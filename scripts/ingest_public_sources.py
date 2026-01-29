#!/usr/bin/env python3
"""Script to ingest approved public sources into the knowledge base."""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import get_settings
from src.knowledge_base import (
    SECEdgarIngester,
    ComcastBusinessSiteIngester,
    KnowledgeBaseVectorStore,
)


async def main() -> None:
    """Ingest all approved public sources into the knowledge base."""
    settings = get_settings()

    print("=" * 60)
    print("Enterprise Strategy Playbook Platform")
    print("Public Source Ingestion")
    print("=" * 60)

    # Initialize vector store
    vector_store = KnowledgeBaseVectorStore(persist_dir=settings.chroma_persist_dir)

    # Initialize ingesters
    sec_ingester = SECEdgarIngester(cik=settings.sec_edgar_comcast_cik)
    cbs_ingester = ComcastBusinessSiteIngester(base_url=settings.comcast_business_base_url)

    total_sources = 0
    total_chunks = 0

    # Ingest SEC EDGAR
    print("\n[1/2] Ingesting SEC EDGAR filings...")
    async for source in sec_ingester.fetch_sources():
        print(f"  - Source: {source.title}")
        vector_store.register_source(source)
        total_sources += 1

        chunks = []
        async for chunk in sec_ingester.fetch_chunks(source):
            chunks.append(chunk)

        if chunks:
            vector_store.add_chunks(chunks)
            print(f"    Added {len(chunks)} chunks")
            total_chunks += len(chunks)

    # Ingest Comcast Business site
    print("\n[2/2] Ingesting Comcast Business enterprise solution pages...")
    async for source in cbs_ingester.fetch_sources():
        print(f"  - Source: {source.title}")
        vector_store.register_source(source)
        total_sources += 1

        chunks = []
        async for chunk in cbs_ingester.fetch_chunks(source):
            chunks.append(chunk)

        if chunks:
            vector_store.add_chunks(chunks)
            print(f"    Added {len(chunks)} chunks")
            total_chunks += len(chunks)

    # Persist
    vector_store.persist()

    print("\n" + "=" * 60)
    print(f"Ingestion complete!")
    print(f"  Sources: {total_sources}")
    print(f"  Chunks:  {total_chunks}")
    print(f"  Stored:  {settings.chroma_persist_dir}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

