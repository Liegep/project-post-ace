import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface BillingAlert {
  id: string;
  title: string;
  due_date: string;
  status: string;
  client_name: string;
  client_slug: string;
}

export function BillingAlertsWidget() {
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, title, due_date, status, clients(name, slug)")
        .in("status", ["open", "overdue"])
        .order("due_date", { ascending: true })
        .limit(5);

      if (data) {
        setAlerts(
          data.map((inv: any) => ({
            id: inv.id,
            title: inv.title,
            due_date: inv.due_date,
            status: inv.status,
            client_name: inv.clients?.name || "",
            client_slug: inv.clients?.slug || "",
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading || alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-4 w-4" />
          Faturas pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const isOverdue = alert.status === "overdue" || new Date(alert.due_date) < new Date();
          return (
            <button
              key={alert.id}
              onClick={() => navigate("/billing")}
              className="w-full flex items-center justify-between rounded-lg border bg-card p-2.5 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{alert.client_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.title} · Venc. {format(new Date(alert.due_date), "dd/MM")}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {isOverdue ? (
                  <Badge variant="secondary" className="bg-red-500/15 text-red-600 text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                    Atrasada
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-blue-500/15 text-blue-600 text-[10px]">
                    <Clock className="h-3 w-3 mr-0.5" />
                    Aberta
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
        <button
          onClick={() => navigate("/billing")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Ver todas as faturas →
        </button>
      </CardContent>
    </Card>
  );
}
