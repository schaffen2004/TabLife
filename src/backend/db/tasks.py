"""
CRUD operations for tasks and their child records.

Tables
------
- tasks(task_id, goal, expected_result, actual_result, status, priority,
        start_at, deadline, project_id, project_stage_id, created_at, updated_at)
- task_steps(step_id, task_id, step_name, position, status, created_at, updated_at)
- task_links(link_id, task_id, url, title, created_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import get_conn


# ══════════════════════════════════════════════════════════════════════════════
# Models
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class Task:
    task_id: int
    goal: str
    expected_result: str
    actual_result: Optional[str]
    status: str             # 'new' | 'in_progress' | 'done' | 'cancel'
    priority: str           # 'low' | 'medium' | 'high'
    start_at: date
    deadline: date
    project_id: int
    project_stage_id: Optional[int]
    created_at: datetime
    updated_at: datetime


@dataclass
class TaskStep:
    step_id: int
    task_id: int
    step_name: str
    position: int
    status: str             # 'new' | 'in_progress' | 'done' | 'cancel'
    created_at: datetime
    updated_at: datetime


@dataclass
class TaskLink:
    link_id: int
    task_id: int
    url: str
    title: Optional[str]
    created_at: datetime


def _row_to_task(row: dict) -> Task:
    return Task(**row)

def _row_to_step(row: dict) -> TaskStep:
    return TaskStep(**row)

def _row_to_link(row: dict) -> TaskLink:
    return TaskLink(**row)


def recalculate_work_progress(project_id: int, stage_ids: Optional[list[int]] = None) -> None:
    """Recompute project/stage progress from done tasks."""
    stage_ids = [stage_id for stage_id in (stage_ids or []) if stage_id is not None]
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE projects
                SET
                    progress = COALESCE((
                        SELECT ROUND(
                            100.0 * COUNT(*) FILTER (WHERE status = 'done')
                            / NULLIF(COUNT(*), 0)
                        )::int
                        FROM tasks
                        WHERE project_id = %s
                    ), 0),
                    updated_at = NOW()
                WHERE project_id = %s
                """,
                (project_id, project_id),
            )

            if stage_ids:
                cur.execute(
                    """
                    UPDATE project_stages stage
                    SET
                        progress = COALESCE((
                            SELECT ROUND(
                                100.0 * COUNT(*) FILTER (WHERE task.status = 'done')
                                / NULLIF(COUNT(*), 0)
                            )::int
                            FROM tasks task
                            WHERE task.project_stage_id = stage.stage_id
                        ), 0),
                        updated_at = NOW()
                    WHERE stage.project_id = %s
                      AND stage.stage_id = ANY(%s)
                    """,
                    (project_id, stage_ids),
                )


# ══════════════════════════════════════════════════════════════════════════════
# Tasks
# ══════════════════════════════════════════════════════════════════════════════

def get_all() -> list[Task]:
    """Return all tasks ordered by deadline ascending."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM tasks ORDER BY deadline")
            return [_row_to_task(r) for r in cur.fetchall()]


def get_by_id(task_id: int) -> Optional[Task]:
    """Return a single task or None."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
            row = cur.fetchone()
            return _row_to_task(row) if row else None


def get_by_project(project_id: int) -> list[Task]:
    """Return all tasks belonging to a project, ordered by deadline."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM tasks WHERE project_id = %s ORDER BY deadline",
                (project_id,),
            )
            return [_row_to_task(r) for r in cur.fetchall()]


def get_by_stage(project_id: int, stage_id: int) -> list[Task]:
    """Return tasks in a specific stage."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM tasks
                WHERE project_id = %s AND project_stage_id = %s
                ORDER BY deadline
                """,
                (project_id, stage_id),
            )
            return [_row_to_task(r) for r in cur.fetchall()]


def get_by_status(status: str) -> list[Task]:
    """Return tasks filtered by status."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM tasks WHERE status = %s ORDER BY deadline",
                (status,),
            )
            return [_row_to_task(r) for r in cur.fetchall()]


def get_by_deadline_range(date_from: date, date_to: date) -> list[Task]:
    """Return tasks whose deadline falls within [date_from, date_to]."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM tasks WHERE deadline BETWEEN %s AND %s ORDER BY deadline",
                (date_from, date_to),
            )
            return [_row_to_task(r) for r in cur.fetchall()]


def create(
    *,
    goal: str,
    project_id: int,
    start_at: date,
    deadline: date,
    expected_result: str = "",
    status: str = "new",
    priority: str = "medium",
    project_stage_id: Optional[int] = None,
) -> Task:
    """Insert a new task and return the created row."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tasks
                    (goal, expected_result, status, priority,
                     start_at, deadline, project_id, project_stage_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (goal, expected_result, status, priority,
                 start_at, deadline, project_id, project_stage_id),
            )
            return _row_to_task(cur.fetchone())


def update(task_id: int, **fields) -> Optional[Task]:
    """
    Partially update a task. Bumps updated_at automatically.

    Updatable fields: goal, expected_result, actual_result, status,
                      priority, start_at, deadline, project_stage_id
    """
    allowed = {
        "goal", "expected_result", "actual_result",
        "status", "priority", "start_at", "deadline", "project_stage_id",
    }
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(task_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [task_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE tasks SET {set_clause} WHERE task_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_task(row) if row else None


def delete(task_id: int) -> bool:
    """Delete a task (cascades to steps and links). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM tasks WHERE task_id = %s RETURNING task_id",
                (task_id,),
            )
            return cur.fetchone() is not None


# ══════════════════════════════════════════════════════════════════════════════
# Task Steps
# ══════════════════════════════════════════════════════════════════════════════

def get_steps(task_id: int) -> list[TaskStep]:
    """Return all steps for a task ordered by position."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM task_steps WHERE task_id = %s ORDER BY position",
                (task_id,),
            )
            return [_row_to_step(r) for r in cur.fetchall()]


def get_step_by_id(step_id: int) -> Optional[TaskStep]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM task_steps WHERE step_id = %s", (step_id,))
            row = cur.fetchone()
            return _row_to_step(row) if row else None


def create_step(*, task_id: int, step_name: str, position: int, status: str = "new") -> TaskStep:
    """Add a single step to a task."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO task_steps (task_id, step_name, position, status)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (task_id, step_name, position, status),
            )
            return _row_to_step(cur.fetchone())


def create_steps(task_id: int, step_names: list[str]) -> list[TaskStep]:
    """
    Bulk-insert steps for a task. Positions are assigned 1, 2, 3, …
    Returns all steps for the task in order.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            values = [(task_id, name, pos + 1) for pos, name in enumerate(step_names)]
            cur.executemany(
                "INSERT INTO task_steps (task_id, step_name, position) VALUES (%s, %s, %s)",
                values,
            )
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM task_steps WHERE task_id = %s ORDER BY position",
                (task_id,),
            )
            return [_row_to_step(r) for r in cur.fetchall()]


def update_step(step_id: int, **fields) -> Optional[TaskStep]:
    """Partially update a step (step_name, position, status). Bumps updated_at."""
    allowed = {"step_name", "position", "status"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_step_by_id(step_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [step_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE task_steps SET {set_clause} WHERE step_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_step(row) if row else None


def delete_step(step_id: int) -> bool:
    """Delete a single step. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM task_steps WHERE step_id = %s RETURNING step_id",
                (step_id,),
            )
            return cur.fetchone() is not None


def delete_steps(task_id: int) -> int:
    """Delete all steps for a task. Returns the number of rows deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM task_steps WHERE task_id = %s", (task_id,))
            return cur.rowcount


# ══════════════════════════════════════════════════════════════════════════════
# Task Links
# ══════════════════════════════════════════════════════════════════════════════

def get_links(task_id: int) -> list[TaskLink]:
    """Return all links for a task ordered by creation date."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM task_links WHERE task_id = %s ORDER BY created_at",
                (task_id,),
            )
            return [_row_to_link(r) for r in cur.fetchall()]


def create_link(*, task_id: int, url: str, title: Optional[str] = None) -> TaskLink:
    """Add a link to a task."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO task_links (task_id, url, title) VALUES (%s, %s, %s) RETURNING *",
                (task_id, url, title),
            )
            return _row_to_link(cur.fetchone())


def update_link(link_id: int, **fields) -> Optional[TaskLink]:
    """Update url and/or title of a link."""
    allowed = {"url", "title"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM task_links WHERE link_id = %s", (link_id,))
                row = cur.fetchone()
                return _row_to_link(row) if row else None

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values = list(updates.values()) + [link_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE task_links SET {set_clause} WHERE link_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_link(row) if row else None


def delete_link(link_id: int) -> bool:
    """Delete a link. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM task_links WHERE link_id = %s RETURNING link_id",
                (link_id,),
            )
            return cur.fetchone() is not None
