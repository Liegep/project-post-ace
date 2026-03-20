
-- Allow clients to view invoices that are visible to them
CREATE POLICY "Clients can view visible invoices"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id IN (SELECT get_user_client_ids(auth.uid()))
    AND client_visible = true
    AND client_id IN (
      SELECT id FROM public.clients WHERE show_invoices_to_client = true
    )
  );

-- Allow clients to view invoice_items of visible invoices
CREATE POLICY "Clients view visible invoice_items"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND invoice_id IN (
      SELECT i.id FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
      WHERE i.client_id IN (SELECT get_user_client_ids(auth.uid()))
        AND i.client_visible = true
        AND c.show_invoices_to_client = true
    )
  );

-- Allow clients to view invoice_attachments of visible invoices
CREATE POLICY "Clients view visible invoice_attachments"
  ON public.invoice_attachments
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND invoice_id IN (
      SELECT i.id FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
      WHERE i.client_id IN (SELECT get_user_client_ids(auth.uid()))
        AND i.client_visible = true
        AND c.show_invoices_to_client = true
    )
  );
