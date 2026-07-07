"""
CRUD operations for the `income` and `expense` tables.

Income schema
-------------
income(income_id, amount, category, income_date, note, created_at, updated_at)

Expense schema
--------------
expense(expense_id, amount, category, expense_date, note, created_at, updated_at)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import get_conn

# Valid category values (mirrors DB enums)
INCOME_CATEGORIES = frozenset(
    {"salary", "freelance", "business", "gift", "allowance", "other"}
)
EXPENSE_CATEGORIES = frozenset(
    {
        "housing", "food_and_drink", "transportation", "healthcare",
        "education", "technology", "entertainment", "social_relationships",
        "family", "unexpected_expenses", "other",
    }
)


# ─── Models ───────────────────────────────────────────────────────────────────

@dataclass
class Income:
    income_id: int
    amount: int
    category: str       # income_category enum
    income_date: date
    note: Optional[str]
    created_at: datetime
    updated_at: datetime


@dataclass
class Expense:
    expense_id: int
    amount: int
    category: str       # expense_category enum
    expense_date: date
    note: Optional[str]
    created_at: datetime
    updated_at: datetime


def _row_to_income(row: dict) -> Income:
    return Income(**row)


def _row_to_expense(row: dict) -> Expense:
    return Expense(**row)


# ─── Income ───────────────────────────────────────────────────────────────────

def get_all_income(*, month: Optional[int] = None, year: Optional[int] = None) -> list[Income]:
    """
    Return income records, optionally filtered to a specific year/month.
    Ordered by income_date DESC.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            if year and month:
                cur.execute(
                    """
                    SELECT * FROM income
                    WHERE EXTRACT(YEAR FROM income_date) = %s
                      AND EXTRACT(MONTH FROM income_date) = %s
                    ORDER BY income_date DESC
                    """,
                    (year, month),
                )
            elif year:
                cur.execute(
                    "SELECT * FROM income WHERE EXTRACT(YEAR FROM income_date) = %s ORDER BY income_date DESC",
                    (year,),
                )
            else:
                cur.execute("SELECT * FROM income ORDER BY income_date DESC")
            return [_row_to_income(r) for r in cur.fetchall()]


def get_income_by_id(income_id: int) -> Optional[Income]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM income WHERE income_id = %s", (income_id,))
            row = cur.fetchone()
            return _row_to_income(row) if row else None


def create_income(
    *,
    amount: int,
    category: str,
    income_date: date,
    note: Optional[str] = None,
) -> Income:
    """Insert a new income record."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO income (amount, category, income_date, note) VALUES (%s, %s, %s, %s) RETURNING *",
                (amount, category, income_date, note),
            )
            return _row_to_income(cur.fetchone())


def update_income(income_id: int, **fields) -> Optional[Income]:
    """Partially update an income record (amount, category, income_date, note)."""
    allowed = {"amount", "category", "income_date", "note"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_income_by_id(income_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [income_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE income SET {set_clause} WHERE income_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_income(row) if row else None


def delete_income(income_id: int) -> bool:
    """Delete an income record. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM income WHERE income_id = %s RETURNING income_id",
                (income_id,),
            )
            return cur.fetchone() is not None


# ─── Expense ──────────────────────────────────────────────────────────────────

def get_all_expense(*, month: Optional[int] = None, year: Optional[int] = None) -> list[Expense]:
    """
    Return expense records, optionally filtered by year/month.
    Ordered by expense_date DESC.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            if year and month:
                cur.execute(
                    """
                    SELECT * FROM expense
                    WHERE EXTRACT(YEAR FROM expense_date) = %s
                      AND EXTRACT(MONTH FROM expense_date) = %s
                    ORDER BY expense_date DESC
                    """,
                    (year, month),
                )
            elif year:
                cur.execute(
                    "SELECT * FROM expense WHERE EXTRACT(YEAR FROM expense_date) = %s ORDER BY expense_date DESC",
                    (year,),
                )
            else:
                cur.execute("SELECT * FROM expense ORDER BY expense_date DESC")
            return [_row_to_expense(r) for r in cur.fetchall()]


def get_expense_by_id(expense_id: int) -> Optional[Expense]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM expense WHERE expense_id = %s", (expense_id,))
            row = cur.fetchone()
            return _row_to_expense(row) if row else None


def create_expense(
    *,
    amount: int,
    category: str,
    expense_date: date,
    note: Optional[str] = None,
) -> Expense:
    """Insert a new expense record."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO expense (amount, category, expense_date, note) VALUES (%s, %s, %s, %s) RETURNING *",
                (amount, category, expense_date, note),
            )
            return _row_to_expense(cur.fetchone())


def update_expense(expense_id: int, **fields) -> Optional[Expense]:
    """Partially update an expense record (amount, category, expense_date, note)."""
    allowed = {"amount", "category", "expense_date", "note"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_expense_by_id(expense_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    set_clause += ", updated_at = NOW()"
    values = list(updates.values()) + [expense_id]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE expense SET {set_clause} WHERE expense_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            return _row_to_expense(row) if row else None


def delete_expense(expense_id: int) -> bool:
    """Delete an expense record. Returns True if deleted."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM expense WHERE expense_id = %s RETURNING expense_id",
                (expense_id,),
            )
            return cur.fetchone() is not None


# ─── Aggregates ───────────────────────────────────────────────────────────────

def monthly_summary(year: int, month: int) -> dict:
    """
    Return a dict with total_income, total_expense, and balance for a given month.

    Example::

        {
            "year": 2026, "month": 6,
            "total_income": 30000000,
            "total_expense": 14000000,
            "balance": 16000000,
        }
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM income
                WHERE EXTRACT(YEAR FROM income_date) = %s
                  AND EXTRACT(MONTH FROM income_date) = %s
                """,
                (year, month),
            )
            total_income = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM expense
                WHERE EXTRACT(YEAR FROM expense_date) = %s
                  AND EXTRACT(MONTH FROM expense_date) = %s
                """,
                (year, month),
            )
            total_expense = int(cur.fetchone()["total"])

    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
    }


def expense_by_category(year: int, month: int) -> list[dict]:
    """
    Return expense totals grouped by category for a month.

    Example row: {"category": "food_and_drink", "total": 4500000}
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT category, SUM(amount) AS total
                FROM expense
                WHERE EXTRACT(YEAR FROM expense_date) = %s
                  AND EXTRACT(MONTH FROM expense_date) = %s
                GROUP BY category
                ORDER BY total DESC
                """,
                (year, month),
            )
            return [{"category": r["category"], "total": int(r["total"])} for r in cur.fetchall()]
