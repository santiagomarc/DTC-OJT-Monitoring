-- ============================================================
-- Migration 005: Secure storage bucket policies
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Allow auth upload access to attendance_photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow auth delete access to attendance_photos" ON storage.objects;

-- Create secure insert (upload) policy
CREATE POLICY "Allow own upload access to attendance_photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance_photos'
    AND split_part(name, '/', 1) = (
      SELECT id::text FROM public.students WHERE auth_user_id = auth.uid()
    )
  );

-- Create secure delete policy
CREATE POLICY "Allow own delete access to attendance_photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attendance_photos'
    AND split_part(name, '/', 1) = (
      SELECT id::text FROM public.students WHERE auth_user_id = auth.uid()
    )
  );
