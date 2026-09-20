"""Add performance and foreign key indexes on high-traffic tables.

Revision ID: 010_add_performance_and_fk_indexes
Revises: 009_phase_2a
Create Date: 2026-08-15 12:00:00.000000

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "010_add_performance_and_fk_indexes"
down_revision = "009_phase_2a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_user_subscriptions_razorpay_sub", "user_subscriptions", ["razorpay_subscription_id"])
    op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])
    op.create_index("ix_api_keys_user_email", "api_keys", ["user_email"])
    op.create_index("ix_desired_index_states_source_state", "desired_index_states", ["source_state_id"])
    op.create_index("ix_desired_index_states_index_config", "desired_index_states", ["index_configuration_id"])


def downgrade() -> None:
    op.drop_index("ix_desired_index_states_index_config", table_name="desired_index_states")
    op.drop_index("ix_desired_index_states_source_state", table_name="desired_index_states")
    op.drop_index("ix_api_keys_user_email", table_name="api_keys")
    op.drop_index("ix_api_keys_key_prefix", table_name="api_keys")
    op.drop_index("ix_user_subscriptions_razorpay_sub", table_name="user_subscriptions")
