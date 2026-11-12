"""Encrypt legacy translation history and remove its plaintext payload.

Run only after the current Alembic head (including ``017_privacy_history``) has
been applied and
``HISTORY_ENCRYPTION_KEYS`` is configured. The job is restartable: rows are
selected only while ``blocks`` is present and ``encrypted_blocks`` is absent.
It deliberately never prints row identifiers, user identifiers, or code.
"""

from __future__ import annotations

import argparse
import asyncio
import logging

from sqlalchemy import select

from app.core.database_session import AsyncSessionLocal
from app.core.history_encryption import encrypt_blocks
from app.models.db_models import TranslationHistory

logger = logging.getLogger("anuvaad.history_backfill")


async def backfill(*, batch_size: int, max_batches: int | None, dry_run: bool) -> tuple[int, int]:
    """Encrypt eligible rows atomically, returning ``(migrated, skipped)``."""
    migrated = 0
    skipped = 0
    batches = 0
    last_seen_id = None

    while max_batches is None or batches < max_batches:
        async with AsyncSessionLocal() as session:
            query = (
                select(TranslationHistory)
                .where(TranslationHistory.blocks.is_not(None))
                .where(TranslationHistory.encrypted_blocks.is_(None))
                .order_by(TranslationHistory.id)
                .limit(batch_size)
                .with_for_update(skip_locked=True)
            )
            if last_seen_id is not None:
                query = query.where(TranslationHistory.id > last_seen_id)
            rows = (await session.execute(query)).scalars().all()
            if not rows:
                break

            for row in rows:
                if not isinstance(row.blocks, list):
                    # Preserve malformed legacy data for manual recovery.
                    skipped += 1
                    continue
                if not dry_run:
                    row.encrypted_blocks = encrypt_blocks(row.blocks)
                    row.history_key_version = 1
                    row.blocks = None
                migrated += 1

            if dry_run:
                await session.rollback()
            else:
                await session.commit()
            batches += 1
            # Advance even across malformed rows, which remain untouched for
            # manual recovery. On a restarted run, already-encrypted rows are
            # excluded and remaining malformed rows are skipped once.
            last_seen_id = rows[-1].id

    return migrated, skipped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Encrypt legacy Anuvaad translation history")
    parser.add_argument("--batch-size", type=int, default=100, help="Rows to lock and process per transaction")
    parser.add_argument("--max-batches", type=int, default=None, help="Stop after this many batches")
    parser.add_argument("--dry-run", action="store_true", help="Count eligible rows without changing data")
    args = parser.parse_args()
    if args.batch_size < 1 or args.batch_size > 1_000:
        parser.error("--batch-size must be between 1 and 1000")
    if args.max_batches is not None and args.max_batches < 1:
        parser.error("--max-batches must be positive")
    return args


async def main() -> int:
    args = parse_args()
    migrated, skipped = await backfill(
        batch_size=args.batch_size,
        max_batches=args.max_batches,
        dry_run=args.dry_run,
    )
    result_label = "eligible" if args.dry_run else "migrated"
    logger.info(
        "History encryption backfill complete: %s=%s skipped=%s dry_run=%s",
        result_label,
        migrated,
        skipped,
        args.dry_run,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
