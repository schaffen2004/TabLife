"""
CRUD operations for the `routines` and `routine_checkins` tables.

Routines schema
---------------
routines(routine_id, name, note, streak, created_at, updated_at)

Checkins schema
---------------
routine_checkins(checkin_id, routine_id, completed_on, created_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import get_conn


# ─── Models ───────────────────────────────────────────────────────────────────

@dataclass
class Routine:
    routine_id: int
    name: str
    note: Optional[str]
    streak: int
    created_at: datetime
    updated_at: datetime


@dataclass
class RoutineCheckin:
    checkin_id: int
    routine_id: int
    completed_on: date
    created_at: datetime


def _row_to_routine(row: dict) -> Routine:
    return Routine(**row)


def _row_to_checkin(row: dict) -> RoutineCheckin:
    return RoutineCheckin(**row)


# ─── Routines ─────────────────────────────────────────────────────────────────

def get_all() -> list[Routine]:
    """Return all routines ordered by name."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM routines ORDER BY name")
            return [_row_to_routine(r) for r in cur.fetchall()]


def get_by_id(routine_id: int) -> Optional[Routine]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM routines WHERE routine_id = %s", (routine_id,))
            row = cur.fetchone()
            return _row_to_routine(row) if row else None


def create(*, name: str, note: Optional[str] = None) -> Routine:
    """Create a new routine with streak = 0."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO routines (name, note) VALUES (%s, %s) RETURNING *",
                (name, note),
            )
            return _row_to_routine(cur.fetchone())


def update(routine_id: int, **fields) -> Optional[Routine]:
    """Partially update a routine (name, note, streak)."""
    allowed = {"name", "note", "streak"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(routine_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [routine_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE routines SET {set_clause} WHERE routine_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_routine(row) if row else None


def increment_streak(routine_id: int) -> Optional[Routine]:
    """Increment the streak counter by 1."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE routines
                SET streak = streak + 1, updated_at = NOW()
                WHERE routine_id = %s
                RETURNING *
                """,
                (routine_id,),
            )
            row = cur.fetchone()
            return _row_to_routine(row) if row else None


def reset_streak(routine_id: int) -> Optional[Routine]:
    """Reset streak to 0 (e.g., when user misses a day)."""
    return update(routine_id, streak=0)


def delete(routine_id: int) -> bool:
    """Delete a routine (cascades to checkins). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM routines WHERE routine_id = %s RETURNING routine_id",
                (routine_id,),
            )
            return cur.fetchone() is not None


# ─── Checkins ─────────────────────────────────────────────────────────────────

def get_checkins(routine_id: int, limit: int = 30) -> list[RoutineCheckin]:
    """Return the most recent checkins for a routine."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM routine_checkins
                WHERE routine_id = %s
                ORDER BY completed_on DESC
                LIMIT %s
                """,
                (routine_id, limit),
            )
            return [_row_to_checkin(r) for r in cur.fetchall()]


def get_checkins_in_range(routine_id: int, date_from: date, date_to: date) -> list[RoutineCheckin]:
    """Return checkins within a date range."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM routine_checkins
                WHERE routine_id = %s AND completed_on BETWEEN %s AND %s
                ORDER BY completed_on
                """,
                (routine_id, date_from, date_to),
            )
            return [_row_to_checkin(r) for r in cur.fetchall()]


def checkin_today(routine_id: int, on_date: Optional[date] = None) -> RoutineCheckin:
    """
    Mark a routine as done for today (or the given date).
    Ignored if already checked-in (ON CONFLICT DO NOTHING).
    Also increments the streak counter.
    """
    target_date = on_date or date.today()

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO routine_checkins (routine_id, completed_on)
                VALUES (%s, %s)
                ON CONFLICT (routine_id, completed_on) DO NOTHING
                RETURNING *
                """,
                (routine_id, target_date),
            )
            row = cur.fetchone()

        if row:
            # New check-in: bump the streak
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE routines SET streak = streak + 1, updated_at = NOW() WHERE routine_id = %s",
                    (routine_id,),
                )
            return _row_to_checkin(row)

        # Already checked-in today: return existing row
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM routine_checkins WHERE routine_id = %s AND completed_on = %s",
                (routine_id, target_date),
            )
            return _row_to_checkin(cur.fetchone())


def undo_checkin(routine_id: int, on_date: Optional[date] = None) -> bool:
    """
    Remove a check-in record and decrement the streak.
    Returns True if a record was deleted.
    """
    target_date = on_date or date.today()

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM routine_checkins WHERE routine_id = %s AND completed_on = %s RETURNING checkin_id",
                (routine_id, target_date),
            )
            deleted = cur.fetchone() is not None

        if deleted:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE routines SET streak = GREATEST(streak - 1, 0), updated_at = NOW() WHERE routine_id = %s",
                    (routine_id,),
                )

        return deleted
