"""
app/db/repositories/embedding_repo.py

Compatibility module re-exporting vector embedding repository functionality from app.repositories.vectors.
"""

from app.repositories.vectors import insert_repo_embeddings, search_repo_embeddings

__all__ = ["insert_repo_embeddings", "search_repo_embeddings"]
