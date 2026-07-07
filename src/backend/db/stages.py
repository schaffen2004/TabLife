"""
CRUD operations for the `project_stages` table.

Schema
------
project_stages(stage_id, project_id, name, goal, status, progress,
               created_at, updated_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import get_conn


# ─── Model ────────────────────────────────────────────────────────────────────

@dataclass
class Stage:
    stage_id: int
    project_id: int
    name: str
    goal: str
    status: str     # 'new' | 'in_progress' | 'done' | 'cancel'
    progress: int
    created_at: datetime
    updated_at: datetime


def _row_to_stage(row: dict) -> Stage:
    return Stage(**row)


# ─── Queries ──────────────────────────────────────────────────────────────────

def get_by_project(project_id: int) -> list[Stage]:
    """Return all stages for a project, ordered by creation date."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM project_stages WHERE project_id = %s ORDER BY created_at",
                (project_id,),
            )
            return [_row_to_stage(r) for r in cur.fetchall()]


def get_by_id(stage_id: int) -> Optional[Stage]:
    """Return a single stage or None."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM project_stages WHERE stage_id = %s",
                (stage_id,),
            )
            row = cur.fetchone()
            return _row_to_stage(row) if row else None


def create(
    *,
    project_id: int,
    name: str,
    goal: str = "",
    status: str = "new",
    progress: int = 0,
) -> Stage:
    """Add a new stage to a project."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO project_stages (project_id, name, goal, status, progress)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (project_id, name, goal, status, progress),
            )
            return _row_to_stage(cur.fetchone())


def update(stage_id: int, **fields) -> Optional[Stage]:
    """Partially update a stage. Bumps updated_at automatically."""
    allowed = {"name", "goal", "status", "progress"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(stage_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [stage_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE project_stages SET {set_clause} WHERE stage_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_stage(row) if row else None


def delete(stage_id: int) -> bool:
    """Delete a stage (tasks in this stage have stage_id set to NULL). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM project_stages WHERE stage_id = %s RETURNING stage_id",
                (stage_id,),
            )
            return cur.fetchone() is not None
