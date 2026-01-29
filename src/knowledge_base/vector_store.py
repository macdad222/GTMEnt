"""Vector store for knowledge base using ChromaDB."""

from typing import List, Optional
from datetime import datetime

import chromadb
from chromadb.config import Settings as ChromaSettings

from .models import Source, SourceChunk, Citation


class KnowledgeBaseVectorStore:
    """ChromaDB-backed vector store for public source chunks."""

    COLLECTION_NAME = "gtm_knowledge_base"

    def __init__(self, persist_dir: str = "./data/chroma"):
        self.client = chromadb.Client(
            ChromaSettings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=persist_dir,
                anonymized_telemetry=False,
            )
        )
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"description": "Comcast Business GTM public source knowledge base"},
        )
        self._source_registry: dict[str, Source] = {}

    def register_source(self, source: Source) -> None:
        """Register a source in the local registry (for citation lookups)."""
        self._source_registry[source.id] = source

    def add_chunks(self, chunks: List[SourceChunk]) -> None:
        """Add chunks to the vector store."""
        if not chunks:
            return

        self.collection.add(
            ids=[c.id for c in chunks],
            documents=[c.content for c in chunks],
            metadatas=[
                {
                    "source_id": c.source_id,
                    "chunk_index": c.chunk_index,
                    "section": c.section or "",
                    **{k: str(v) for k, v in c.metadata.items()},
                }
                for c in chunks
            ],
        )

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        source_type: Optional[str] = None,
    ) -> List[tuple[SourceChunk, float]]:
        """Query the knowledge base and return ranked chunks with scores."""
        where_filter = None
        if source_type:
            where_filter = {"source_type": source_type}

        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        chunks_with_scores: List[tuple[SourceChunk, float]] = []
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            content = results["documents"][0][i]
            distance = results["distances"][0][i] if results.get("distances") else 0.0

            chunk = SourceChunk(
                id=doc_id,
                source_id=meta.get("source_id", ""),
                chunk_index=int(meta.get("chunk_index", 0)),
                content=content,
                section=meta.get("section"),
                metadata={k: v for k, v in meta.items() if k not in ("source_id", "chunk_index", "section")},
            )
            chunks_with_scores.append((chunk, distance))

        return chunks_with_scores

    def create_citation(self, chunk: SourceChunk, excerpt_length: int = 150) -> Citation:
        """Create a Citation object for a retrieved chunk."""
        source = self._source_registry.get(chunk.source_id)
        if not source:
            # Fallback if source not in registry
            return Citation(
                source_id=chunk.source_id,
                source_title="Unknown Source",
                source_url="",
                chunk_id=chunk.id,
                section=chunk.section,
                retrieved_at=datetime.utcnow(),
                excerpt=chunk.content[:excerpt_length] + "..." if len(chunk.content) > excerpt_length else chunk.content,
            )

        return Citation(
            source_id=source.id,
            source_title=source.title,
            source_url=source.url,
            chunk_id=chunk.id,
            section=chunk.section,
            retrieved_at=datetime.utcnow(),
            excerpt=chunk.content[:excerpt_length] + "..." if len(chunk.content) > excerpt_length else chunk.content,
        )

    def persist(self) -> None:
        """Persist the vector store to disk."""
        self.client.persist()

