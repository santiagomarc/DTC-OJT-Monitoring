-- Enforce the invariant used by the global clock: an intern can only have one open session.
-- This intentionally fails if historical data contains multiple open sessions, preserving data
-- for explicit administrator review rather than silently changing attendance records.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_logs_one_open_session_per_student
  ON public.attendance_logs (student_id)
  WHERE time_out IS NULL;
