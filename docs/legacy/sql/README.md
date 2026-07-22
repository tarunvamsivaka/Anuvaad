# Legacy SQL Scripts Archive

The raw `.sql` files in this directory are historical database scripts used prior to the adoption of Alembic schema migrations.

## Active Migration System
All database schema versioning, indexes, PGVector embeddings, and tenant-scoped tables are now managed by Alembic in [`alembic/versions/`](file:///c:/Users/tarun/Anuvaad/Anuvaad/alembic/versions).

Do not execute these scripts directly on production database instances. Use `alembic upgrade head` instead.
