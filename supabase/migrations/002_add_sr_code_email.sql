-- ============================================================
-- Migration 002: Add sr_code and email columns to students
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. ADD NEW COLUMNS ──────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS sr_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email   TEXT;

-- ── 2. RECREATE STUDENT PROGRESS VIEW ───────────────────────
-- Must drop first because Postgres does not allow changing column structure via CREATE OR REPLACE VIEW
DROP VIEW IF EXISTS public.student_progress CASCADE;

CREATE OR REPLACE VIEW public.student_progress AS
SELECT
  s.id,
  s.auth_user_id,
  s.last_name,
  s.first_name,
  s.sr_code,
  s.email,
  s.program,
  s.required_ojt_hours,
  s.assigned_project,
  s.github_link,
  s.role,
  COALESCE(SUM(a.total_hours), 0)::NUMERIC(6,2)                AS total_rendered_hours,
  (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0))
    ::NUMERIC(6,2)                                              AS remaining_hours,
  -- Estimate: remaining / average daily hours, added to today
  CASE
    WHEN COUNT(a.id) > 0 AND AVG(a.total_hours) > 0
    THEN CURRENT_DATE + CEIL(
      (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0)) /
      AVG(a.total_hours)
    )::INT
    ELSE NULL
  END                                                           AS estimated_completion_date,
  -- Show how many days have been logged
  COUNT(a.id)::INT                                              AS total_days_logged,
  -- Latest log date
  MAX(a.date)                                                   AS last_attendance_date
FROM public.students s
LEFT JOIN public.attendance_logs a ON a.student_id = s.id
GROUP BY s.id;
