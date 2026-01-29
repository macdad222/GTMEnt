"""Experiment tracker for managing A/B tests."""

from datetime import datetime, date
from typing import Optional, List, Dict
import hashlib

from .models import (
    Experiment,
    ExperimentVariant,
    ExperimentStatus,
    MetricObservation,
    MetricType,
)


class ExperimentTracker:
    """
    Track experiments and collect metric observations.

    Responsibilities:
    - Create and manage experiments
    - Assign accounts to variants
    - Record metric observations
    - Query observations for analysis
    """

    def __init__(self):
        self._experiments: Dict[str, Experiment] = {}
        self._observations: List[MetricObservation] = []
        self._assignments: Dict[str, str] = {}  # account_id -> variant_id

    def _generate_id(self, *components: str) -> str:
        """Generate a deterministic ID."""
        combined = "|".join(str(c) for c in components)
        return hashlib.sha256(combined.encode()).hexdigest()[:12]

    def create_experiment(
        self,
        name: str,
        description: str,
        hypothesis: str,
        primary_metric: str,
        segment: Optional[str] = None,
        solution_area: Optional[str] = None,
        secondary_metrics: Optional[List[str]] = None,
        owner_name: Optional[str] = None,
    ) -> Experiment:
        """Create a new experiment in draft status."""
        exp_id = self._generate_id("experiment", name, datetime.utcnow().isoformat())

        # Create default control and treatment variants
        control = ExperimentVariant(
            id=f"{exp_id}-control",
            name="Control",
            description="Current playbook / no change",
            is_control=True,
            target_allocation_pct=0.5,
        )
        treatment = ExperimentVariant(
            id=f"{exp_id}-treatment",
            name="Treatment",
            description="New playbook variant",
            is_control=False,
            target_allocation_pct=0.5,
        )

        experiment = Experiment(
            id=exp_id,
            name=name,
            description=description,
            hypothesis=hypothesis,
            segment=segment,
            solution_area=solution_area,
            variants=[control, treatment],
            primary_metric=primary_metric,
            secondary_metrics=secondary_metrics or [],
            status=ExperimentStatus.DRAFT,
            owner_name=owner_name,
        )

        self._experiments[exp_id] = experiment
        return experiment

    def start_experiment(self, experiment_id: str, start_date: Optional[date] = None) -> Experiment:
        """Start an experiment."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            raise ValueError(f"Experiment {experiment_id} not found")

        exp.status = ExperimentStatus.RUNNING
        exp.start_date = start_date or date.today()
        exp.updated_at = datetime.utcnow()

        return exp

    def stop_experiment(self, experiment_id: str, end_date: Optional[date] = None) -> Experiment:
        """Stop an experiment."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            raise ValueError(f"Experiment {experiment_id} not found")

        exp.status = ExperimentStatus.COMPLETED
        exp.end_date = end_date or date.today()
        exp.updated_at = datetime.utcnow()

        return exp

    def assign_account(self, experiment_id: str, account_id: str) -> str:
        """
        Assign an account to a variant using deterministic hashing.

        Returns the variant_id the account is assigned to.
        """
        exp = self._experiments.get(experiment_id)
        if not exp:
            raise ValueError(f"Experiment {experiment_id} not found")

        # Check if already assigned
        assignment_key = f"{experiment_id}:{account_id}"
        if assignment_key in self._assignments:
            return self._assignments[assignment_key]

        # Deterministic assignment using hash
        hash_input = f"{experiment_id}:{account_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)

        # Simple 50/50 split (could be weighted based on target_allocation_pct)
        variant_index = hash_value % len(exp.variants)
        variant = exp.variants[variant_index]

        self._assignments[assignment_key] = variant.id
        return variant.id

    def record_observation(
        self,
        experiment_id: str,
        variant_id: str,
        metric_id: str,
        metric_type: MetricType,
        value: float,
        account_id: Optional[str] = None,
        opportunity_id: Optional[str] = None,
    ) -> MetricObservation:
        """Record a metric observation for a variant."""
        obs_id = self._generate_id(
            experiment_id, variant_id, metric_id, datetime.utcnow().isoformat()
        )

        observation = MetricObservation(
            id=obs_id,
            experiment_id=experiment_id,
            variant_id=variant_id,
            metric_id=metric_id,
            metric_type=metric_type,
            value=value,
            account_id=account_id,
            opportunity_id=opportunity_id,
        )

        self._observations.append(observation)
        return observation

    def get_observations(
        self,
        experiment_id: str,
        metric_id: Optional[str] = None,
        variant_id: Optional[str] = None,
    ) -> List[MetricObservation]:
        """Query observations for an experiment."""
        observations = [o for o in self._observations if o.experiment_id == experiment_id]

        if metric_id:
            observations = [o for o in observations if o.metric_id == metric_id]

        if variant_id:
            observations = [o for o in observations if o.variant_id == variant_id]

        return observations

    def get_experiment(self, experiment_id: str) -> Optional[Experiment]:
        """Get an experiment by ID."""
        return self._experiments.get(experiment_id)

    def list_experiments(
        self,
        status: Optional[ExperimentStatus] = None,
        segment: Optional[str] = None,
    ) -> List[Experiment]:
        """List experiments with optional filters."""
        experiments = list(self._experiments.values())

        if status:
            experiments = [e for e in experiments if e.status == status]

        if segment:
            experiments = [e for e in experiments if e.segment == segment]

        return sorted(experiments, key=lambda e: e.created_at, reverse=True)

    def get_variant_sample_sizes(self, experiment_id: str) -> Dict[str, int]:
        """Get the number of unique accounts per variant."""
        exp = self._experiments.get(experiment_id)
        if not exp:
            return {}

        counts: Dict[str, int] = {v.id: 0 for v in exp.variants}

        for key, variant_id in self._assignments.items():
            if key.startswith(f"{experiment_id}:"):
                if variant_id in counts:
                    counts[variant_id] += 1

        return counts

