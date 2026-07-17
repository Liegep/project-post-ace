import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAppLogo } from "@/hooks/useAppLogo";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { Locale } from "@/i18n/translations";

type ClientOption = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

const dict: Record<Locale, { title: string; subtitle: string; loading: string; empty: string; signOut: string }> = {
  pt: { title: "Escolha a conta", subtitle: "Selecione com qual cliente você quer entrar", loading: "Carregando...", empty: "Nenhum cliente vinculado à sua conta", signOut: "Sair" },
  en: { title: "Choose account", subtitle: "Select which client you want to access", loading: "Loading...", empty: "No client linked to your account", signOut: "Sign out" },
  it: { title: "Scegli l'account", subtitle: "Seleziona con quale cliente vuoi entrare", loading: "Caricamento...", empty: "Nessun cliente collegato al tuo account", signOut: "Esci" },
  es: { title: "Elige la cuenta", subtitle: "Selecciona con qué cliente quieres entrar", loading: "Cargando...", empty: "Ningún cliente vinculado a tu cuenta", signOut: "Salir" },
  sv: { title: "Välj konto", subtitle: "Välj vilken klient du vill använda", loading: "Laddar...", empty: "Ingen klient kopplad till ditt konto", signOut: "Logga ut" },
};

const SelectClientPage = () => {
  const navigate = useNavigate();
  const appLogo = useAppLogo();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const locale: Locale = (localStorage.getItem("login_locale") as Locale) || "pt";
  const t = dict[locale] || dict.pt;

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) {
        navigate("/login", { replace: true });
        return;
      }
      const { data: assignments } = await supabase
        .from("user_client_assignments")
        .select("client_id")
        .eq("user_id", userId);

      const ids = (assignments || []).map((a) => a.client_id);
      if (ids.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const { data: rows } = await supabase
        .from("clients")
        .select("id, name, slug, logo_url")
        .in("id", ids)
        .order("name");

      const list = (rows || []) as ClientOption[];

      // If only one client, go straight in.
      if (list.length === 1) {
        navigate(`/client/${list[0].slug}`, { replace: true });
        return;
      }

      setClients(list);
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          {appLogo && (
            <img src={appLogo} alt="Logo" className="h-14 w-14 rounded-xl object-contain mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            {t.empty}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/client/${c.slug}`)}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {c.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">/{c.slug}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" />
            {t.signOut}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectClientPage;
