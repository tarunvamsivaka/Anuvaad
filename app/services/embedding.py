import os

import httpx
import structlog
from openai import AsyncOpenAI

logger = structlog.get_logger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

async def generate_embeddings_openai(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings using OpenAI text-embedding-3-small (1536 dim).
    """
    if not texts:
        return []

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY not set")
        return []

    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.embeddings.create(
            input=texts,
            model="text-embedding-3-small"
        )
        return [data.embedding for data in response.data]
    except Exception as e:
        logger.error(f"Failed to generate embeddings via OpenAI API: {e}")
        return []

async def generate_embeddings_hf(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings using Hugging Face inference API.
    Returns a list of vectors of dimension 384.
    """
    if not texts:
        return []

    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        logger.warning("HF_TOKEN not found, attempting to use unauthenticated HF inference API (may be heavily rate-limited).")

    headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                HF_API_URL,
                headers=headers,
                json={"inputs": texts, "options": {"wait_for_model": True}},
                timeout=30.0
            )
            response.raise_for_status()

            result = response.json()
            if isinstance(result, list):
                if len(result) > 0 and isinstance(result[0], float):
                    return [result]  # Single text case
                return result
            return []
    except Exception as e:
        logger.error(f"Failed to generate embeddings via HF API: {e}")
        # Return dummy embeddings so the pipeline doesn't completely crash for free users
        return [[0.0] * 384 for _ in texts]

def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
    """
    Simple sliding window character-based chunking.
    """
    if not text:
        return []

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks
