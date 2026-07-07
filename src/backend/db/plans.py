"""
CRUD operations for the `plans` and `plan_requirements` tables.

Plans schema
------------
plans(plan_id, name, goal, estimated_time, status, created_at, updated_at)

Requirements schema
-------------------
plan_requirements(requirement_id, plan_id, name, status, position)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from db.connection import get_conn


# ─── Models ───────────────────────────────────────────────────────────────────

@dataclass
class PlanRequirement:
    requirement_id: int
    plan_id: int
    name: str
    status: str     # 'new' | 'in_progress' | 'done' | 'cancel'
    position: int


@dataclass
class Plan:
    plan_id: int
    name: str
    goal: str
    estimated_time: str
    status: str     # 'draft' | 'active' | 'done' | 'cancel'
    created_at: datetime
    updated_at: datetime
    requirements: list[PlanRequirement] = field(default_factory=list)


def _row_to_requirement(row: dict) -> PlanRequirement:
    return PlanRequirement(**row)


def _row_to_plan(row: dict) -> Plan:
    data = dict(row)
    data.setdefault("requirements", [])
    return Plan(**data)


# ─── Plans ────────────────────────────────────────────────────────────────────

def get_all(include_requirements: bool = False) -> list[Plan]:
    """Return all plans. Optionally eager-load requirements."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM plans ORDER BY created_at DESC")
            plans = [_row_to_plan(r) for r in cur.fetchall()]

        if include_requirements and plans:
            plan_ids = [p.plan_id for p in plans]
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM plan_requirements WHERE plan_id = ANY(%s) ORDER BY position",
                    (plan_ids,),
                )
            reqs_by_plan: dict[int, list[PlanRequirement]] = {}
            for r in cur.fetchall():
                req = _row_to_requirement(r)
                reqs_by_plan.setdefault(req.plan_id, []).append(req)
            for plan in plans:
                plan.requirements = reqs_by_plan.get(plan.plan_id, [])

        return plans


def get_by_id(plan_id: int, include_requirements: bool = True) -> Optional[Plan]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM plans WHERE plan_id = %s", (plan_id,))
            row = cur.fetchone()
            if not row:
                return None
            plan = _row_to_plan(row)

        if include_requirements:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM plan_requirements WHERE plan_id = %s ORDER BY position",
                    (plan_id,),
                )
                plan.requirements = [_row_to_requirement(r) for r in cur.fetchall()]

        return plan


def create(
    *,
    name: str,
    goal: str = "",
    estimated_time: str = "",
    status: str = "draft",
) -> Plan:
    """Insert a new plan and return it (without requirements)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO plans (name, goal, estimated_time, status)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (name, goal, estimated_time, status),
            )
            return _row_to_plan(cur.fetchone())


def update(plan_id: int, **fields) -> Optional[Plan]:
    """Partially update a plan. Bumps updated_at."""
    allowed = {"name", "goal", "estimated_time", "status"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(plan_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [plan_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE plans SET {set_clause} WHERE plan_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_plan(row) if row else None


def delete(plan_id: int) -> bool:
    """Delete a plan (cascades to requirements). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM plans WHERE plan_id = %s RETURNING plan_id",
                (plan_id,),
            )
            return cur.fetchone() is not None


# ─── Plan Requirements ────────────────────────────────────────────────────────

def get_requirements(plan_id: int) -> list[PlanRequirement]:
    """Return all requirements for a plan ordered by position."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM plan_requirements WHERE plan_id = %s ORDER BY position",
                (plan_id,),
            )
            return [_row_to_requirement(r) for r in cur.fetchall()]


def _next_req_position(plan_id: int, conn) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM plan_requirements WHERE plan_id = %s",
            (plan_id,),
        )
        return cur.fetchone()["coalesce"]


def add_requirement(
    *,
    plan_id: int,
    name: str,
    status: str = "new",
    position: Optional[int] = None,
) -> PlanRequirement:
    """Add a requirement to a plan. Position is auto-assigned if omitted."""
    with get_conn() as conn:
        pos = position if position is not None else _next_req_position(plan_id, conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO plan_requirements (plan_id, name, status, position)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (plan_id, name, status, pos),
            )
            return _row_to_requirement(cur.fetchone())


def update_requirement(requirement_id: int, **fields) -> Optional[PlanRequirement]:
    """Update name, status, or position of a requirement."""
    allowed = {"name", "status", "position"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM plan_requirements WHERE requirement_id = %s",
                    (requirement_id,),
                )
                row = cur.fetchone()
                return _row_to_requirement(row) if row else None

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values = list(updates.values()) + [requirement_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE plan_requirements SET {set_clause} WHERE requirement_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_requirement(row) if row else None


def delete_requirement(requirement_id: int) -> bool:
    """Delete a requirement. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM plan_requirements WHERE requirement_id = %s RETURNING requirement_id",
                (requirement_id,),
            )
            return cur.fetchone() is not None
