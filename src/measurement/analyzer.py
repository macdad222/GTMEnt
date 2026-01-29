"""Lift analyzer for calculating experiment results."""

import math
from typing import Optional, List
from datetime import datetime

from .models import (
    Experiment,
    MetricObservation,
    MetricType,
    LiftResult,
    GrowthContribution,
)
from .tracker import ExperimentTracker


class LiftAnalyzer:
    """
    Analyze experiment results and calculate lift.

    Responsibilities:
    - Aggregate observations by variant
    - Calculate lift (absolute and relative)
    - Estimate statistical significance
    - Generate recommendations
    """

    # Significance thresholds
    CONFIDENCE_THRESHOLD = 0.95
    MIN_SAMPLE_SIZE = 30

    def __init__(self, tracker: ExperimentTracker):
        self.tracker = tracker

    def calculate_lift(
        self,
        experiment_id: str,
        metric_id: Optional[str] = None,
    ) -> List[LiftResult]:
        """
        Calculate lift for an experiment.

        Args:
            experiment_id: The experiment to analyze
            metric_id: Optional specific metric (defaults to primary)

        Returns:
            List of LiftResult objects
        """
        experiment = self.tracker.get_experiment(experiment_id)
        if not experiment:
            raise ValueError(f"Experiment {experiment_id} not found")

        # Use primary metric if not specified
        metrics_to_analyze = [metric_id] if metric_id else [experiment.primary_metric]

        results: List[LiftResult] = []

        # Find control variant
        control = next((v for v in experiment.variants if v.is_control), None)
        if not control:
            raise ValueError("No control variant found")

        # Analyze each treatment vs control
        treatments = [v for v in experiment.variants if not v.is_control]

        for metric in metrics_to_analyze:
            control_obs = self.tracker.get_observations(
                experiment_id=experiment_id,
                metric_id=metric,
                variant_id=control.id,
            )

            for treatment in treatments:
                treatment_obs = self.tracker.get_observations(
                    experiment_id=experiment_id,
                    metric_id=metric,
                    variant_id=treatment.id,
                )

                result = self._calculate_variant_lift(
                    experiment_id=experiment_id,
                    metric_id=metric,
                    control_variant_id=control.id,
                    control_observations=control_obs,
                    treatment_variant_id=treatment.id,
                    treatment_observations=treatment_obs,
                )

                results.append(result)

        return results

    def _calculate_variant_lift(
        self,
        experiment_id: str,
        metric_id: str,
        control_variant_id: str,
        control_observations: List[MetricObservation],
        treatment_variant_id: str,
        treatment_observations: List[MetricObservation],
    ) -> LiftResult:
        """Calculate lift between control and treatment."""

        # Aggregate values
        control_values = [o.value for o in control_observations]
        treatment_values = [o.value for o in treatment_observations]

        control_n = len(control_values)
        treatment_n = len(treatment_values)

        # Calculate means
        control_mean = sum(control_values) / control_n if control_n > 0 else 0
        treatment_mean = sum(treatment_values) / treatment_n if treatment_n > 0 else 0

        # Calculate lift
        absolute_lift = treatment_mean - control_mean
        relative_lift_pct = (
            (absolute_lift / control_mean) * 100 if control_mean != 0 else 0
        )

        # Statistical significance (simplified z-test for proportions)
        is_significant, p_value, confidence = self._calculate_significance(
            control_values, treatment_values
        )

        # Generate recommendation
        recommendation = self._generate_recommendation(
            is_significant=is_significant,
            relative_lift_pct=relative_lift_pct,
            control_n=control_n,
            treatment_n=treatment_n,
        )

        return LiftResult(
            experiment_id=experiment_id,
            metric_id=metric_id,
            control_variant_id=control_variant_id,
            control_value=control_mean,
            control_sample_size=control_n,
            treatment_variant_id=treatment_variant_id,
            treatment_value=treatment_mean,
            treatment_sample_size=treatment_n,
            absolute_lift=absolute_lift,
            relative_lift_pct=relative_lift_pct,
            confidence_level=confidence,
            is_significant=is_significant,
            p_value=p_value,
            recommendation=recommendation,
        )

    def _calculate_significance(
        self,
        control_values: List[float],
        treatment_values: List[float],
    ) -> tuple[bool, Optional[float], float]:
        """
        Calculate statistical significance using a simplified approach.

        Returns: (is_significant, p_value, confidence_level)
        """
        control_n = len(control_values)
        treatment_n = len(treatment_values)

        # Need minimum sample size
        if control_n < self.MIN_SAMPLE_SIZE or treatment_n < self.MIN_SAMPLE_SIZE:
            return False, None, 0.0

        # Calculate means and standard deviations
        control_mean = sum(control_values) / control_n
        treatment_mean = sum(treatment_values) / treatment_n

        control_var = sum((x - control_mean) ** 2 for x in control_values) / control_n
        treatment_var = sum((x - treatment_mean) ** 2 for x in treatment_values) / treatment_n

        control_std = math.sqrt(control_var)
        treatment_std = math.sqrt(treatment_var)

        # Pooled standard error
        se = math.sqrt(
            (control_std ** 2 / control_n) + (treatment_std ** 2 / treatment_n)
        )

        if se == 0:
            return False, None, 0.0

        # Z-score
        z = (treatment_mean - control_mean) / se

        # Approximate p-value using normal distribution
        # (simplified - in production use scipy.stats)
        p_value = 2 * (1 - self._norm_cdf(abs(z)))

        confidence = 1 - p_value
        is_significant = confidence >= self.CONFIDENCE_THRESHOLD

        return is_significant, p_value, confidence

    def _norm_cdf(self, x: float) -> float:
        """Approximate normal CDF (standard normal)."""
        # Approximation using error function
        return 0.5 * (1 + math.erf(x / math.sqrt(2)))

    def _generate_recommendation(
        self,
        is_significant: bool,
        relative_lift_pct: float,
        control_n: int,
        treatment_n: int,
    ) -> str:
        """Generate a recommendation based on results."""
        min_sample = min(control_n, treatment_n)

        if min_sample < self.MIN_SAMPLE_SIZE:
            return "continue_testing"

        if not is_significant:
            return "continue_testing"

        if relative_lift_pct > 5:  # >5% lift and significant
            return "adopt"
        elif relative_lift_pct < -5:  # <-5% lift and significant
            return "reject"
        else:
            return "continue_testing"

    def summarize_for_dashboard(self, experiment_id: str) -> dict:
        """Generate a summary suitable for dashboard display."""
        experiment = self.tracker.get_experiment(experiment_id)
        if not experiment:
            return {}

        results = self.calculate_lift(experiment_id)
        sample_sizes = self.tracker.get_variant_sample_sizes(experiment_id)

        return {
            "experiment_id": experiment_id,
            "name": experiment.name,
            "status": experiment.status.value,
            "primary_metric": experiment.primary_metric,
            "start_date": experiment.start_date.isoformat() if experiment.start_date else None,
            "sample_sizes": sample_sizes,
            "results": [
                {
                    "metric_id": r.metric_id,
                    "control_value": r.control_value,
                    "treatment_value": r.treatment_value,
                    "relative_lift_pct": r.relative_lift_pct,
                    "is_significant": r.is_significant,
                    "recommendation": r.recommendation,
                }
                for r in results
            ],
        }

    def calculate_growth_contribution(
        self,
        experiment_id: str,
        arr_impact: float,
    ) -> dict:
        """
        Calculate how an experiment contributes to the 15% growth target.

        Args:
            experiment_id: The experiment
            arr_impact: Estimated ARR impact from this experiment

        Returns:
            Contribution summary
        """
        experiment = self.tracker.get_experiment(experiment_id)
        if not experiment:
            return {}

        # Assuming $3B base and 15% target
        base_arr = 3_000_000_000
        target_growth_arr = base_arr * 0.15  # $450M

        contribution_pct = (arr_impact / target_growth_arr) * 100

        return {
            "experiment_id": experiment_id,
            "experiment_name": experiment.name,
            "arr_impact": arr_impact,
            "target_growth_arr": target_growth_arr,
            "contribution_pct": contribution_pct,
            "interpretation": (
                f"This experiment contributes {contribution_pct:.1f}% of the "
                f"${target_growth_arr/1e6:.0f}M growth target."
            ),
        }

