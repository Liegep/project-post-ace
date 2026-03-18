import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Appointment {
  id: string;
  userId: string;
  title: string;
  description: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  category: string;
  completed: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

interface CreateAppointment {
  title: string;
  description?: string;
  appointmentDate: string;
  appointmentTime: string;
  category?: string;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (!error && data) {
      setAppointments(data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        description: r.description || "",
        appointmentDate: r.appointment_date,
        appointmentTime: r.appointment_time?.slice(0, 5) || "09:00",
        category: r.category || "",
        completed: r.completed,
        completedAt: r.completed_at ? new Date(r.completed_at) : null,
        createdAt: new Date(r.created_at),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const createAppointment = useCallback(async (input: CreateAppointment) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { error } = await supabase.from("appointments").insert({
      user_id: session.user.id,
      title: input.title,
      description: input.description || "",
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      category: input.category || "",
    } as any);

    if (!error) await fetchAppointments();
    return !error;
  }, [fetchAppointments]);

  const createBatch = useCallback(async (inputs: CreateAppointment[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || inputs.length === 0) return false;

    const rows = inputs.map(input => ({
      user_id: session.user.id,
      title: input.title,
      description: input.description || "",
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      category: input.category || "",
    }));

    const { error } = await supabase.from("appointments").insert(rows as any);
    if (!error) await fetchAppointments();
    return !error;
  }, [fetchAppointments]);

  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    const updates: Record<string, any> = {
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, completed, completedAt: completed ? new Date() : null } : a));
    await supabase.from("appointments").update(updates).eq("id", id);
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    await supabase.from("appointments").delete().eq("id", id);
  }, []);

  const updateAppointment = useCallback(async (id: string, updates: Partial<CreateAppointment>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.appointmentDate !== undefined) dbUpdates.appointment_date = updates.appointmentDate;
    if (updates.appointmentTime !== undefined) dbUpdates.appointment_time = updates.appointmentTime;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    await supabase.from("appointments").update(dbUpdates).eq("id", id);
  }, []);

  return { appointments, loading, createAppointment, toggleComplete, deleteAppointment, updateAppointment, refetch: fetchAppointments };
}
