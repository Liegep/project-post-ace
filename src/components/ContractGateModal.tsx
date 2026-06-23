import { useState } from "react";
import { usePendingContract } from "@/hooks/useContracts";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ContractGateModal() {
  const { pendingContract, checking, acceptContract } = usePendingContract();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (checking || !pendingContract || accepted) return null;

  const handleAccept = async () => {
    setAccepting(true);
    const { error } = await acceptContract(pendingContract.id);
    if (error) {
      toast({ title: "Erro ao aceitar contrato", variant: "destructive" });
    } else {
      setAccepted(true);
      toast({ title: "Contrato aceito com sucesso!" });
    }
    setAccepting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in-0 duration-500">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 fade-in-0 duration-500">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-white/10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-serif tracking-tight">
            {pendingContract.title || "Contrato de Prestação de Serviços"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Leia atentamente o contrato abaixo antes de prosseguir
          </p>
        </div>

        {/* Body */}
        <ScrollArea className="px-8 py-6 max-h-[50vh]">
          {/^\s*</.test(pendingContract.body) ? (
            <div
              className="prose prose-sm prose-invert max-w-none font-serif leading-relaxed [&_strong]:text-foreground [&_b]:text-foreground"
              dangerouslySetInnerHTML={{ __html: pendingContract.body }}
            />
          ) : (
            <div className="prose prose-sm prose-invert max-w-none font-serif leading-relaxed whitespace-pre-wrap [&_strong]:text-foreground [&_b]:text-foreground">
              {pendingContract.body}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 border-t border-white/10 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Ao clicar no botão abaixo, você confirma que leu e aceita todos os termos descritos acima.
          </p>
          <Button
            onClick={handleAccept}
            disabled={accepting}
            size="lg"
            className="w-full max-w-sm gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-pink-500 text-white font-semibold text-base h-12 rounded-xl shadow-lg transition-all duration-300"
          >
            {accepting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {accepting ? "Processando..." : "Li e Aceito os Termos"}
          </Button>
        </div>
      </div>
    </div>
  );
}
