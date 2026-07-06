-- ============================================================
-- Task Board — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS task_board
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE task_board;

-- ── Projects ─────────────────────────────────────────────────
--
-- Projects are containers for ordered steps (items with
-- project_id set). They are defined first so items can
-- reference them via FK.
--
-- deferred: project is parked and hidden from the active list.

CREATE TABLE projects (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(500) NOT NULL,
  deferred     TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATE         NOT NULL,
  completed_at DATE             DEFAULT NULL,
  PRIMARY KEY (id)
);

-- ── Items ─────────────────────────────────────────────────────
--
-- Single table for all item types: task, request, habit, and
-- project step. Columns that don't apply to a given type are
-- left NULL.
--
-- type
--   'task'    — plain to-do
--   'request' — ask / request from someone else
--   'habit'   — recurring habit (repeated task)
--   'step'    — one step inside a project
--
-- Columns shared by all types:
--   title, created_at, completed_at
--
-- Columns for task / request / habit / step:
--   starred, day_night
--
-- Columns for habit only:
--   reset_day  NULL = daily reset; 0–6 = weekly on that weekday
--              (0 = Sunday … 6 = Saturday)
--   log_mode   'today'     → Log button credits today's date
--              'yesterday' → Log button credits yesterday's date
--                            (useful for morning-after logging)
--
-- Columns for step only:
--   project_id  FK to projects.id
--   sort_order  display sequence within the project (0-indexed)
--   deferred    step is individually parked

CREATE TABLE items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type         ENUM('task', 'request', 'habit', 'step') NOT NULL,
  title        VARCHAR(500) NOT NULL,

  -- shared by task / request / habit / step
  starred      TINYINT(1)   DEFAULT NULL,
  day_night    ENUM('day', 'night') DEFAULT NULL,

  -- habit-specific
  reset_day    TINYINT UNSIGNED DEFAULT NULL CHECK (reset_day <= 6),
  log_mode     ENUM('today', 'yesterday') DEFAULT NULL,

  -- step-specific
  project_id   INT UNSIGNED DEFAULT NULL,
  sort_order   SMALLINT UNSIGNED DEFAULT NULL,
  deferred     TINYINT(1)   DEFAULT NULL,

  created_at   DATE         NOT NULL,
  completed_at DATE             DEFAULT NULL,

  PRIMARY KEY (id),
  KEY idx_items_type (type),
  KEY idx_items_project_id (project_id),
  CONSTRAINT fk_items_project
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- ── Habit logs ────────────────────────────────────────────────
--
-- One row per habit logging event.
--
-- action_date   — the calendar day the Log button was clicked.
--                 Used by canLog() to gate re-logging within a
--                 reset cycle.
-- recorded_date — the day the habit is credited for.
--                 Equals action_date when log_mode = 'today'.
--                 Equals action_date - 1 day when log_mode = 'yesterday'.
--
-- recordedDate must never change after insert; actionDate can be
-- recalculated if log_mode is edited (see recalcActionDates in utils.ts).

CREATE TABLE habit_logs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id       INT UNSIGNED NOT NULL,
  action_date   DATE         NOT NULL,
  recorded_date DATE         NOT NULL,
  PRIMARY KEY (id),
  KEY idx_habit_logs_item_id (item_id),
  KEY idx_habit_logs_action_date (item_id, action_date),
  CONSTRAINT fk_habit_logs_item
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
);
