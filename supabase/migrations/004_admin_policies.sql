-- ============================================================
-- Add Admin Policies for Students and Attendance Logs
-- ============================================================

-- Allow admins to update student profiles
CREATE POLICY "students: admin update"
  ON public.students FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow admins to insert attendance logs for any student
CREATE POLICY "logs: admin insert"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Allow admins to update attendance logs for any student
CREATE POLICY "logs: admin update"
  ON public.attendance_logs FOR UPDATE
  USING (public.is_admin());

-- Allow admins to delete attendance logs for any student
CREATE POLICY "logs: admin delete"
  ON public.attendance_logs FOR DELETE
  USING (public.is_admin());
