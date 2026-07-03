from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func

from app.core.auth import get_user_email
from app.core.database_session import AsyncSessionLocal
from app.models.db_models import RepoEmbedding
from app.queue.tasks import process_github_repo_task
from app.repositories.vectors import search_repo_embeddings
from app.services.embedding import generate_embeddings_openai, generate_embeddings_hf
import os
import logging

logger = logging.getLogger("anuvaad")
router = APIRouter(prefix="/repo", tags=["repo-search"])

class IndexRepoPayload(BaseModel):
    repo_name: str = Field(..., description="Format: owner/repo")

class SearchRepoPayload(BaseModel):
    repo_name: str
    query: str
    top_k: int = 5

@router.post("/index")
async def index_repo(payload: IndexRepoPayload, user_email: str = Depends(get_user_email)):
    """Trigger background indexing of a GitHub repository."""
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Enqueue background task
    process_github_repo_task.delay(payload.repo_name)
    return {"message": f"Started indexing {payload.repo_name}", "status": "accepted"}

@router.get("/{owner}/{repo}/status")
async def repo_status(owner: str, repo: str, user_email: str = Depends(get_user_email)):
    """Get indexing status for a repository."""
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    repo_name = f"{owner}/{repo}"
    
    async with AsyncSessionLocal() as session:
        stmt = select(func.count(RepoEmbedding.id)).where(RepoEmbedding.repository_name == repo_name)
        result = await session.execute(stmt)
        count = result.scalar() or 0
        
    return {"repo_name": repo_name, "indexed_chunks": count}

@router.post("/search")
async def search_repo(payload: SearchRepoPayload, user_email: str = Depends(get_user_email)):
    """Search an indexed repository."""
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    # Generate query embedding
    openai_key = os.environ.get("OPENAI_API_KEY")
    try:
        if openai_key:
            embeddings = await generate_embeddings_openai([payload.query])
        else:
            embeddings = await generate_embeddings_hf([payload.query])
            
        if not embeddings or not embeddings[0]:
            raise ValueError("Failed to generate embeddings")
            
        query_embedding = embeddings[0]
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")
        
    # Search DB
    async with AsyncSessionLocal() as session:
        results = await search_repo_embeddings(session, payload.repo_name, query_embedding, payload.top_k)
        
    return {
        "repo_name": payload.repo_name,
        "query": payload.query,
        "results": [
            {
                "file_path": r.file_path,
                "content": r.content,
                "similarity": r.similarity
            } for r in results
        ]
    }
