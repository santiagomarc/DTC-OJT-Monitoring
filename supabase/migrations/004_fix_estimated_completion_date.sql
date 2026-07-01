-- Migration: Fix estimated completion date calculation
-- Rules: only Monday to Thursday are working days, skip Fri, Sat, Sun.

CREATE OR REPLACE FUNCTION public.get_estimated_completion_date(
  start_date DATE,
  remaining_hours NUMERIC,
  avg_hours NUMERIC
) RETURNS DATE AS $$
DECLARE
    current_d DATE := start_date;
    days_to_add INT;
    days_added INT := 0;
BEGIN
    IF remaining_hours <= 0 THEN
        RETURN current_d;
    END IF;

    IF avg_hours IS NULL OR avg_hours <= 0 THEN
        avg_hours := 8.0; -- default 8 hours per day if no logs
    END IF;

    days_to_add := CEIL(remaining_hours / avg_hours);

    WHILE days_added < days_to_add LOOP
        current_d := current_d + 1;
        -- ISODOW: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
        IF EXTRACT(ISODOW FROM current_d) <= 4 THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;
    
    RETURN current_d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
  public.get_estimated_completion_date(
    CURRENT_DATE,
    (s.required_ojt_hours - COALESCE(SUM(a.total_hours), 0)),
    -- Use 8.0 default if they haven't started or avg is 0
    COALESCE(NULLIF(AVG(a.total_hours), 0), 8.0)
  )                                                             AS estimated_completion_date,
  COUNT(a.id)::INT                                              AS total_days_logged,
  MAX(a.date)                                                   AS last_attendance_date
FROM public.students s
LEFT JOIN public.attendance_logs a ON a.student_id = s.id
GROUP BY s.id;
