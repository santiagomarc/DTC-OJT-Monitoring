-- ============================================================
-- Migration 007: Registration Approval Gate + Academic Term Tracking
-- ============================================================

-- ── 1. ADD is_approved TO students ──────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- ── 2. ADD academic_term AND academic_year TO students ──────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_term TEXT
    CHECK (academic_term IN ('First Semester', 'Second Semester', 'Midyear')),
  ADD COLUMN IF NOT EXISTS academic_year TEXT;
  -- e.g. "2025-2026"

-- ── 3. BACKFILL EXISTING STUDENTS ────────────────────────────
-- Set existing students as approved, and set their academic term to Midyear 2025-2026 as per supervisor feedback
UPDATE public.students
SET is_approved = true,
    academic_term = 'Midyear',
    academic_year = '2025-2026'
WHERE role = 'student';

-- Also make sure admins are approved
UPDATE public.students
SET is_approved = true
WHERE role = 'admin';

-- ── 4. RECREATE student_progress VIEW ───────────────────────
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
  s.project_github_link,
  s.role,
  s.is_approved,
  s.academic_term,
  s.academic_year,
  COALESCE(SUM(a.total_hours), 0)::NUMERIC(6,2)                AS total_rendered_hours,
  (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0))
    ::NUMERIC(6,2)                                              AS remaining_hours,
  CASE
    WHEN COUNT(a.id) > 0 AND AVG(a.total_hours) > 0
    THEN CURRENT_DATE + CEIL(
      (
        (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0)) /
        AVG(a.total_hours)
      ) * (7.0 / 4.0)
    )::INT
    ELSE NULL
  END                                                           AS estimated_completion_date,
  COUNT(a.id)::INT                                              AS total_days_logged,
  MAX(a.date)                                                   AS last_attendance_date
FROM public.students s
LEFT JOIN public.attendance_logs a ON a.student_id = s.id
GROUP BY s.id;

-- ── 5. ADMIN UPDATE POLICY for approval toggle ─────────────
-- Admins already have read access via "students: own read".
-- Admins need UPDATE capability — the existing "students: own update"
-- only allows self-updates. Add an admin update policy:
CREATE POLICY "students: admin update"
  ON public.students FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
