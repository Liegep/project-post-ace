
-- Drop the admin policy that shows all appointments
DROP POLICY "Admins can manage all appointments" ON public.appointments;

-- Admins also only see their own appointments
CREATE POLICY "Admins can manage own appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
