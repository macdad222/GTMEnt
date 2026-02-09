"""Job queue for managing async operations."""

from datetime import datetime
from typing import Dict, List, Optional
import json
import os
import threading

import structlog

from .models import Job, JobStatus, JobType, JobSummary

logger = structlog.get_logger(__name__)


class JobQueue:
    """
    In-memory job queue with persistence.
    
    Tracks all data import, summarization, and deck generation jobs.
    """
    
    QUEUE_FILE = "./data/job_queue.json"
    
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._lock = threading.Lock()
        self._load_queue()
    
    def _load_queue(self):
        """Load jobs from persistent storage."""
        try:
            if os.path.exists(self.QUEUE_FILE):
                with open(self.QUEUE_FILE, 'r') as f:
                    data = json.load(f)
                for job_data in data.get('jobs', []):
                    # Convert datetime strings back
                    for dt_field in ['created_at', 'started_at', 'completed_at']:
                        if job_data.get(dt_field):
                            job_data[dt_field] = datetime.fromisoformat(job_data[dt_field])
                    job = Job(**job_data)
                    self._jobs[job.id] = job
        except Exception as e:
            logger.warning("job_queue_load_failed", error=str(e))
    
    def _save_queue(self):
        """Save jobs to persistent storage."""
        try:
            os.makedirs(os.path.dirname(self.QUEUE_FILE), exist_ok=True)
            
            jobs_data = []
            for job in self._jobs.values():
                job_dict = job.model_dump()
                # Convert datetime to ISO strings
                for dt_field in ['created_at', 'started_at', 'completed_at']:
                    if job_dict.get(dt_field):
                        job_dict[dt_field] = job_dict[dt_field].isoformat()
                jobs_data.append(job_dict)
            
            with open(self.QUEUE_FILE, 'w') as f:
                json.dump({'jobs': jobs_data}, f, indent=2, default=str)
        except Exception as e:
            logger.warning("job_queue_save_failed", error=str(e))
    
    def create_job(
        self,
        job_type: JobType,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        parent_job_id: Optional[str] = None,
    ) -> Job:
        """Create a new job."""
        with self._lock:
            job = Job(
                job_type=job_type,
                target_id=target_id,
                target_name=target_name,
                parent_job_id=parent_job_id,
            )
            self._jobs[job.id] = job
            
            # If there's a parent, add to its children
            if parent_job_id and parent_job_id in self._jobs:
                self._jobs[parent_job_id].child_job_ids.append(job.id)
            
            self._save_queue()
            return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by ID."""
        return self._jobs.get(job_id)
    
    def update_job(self, job: Job):
        """Update a job."""
        with self._lock:
            self._jobs[job.id] = job
            self._save_queue()
    
    def start_job(self, job_id: str) -> Optional[Job]:
        """Mark a job as started."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.start()
                self._save_queue()
            return job
    
    def update_progress(self, job_id: str, pct: int, message: Optional[str] = None) -> Optional[Job]:
        """Update job progress."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.update_progress(pct, message)
                self._save_queue()
            return job
    
    def complete_job(self, job_id: str, result: Optional[dict] = None) -> Optional[Job]:
        """Mark a job as completed."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.complete(result)
                self._save_queue()
            return job
    
    def fail_job(self, job_id: str, error: str) -> Optional[Job]:
        """Mark a job as failed."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.fail(error)
                self._save_queue()
            return job
    
    def get_jobs_by_type(self, job_type: JobType) -> List[Job]:
        """Get all jobs of a specific type."""
        return [j for j in self._jobs.values() if j.job_type == job_type]
    
    def get_jobs_by_status(self, status: JobStatus) -> List[Job]:
        """Get all jobs with a specific status."""
        return [j for j in self._jobs.values() if j.status == status]
    
    def get_active_jobs(self) -> List[Job]:
        """Get all active (pending or in-progress) jobs."""
        return [j for j in self._jobs.values() if j.is_active]
    
    def get_jobs_for_target(self, target_id: str) -> List[Job]:
        """Get all jobs for a specific target."""
        return [j for j in self._jobs.values() if j.target_id == target_id]
    
    def get_recent_jobs(self, limit: int = 20) -> List[Job]:
        """Get most recent jobs."""
        sorted_jobs = sorted(
            self._jobs.values(),
            key=lambda j: j.created_at,
            reverse=True
        )
        return sorted_jobs[:limit]
    
    def get_summary(self) -> JobSummary:
        """Get summary of job queue."""
        jobs = list(self._jobs.values())
        
        by_type = {}
        for jt in JobType:
            by_type[jt.value] = sum(1 for j in jobs if j.job_type == jt)
        
        active = [j for j in jobs if j.is_active]
        completed = sorted(
            [j for j in jobs if j.status == JobStatus.COMPLETED],
            key=lambda j: j.completed_at or datetime.min,
            reverse=True
        )[:10]
        
        return JobSummary(
            total_jobs=len(jobs),
            pending=sum(1 for j in jobs if j.status == JobStatus.PENDING),
            in_progress=sum(1 for j in jobs if j.status == JobStatus.IN_PROGRESS),
            completed=sum(1 for j in jobs if j.status == JobStatus.COMPLETED),
            failed=sum(1 for j in jobs if j.status == JobStatus.FAILED),
            by_type=by_type,
            recent_completed=completed,
            active_jobs=active,
        )
    
    def clear_completed(self, older_than_days: int = 7):
        """Clear old completed jobs."""
        with self._lock:
            cutoff = datetime.utcnow()
            to_remove = []
            for job_id, job in self._jobs.items():
                if job.status == JobStatus.COMPLETED and job.completed_at:
                    age_days = (cutoff - job.completed_at).days
                    if age_days > older_than_days:
                        to_remove.append(job_id)
            
            for job_id in to_remove:
                del self._jobs[job_id]
            
            self._save_queue()


# Singleton instance
_queue: Optional[JobQueue] = None


def get_job_queue() -> JobQueue:
    """Get the singleton job queue instance."""
    global _queue
    if _queue is None:
        _queue = JobQueue()
    return _queue

