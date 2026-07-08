-- Migration: Multi-project support for interns

-- 1. Create student_projects table
CREATE TABLE IF NOT EXISTS public.student_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  github_link TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Migrate existing data from students table
INSERT INTO public.student_projects (student_id, name, github_link)
SELECT id, assigned_project, project_github_link
FROM public.students
WHERE assigned_project IS NOT NULL AND assigned_project != '';

-- 3. Add updated_at trigger
CREATE TRIGGER student_projects_updated_at
  BEFORE UPDATE ON public.student_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable RLS
ALTER TABLE public.student_projects ENABLE ROW LEVEL SECURITY;

-- 5. Add Policies
-- Students can read their own projects; admins can read all
CREATE POLICY "student_projects: read"
  ON public.student_projects FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid())
    OR public.is_admin()
  );

-- Students can insert their own projects (max 5 enforced at application level, but we can do it here too if we want, application level is fine)
CREATE POLICY "student_projects: insert"
  ON public.student_projects FOR INSERT
  WITH CHECK (
    (student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()))
    OR public.is_admin()
  );

-- Students can update their own projects
CREATE POLICY "student_projects: update"
  ON public.student_projects FOR UPDATE
  USING (
    (student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()))
    OR public.is_admin()
  );

-- Students can delete their own projects
CREATE POLICY "student_projects: delete"
  ON public.student_projects FOR DELETE
  USING (
    (student_id IN (SELECT id FROM public.students WHERE auth_user_id = auth.uid()))
    OR public.is_admin()
  );

-- 6. Recreate student_progress view to include projects summary (optional but good for master table)
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
  -- Keep these for backwards compatibility for now until frontend drops them
  s.assigned_project,
  s.github_link,
  s.project_github_link,
  s.role,
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
