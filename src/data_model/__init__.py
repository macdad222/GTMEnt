"""Unified customer/account data model and KPI semantic layer."""

from .models import (
    Account,
    Contact,
    Opportunity,
    Quote,
    Contract,
    ServiceInstance,
    UsageMetric,
    SupportTicket,
    MarketingTouch,
)
from .semantic_layer import KPIDefinition, KPIMetric, SemanticLayer
from .identity_resolution import IdentityResolver

__all__ = [
    # Core entities
    "Account",
    "Contact",
    "Opportunity",
    "Quote",
    "Contract",
    "ServiceInstance",
    "UsageMetric",
    "SupportTicket",
    "MarketingTouch",
    # Semantic layer
    "KPIDefinition",
    "KPIMetric",
    "SemanticLayer",
    # Identity
    "IdentityResolver",
]

