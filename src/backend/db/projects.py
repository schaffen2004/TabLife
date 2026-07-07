"""
CRUD operations for the `projects` table.

Schema
------
projects(project_id, name, description, goal, status, start_at, end_at,
         progress, created_at, updated_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import get_conn


# ─── Model ────────────────────────────────────────────────────────────────────

@dataclass
class Project:
    project_id: int
    name: str
    description: str
    goal: str
    status: str          # 'new' | 'in_progress' | 'done' | 'cancel'
    start_at: date
    end_at: date
    progress: int
    created_at: datetime
    updated_at: datetime


def _row_to_project(row: dict) -> Project:
    return Project(**row)


# ─── Queries ──────────────────────────────────────────────────────────────────

def get_all() -> list[Project]:
    """Return all projects ordered by creation date (newest first)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM projects ORDER BY created_at DESC"
            )
            return [_row_to_project(r) for r in cur.fetchall()]


def get_by_id(project_id: int) -> Optional[Project]:
    """Return a single project or None if not found."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM projects WHERE project_id = %s",
                (project_id,),
            )
            row = cur.fetchone()
            return _row_to_project(row) if row else None


def get_by_status(status: str) -> list[Project]:
    """Return projects filtered by status."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM projects WHERE status = %s ORDER BY created_at DESC",
                (status,),
            )
            return [_row_to_project(r) for r in cur.fetchall()]


def create(
    *,
    name: str,
    start_at: date,
    end_at: date,
    description: str = "",
    goal: str = "",
    status: str = "new",
    progress: int = 0,
) -> Project:
    """Insert a new project and return the created row."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO projects (name, description, goal, status, start_at, end_at, progress)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (name, description, goal, status, start_at, end_at, progress),
            )
            return _row_to_project(cur.fetchone())


def update(project_id: int, **fields) -> Optional[Project]:
    """
    Partially update a project. Pass only the columns you want to change.
    Always bumps `updated_at` to NOW().

    Example::

        update(1, name="New name", progress=80)
    """
    allowed = {"name", "description", "goal", "status", "start_at", "end_at", "progress"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(project_id)

    updates["updated_at"] = "NOW()"
    set_clause = ", ".join(
        f"{col} = NOW()" if val == "NOW()" else f"{col} = %s"
        for col, val in updates.items()
    )
    values = [v for v in updates.values() if v != "NOW()"]
    values.append(project_id)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE projects SET {set_clause} WHERE project_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_project(row) if row else None


def delete(project_id: int) -> bool:
    """Delete a project (cascades to stages and tasks). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM projects WHERE project_id = %s RETURNING project_id",
                (project_id,),
            )
            return cur.fetchone() is not None
