import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { CheckCircle2, Clock, FileX, Pen } from "lucide-react";
import { useAppLogo } from "@/hooks/useAppLogo";
import { ProposalLocale, getProposalT } from "@/i18n/proposalTranslations";

interface ProposalService {
  name: string;
  description: string;
  value: number;
}

interface ProposalData {
  id: string;
  client_name: string;
  scope_description: string;
  investment_description: string;
  services: ProposalService[];
  total_value: number;
  currency: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_name: string;
  created_at: string;
  locale: ProposalLocale;
}

export default function PublicProposalPage() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [acceptName, setAcceptName] = useState("");
  const [acceptSignature, setAcceptSignature] = useState("");
  const [acceptEmail, setAcceptEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const appLogo = useAppLogo();

  const loc: ProposalLocale = proposal?.locale || "pt";
  const t = getProposalT(loc);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      const p: ProposalData = {
        ...data,
        services: Array.isArray(data.services) ? data.services as any : JSON.parse(data.services as string || "[]"),
        locale: ((data as any).locale || "pt") as ProposalLocale,
      };

      if (new Date(p.expires_at) < new Date()) {
        setExpired(true);
        if (p.status !== "expired") {
          await supabase.from("proposals").update({ status: "expired" as any }).eq("id", p.id);
        }
      } else if (p.status === "accepted") {
        setAccepted(true);
      } else {
        if (p.status === "sent" || p.status === "draft") {
          await supabase
            .from("proposals")
            .update({ status: "viewed" as any, viewed_at: new Date().toISOString() })
            .eq("id", p.id);
        }
      }

      setProposal(p);
      setLoading(false);
      setTimeout(() => setAnimateIn(true), 100);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!acceptName.trim()) {
      toast({ title: t("enterFullName"), variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("proposals")
      .update({
        status: "accepted" as any,
        accepted_at: new Date().toISOString(),
        accepted_name: acceptName.trim(),
        accepted_signature: acceptSignature.trim(),
      })
      .eq("id", proposal!.id);
    setSubmitting(false);
    if (error) {
      toast({ title: t("errorAccepting"), variant: "destructive" });
    } else {
      setAccepted(true);
      setAcceptOpen(false);
      toast({ title: t("proposalAccepted") });
    }
  };

  const getTimeRemaining = () => {
    if (!proposal) return "";
    const now = new Date();
    const exp = new Date(proposal.expires_at);
    const days = differenceInDays(exp, now);
    if (days > 0) return `${days} ${days > 1 ? t("days") : t("day")}`;
    const hours = differenceInHours(exp, now);
    if (hours > 0) return `${hours} ${hours > 1 ? t("hours") : t("hour")}`;
    const mins = differenceInMinutes(exp, now);
    return `${Math.max(0, mins)} ${mins !== 1 ? t("minutes") : t("minute")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white/70 gap-4">
        <FileX className="h-16 w-16 text-white/20" />
        <h1 className="text-2xl font-light tracking-wide">{t("proposalNotFound")}</h1>
        <p className="text-sm text-white/40">{t("notFoundMessage")}</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white/70 gap-6 px-6">
        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-xl border border-white/10">
          <Clock className="h-10 w-10 text-white/30" />
        </div>
        <h1 className="text-3xl font-extralight tracking-widest text-white/80">{t("proposalExpired")}</h1>
        <p className="text-sm text-white/40 max-w-md text-center leading-relaxed">
          {t("expiredMessage")}
        </p>
        {appLogo && <img src={appLogo} alt="Logo" className="h-8 mt-8 opacity-30" />}
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white/70 gap-6 px-6">
        <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center backdrop-blur-xl border border-emerald-500/20">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-extralight tracking-widest text-white/80">{t("acceptedTitle")}</h1>
        <p className="text-sm text-white/40 max-w-md text-center leading-relaxed">
          {proposal.accepted_name
            ? t("acceptedBy").replace("{name}", proposal.accepted_name)
            : t("acceptedGeneric")}
        </p>
        {appLogo && <img src={appLogo} alt="Logo" className="h-8 mt-8 opacity-30" />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white/90 selection:bg-white/20">
      {/* Banner */}
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-6">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="h-8 opacity-80" />
          ) : (
            <span className="text-lg font-light tracking-[0.2em] uppercase text-white/60">{t("proposal")}</span>
          )}
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Clock className="h-3.5 w-3.5" />
            <span>{t("expiresIn")} {getTimeRemaining()}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 space-y-12">
        {/* Greeting */}
        <div
          className={`transition-all duration-700 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <p className="text-sm text-white/40 uppercase tracking-widest mb-2">{t("proposalFor")}</p>
          <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">{proposal.client_name}</h1>
        </div>

        {/* Scope */}
        {proposal.scope_description && (
          <section
            className={`transition-all duration-700 delay-150 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">{t("projectScope")}</h2>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8">
              <p className="text-sm md:text-base leading-relaxed text-white/70 whitespace-pre-line">
                {proposal.scope_description}
              </p>
            </div>
          </section>
        )}

        {/* Services */}
        <section
          className={`transition-all duration-700 delay-300 ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">{t("services")}</h2>
          <div className="space-y-3">
            {proposal.services.map((svc, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-xl px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-white/80">{svc.name}</p>
                  {svc.description && (
                    <p className="text-xs text-white/40 mt-0.5">{svc.description}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-white/60 shrink-0 ml-4">
                  {formatCurrency(svc.value, proposal.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Investment */}
        <section
          className={`transition-all duration-700 delay-[450ms] ${animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="text-xs uppercase tracking-[0.25em] text-white/40 mb-4">{t("investment")}</h2>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-6 md:p-8">
            <div className="flex items-end justify-between mb-4">
              <span className="text-sm text-white/50">{t("total")}</span>
              <span className="text-3xl md:text-4xl font-extralight tracking-tight">
                {formatCurrency(proposal.total_value, proposal.currency)}
              </span>
            </div>
            {proposal.investment_description && (
              <p className="text-xs text-white/40 leading-relaxed whitespace-pre-line border-t border-white/5 pt-4">
                {proposal.investment_description}
              </p>
            )}
          </div>
        </section>
      </main>

      {/* Floating Accept Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-6">
        <button
          onClick={() => setAcceptOpen(true)}
          className="flex items-center gap-2.5 rounded-full bg-white text-[#0a0a0f] px-8 py-3.5 text-sm font-medium shadow-2xl shadow-white/10 hover:shadow-white/20 hover:scale-[1.02] transition-all duration-300"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t("acceptProposal")}
        </button>
      </div>

      {/* Accept Dialog */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{t("acceptTitle")}</DialogTitle>
            <DialogDescription className="text-white/40">
              {t("acceptDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-white/60">{t("fullName")}</Label>
              <Input
                value={acceptName}
                onChange={(e) => setAcceptName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60">{t("digitalSignature")}</Label>
              <div className="relative">
                <Pen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={acceptSignature}
                  onChange={(e) => setAcceptSignature(e.target.value)}
                  placeholder={t("signaturePlaceholder")}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 italic font-serif text-lg"
                />
              </div>
            </div>
            <Button
              className="w-full bg-white text-[#0a0a0f] hover:bg-white/90"
              onClick={handleAccept}
              disabled={submitting}
            >
              {submitting ? t("processing") : t("confirmAccept")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
