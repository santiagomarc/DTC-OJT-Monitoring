-- Migration: Lunch break deduction and 4-day work week calculation
-- Drop the view first because it depends on total_hours
DROP VIEW IF EXISTS public.student_progress;

-- Recreate total_hours to deduct 1-hour lunch break (12:00 PM - 1:00 PM) if overlapped
ALTER TABLE public.attendance_logs DROP COLUMN IF EXISTS total_hours;

ALTER TABLE public.attendance_logs ADD COLUMN total_hours NUMERIC(5,2) GENERATED ALWAYS AS (
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
) STORED;

-- Recreate the view with the updated estimated completion date logic
-- We multiply the remaining working days by (7/4) to account for skipping Fri/Sat/Sun
CREATE OR REPLACE VIEW public.student_progress AS
SELECT
  s.id,
  s.auth_user_id,
  s.last_name,
  s.first_name,
  s.program,
  s.required_ojt_hours,
  s.assigned_project,
  s.github_link,
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
