import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

export function StorageCleanupButton() {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orphanCount, setOrphanCount] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  const scan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-orphaned-files", {
        body: { dryRun: true, olderThanHours: 24 },
      });
      if (error) throw error;
      const count = data?.orphanCount ?? 0;
      const bytes = data?.totalBytes ?? 0;
      setOrphanCount(count);
      setTotalBytes(bytes);
      if (count === 0) {
        toast({ title: "Nada para limpar", description: "Nenhum arquivo órfão encontrado." });
      } else {
        setConfirmOpen(true);
      }
    } catch (e: any) {
      toast({ title: "Erro ao verificar", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cleanup-orphaned-files", {
        body: { dryRun: false, olderThanHours: 24 },
      });
      if (error) throw error;
      toast({
        title: "Limpeza concluída",
        description: `${data?.deleted ?? 0} arquivos removidos (${formatBytes(data?.freedBytes ?? 0)} liberados).`,
      });
      setConfirmOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={scan} disabled={scanning} title="Limpar arquivos órfãos do armazenamento">
        {scanning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
        Limpar storage
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar limpeza de armazenamento</AlertDialogTitle>
            <AlertDialogDescription className="text-white/90">
              Foram encontrados <strong className="text-white">{orphanCount}</strong> arquivos órfãos ocupando aproximadamente{" "}
              <strong className="text-white">{formatBytes(totalBytes)}</strong>. Esses arquivos não estão vinculados a nenhum post, pauta,
              calendário ou fatura. Deseja excluir permanentemente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Excluir {orphanCount} arquivos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
