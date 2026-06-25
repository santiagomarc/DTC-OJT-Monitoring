-- Migration: Add project_github_link to students, photo_url to attendance_logs, and set up attendance_photos storage bucket

-- ── 1. ADD NEW COLUMNS ──────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS project_github_link TEXT;

ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ── 2. RECREATE STUDENT PROGRESS VIEW ───────────────────────
-- Drop view because Postgres doesn't allow altering views (changing columns) directly.
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
  COALESCE(SUM(a.total_hours), 0)::NUMERIC(6,2)                AS total_rendered_hours,
  (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0))
    ::NUMERIC(6,2)                                              AS remaining_hours,
  -- Estimate: remaining working days * 1.75 to skip weekends and Fridays
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
  -- Show how many days have been logged
  COUNT(a.id)::INT                                              AS total_days_logged,
  -- Latest log date
  MAX(a.date)                                                   AS last_attendance_date
FROM public.students s
LEFT JOIN public.attendance_logs a ON a.student_id = s.id
GROUP BY s.id;

-- ── 3. CREATE STORAGE BUCKET ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance_photos', 'attendance_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable storage policies (make sure policies don't clash)
CREATE POLICY "Allow public read access to attendance_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attendance_photos');

CREATE POLICY "Allow auth upload access to attendance_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attendance_photos');

CREATE POLICY "Allow auth delete access to attendance_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attendance_photos');
