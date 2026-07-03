from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import os  # noqa: E402
import sys  # noqa: E402
from dotenv import load_dotenv  # noqa: E402

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))
load_dotenv()

from app.models.db_models import Base  # noqa: E402
from app.core.config import DATABASE_URL  # noqa: E402

target_metadata = Base.metadata


def get_url() -> str:
    """FIX-02 (P0-02): Derive a sync SQLAlchemy URL from DATABASE_URL.

    Raises RuntimeError clearly when DATABASE_URL is not set so Alembic fails
    fast with a useful message instead of silently targeting SQLite.
    """
    url = DATABASE_URL
    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Alembic cannot run migrations without a target database. "
            "Set it to your PostgreSQL connection string and retry.\n"
            "Example: DATABASE_URL=postgresql://user:pass@host:5432/dbname alembic upgrade head"
        )
    # asyncpg driver is not supported in Alembic's synchronous engine — use psycopg2 dialect
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgres://", "postgresql://", 1)
    # Escape % for ConfigParser interpolation (e.g. URL-encoded passwords)
    return url.replace("%", "%%")


config.set_main_option("sqlalchemy.url", get_url())

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
