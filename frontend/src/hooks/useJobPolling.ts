/**
 * Custom hook for polling job status until completion.
 * Used for async LLM operations that return a job_id.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface JobStatus {
  id: string
  job_type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  target_id?: string
  target_name?: string
  progress_pct: number
  progress_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
  duration_seconds?: number
  error_message?: string
  result_summary?: Record<string, unknown>
}

interface UseJobPollingOptions {
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number
  /** Maximum polling time in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number
  /** Callback when job completes successfully */
  onComplete?: (job: JobStatus) => void
  /** Callback when job fails */
  onError?: (error: string) => void
  /** Callback on each progress update */
  onProgress?: (job: JobStatus) => void
}

interface UseJobPollingReturn {
  /** Current job status */
  job: JobStatus | null
  /** Whether currently polling */
  isPolling: boolean
  /** Current progress percentage (0-100) */
  progress: number
  /** Current progress message */
  progressMessage: string
  /** Error message if failed */
  error: string | null
  /** Start polling for a job */
  startPolling: (jobId: string) => void
  /** Stop polling */
  stopPolling: () => void
  /** Reset state */
  reset: () => void
}

export function useJobPolling(options: UseJobPollingOptions = {}): UseJobPollingReturn {
  const {
    interval = 2000,
    timeout = 300000,
    onComplete,
    onError,
    onProgress,
  } = options

  const [job, setJob] = useState<JobStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsPolling(false)
  }, [])

  const reset = useCallback(() => {
    stopPolling()
    setJob(null)
    setProgress(0)
    setProgressMessage('')
    setError(null)
    jobIdRef.current = null
  }, [stopPolling])

  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`)
      }

      const jobData: JobStatus = await response.json()
      setJob(jobData)
      setProgress(jobData.progress_pct)
      setProgressMessage(jobData.progress_message || '')

      // Call progress callback
      onProgress?.(jobData)

      // Check for completion
      if (jobData.status === 'completed') {
        stopPolling()
        onComplete?.(jobData)
        return true
      }

      // Check for failure
      if (jobData.status === 'failed' || jobData.status === 'cancelled') {
        stopPolling()
        const errorMsg = jobData.error_message || 'Job failed'
        setError(errorMsg)
        onError?.(errorMsg)
        return true
      }

      return false
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMsg)
      stopPolling()
      onError?.(errorMsg)
      return true
    }
  }, [stopPolling, onComplete, onError, onProgress])

  const startPolling = useCallback((jobId: string) => {
    // Reset previous state
    reset()
    
    jobIdRef.current = jobId
    setIsPolling(true)
    setProgress(0)
    setProgressMessage('Starting...')

    // Initial poll
    pollJobStatus(jobId)

    // Set up interval polling
    pollingRef.current = setInterval(() => {
      if (jobIdRef.current) {
        pollJobStatus(jobIdRef.current)
      }
    }, interval)

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setError('Job timed out')
      onError?.('Job timed out')
    }, timeout)
  }, [reset, pollJobStatus, interval, timeout, stopPolling, onError])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    job,
    isPolling,
    progress,
    progressMessage,
    error,
    startPolling,
    stopPolling,
    reset,
  }
}

/**
 * Hook for tracking multiple jobs simultaneously.
 */
interface UseMultiJobPollingReturn {
  /** Map of job IDs to their status */
  jobs: Map<string, JobStatus>
  /** Number of active (polling) jobs */
  activeCount: number
  /** Overall progress across all jobs */
  overallProgress: number
  /** Add a job to track */
  addJob: (jobId: string) => void
  /** Remove a job from tracking */
  removeJob: (jobId: string) => void
  /** Get status of a specific job */
  getJob: (jobId: string) => JobStatus | undefined
  /** Reset all tracking */
  resetAll: () => void
}

export function useMultiJobPolling(options: UseJobPollingOptions = {}): UseMultiJobPollingReturn {
  const { interval = 2000, timeout = 300000, onComplete, onError } = options

  const [jobs, setJobs] = useState<Map<string, JobStatus>>(new Map())
  const [activeCount, setActiveCount] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeJobsRef = useRef<Set<string>>(new Set())

  const pollAllJobs = useCallback(async () => {
    const jobIds = Array.from(activeJobsRef.current)
    
    for (const jobId of jobIds) {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        if (!response.ok) continue

        const jobData: JobStatus = await response.json()
        
        setJobs(prev => new Map(prev).set(jobId, jobData))

        if (jobData.status === 'completed') {
          activeJobsRef.current.delete(jobId)
          onComplete?.(jobData)
        } else if (jobData.status === 'failed' || jobData.status === 'cancelled') {
          activeJobsRef.current.delete(jobId)
          onError?.(jobData.error_message || 'Job failed')
        }
      } catch {
        // Continue polling other jobs
      }
    }

    setActiveCount(activeJobsRef.current.size)

    // Stop polling if no active jobs
    if (activeJobsRef.current.size === 0 && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [onComplete, onError])

  const addJob = useCallback((jobId: string) => {
    activeJobsRef.current.add(jobId)
    setActiveCount(activeJobsRef.current.size)

    // Start polling if not already
    if (!pollingRef.current) {
      pollAllJobs() // Initial poll
      pollingRef.current = setInterval(pollAllJobs, interval)
    }

    // Set timeout for this job
    setTimeout(() => {
      if (activeJobsRef.current.has(jobId)) {
        activeJobsRef.current.delete(jobId)
        setActiveCount(activeJobsRef.current.size)
        onError?.(`Job ${jobId} timed out`)
      }
    }, timeout)
  }, [interval, timeout, pollAllJobs, onError])

  const removeJob = useCallback((jobId: string) => {
    activeJobsRef.current.delete(jobId)
    setActiveCount(activeJobsRef.current.size)
  }, [])

  const getJob = useCallback((jobId: string) => {
    return jobs.get(jobId)
  }, [jobs])

  const resetAll = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    activeJobsRef.current.clear()
    setJobs(new Map())
    setActiveCount(0)
  }, [])

  // Calculate overall progress
  const overallProgress = jobs.size > 0
    ? Array.from(jobs.values()).reduce((sum, j) => sum + j.progress_pct, 0) / jobs.size
    : 0

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return {
    jobs,
    activeCount,
    overallProgress,
    addJob,
    removeJob,
    getJob,
    resetAll,
  }
}

