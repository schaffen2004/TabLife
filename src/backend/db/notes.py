"""
CRUD operations for the `notes` table.

Notes schema
------------
notes(note_id, title, content, pinned, created_at, updated_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import get_conn


@dataclass
class Note:
    note_id: int
    title: str
    content: str
    pinned: bool
    created_at: datetime
    updated_at: datetime


def _row_to_note(row: dict) -> Note:
    return Note(**row)


def get_all() -> list[Note]:
    """Return notes with pinned items first, then newest updates."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM notes
                ORDER BY pinned DESC, updated_at DESC, note_id DESC
                """
            )
            return [_row_to_note(r) for r in cur.fetchall()]


def get_by_id(note_id: int) -> Optional[Note]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM notes WHERE note_id = %s", (note_id,))
            row = cur.fetchone()
            return _row_to_note(row) if row else None


def create(*, title: str, content: str = "", pinned: bool = False) -> Note:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO notes (title, content, pinned)
                VALUES (%s, %s, %s)
                RETURNING *
                """,
                (title, content, pinned),
            )
            return _row_to_note(cur.fetchone())


def update(note_id: int, **fields) -> Optional[Note]:
    allowed = {"title", "content", "pinned"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(note_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [note_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE notes SET {set_clause} WHERE note_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_note(row) if row else None


def delete(note_id: int) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM notes WHERE note_id = %s RETURNING note_id",
                (note_id,),
            )
            return cur.fetchone() is not None
