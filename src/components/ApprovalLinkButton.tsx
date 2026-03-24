import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface ApprovalLinkButtonProps {
  clientId: string;
  postId?: string;
  postTitle?: string;
  variant?: "individual" | "batch";
  className?: string;
}

export const ApprovalLinkButton = ({
  clientId,
  postId,
  postTitle,
  variant = "individual",
  className,
}: ApprovalLinkButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");

  const generateToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    for (const byte of array) {
      result += chars[byte % chars.length];
    }
    return result;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Get client expiration config
      const { data: client } = await supabase
        .from("clients")
        .select("link_expiration_days")
        .eq("id", clientId)
        .maybeSingle();

      const expirationDays = (client as any)?.link_expiration_days || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const { data: user } = await supabase.auth.getUser();
      const token = generateToken();

      const { error } = await supabase.from("approval_tokens").insert({
        client_id: clientId,
        post_id: variant === "individual" ? postId : null,
        token,
        token_type: variant,
        created_by: user?.user?.id || null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      const generatedLink = `${window.location.origin}/aprovacao/${token}`;
      setLink(generatedLink);
      setOpen(true);
    } catch {
      toast.error("Erro ao gerar link de aprovação.");
    }
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  const shareWhatsApp = () => {
    const text = variant === "individual"
      ? `Olá! Confira e aprove o post "${postTitle}": ${link}`
      : `Olá! Confira os posts pendentes de aprovação: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className={className}
        title={variant === "batch" ? "Enviar todos para aprovação" : "Enviar para aprovação"}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {variant === "batch" && <span className="ml-1 text-xs">Enviar para aprovação</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Link de aprovação
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Link gerado:</p>
              <p className="text-sm font-mono break-all text-foreground">{link}</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button onClick={copyLink} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copiar link
              </Button>
              <Button onClick={shareWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Send className="h-4 w-4 mr-2" />
                Enviar via WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(link, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir link
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              O cliente pode aprovar ou solicitar ajustes sem precisar de login.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
