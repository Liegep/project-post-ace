import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: number;
  title: string;
  period_start: string | null;
  period_end: string | null;
  issue_date: string;
  due_date: string;
  status: "open" | "paid" | "overdue" | "cancelled";
  discount: number;
  surcharge: number;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  payment_method: string;
  clients?: { name: string; logo_url: string; slug: string };
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  post_id: string | null;
  name: string;
  description: string;
  category: string;
  service_date: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
  created_at: string;
}

export interface InvoiceAttachment {
  id: string;
  invoice_id: string;
  file_name: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export function useInvoices(clientId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("invoices")
      .select("*, clients(name, logo_url, slug)")
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data } = await query;
    setInvoices((data as any[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return { invoices, loading, refetch: fetchInvoices };
}

export function useInvoiceItems(invoiceId: string) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });
    setItems((data as any[]) || []);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return { items, loading, refetch: fetchItems };
}

export function useInvoiceAttachments(invoiceId: string) {
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoice_attachments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false });
    setAttachments((data as any[]) || []);
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  return { attachments, loading, refetch: fetchAttachments };
}

export async function createInvoice(data: {
  client_id: string;
  title: string;
  period_start?: string;
  period_end?: string;
  issue_date: string;
  due_date: string;
  notes?: string;
  created_by?: string;
}) {
  const { data: inv, error } = await supabase.from("invoices").insert(data as any).select().single();
  if (error) throw error;
  return inv;
}

export async function updateInvoice(id: string, data: Partial<Invoice>) {
  const { error } = await supabase.from("invoices").update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function createInvoiceItem(data: {
  invoice_id: string;
  post_id?: string | null;
  name: string;
  description?: string;
  category?: string;
  service_date?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  notes?: string;
}) {
  const { error } = await supabase.from("invoice_items").insert(data as any);
  if (error) throw error;
}

export async function updateInvoiceItem(id: string, data: Partial<InvoiceItem>) {
  const { error } = await supabase.from("invoice_items").update(data as any).eq("id", id);
  if (error) throw error;
}

export async function deleteInvoiceItem(id: string) {
  const { error } = await supabase.from("invoice_items").delete().eq("id", id);
  if (error) throw error;
}

export async function createInvoiceAttachment(data: {
  invoice_id: string;
  file_name: string;
  file_url: string;
  uploaded_by?: string;
}) {
  const { error } = await supabase.from("invoice_attachments").insert(data as any);
  if (error) throw error;
}

export async function deleteInvoiceAttachment(id: string) {
  const { error } = await supabase.from("invoice_attachments").delete().eq("id", id);
  if (error) throw error;
}

// Check if a post is already invoiced
export async function isPostInvoiced(postId: string): Promise<boolean> {
  const { data } = await supabase
    .from("invoice_items")
    .select("id")
    .eq("post_id", postId)
    .limit(1);
  return (data || []).length > 0;
}
