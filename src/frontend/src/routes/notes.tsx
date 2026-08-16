import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Pin, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { formatId, type Note } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Note — TabLife" },
      { name: "description", content: "Ghi chú nhanh và ý tưởng cá nhân." },
    ],
  }),
  component: NotesPage,
});

function formatUpdatedAt(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NewNoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addNote = useStore((s) => s.addNote);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Note mới</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await addNote({ title, content, pinned: false });
            toast.success("Đã tạo note");
            setTitle("");
            setContent("");
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Tiêu đề *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nội dung</Label>
            <Textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết ghi chú..."
            />
          </div>
          <DialogFooter>
            <Button type="submit">Tạo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditNoteDialog({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const { updateNote, deleteNote } = useStore();
  const [draft, setDraft] = useState<Note | null>(note);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraft(note);
    setIsEditing(false);
  }, [note]);

  if (!draft) return null;

  const cancelEdit = () => {
    setDraft(note);
    setIsEditing(false);
  };

  return (
    <Dialog open={!!note} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {formatId(draft.id)}
            </span>
            {draft.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Pin className="h-3 w-3" />
                Ghim
              </span>
            )}
          </div>
          <DialogTitle className="pt-1 font-display text-2xl">
            {isEditing ? "Chỉnh sửa Note" : draft.title}
          </DialogTitle>
        </DialogHeader>
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tiêu đề</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nội dung</Label>
              <Textarea
                rows={8}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="whitespace-pre-wrap">{draft.content || "—"}</p>
            <p className="text-xs text-muted-foreground">
              Cập nhật {formatUpdatedAt(draft.updatedAt)}
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {isEditing ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await deleteNote(draft.id);
                toast.success("Đã xoá note");
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Xoá
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                const nextPinned = !draft.pinned;
                await updateNote(draft.id, { pinned: nextPinned });
                setDraft({ ...draft, pinned: nextPinned });
                toast.success(nextPinned ? "Đã ghim note" : "Đã bỏ ghim");
              }}
            >
              <Pin className={cn("h-4 w-4", draft.pinned && "fill-current")} />
              {draft.pinned ? "Bỏ ghim" : "Ghim"}
            </Button>
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>
                  Huỷ
                </Button>
                <Button
                  onClick={async () => {
                    await updateNote(draft.id, draft);
                    toast.success("Đã lưu");
                    setIsEditing(false);
                  }}
                >
                  Lưu thay đổi
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesPage() {
  const { notes, updateNote } = useStore();
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (note) => note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Note</h1>
          <p className="text-sm text-muted-foreground">
            Ghi chú nhanh, ý tưởng và checklist cá nhân.
          </p>
        </div>
        <Button className="rounded-xl" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          Note mới
        </Button>
      </div>

      <div className="relative min-w-0 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm note..."
          className="h-10 pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((note) => (
          <Card
            key={note.id}
            className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(note)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-primary-glow/15 text-primary">
                    <StickyNote className="h-5 w-5" />
                  </div>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 shrink-0",
                    note.pinned ? "text-primary" : "text-muted-foreground",
                  )}
                  onClick={async (event) => {
                    event.stopPropagation();
                    await updateNote(note.id, { pinned: !note.pinned });
                    toast.success(note.pinned ? "Đã bỏ ghim" : "Đã ghim note");
                  }}
                  aria-label={note.pinned ? `Bỏ ghim ${note.title}` : `Ghim ${note.title}`}
                >
                  <Pin className={cn("h-4 w-4", note.pinned && "fill-current")} />
                </Button>
              </div>
              <button type="button" onClick={() => setEditing(note)} className="text-left">
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {formatId(note.id)}
                </div>
                <CardTitle className="mt-1">{note.title}</CardTitle>
                <CardDescription className="line-clamp-3 whitespace-pre-wrap">
                  {note.content || "Chưa có nội dung"}
                </CardDescription>
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Cập nhật {formatUpdatedAt(note.updatedAt)}
              </p>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            Chưa có note nào
          </p>
        )}
      </div>

      <NewNoteDialog open={openNew} onOpenChange={setOpenNew} />
      <EditNoteDialog note={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
