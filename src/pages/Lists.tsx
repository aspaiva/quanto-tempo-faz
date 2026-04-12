import { useState, useEffect } from "react";
import { Plus, Clock, LogOut, ArrowLeft, Share2, Trash2, Pencil, Users, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EventList, loadLists, createList, updateList, deleteList, joinListById } from "@/lib/lists";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Lists = () => {
  const [lists, setLists] = useState<EventList[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingList, setEditingList] = useState<EventList | null>(null);
  const [editName, setEditName] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadLists()
      .then(setLists)
      .catch(() => toast.error("Erro ao carregar listas"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const list = await createList(newName.trim());
      setLists((prev) => [list, ...prev]);
      setNewName("");
      setCreateOpen(false);
      toast.success("Lista criada");
    } catch (e: any) {
      console.error("Erro ao criar lista:", e);
      toast.error(e?.message || "Erro ao criar lista");
    }
  };

  const handleUpdate = async () => {
    if (!editingList || !editName.trim()) return;
    try {
      await updateList(editingList.id, editName.trim());
      setLists((prev) => prev.map((l) => (l.id === editingList.id ? { ...l, name: editName.trim() } : l)));
      setEditingList(null);
      toast.success("Lista atualizada");
    } catch (e: any) {
      console.error("Erro ao atualizar lista:", e);
      toast.error(e?.message || "Erro ao atualizar lista");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lista excluída");
    } catch (e: any) {
      console.error("Erro ao excluir lista:", e);
      toast.error(e?.message || "Erro ao excluir lista");
    }
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    try {
      await joinListById(joinId.trim());
      const updated = await loadLists();
      setLists(updated);
      setJoinId("");
      setJoinOpen(false);
      toast.success("Você entrou na lista!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao entrar na lista");
    }
  };

  const copyLink = (id: string) => {
    const baseUrl = "https://quantotempofaz.lovable.app";
    const link = `${baseUrl}/lists/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground">Minhas Listas</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/")} variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Eventos
            </Button>
            <Button onClick={() => setJoinOpen(true)} variant="outline" size="sm" className="gap-1.5">
              <Link2 className="h-4 w-4" /> Entrar em lista
            </Button>
            <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova lista
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon" className="h-9 w-9" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 rounded-full bg-secondary p-5">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">Nenhuma lista criada</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Crie listas para agrupar eventos e compartilhar com outras pessoas.
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Criar lista
              </Button>
              <Button onClick={() => setJoinOpen(true)} variant="outline" className="gap-1.5">
                <Link2 className="h-4 w-4" /> Entrar em lista
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lists.map((list) => (
              <div
                key={list.id}
                className="group flex items-center gap-4 rounded-lg border border-border/60 bg-card px-4 py-4 transition-shadow hover:shadow-sm cursor-pointer"
                onClick={() => navigate(`/lists/${list.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-base font-semibold text-foreground">{list.name}</span>
                    {!list.is_owner && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Compartilhada
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {list.event_count} {list.event_count === 1 ? "evento" : "eventos"}
                  </p>
                </div>

                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  {list.is_owner && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Copiar link para compartilhar"
                        onClick={() => copyLink(list.id)}
                      >
                        {copiedId === list.id ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingList(list);
                          setEditName(list.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(list.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create list dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Nova lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da lista"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full">
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit list dialog */}
      <Dialog open={!!editingList} onOpenChange={(o) => !o && setEditingList(null)}>
        <DialogContent className="font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Editar lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da lista"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={80}
              onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            />
            <Button onClick={handleUpdate} disabled={!editName.trim()} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join list dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Entrar em uma lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Cole o ID da lista compartilhada por outra pessoa.</p>
            <Input
              placeholder="ID da lista"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button onClick={handleJoin} disabled={!joinId.trim()} className="w-full">
              Entrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lists;
