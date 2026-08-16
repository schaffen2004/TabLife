"""
CRUD operations for the `events` table.

Events schema
-------------
events(event_id, name, description, location, event_date, start_time, end_time,
       status, created_at, updated_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Optional

from db.connection import get_conn


# ─── Models ───────────────────────────────────────────────────────────────────

@dataclass
class Event:
    event_id: int
    name: str
    description: str
    location: Optional[str]
    event_date: date
    start_time: time
    end_time: Optional[time]
    status: str     # 'upcoming' | 'done' | 'cancel'
    created_at: datetime
    updated_at: datetime


def _blank_to_none(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _row_to_event(row: dict) -> Event:
    return Event(**row)


# ─── Queries ──────────────────────────────────────────────────────────────────

def get_all(
    *,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[str] = None,
) -> list[Event]:
    """Return events ordered by date and start time, optionally filtered."""
    clauses: list[str] = []
    params: list[object] = []

    if date_from is not None:
        clauses.append("event_date >= %s")
        params.append(date_from)
    if date_to is not None:
        clauses.append("event_date <= %s")
        params.append(date_to)
    if status is not None:
        clauses.append("status = %s")
        params.append(status)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT * FROM events
                {where}
                ORDER BY event_date, start_time, event_id
                """,
                params,
            )
            return [_row_to_event(r) for r in cur.fetchall()]


def get_by_id(event_id: int) -> Optional[Event]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM events WHERE event_id = %s", (event_id,))
            row = cur.fetchone()
            return _row_to_event(row) if row else None


def create(
    *,
    name: str,
    event_date: date,
    start_time: time,
    description: str = "",
    location: Optional[str] = None,
    end_time: Optional[time] = None,
    status: str = "upcoming",
) -> Event:
    """Insert a new event and return it."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO events (name, description, location, event_date, start_time, end_time, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (name, description, _blank_to_none(location), event_date, start_time, end_time, status),
            )
            return _row_to_event(cur.fetchone())


def update(event_id: int, **fields) -> Optional[Event]:
    """Partially update an event. Bumps updated_at."""
    allowed = {"name", "description", "location", "event_date", "start_time", "end_time", "status"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if "location" in updates:
        updates["location"] = _blank_to_none(updates["location"])
    if not updates:
        return get_by_id(event_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [event_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE events SET {set_clause} WHERE event_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_event(row) if row else None


def delete(event_id: int) -> bool:
    """Delete an event. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM events WHERE event_id = %s RETURNING event_id",
                (event_id,),
            )
            return cur.fetchone() is not None
