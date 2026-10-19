import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addTags, categoryExists, relativeTime, sortNotes, type Category, type Note,
} from "@/lib/notes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notebook — a quiet place for your notes" },
      { name: "description", content: "A calm, paper-like notebook to write, tag and organise your notes." },
      { property: "og:title", content: "Notebook" },
      { property: "og:description", content: "A calm, paper-like notebook to write, tag and organise your notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotebookApp,
});

const CAT_COLORS = ["#3D5A47", "#7A5C3E", "#4A5D7A", "#6B4A6B", "#5C6B3E", "#7A4A4A"];
const uid = () => Math.random().toString(36).slice(2, 10);

function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const r = localStorage.getItem(key); if (r) setV(JSON.parse(r)); } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(v)); }, [key, v, ready]);
  return [v, setV] as const;
}

type Draft = { title: string; content: string; category: string | null; tags: string[] };

function NotebookApp() {
  const [notes, setNotes] = usePersisted<Note[]>("nb.notes", []);
  const [cats, setCats] = usePersisted<Category[]>("nb.cats", []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catError, setCatError] = useState("");
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [notes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortNotes(notes.filter((n) =>
      (!catFilter || n.category === catFilter) &&
      (!tagFilter || n.tags.includes(tagFilter)) &&
      (!q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
    ));
  }, [notes, search, catFilter, tagFilter]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCat.trim();
    if (!name) return setCatError("Give the category a name.");
    if (categoryExists(cats, name)) return setCatError(`A category called "${name}" already exists.`);
    setCats([...cats, { name, color: CAT_COLORS[cats.length % CAT_COLORS.length] ?? "#3D5A47" }]);
    setNewCat(""); setCatError("");
  };
  const deleteCategory = (name: string) => {
    if (!confirm(`Delete the category "${name}"? Its notes will be kept, without a category.`)) return;
    setCats(cats.filter((c) => c.name !== name));
    setNotes(notes.map((n) => (n.category === name ? { ...n, category: null } : n)));
    if (catFilter === name) setCatFilter(null);
  };

  const startNew = () => {
    setSelectedId(null);
    setDraft({ title: "", content: "", category: catFilter, tags: tagFilter ? [tagFilter] : [] });
  };
  const createNote = (d: Draft) => {
    const now = Date.now();
    const n: Note = { id: uid(), ...d, title: d.title.trim(), pinned: false, createdAt: now, updatedAt: now };
    setNotes((p) => [n, ...p]);
    setDraft(null); setSelectedId(n.id);
  };
  const updateNote = (id: string, patch: Partial<Note>, touch = true) =>
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch, ...(touch ? { updatedAt: Date.now() } : {}) } : n)));
  const deleteNote = (id: string) => {
    if (!confirm("Delete this note? This can't be undone.")) return;
    setNotes((p) => p.filter((n) => n.id !== id));
    setSelectedId(null);
  };

  return (
    <div className="flex min-h-screen flex-col md:h-screen md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col gap-6 bg-sidebar p-5 text-sidebar-foreground md:w-60 md:overflow-y-auto">
        <h1 className="font-serif text-2xl font-semibold">Notebook</h1>
        <button onClick={startNew} className="rounded-md bg-gold px-3 py-2 text-left text-sm font-medium text-gold-foreground hover:opacity-90">
          + New note
        </button>

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-sidebar-muted">Categories</h2>
          <ul className="space-y-0.5 text-sm">
            <li>
              <button onClick={() => setCatFilter(null)} className={`flex w-full justify-between rounded px-2 py-1 ${!catFilter ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
                <span>All notes</span><span className="text-sidebar-muted">{notes.length}</span>
              </button>
            </li>
            {cats.map((c) => (
              <li key={c.name} className="group flex items-center">
                <button onClick={() => setCatFilter(catFilter === c.name ? null : c.name)} className={`flex flex-1 items-center justify-between rounded px-2 py-1 ${catFilter === c.name ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="text-sidebar-muted">{notes.filter((n) => n.category === c.name).length}</span>
                </button>
                <button aria-label={`Delete category ${c.name}`} onClick={() => deleteCategory(c.name)} className="ml-1 px-1 text-sidebar-muted opacity-0 hover:text-sidebar-foreground group-hover:opacity-100">×</button>
              </li>
            ))}
          </ul>
          <form onSubmit={addCategory} className="mt-2">
            <input value={newCat} onChange={(e) => { setNewCat(e.target.value); setCatError(""); }} placeholder="New category…"
              className="w-full border-b border-sidebar-border bg-transparent px-2 py-1 text-sm placeholder:text-sidebar-muted focus:outline-none focus:border-sidebar-foreground" />
            {catError && <p role="alert" className="mt-1 rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground">{catError}</p>}
          </form>
        </section>

        <section>
          <h2 className="mb-2 text-xs uppercase tracking-widest text-sidebar-muted">Tags</h2>
          {allTags.length === 0 ? <p className="text-xs text-sidebar-muted">Tags you add to notes appear here.</p> : (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(([t, c]) => (
                <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)}
                  className={`rounded-full border px-2 py-0.5 text-xs ${tagFilter === t ? "border-gold bg-gold text-gold-foreground" : "border-gold text-gold hover:bg-sidebar-accent"}`}>
                  #{t} <span className="opacity-70">{c}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </aside>

      {/* List */}
      <section className="flex w-full shrink-0 flex-col border-b bg-surface md:w-[300px] md:border-b-0 md:border-r">
        <div className="border-b p-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <p className="mt-2 text-xs text-muted-foreground">
            {visible.length} {visible.length === 1 ? "note" : "notes"}
            {catFilter && <> in <b>{catFilter}</b></>}{tagFilter && <> tagged <b className="text-gold">#{tagFilter}</b></>}
          </p>
        </div>
        <ul className="max-h-96 overflow-y-auto md:max-h-none md:flex-1">
          {visible.length === 0 && (
            <li className="p-6 text-sm text-muted-foreground">
              {notes.length === 0 ? "No notes here yet. Start one from the sidebar." : "Nothing matches. Try a different search or clear the filter."}
            </li>
          )}
          {visible.map((n) => {
            const cat = cats.find((c) => c.name === n.category);
            const active = n.id === selectedId;
            return (
              <li key={n.id} className="border-b">
                <button onClick={() => { setDraft(null); setSelectedId(n.id); }}
                  className={`block w-full border-l-4 px-4 py-3 text-left ${active ? "border-l-primary bg-accent" : "border-l-transparent hover:bg-background/50"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-serif font-semibold">{n.pinned && "📌 "}{n.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(n.updatedAt)}</span>
                  </div>
                  {n.content && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.content}</p>}
                  {(cat || n.tags.length > 0) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {cat && <span className="rounded px-1.5 py-0.5 text-[11px] text-primary-foreground" style={{ background: cat.color }}>{cat.name}</span>}
                      {n.tags.map((t) => <span key={t} className="rounded-full border border-gold px-1.5 text-[11px] text-gold">#{t}</span>)}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Editor */}
      <main className="flex-1 overflow-y-auto bg-surface md:bg-background">
        {draft ? (
          <Editor key="new" initial={draft} cats={cats} isNew
            onCreate={createNote} onCancel={() => setDraft(null)} />
        ) : selected ? (
          <Editor key={selected.id} initial={selected} cats={cats} note={selected}
            onSave={(p) => updateNote(selected.id, p)}
            onPin={() => updateNote(selected.id, { pinned: !selected.pinned }, false)}
            onDelete={() => deleteNote(selected.id)} />
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center p-8 text-center text-muted-foreground">
            <p>{notes.length === 0 ? "No notes here yet. Start one from the sidebar." : "Pick a note from the list, or start a new one from the sidebar."}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Editor(props: {
  initial: Draft; cats: Category[]; isNew?: boolean; note?: Note;
  onCreate?: (d: Draft) => void; onCancel?: () => void;
  onSave?: (p: Partial<Note>) => void; onPin?: () => void; onDelete?: () => void;
}) {
  const { initial, cats, isNew, note } = props;
  const [d, setD] = useState<Draft>({ title: initial.title, content: initial.content, category: initial.category, tags: initial.tags });
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(props.onSave);
  saveRef.current = props.onSave;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const change = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    setD(next);
    if (isNew) return;
    if (!next.title.trim()) { setError("A note needs a title."); setStatus("idle"); if (timer.current) clearTimeout(timer.current); return; }
    setError(""); setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveRef.current?.({ ...next, title: next.title.trim() });
      setStatus("saved");
    }, 600);
  };

  const commitTags = (raw: string) => {
    const tags = addTags(d.tags, raw);
    setTagInput("");
    if (tags.length !== d.tags.length) change({ tags });
  };

  const create = () => {
    if (!d.title.trim()) return setError("A note needs a title.");
    commitTags(tagInput);
    props.onCreate?.({ ...d, tags: addTags(d.tags, tagInput) });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-3 text-sm">
        <select value={d.category ?? ""} onChange={(e) => change({ category: e.target.value || null })}
          className="rounded-md border bg-surface px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">No category</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {!isNew && note && (
          <>
            <button onClick={props.onPin} className={`rounded-md border px-2 py-1 ${note.pinned ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {note.pinned ? "Pinned" : "Pin"}
            </button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : `Edited ${relativeTime(note.updatedAt)}`}
            </span>
            <button onClick={props.onDelete} className="ml-auto rounded-md bg-destructive px-3 py-1 text-destructive-foreground hover:opacity-90">Delete</button>
          </>
        )}
      </div>

      <input value={d.title} onChange={(e) => change({ title: e.target.value })} placeholder="Untitled note" autoFocus={isNew}
        className="w-full rounded-md border border-transparent bg-transparent px-1 font-serif text-[28px] font-semibold placeholder:text-muted-foreground/60 focus:border-border focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ring" />
      {error && <p role="alert" className="mt-1 px-1 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
        {d.tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full border border-gold px-2 py-0.5 text-xs text-gold">
            #{t}
            <button aria-label={`Remove tag ${t}`} onClick={() => change({ tags: d.tags.filter((x) => x !== t) })} className="hover:text-foreground">×</button>
          </span>
        ))}
        <input value={tagInput} placeholder="Add tag…"
          onChange={(e) => { const v = e.target.value; if (v.includes(",")) commitTags(v); else setTagInput(v); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitTags(tagInput); }
            if (e.key === "Backspace" && !tagInput && d.tags.length) change({ tags: d.tags.slice(0, -1) });
          }}
          className="min-w-24 flex-1 bg-transparent py-0.5 text-xs placeholder:text-muted-foreground focus:outline-none" />
      </div>

      <textarea value={d.content} onChange={(e) => change({ content: e.target.value })} placeholder="Start writing…"
        className="mt-6 min-h-[50vh] w-full resize-none border-t bg-transparent px-1 pt-4 leading-7 placeholder:text-muted-foreground focus:outline-none"
        style={{ backgroundImage: "linear-gradient(transparent 27px, var(--border) 28px)", backgroundSize: "100% 28px", backgroundPositionY: "15px" }} />

      {isNew && (
        <div className="mt-4 flex gap-2">
          <button onClick={create} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Create note</button>
          <button onClick={props.onCancel} className="rounded-md border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
        </div>
      )}
    </div>
  );
}
