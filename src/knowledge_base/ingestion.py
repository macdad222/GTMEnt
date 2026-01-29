"""Ingesters for approved public sources (SEC EDGAR, Comcast Business site)."""

import hashlib
import re
from datetime import datetime
from typing import AsyncIterator
from abc import ABC, abstractmethod

import httpx
from bs4 import BeautifulSoup

from .models import Source, SourceChunk, SourceType


class BaseIngester(ABC):
    """Abstract base class for source ingesters."""

    @abstractmethod
    async def fetch_sources(self) -> AsyncIterator[Source]:
        """Yield Source objects from the upstream provider."""
        ...

    @abstractmethod
    async def fetch_chunks(self, source: Source) -> AsyncIterator[SourceChunk]:
        """Yield SourceChunk objects for a given source."""
        ...

    @staticmethod
    def _chunk_id(source_id: str, chunk_index: int) -> str:
        """Generate a deterministic chunk ID."""
        return hashlib.sha256(f"{source_id}:{chunk_index}".encode()).hexdigest()[:16]


class SECEdgarIngester(BaseIngester):
    """Ingester for SEC EDGAR filings (10-K, 10-Q) for Comcast."""

    BASE_URL = "https://www.sec.gov"
    FILING_INDEX_URL = (
        "https://www.sec.gov/cgi-bin/browse-edgar"
        "?action=getcompany&CIK={cik}&type=10-K&dateb=&owner=include&count=5&output=atom"
    )

    def __init__(self, cik: str = "0001166691"):
        self.cik = cik

    async def fetch_sources(self) -> AsyncIterator[Source]:
        """Fetch recent 10-K filings from SEC EDGAR."""
        async with httpx.AsyncClient(timeout=30) as client:
            # For MVP, we use a known filing index URL directly
            # In production, parse the Atom feed for multiple filings
            source = Source(
                id=f"sec-10k-{self.cik}-2024",
                source_type=SourceType.SEC_FILING,
                title="Comcast Corporation 10-K (FY2024)",
                url="https://www.sec.gov/Archives/edgar/data/1166691/000116669125000011/0001166691-25-000011-index.htm",
                filing_date=datetime(2025, 1, 31),
                fiscal_year=2024,
                description="Annual report for Comcast Corporation fiscal year ending December 31, 2024.",
            )
            yield source

    async def fetch_chunks(self, source: Source) -> AsyncIterator[SourceChunk]:
        """Fetch and chunk the 10-K filing content."""
        async with httpx.AsyncClient(timeout=60) as client:
            # Fetch the main HTML document
            doc_url = source.url.replace("-index.htm", ".htm").replace("0001166691-25-000011", "cmcsa-20241231")
            doc_url = "https://www.sec.gov/Archives/edgar/data/1166691/000116669125000011/cmcsa-20241231.htm"
            resp = await client.get(doc_url)
            if resp.status_code != 200:
                return

            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text(separator="\n", strip=True)

            # Simple chunking by ~2000 chars with overlap
            chunk_size = 2000
            overlap = 200
            chunks = []
            for i in range(0, len(text), chunk_size - overlap):
                chunk_text = text[i : i + chunk_size]
                if len(chunk_text.strip()) < 50:
                    continue
                chunks.append(chunk_text)

            for idx, chunk_text in enumerate(chunks):
                yield SourceChunk(
                    id=self._chunk_id(source.id, idx),
                    source_id=source.id,
                    chunk_index=idx,
                    content=chunk_text,
                    section="10-K Full Document",
                    metadata={"fiscal_year": source.fiscal_year},
                )


class ComcastBusinessSiteIngester(BaseIngester):
    """Ingester for Comcast Business enterprise solution pages."""

    PAGES = [
        {
            "path": "/enterprise/products-services/connectivity/ethernet-network-services",
            "title": "Ethernet Network Services",
            "section": "Connectivity",
        },
        {
            "path": "/enterprise/products-services/connectivity",
            "title": "Connectivity Solutions Hub",
            "section": "Connectivity",
        },
        {
            "path": "/enterprise/products-services/secure-networking/sd-wan",
            "title": "SD-WAN Solutions",
            "section": "Secure Networking",
        },
    ]

    def __init__(self, base_url: str = "https://business.comcast.com"):
        self.base_url = base_url

    async def fetch_sources(self) -> AsyncIterator[Source]:
        """Yield Source objects for each configured page."""
        for page in self.PAGES:
            source_id = hashlib.sha256(page["path"].encode()).hexdigest()[:12]
            yield Source(
                id=f"cbs-{source_id}",
                source_type=SourceType.COMCAST_BUSINESS_SITE,
                title=f"Comcast Business: {page['title']}",
                url=f"{self.base_url}{page['path']}",
                description=f"Enterprise {page['section']} solution page.",
            )

    async def fetch_chunks(self, source: Source) -> AsyncIterator[SourceChunk]:
        """Fetch and chunk page content."""
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(source.url)
            if resp.status_code != 200:
                return

            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove script/style
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()

            text = soup.get_text(separator="\n", strip=True)
            # Clean up excessive whitespace
            text = re.sub(r"\n{3,}", "\n\n", text)

            # Chunk by ~1500 chars
            chunk_size = 1500
            overlap = 150
            idx = 0
            for i in range(0, len(text), chunk_size - overlap):
                chunk_text = text[i : i + chunk_size]
                if len(chunk_text.strip()) < 50:
                    continue
                yield SourceChunk(
                    id=self._chunk_id(source.id, idx),
                    source_id=source.id,
                    chunk_index=idx,
                    content=chunk_text,
                    section=source.title,
                    metadata={"url": source.url},
                )
                idx += 1

