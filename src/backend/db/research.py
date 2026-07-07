"""
CRUD operations for research topics and their child records.

Tables
------
- research_topics(topic_id, name, description, status, start_at, link,
                  created_at, updated_at)
- subtopics(subtopic_id, topic_id, name, description, note, status,
            start_at, position, created_at, updated_at)
- subtopic_links(link_id, subtopic_id, url, title, created_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import get_conn


# ─── Model ────────────────────────────────────────────────────────────────────

@dataclass
class ResearchTopic:
    topic_id: int
    name: str
    description: str
    status: str         # 'new' | 'in_progress' | 'done' | 'cancel'
    start_at: date
    link: Optional[str]
    created_at: datetime
    updated_at: datetime


@dataclass
class Subtopic:
    subtopic_id: int
    topic_id: int
    name: str
    description: str
    note: Optional[str]
    status: str     # 'new' | 'in_progress' | 'done' | 'cancel'
    start_at: date
    position: int
    created_at: datetime
    updated_at: datetime


@dataclass
class SubtopicLink:
    link_id: int
    subtopic_id: int
    url: str
    title: Optional[str]
    created_at: datetime


def _row_to_topic(row: dict) -> ResearchTopic:
    return ResearchTopic(**row)


def _row_to_subtopic(row: dict) -> Subtopic:
    return Subtopic(**row)


def _row_to_link(row: dict) -> SubtopicLink:
    return SubtopicLink(**row)


# ══════════════════════════════════════════════════════════════════════════════
# Research Topics
# ══════════════════════════════════════════════════════════════════════════════

def get_all() -> list[ResearchTopic]:
    """Return all research topics ordered by creation date (newest first)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM research_topics ORDER BY created_at DESC")
            return [_row_to_topic(r) for r in cur.fetchall()]


def get_by_id(topic_id: int) -> Optional[ResearchTopic]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM research_topics WHERE topic_id = %s", (topic_id,))
            row = cur.fetchone()
            return _row_to_topic(row) if row else None


def get_by_status(status: str) -> list[ResearchTopic]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM research_topics WHERE status = %s ORDER BY created_at DESC",
                (status,),
            )
            return [_row_to_topic(r) for r in cur.fetchall()]


def create(
    *,
    name: str,
    start_at: date,
    description: str = "",
    status: str = "new",
    link: Optional[str] = None,
) -> ResearchTopic:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO research_topics (name, description, status, start_at, link)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (name, description, status, start_at, link),
            )
            return _row_to_topic(cur.fetchone())


def update(topic_id: int, **fields) -> Optional[ResearchTopic]:
    """Partially update a topic. Bumps updated_at."""
    allowed = {"name", "description", "status", "start_at", "link"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_by_id(topic_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [topic_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE research_topics SET {set_clause} WHERE topic_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_topic(row) if row else None


def delete(topic_id: int) -> bool:
    """Delete a topic (cascades to subtopics). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM research_topics WHERE topic_id = %s RETURNING topic_id",
                (topic_id,),
            )
            return cur.fetchone() is not None


# ══════════════════════════════════════════════════════════════════════════════
# Subtopics
# ══════════════════════════════════════════════════════════════════════════════

def get_subtopics(topic_id: int) -> list[Subtopic]:
    """Return all subtopics for a topic ordered by position."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM subtopics WHERE topic_id = %s ORDER BY position",
                (topic_id,),
            )
            return [_row_to_subtopic(r) for r in cur.fetchall()]


def get_subtopic_by_id(subtopic_id: int) -> Optional[Subtopic]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM subtopics WHERE subtopic_id = %s", (subtopic_id,))
            row = cur.fetchone()
            return _row_to_subtopic(row) if row else None


def _next_subtopic_position(topic_id: int, conn) -> int:
    """Return the next available subtopic position for a topic."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM subtopics WHERE topic_id = %s",
            (topic_id,),
        )
        return cur.fetchone()["coalesce"]


def create_subtopic(
    *,
    topic_id: int,
    name: str,
    start_at: date,
    description: str = "",
    note: Optional[str] = None,
    status: str = "new",
    position: Optional[int] = None,
) -> Subtopic:
    """
    Add a subtopic. If `position` is omitted, it is appended at the end
    (MAX(position) + 1).
    """
    with get_conn() as conn:
        pos = position if position is not None else _next_subtopic_position(topic_id, conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO subtopics
                    (topic_id, name, description, note, status, start_at, position)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (topic_id, name, description, note, status, start_at, pos),
            )
            return _row_to_subtopic(cur.fetchone())


def update_subtopic(subtopic_id: int, **fields) -> Optional[Subtopic]:
    """Partially update a subtopic. Bumps updated_at."""
    allowed = {"name", "description", "note", "status", "start_at", "position"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_subtopic_by_id(subtopic_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [subtopic_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE subtopics SET {set_clause} WHERE subtopic_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_subtopic(row) if row else None


def reorder_subtopics(topic_id: int, ordered_ids: list[int]) -> list[Subtopic]:
    """
    Reorder subtopics by assigning new positions (1-based) in the order
    of `ordered_ids`. All IDs must belong to `topic_id`.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            for pos, subtopic_id in enumerate(ordered_ids, start=1):
                cur.execute(
                    """
                    UPDATE subtopics
                    SET position = %s, updated_at = NOW()
                    WHERE subtopic_id = %s AND topic_id = %s
                    """,
                    (pos, subtopic_id, topic_id),
                )
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM subtopics WHERE topic_id = %s ORDER BY position",
                (topic_id,),
            )
            return [_row_to_subtopic(r) for r in cur.fetchall()]


def delete_subtopic(subtopic_id: int) -> bool:
    """Delete a subtopic (cascades to subtopic_links). Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM subtopics WHERE subtopic_id = %s RETURNING subtopic_id",
                (subtopic_id,),
            )
            return cur.fetchone() is not None


# ══════════════════════════════════════════════════════════════════════════════
# Subtopic Links
# ══════════════════════════════════════════════════════════════════════════════

def get_links(subtopic_id: int) -> list[SubtopicLink]:
    """Return all links for a subtopic ordered by creation date."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM subtopic_links WHERE subtopic_id = %s ORDER BY created_at",
                (subtopic_id,),
            )
            return [_row_to_link(r) for r in cur.fetchall()]


def get_link_by_id(link_id: int) -> Optional[SubtopicLink]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM subtopic_links WHERE link_id = %s", (link_id,))
            row = cur.fetchone()
            return _row_to_link(row) if row else None


def create_link(*, subtopic_id: int, url: str, title: Optional[str] = None) -> SubtopicLink:
    """Add a link to a subtopic."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO subtopic_links (subtopic_id, url, title)
                VALUES (%s, %s, %s)
                RETURNING *
                """,
                (subtopic_id, url, title),
            )
            return _row_to_link(cur.fetchone())


def update_link(link_id: int, **fields) -> Optional[SubtopicLink]:
    """Update url and/or title of a link."""
    allowed = {"url", "title"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_link_by_id(link_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values = list(updates.values()) + [link_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE subtopic_links SET {set_clause} WHERE link_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_link(row) if row else None


def delete_link(link_id: int) -> bool:
    """Delete a link. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM subtopic_links WHERE link_id = %s RETURNING link_id",
                (link_id,),
            )
            return cur.fetchone() is not None
