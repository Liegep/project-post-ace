import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, ArrowLeft, Trash2, MoreVertical, GripVertical, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import UserProfileMenu from "@/components/UserProfileMenu";
import { MobileNav } from "@/components/MobileNav";

interface IdeaColumn {
  id: string;
  name: string;
  position: number;
  user_id: string;
}

interface Idea {
  id: string;
  column_id: string;
  user_id: string;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

const IdeasPage = () => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<IdeaColumn[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  // New column
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol] = useState(false);

  // New idea
  const [addingIdeaCol, setAddingIdeaCol] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc, setIdeaDesc] = useState("");

  // Edit idea
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Edit column
  const [editingCol, setEditingCol] = useState<IdeaColumn | null>(null);
  const [editColName, setEditColName] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [colRes, ideaRes] = await Promise.all([
      supabase.from("idea_columns").select("*").order("position"),
      supabase.from("ideas").select("*").order("position"),
    ]);

    setColumns((colRes.data as IdeaColumn[]) || []);
    setIdeas((ideaRes.data as Idea[]) || []);
    setLoading(false);
  };

  const addColumn = async () => {
    if (!newColName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("idea_columns").insert({
      name: newColName.trim(),
      user_id: user.id,
      position: columns.length,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNewColName("");
      setAddingCol(false);
      fetchAll();
    }
  };

  const deleteColumn = async (colId: string) => {
    const { error } = await supabase.from("idea_columns").delete().eq("id", colId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
    }
  };

  const updateColumn = async () => {
    if (!editingCol || !editColName.trim()) return;
    const { error } = await supabase.from("idea_columns").update({ name: editColName.trim() }).eq("id", editingCol.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEditingCol(null);
      fetchAll();
    }
  };

  const addIdea = async () => {
    if (!ideaTitle.trim() || !addingIdeaCol) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const colIdeas = ideas.filter(i => i.column_id === addingIdeaCol);

    const { error } = await supabase.from("ideas").insert({
      column_id: addingIdeaCol,
      user_id: user.id,
      title: ideaTitle.trim(),
      description: ideaDesc.trim(),
      position: colIdeas.length,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setIdeaTitle("");
      setIdeaDesc("");
      setAddingIdeaCol(null);
      fetchAll();
    }
  };

  const deleteIdea = async (ideaId: string) => {
    const { error } = await supabase.from("ideas").delete().eq("id", ideaId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchAll();
    }
  };

  const updateIdea = async () => {
    if (!editingIdea || !editTitle.trim()) return;
    const { error } = await supabase.from("ideas").update({
      title: editTitle.trim(),
      description: editDesc.trim(),
    }).eq("id", editingIdea.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEditingIdea(null);
      fetchAll();
    }
  };

  const moveIdea = async (idea: Idea, targetColId: string) => {
    const targetIdeas = ideas.filter(i => i.column_id === targetColId);
    const { error } = await supabase.from("ideas").update({
      column_id: targetColId,
      position: targetIdeas.length,
    }).eq("id", idea.id);

    if (!error) fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <MobileNav title="Ideias" />
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base md:text-xl font-bold text-foreground truncate">💡 Ideias de Pauta</h1>
        </div>
        <UserProfileMenu />
      </header>

      {/* Board */}
      <div className="p-4 md:p-6 flex gap-4 overflow-x-auto min-h-[calc(100vh-73px)]">
        {columns.map((col) => {
          const colIdeas = ideas.filter(i => i.column_id === col.id).sort((a, b) => a.position - b.position);
          return (
            <div key={col.id} className="flex-shrink-0 w-64 md:w-72">
              <div className="bg-muted rounded-lg p-3">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground text-sm">{col.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingCol(col); setEditColName(col.name); }}>
                        <Pencil className="h-4 w-4 mr-2" /> Renomear
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteColumn(col.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Ideas */}
                <div className="space-y-2 mb-3">
                  {colIdeas.map((idea) => (
                    <Card key={idea.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0" onClick={() => { setEditingIdea(idea); setEditTitle(idea.title); setEditDesc(idea.description); }}>
                            <p className="font-medium text-sm text-foreground truncate">{idea.title}</p>
                            {idea.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{idea.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {columns.filter(c => c.id !== col.id).map(targetCol => (
                                <DropdownMenuItem key={targetCol.id} onClick={() => moveIdea(idea, targetCol.id)}>
                                  Mover para {targetCol.name}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteIdea(idea.id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Add idea button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => { setAddingIdeaCol(col.id); setIdeaTitle(""); setIdeaDesc(""); }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar ideia
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add column */}
        <div className="flex-shrink-0 w-72">
          {addingCol ? (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <Input
                placeholder="Nome da coluna"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && addColumn()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addColumn}>Criar</Button>
                <Button size="sm" variant="ghost" onClick={() => setAddingCol(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start border-dashed h-12"
              onClick={() => setAddingCol(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Nova coluna
            </Button>
          )}
        </div>
      </div>

      {/* Add idea dialog */}
      <Dialog open={!!addingIdeaCol} onOpenChange={() => setAddingIdeaCol(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Ideia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título da ideia"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={ideaDesc}
              onChange={(e) => setIdeaDesc(e.target.value)}
              rows={3}
            />
            <Button onClick={addIdea} disabled={!ideaTitle.trim()} className="w-full">
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit idea dialog */}
      <Dialog open={!!editingIdea} onOpenChange={() => setEditingIdea(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ideia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Título"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Descrição"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
            />
            <Button onClick={updateIdea} disabled={!editTitle.trim()} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit column dialog */}
      <Dialog open={!!editingCol} onOpenChange={() => setEditingCol(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editColName}
              onChange={(e) => setEditColName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && updateColumn()}
            />
            <Button onClick={updateColumn} disabled={!editColName.trim()} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IdeasPage;
