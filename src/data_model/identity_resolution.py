"""Identity resolution for unifying records across source systems."""

from typing import Optional, List, Tuple
from pydantic import BaseModel, Field
from datetime import datetime
import hashlib

from .models import Account, Contact


class MatchCandidate(BaseModel):
    """A candidate match between two records."""

    source_id: str
    source_system: str
    target_id: str
    target_system: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_reasons: List[str] = Field(default_factory=list)


class IdentityResolver:
    """
    Identity resolution engine for unifying records across systems.

    Approach:
    - Deterministic matching on strong identifiers (billing ID, DUNS, EIN)
    - Fuzzy matching on name + address for candidates
    - Human review queue for low-confidence matches

    Source systems to unify:
    - Dynamics (CRM)
    - Billing/RevOps
    - Orion (CPQ)
    - ServiceNow
    - Marketing automation
    """

    # Thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.90
    MEDIUM_CONFIDENCE_THRESHOLD = 0.70
    LOW_CONFIDENCE_THRESHOLD = 0.50

    def __init__(self):
        self._unified_accounts: dict[str, Account] = {}
        self._source_to_unified: dict[Tuple[str, str], str] = {}  # (system, source_id) -> unified_id

    def generate_unified_id(self, *components: str) -> str:
        """Generate a deterministic unified ID from components."""
        combined = "|".join(str(c).lower().strip() for c in components if c)
        return "ua-" + hashlib.sha256(combined.encode()).hexdigest()[:12]

    def match_accounts(
        self,
        account1: Account,
        system1: str,
        account2: Account,
        system2: str,
    ) -> MatchCandidate:
        """
        Calculate match confidence between two account records.

        Returns a MatchCandidate with confidence score and reasons.
        """
        confidence = 0.0
        reasons: List[str] = []

        # Strong identifier match (deterministic)
        if account1.billing_id and account1.billing_id == account2.billing_id:
            confidence = 1.0
            reasons.append("billing_id_match")
            return MatchCandidate(
                source_id=account1.id,
                source_system=system1,
                target_id=account2.id,
                target_system=system2,
                confidence=confidence,
                match_reasons=reasons,
            )

        if account1.dynamics_id and account1.dynamics_id == account2.dynamics_id:
            confidence = 1.0
            reasons.append("dynamics_id_match")
            return MatchCandidate(
                source_id=account1.id,
                source_system=system1,
                target_id=account2.id,
                target_system=system2,
                confidence=confidence,
                match_reasons=reasons,
            )

        # Name matching (fuzzy)
        name1 = self._normalize_name(account1.name)
        name2 = self._normalize_name(account2.name)
        if name1 and name2:
            name_sim = self._string_similarity(name1, name2)
            if name_sim > 0.85:
                confidence += 0.4
                reasons.append(f"name_match_{name_sim:.2f}")
            elif name_sim > 0.70:
                confidence += 0.25
                reasons.append(f"name_partial_{name_sim:.2f}")

        # Address matching
        if account1.zip_code and account2.zip_code:
            if account1.zip_code == account2.zip_code:
                confidence += 0.2
                reasons.append("zip_match")

                # Same zip + similar street
                if account1.address_line1 and account2.address_line1:
                    addr_sim = self._string_similarity(
                        self._normalize_address(account1.address_line1),
                        self._normalize_address(account2.address_line1),
                    )
                    if addr_sim > 0.80:
                        confidence += 0.2
                        reasons.append(f"address_match_{addr_sim:.2f}")

        # Industry match (weak signal)
        if account1.industry and account2.industry:
            if account1.industry.lower() == account2.industry.lower():
                confidence += 0.1
                reasons.append("industry_match")

        # Cap at 0.95 for non-deterministic matches
        confidence = min(confidence, 0.95)

        return MatchCandidate(
            source_id=account1.id,
            source_system=system1,
            target_id=account2.id,
            target_system=system2,
            confidence=confidence,
            match_reasons=reasons,
        )

    def _normalize_name(self, name: Optional[str]) -> str:
        """Normalize company name for matching."""
        if not name:
            return ""
        name = name.lower().strip()
        # Remove common suffixes
        for suffix in ["inc", "inc.", "llc", "llc.", "corp", "corp.", "co", "co.", "ltd", "ltd."]:
            if name.endswith(suffix):
                name = name[: -len(suffix)].strip().rstrip(",")
        return name

    def _normalize_address(self, address: Optional[str]) -> str:
        """Normalize address for matching."""
        if not address:
            return ""
        address = address.lower().strip()
        # Expand common abbreviations
        replacements = {
            "st.": "street",
            "st ": "street ",
            "ave.": "avenue",
            "ave ": "avenue ",
            "blvd.": "boulevard",
            "blvd ": "boulevard ",
            "dr.": "drive",
            "dr ": "drive ",
            "rd.": "road",
            "rd ": "road ",
        }
        for abbr, full in replacements.items():
            address = address.replace(abbr, full)
        return address

    def _string_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity (Jaccard on character bigrams)."""
        if not s1 or not s2:
            return 0.0

        def bigrams(s: str) -> set:
            return {s[i : i + 2] for i in range(len(s) - 1)}

        bg1 = bigrams(s1)
        bg2 = bigrams(s2)

        if not bg1 or not bg2:
            return 0.0

        intersection = len(bg1 & bg2)
        union = len(bg1 | bg2)
        return intersection / union if union > 0 else 0.0

    def register_unified_account(
        self,
        account: Account,
        source_system: str,
        source_id: str,
    ) -> str:
        """
        Register an account in the unified store.

        Returns the unified account ID.
        """
        unified_id = account.id
        self._unified_accounts[unified_id] = account
        self._source_to_unified[(source_system, source_id)] = unified_id
        return unified_id

    def get_unified_id(self, source_system: str, source_id: str) -> Optional[str]:
        """Look up unified ID from source system ID."""
        return self._source_to_unified.get((source_system, source_id))

    def get_unified_account(self, unified_id: str) -> Optional[Account]:
        """Get unified account by ID."""
        return self._unified_accounts.get(unified_id)

    def needs_review(self, candidate: MatchCandidate) -> bool:
        """Determine if a match candidate needs human review."""
        return (
            candidate.confidence >= self.LOW_CONFIDENCE_THRESHOLD
            and candidate.confidence < self.HIGH_CONFIDENCE_THRESHOLD
        )

