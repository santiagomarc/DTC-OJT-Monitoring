-- ============================================================
-- BatSU OJT Monitoring System — Supabase Migrations
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. STUDENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id     UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_name        TEXT        NOT NULL,
  first_name       TEXT        NOT NULL,
  program          TEXT        NOT NULL,         -- e.g. "BSIT", "BSCS", "BSECE"
  required_ojt_hours NUMERIC(6,2) NOT NULL DEFAULT 486,
  assigned_project TEXT,
  github_link      TEXT,
  role             TEXT        NOT NULL DEFAULT 'student'
                               CHECK (role IN ('student', 'admin')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. ATTENDANCE LOGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date                 DATE        NOT NULL,
  time_in              TIME        NOT NULL,
  time_out             TIME,                     -- nullable: student may not have clocked out yet
  total_hours          NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN time_out IS NOT NULL
      THEN ROUND(
        CAST(
          (
            EXTRACT(EPOCH FROM (time_out - time_in))
            -
            GREATEST(
              0,
              EXTRACT(EPOCH FROM (
                LEAST(time_out, '13:00'::time) - GREATEST(time_in, '12:00'::time)
              ))
            )
          ) / 3600.0 
        AS NUMERIC),
        2
      )
      ELSE NULL
    END
  ) STORED,
  planned_task         TEXT,
  actual_accomplishment TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)                      -- one entry per student per calendar day
);

-- ── 3. STUDENT PROGRESS VIEW ────────────────────────────────
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

-- ── 4. AUTO-UPDATE updated_at TRIGGER ───────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 5. ROW-LEVEL SECURITY ───────────────────────────────────
ALTER TABLE public.students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check if the calling user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ── STUDENTS policies ────────────────────────────────────────
-- Any authenticated user can read their own row; admins can read all
CREATE POLICY "students: own read"
  ON public.students FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_admin());

-- Students can update their own non-sensitive fields
CREATE POLICY "students: own update"
  ON public.students FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid() AND
    role = (SELECT role FROM public.students WHERE auth_user_id = auth.uid())  -- can't self-promote
  );

-- Only admins can insert (create intern profiles) or delete
CREATE POLICY "students: admin insert"
  ON public.students FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "students: admin delete"
  ON public.students FOR DELETE
  USING (public.is_admin());

-- ── ATTENDANCE_LOGS policies ─────────────────────────────────
-- Students can read/write only their own logs
CREATE POLICY "logs: own read"
  ON public.attendance_logs FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "logs: own insert"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "logs: own update"
  ON public.attendance_logs FOR UPDATE
  USING (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "logs: own delete"
  ON public.attendance_logs FOR DELETE
  USING (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
  );

-- ── 6. SEED DATA (remove before production) ─────────────────
-- NOTE: Replace UUIDs with real Supabase auth.users IDs after creating test accounts.
-- INSERT INTO public.students (auth_user_id, last_name, first_name, program, required_ojt_hours, role)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'De Leon', 'Maria', 'BSIT', 486, 'student'),
--   ('00000000-0000-0000-0000-000000000002', 'Santos',  'Juan',  'BSCS', 486, 'student'),
--   ('00000000-0000-0000-0000-000000000099', 'Admin',   'Super', 'N/A',  0,   'admin');
