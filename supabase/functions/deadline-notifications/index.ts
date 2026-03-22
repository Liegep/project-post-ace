import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Get all admin/team users
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "super_admin", "colaborador"]);

    const userIds = (adminUsers || []).map((u: any) => u.user_id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications: any[] = [];

    // 1. Check posts with deadlines
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, deadline, client_id, archived")
      .eq("archived", false)
      .not("deadline", "is", null)
      .lte("deadline", threeDaysFromNow + "T23:59:59Z");

    // 2. Check invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, title, due_date, client_id, status, invoice_number")
      .in("status", ["open", "overdue"])
      .lte("due_date", threeDaysFromNow);

    // 3. Check briefs
    const { data: briefs } = await supabase
      .from("content_briefs")
      .select("id, title, planned_date, client_id, status")
      .not("planned_date", "is", null)
      .not("status", "in", '("published","rejected")')
      .lte("planned_date", threeDaysFromNow);

    // Get all relevant client names
    const allClientIds = new Set<string>();
    (posts || []).forEach((p: any) => p.client_id && allClientIds.add(p.client_id));
    (invoices || []).forEach((i: any) => i.client_id && allClientIds.add(i.client_id));
    (briefs || []).forEach((b: any) => b.client_id && allClientIds.add(b.client_id));

    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .in("id", Array.from(allClientIds));

    const clientMap: Record<string, string> = {};
    (clients || []).forEach((c: any) => { clientMap[c.id] = c.name; });

    // Get user-client assignments to only notify relevant users
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("user_id, client_id");

    const userClientMap: Record<string, Set<string>> = {};
    (assignments || []).forEach((a: any) => {
      if (!userClientMap[a.user_id]) userClientMap[a.user_id] = new Set();
      userClientMap[a.user_id].add(a.client_id);
    });

    // Check existing notifications to avoid duplicates (last 24h)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingNotifs } = await supabase
      .from("admin_notifications")
      .select("post_id, type")
      .in("type", ["deadline_warning", "deadline_today", "deadline_overdue"])
      .gte("created_at", yesterday);

    const existingKeys = new Set(
      (existingNotifs || []).map((n: any) => `${n.post_id}-${n.type}`)
    );

    const addNotification = (
      itemId: string,
      clientId: string,
      title: string,
      message: string,
      type: string,
      targetUserIds: string[]
    ) => {
      const key = `${itemId}-${type}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);

      targetUserIds.forEach((uid) => {
        notifications.push({
          type,
          title,
          message,
          client_id: clientId,
          post_id: itemId,
          user_id: uid,
          read: false,
        });
      });
    };

    // Process posts
    (posts || []).forEach((p: any) => {
      const clientName = clientMap[p.client_id] || "Cliente";
      const deadline = p.deadline.split("T")[0];
      const relevantUsers = userIds.filter((uid: string) =>
        userClientMap[uid]?.has(p.client_id)
      );
      if (relevantUsers.length === 0) return;

      if (deadline < today) {
        addNotification(p.id, p.client_id, `${clientName} — Post atrasado`, `"${p.title}" venceu em ${deadline}`, "deadline_overdue", relevantUsers);
      } else if (deadline === today) {
        addNotification(p.id, p.client_id, `${clientName} — Post vence hoje`, `"${p.title}" vence hoje`, "deadline_today", relevantUsers);
      } else {
        const daysLeft = Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        addNotification(p.id, p.client_id, `${clientName} — Post vence em ${daysLeft} dias`, `"${p.title}" vence em ${deadline}`, "deadline_warning", relevantUsers);
      }
    });

    // Process invoices
    (invoices || []).forEach((inv: any) => {
      const clientName = clientMap[inv.client_id] || "Cliente";
      const dueDate = inv.due_date;
      const invTitle = inv.title || `Fatura #${inv.invoice_number || ""}`;
      const relevantUsers = userIds.filter((uid: string) =>
        userClientMap[uid]?.has(inv.client_id)
      );
      if (relevantUsers.length === 0) return;

      if (dueDate < today) {
        addNotification(inv.id, inv.client_id, `${clientName} — Fatura atrasada`, `"${invTitle}" venceu em ${dueDate}`, "deadline_overdue", relevantUsers);
      } else if (dueDate === today) {
        addNotification(inv.id, inv.client_id, `${clientName} — Fatura vence hoje`, `"${invTitle}" vence hoje`, "deadline_today", relevantUsers);
      } else {
        const daysLeft = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        addNotification(inv.id, inv.client_id, `${clientName} — Fatura vence em ${daysLeft} dias`, `"${invTitle}" vence em ${dueDate}`, "deadline_warning", relevantUsers);
      }
    });

    // Process briefs
    (briefs || []).forEach((b: any) => {
      const clientName = clientMap[b.client_id] || "Cliente";
      const plannedDate = b.planned_date;
      const relevantUsers = userIds.filter((uid: string) =>
        userClientMap[uid]?.has(b.client_id)
      );
      if (relevantUsers.length === 0) return;

      if (plannedDate < today) {
        addNotification(b.id, b.client_id, `${clientName} — Pauta atrasada`, `"${b.title}" venceu em ${plannedDate}`, "deadline_overdue", relevantUsers);
      } else if (plannedDate === today) {
        addNotification(b.id, b.client_id, `${clientName} — Pauta vence hoje`, `"${b.title}" vence hoje`, "deadline_today", relevantUsers);
      } else {
        const daysLeft = Math.ceil((new Date(plannedDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
        addNotification(b.id, b.client_id, `${clientName} — Pauta vence em ${daysLeft} dias`, `"${b.title}" vence em ${plannedDate}`, "deadline_warning", relevantUsers);
      }
    });

    // Insert notifications in batches
    if (notifications.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from("admin_notifications").insert(batch);
      }
    }

    return new Response(
      JSON.stringify({ message: `Created ${notifications.length} notifications` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
