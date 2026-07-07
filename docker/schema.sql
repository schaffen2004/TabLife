-- TabLife application schema for PostgreSQL.
-- Synced with frontend types in src/frontend/src/lib/mock-data.ts

-- ─── ENUM TYPES ──────────────────────────────────────────────────────────────

CREATE TYPE task_status     AS ENUM ('new', 'in_progress', 'done', 'cancel');
CREATE TYPE task_priority   AS ENUM ('low', 'medium', 'high');

-- Projects: new | in_progress | done | cancel (frontend Project.status)
CREATE TYPE project_status  AS ENUM ('new', 'in_progress', 'done', 'cancel');

-- Project stages, research topics, subtopics, and plan requirements
CREATE TYPE work_status     AS ENUM ('new', 'in_progress', 'done', 'cancel');

-- Plans: draft | active | done | cancel (frontend Plan.status)
CREATE TYPE plan_status     AS ENUM ('draft', 'active', 'done', 'cancel');



-- Finance: income categories
CREATE TYPE income_category AS ENUM (
  'salary',
  'freelance',
  'business',
  'gift',
  'allowance',
  'other'
);

-- Finance: expense categories
CREATE TYPE expense_category AS ENUM (
  'housing',
  'food_and_drink',
  'transportation',
  'healthcare',
  'education',
  'technology',
  'entertainment',
  'social_relationships',
  'family',
  'unexpected_expenses',
  'other'
);

-- ─── PROJECTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  project_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         TEXT   NOT NULL,
  description  TEXT   NOT NULL DEFAULT '',
  goal         TEXT   NOT NULL DEFAULT '',
  status       project_status NOT NULL DEFAULT 'new',
  start_at     DATE   NOT NULL,
  end_at       DATE   NOT NULL,
  progress     INTEGER NOT NULL DEFAULT 0
                 CONSTRAINT projects_progress_range CHECK (progress BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT projects_name_not_blank       CHECK (btrim(name) <> ''),
  CONSTRAINT projects_end_at_after_start   CHECK (end_at >= start_at)
);

-- ─── PROJECT STAGES ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_stages (
  stage_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id   BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  name         TEXT   NOT NULL,
  goal         TEXT   NOT NULL DEFAULT '',
  status       work_status NOT NULL DEFAULT 'new',
  progress     INTEGER NOT NULL DEFAULT 0
                 CONSTRAINT project_stages_progress_range CHECK (progress BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_stages_name_not_blank CHECK (btrim(name) <> ''),
  UNIQUE (stage_id, project_id),
  UNIQUE (project_id, name)
);

-- ─── RESEARCH TOPICS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_topics (
  topic_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         TEXT   UNIQUE NOT NULL,
  description  TEXT   NOT NULL DEFAULT '',
  status       work_status NOT NULL DEFAULT 'new',
  start_at     DATE   NOT NULL,
  link         TEXT   DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT research_topics_name_not_blank CHECK (btrim(name) <> '')
);

-- ─── SUBTOPICS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subtopics (
  subtopic_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  topic_id     BIGINT NOT NULL REFERENCES research_topics(topic_id) ON DELETE CASCADE,
  name         TEXT   NOT NULL,
  description  TEXT   NOT NULL DEFAULT '',
  note         TEXT   DEFAULT NULL,
  status       work_status NOT NULL DEFAULT 'new',
  start_at     DATE   NOT NULL,
  position     INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subtopics_name_not_blank    CHECK (btrim(name) <> ''),
  CONSTRAINT subtopics_position_valid    CHECK (position > 0),
  UNIQUE (topic_id, position)
);

-- ─── TASKS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  task_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal             TEXT   NOT NULL,
  expected_result  TEXT   NOT NULL DEFAULT '',
  actual_result    TEXT   DEFAULT NULL,
  status           task_status   NOT NULL DEFAULT 'new',
  priority         task_priority NOT NULL DEFAULT 'medium',
  start_at         DATE   NOT NULL,
  deadline         DATE   NOT NULL,
  -- Every task must belong to a project; stage is optional within that project
  project_id       BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  project_stage_id BIGINT DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tasks_goal_not_blank           CHECK (btrim(goal) <> ''),
  CONSTRAINT tasks_deadline_after_start     CHECK (deadline >= start_at),
  CONSTRAINT tasks_stage_belongs_to_project
    FOREIGN KEY (project_stage_id, project_id)
    REFERENCES project_stages(stage_id, project_id)
    ON DELETE SET NULL (project_stage_id)
);

-- ─── TASK STEPS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_steps (
  step_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id       BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  step_name     TEXT   NOT NULL,
  position      INTEGER NOT NULL,
  status        task_status NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_steps_step_name_not_blank CHECK (btrim(step_name) <> ''),
  CONSTRAINT task_steps_position_valid      CHECK (position > 0),
  UNIQUE (task_id, position)
);

-- ─── TASK LINKS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_links (
  link_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id    BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  url        TEXT   NOT NULL,
  title      TEXT   DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT task_links_url_not_blank   CHECK (btrim(url) <> ''),
  CONSTRAINT task_links_title_not_blank CHECK (title IS NULL OR btrim(title) <> '')
);

-- ─── SUBTOPIC LINKS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subtopic_links (
  link_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subtopic_id  BIGINT NOT NULL REFERENCES subtopics(subtopic_id) ON DELETE CASCADE,
  url          TEXT   NOT NULL,
  title        TEXT   DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subtopic_links_url_not_blank   CHECK (btrim(url) <> ''),
  CONSTRAINT subtopic_links_title_not_blank CHECK (title IS NULL OR btrim(title) <> '')
);

-- ─── PLANS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  plan_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name               TEXT   NOT NULL,
  goal               TEXT   NOT NULL DEFAULT '',
  estimated_time     TEXT   NOT NULL DEFAULT '',
  status             plan_status NOT NULL DEFAULT 'draft',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT plans_name_not_blank CHECK (btrim(name) <> '')
);

-- ─── PLAN REQUIREMENTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_requirements (
  requirement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_id        BIGINT NOT NULL REFERENCES plans(plan_id) ON DELETE CASCADE,
  name           TEXT   NOT NULL,
  status         work_status NOT NULL DEFAULT 'new',
  position       INTEGER NOT NULL,
  CONSTRAINT plan_requirements_name_not_blank  CHECK (btrim(name) <> ''),
  CONSTRAINT plan_requirements_position_valid  CHECK (position > 0),
  UNIQUE (plan_id, position)
);

-- ─── ROUTINES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routines (
  routine_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT   NOT NULL,
  note       TEXT   DEFAULT NULL,
  streak     INTEGER NOT NULL DEFAULT 0
               CONSTRAINT routines_streak_non_negative CHECK (streak >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT routines_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT routines_note_not_blank CHECK (note IS NULL OR btrim(note) <> '')
);

-- Daily check-in records per routine (one row per day completed)
CREATE TABLE IF NOT EXISTS routine_checkins (
  checkin_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  routine_id   BIGINT NOT NULL REFERENCES routines(routine_id) ON DELETE CASCADE,
  completed_on DATE   NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (routine_id, completed_on)
);

-- ─── FINANCE: INCOME ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS income (
  income_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  amount       NUMERIC(14, 0) NOT NULL,
  category     income_category NOT NULL,
  income_date  DATE           NOT NULL,
  note         TEXT           DEFAULT NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT income_amount_positive CHECK (amount > 0)
);

-- ─── FINANCE: EXPENSE ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense (
  expense_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  amount        NUMERIC(14, 0)   NOT NULL,
  category      expense_category NOT NULL,
  expense_date  DATE             NOT NULL,
  note          TEXT             DEFAULT NULL,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT expense_amount_positive CHECK (amount > 0)
);
