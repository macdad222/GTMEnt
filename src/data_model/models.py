"""Unified data model for customer/account entities across source systems."""

from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────────────────────────


class MRRTier(str, Enum):
    """Enterprise MRR tier segments (>$1,500/mo = Enterprise)."""

    TIER_E1 = "tier_e1"  # $1.5k–$10k
    TIER_E2 = "tier_e2"  # $10k–$50k
    TIER_E3 = "tier_e3"  # $50k–$250k
    TIER_E4 = "tier_e4"  # $250k–$1M
    TIER_E5 = "tier_e5"  # $1M+
    NON_ENTERPRISE = "non_enterprise"  # <$1,500/mo


class OpportunityStage(str, Enum):
    """Standard opportunity stages."""

    QUALIFICATION = "qualification"
    DISCOVERY = "discovery"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class ProductCategory(str, Enum):
    """Product/service categories aligned with solution taxonomy."""

    CONNECTIVITY_INTERNET = "connectivity_internet"
    ETHERNET_TRANSPORT = "ethernet_transport"
    SD_WAN = "sd_wan"
    SASE_SECURITY = "sase_security"
    CLOUD_CONNECTIVITY = "cloud_connectivity"
    MANAGED_SERVICES = "managed_services"
    VOICE_UC = "voice_uc"
    MOBILE_WIRELESS = "mobile_wireless"
    OTHER = "other"


class TicketSeverity(str, Enum):
    """Support ticket severity levels."""

    SEV1 = "sev1"  # Critical / outage
    SEV2 = "sev2"  # High / degraded
    SEV3 = "sev3"  # Medium
    SEV4 = "sev4"  # Low


class TicketCategory(str, Enum):
    """Support ticket categories (top call drivers)."""

    OUTAGE = "outage"
    PERFORMANCE = "performance"
    PROVISIONING_STATUS = "provisioning_status"
    CONFIG_CHANGE = "config_change"
    BILLING = "billing"
    HARDWARE = "hardware"
    SECURITY_INCIDENT = "security_incident"
    PORTAL_ACCESS = "portal_access"
    OTHER = "other"


# ─────────────────────────────────────────────────────────────────────────────
# Core Entities
# ─────────────────────────────────────────────────────────────────────────────


class Account(BaseModel):
    """
    Unified Account entity (customer).

    Source systems: Dynamics (CRM), Billing/RevOps
    """

    id: str = Field(..., description="Unified account ID (after identity resolution)")
    dynamics_id: Optional[str] = None
    billing_id: Optional[str] = None

    name: str
    dba_name: Optional[str] = None
    industry: Optional[str] = None
    naics_code: Optional[str] = None
    employee_count: Optional[int] = None
    annual_revenue_usd: Optional[float] = None

    # Address
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"

    # Segmentation
    mrr_usd: float = Field(0.0, description="Current monthly recurring revenue")
    mrr_tier: MRRTier = MRRTier.NON_ENTERPRISE
    is_enterprise: bool = Field(False, description="True if MRR >= $1,500")

    # Footprint
    is_on_net: bool = False
    is_near_net: bool = False
    site_count: int = 1

    # Relationships
    owner_id: Optional[str] = None  # Sales rep
    csm_id: Optional[str] = None  # Customer success manager
    territory: Optional[str] = None

    # Timestamps
    customer_since: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Contact(BaseModel):
    """Contact associated with an Account."""

    id: str
    account_id: str
    dynamics_id: Optional[str] = None

    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    role: Optional[str] = None  # e.g., "Economic Buyer", "Technical Evaluator"
    is_primary: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)


class Opportunity(BaseModel):
    """
    Sales opportunity.

    Source system: Dynamics (CRM)
    """

    id: str
    dynamics_id: Optional[str] = None
    account_id: str

    name: str
    stage: OpportunityStage
    amount_usd: float = 0.0
    mrr_usd: float = 0.0  # Monthly value if recurring
    probability: float = 0.0  # 0–1

    # Products
    primary_product_category: Optional[ProductCategory] = None
    product_categories: List[ProductCategory] = Field(default_factory=list)

    # Dates
    created_date: date
    close_date: Optional[date] = None
    expected_close_date: Optional[date] = None

    # Outcome
    is_won: bool = False
    is_closed: bool = False
    loss_reason: Optional[str] = None

    # Owner
    owner_id: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Quote(BaseModel):
    """
    Quote/proposal.

    Source system: Orion (CPQ)
    """

    id: str
    orion_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    account_id: str

    name: str
    status: str  # e.g., "draft", "pending_approval", "approved", "sent", "accepted"
    total_mrr_usd: float = 0.0
    total_nrc_usd: float = 0.0  # Non-recurring charges
    term_months: int = 36

    # Products
    product_categories: List[ProductCategory] = Field(default_factory=list)

    # Discounting
    discount_pct: float = 0.0
    requires_approval: bool = False
    approval_status: Optional[str] = None

    # Dates
    created_date: date
    expiration_date: Optional[date] = None
    accepted_date: Optional[date] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class Contract(BaseModel):
    """
    Active contract.

    Source system: Billing/RevOps
    """

    id: str
    billing_id: Optional[str] = None
    account_id: str

    name: str
    status: str  # e.g., "active", "expired", "cancelled"
    mrr_usd: float = 0.0
    term_months: int = 36

    start_date: date
    end_date: Optional[date] = None
    auto_renew: bool = True

    product_categories: List[ProductCategory] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ServiceInstance(BaseModel):
    """
    Provisioned service instance.

    Source system: Billing/RevOps + provisioning systems
    """

    id: str
    account_id: str
    contract_id: Optional[str] = None

    product_code: str
    product_name: str
    product_category: ProductCategory

    status: str  # e.g., "active", "pending", "suspended", "disconnected"
    mrr_usd: float = 0.0

    # Location
    site_address: Optional[str] = None
    site_city: Optional[str] = None
    site_state: Optional[str] = None

    # Provisioning
    order_date: Optional[date] = None
    install_date: Optional[date] = None
    disconnect_date: Optional[date] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class UsageMetric(BaseModel):
    """
    Usage/telemetry metric for a service instance.

    Source system: Network telemetry
    """

    id: str
    service_instance_id: str
    account_id: str

    metric_name: str  # e.g., "bandwidth_utilization_pct", "uptime_pct"
    metric_value: float
    unit: str  # e.g., "%", "Mbps", "count"
    period_start: datetime
    period_end: datetime

    created_at: datetime = Field(default_factory=datetime.utcnow)


class SupportTicket(BaseModel):
    """
    Support case/ticket.

    Source system: ServiceNow
    """

    id: str
    servicenow_id: Optional[str] = None
    account_id: str
    service_instance_id: Optional[str] = None

    number: str  # e.g., "INC0012345"
    short_description: str
    category: TicketCategory
    severity: TicketSeverity
    status: str  # e.g., "new", "in_progress", "resolved", "closed"

    # Timestamps
    opened_at: datetime
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Resolution
    resolution_notes: Optional[str] = None
    time_to_resolve_hours: Optional[float] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class MarketingTouch(BaseModel):
    """
    Marketing touchpoint (campaign interaction).

    Source system: Marketing automation
    """

    id: str
    account_id: Optional[str] = None
    contact_id: Optional[str] = None
    lead_id: Optional[str] = None

    campaign_id: str
    campaign_name: str
    channel: str  # e.g., "email", "web", "event", "paid_search"
    touch_type: str  # e.g., "impression", "click", "form_submit", "meeting"

    occurred_at: datetime
    attributed_pipeline_usd: float = 0.0
    attributed_revenue_usd: float = 0.0

    created_at: datetime = Field(default_factory=datetime.utcnow)

