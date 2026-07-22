import datetime

from sqlalchemy import delete, select

from app.core.database_session import AsyncSessionLocal
from app.core.token_encryption import decrypt_token, encrypt_token, is_encrypted
from app.models.db_models import UserGithubToken

UTC = datetime.UTC

async def save_github_token(email: str, access_token: str) -> bool:
    """Upsert a GitHub OAuth token for a user, Fernet-encrypted.

    FIX-E (DB-01): Encrypts the token before storage.
    The UserGithubToken model has no installation_id column — removed from signature.
    """
    encrypted = encrypt_token(access_token)
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(UserGithubToken).where(UserGithubToken.user_email == email)
            )
            existing = result.scalars().first()
            if existing:
                existing.access_token = encrypted
                existing.updated_at = datetime.datetime.now(UTC)
            else:
                new_token = UserGithubToken(
                    user_email=email,
                    access_token=encrypted,
                    updated_at=datetime.datetime.now(UTC),
                )
                session.add(new_token)
            await session.commit()
            return True
        except Exception:
            await session.rollback()
            return False

async def get_github_token(email: str) -> str | None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(UserGithubToken).where(UserGithubToken.user_email == email)
        )
        row = result.scalars().first()

    if not row or not row.access_token:
        return None

    token = row.access_token
    if is_encrypted(token):
        try:
            token = decrypt_token(token)
        except Exception:
            return None
    return token

async def delete_github_token(email: str) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                delete(UserGithubToken).where(UserGithubToken.user_email == email)
            )
            await session.commit()
            return True
        except Exception:
            await session.rollback()
            return False
