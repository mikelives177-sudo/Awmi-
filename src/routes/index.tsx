import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronDown, FileText, Folder, Grid2X2, List, Menu, MoreHorizontal, Pin, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { addTags, categoryExists, relativeTime, sortNotes, type Category, type Note } from "@/lib/notes";
import cover from "@/assets/notebook-still-life.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Margin — a little room for your ideas" },
    { name: "description", content: "Your personal space for notes, plans, and ideas. Collect your thoughts, find your focus, and make something of them." },
    { property: "og:title", content: "Margin — a little room for your ideas" },
    { property: "og:description", content: "A personal notebook for the things you want to remember and the ideas worth coming back to." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: NotebookApp,
});
const CAT_COLORS = ["coral", "blue", "green", "violet", "yellow", "rose"];
const templates = [
  { title: "A thought worth keeping", category: "Ideas", color: "blue", content: "What if…\n\nThe idea\n\nWhy it matters\n\nOne small next step", tags: ["ideas"], caption: "Big things start with a small thought.", icon: Sparkles },
  { title: "A little more clarity", category: "Personal", color: "yellow", content: "On my mind\n\nWhat feels good\n\nWhat I can let go of\n\nSomething to look forward to", tags: ["journal"], caption: "Get it out of your head and onto a page.", icon: FileText },
  { title: "Make room for a plan", category: "Work", color: "green", content: "The goal\n\nWhat needs to happen\n\nFirst steps\n\nA little reminder", tags: ["plans"], caption: "A fresh page for your next chapter.", icon: ArrowUpRight },
];
type Draft = { title: string; content: string; category: string | null; tags: string[] };
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw)); } catch {} setReady(true); }, [key]);
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(value)); }, [key, value, ready]);
  return [value, setValue] as const;
}
function NotebookApp() {
  const [notes, setNotes] = usePersisted<Note[]>("nb.notes", []);
  const [cats, setCats] = usePersisted<Category[]>("nb.cats", []);
  const [view, setView] = useState<"all" | "pinned">("all");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Note | Draft | null>(null);
  const [newCat, setNewCat] = useState("");
  const [catDialog, setCatDialog] = useState(false);
  const [catError, setCatError] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const tags = useMemo(() => [...new Set(notes.flatMap(n => n.tags))].sort(), [notes]);
  const visible = useMemo(() => { const q = search.trim().toLowerCase(); return sortNotes(notes.filter(n => (view !== "pinned" || n.pinned) && (!catFilter || n.category === catFilter) && (!tagFilter || n.tags.includes(tagFilter)) && (!q || `${n.title} ${n.content} ${n.tags.join(" ")}`.toLowerCase().includes(q)))); }, [notes, search, view, catFilter, tagFilter]);
  const openNew = () => setEditing({ title: "", content: "", category: catFilter, tags: tagFilter ? [tagFilter] : [] });
  const save = (draft: Draft, id?: string) => {
    const now = Date.now();
    if (id) setNotes(p => p.map(n => n.id === id ? { ...n, ...draft, updatedAt: now } : n));
    else { const note: Note = { ...draft, id: crypto.randomUUID(), pinned: false, createdAt: now, updatedAt: now }; setNotes(p => [note, ...p]); setEditing(note); }
  };
  const pin = (id: string) => setNotes(p => p.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const navigate = (next: "all" | "pinned", category: string | null = null) => { setView(next); setCatFilter(category); setTagFilter(null); setMobileNav(false); };
  const addCategory = (e: React.FormEvent) => { e.preventDefault(); const name = newCat.trim(); if (!name) return setCatError("Give your collection a name."); if (categoryExists(cats, name)) return setCatError("That collection already exists."); setCats(p => [...p, { name, color: CAT_COLORS[p.length % CAT_COLORS.length] ?? "coral" }]); setNewCat(""); setCatError(""); setCatDialog(false); };
  const removeCategory = (name: string) => { if (!confirm(`Delete “${name}”? Your notes will be kept.`)) return; setCats(p => p.filter(c => c.name !== name)); setNotes(p => p.map(n => n.category === name ? { ...n, category: null } : n)); if (catFilter === name) setCatFilter(null); };
  const title = catFilter || (view === "pinned" ? "Pinned notes" : "All notes");
  return <div className="workspace">
    <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
      <a href="/" className="wordmark"><span className="brand-mark">m<span>.</span></span>margin<span className="wordmark-period">.</span></a>
      <div className="workspace-name"><span className="workspace-avatar">M</span><span>My workspace<small>Personal notebook</small></span><ChevronDown size={15} /></div>
      <Button onClick={openNew} className="new-note-button"><Plus size={18} /> New note <span className="ml-auto opacity-60"><ArrowUpRight size={15} /></span></Button>
      <div className="nav-label">LIBRARY</div>
      <Button variant="ghost" className={`nav-item ${view === "all" && !catFilter ? "active" : ""}`} onClick={() => navigate("all")}><FileText />All notes<span className="nav-count">{notes.length}</span></Button>
      <Button variant="ghost" className={`nav-item ${view === "pinned" ? "active" : ""}`} onClick={() => navigate("pinned")}><Pin />Pinned<span className="nav-count">{notes.filter(n => n.pinned).length}</span></Button>
      <div className="nav-label collection-label">COLLECTIONS<Button variant="ghost" size="icon" title="New collection" aria-label="New collection" onClick={() => setCatDialog(true)}><Plus /></Button></div>
      {cats.length === 0 && <div className="no-collections">A place for every kind of thought.</div>}
      {cats.map((c, i) => <div key={c.name} className="collection-row group"><Button variant="ghost" className={`nav-item ${catFilter === c.name ? "active" : ""}`} onClick={() => navigate("all", c.name)}><span className={`collection-dot tone-${CAT_COLORS[i % CAT_COLORS.length]}`} /> <span className="truncate">{c.name}</span><span className="nav-count">{notes.filter(n => n.category === c.name).length}</span></Button><Button variant="ghost" size="icon" aria-label={`Delete collection ${c.name}`} className="collection-delete" onClick={() => removeCategory(c.name)}><X /></Button></div>)}
      {tags.length > 0 && <><div className="nav-label mt-7">YOUR TAGS</div><div className="sidebar-tags">{tags.map(t => <Button key={t} variant="ghost" size="sm" className={tagFilter === t ? "tag-selected" : ""} onClick={() => setTagFilter(tagFilter === t ? null : t)}>#{t}</Button>)}</div></>}
      <div className="sidebar-bottom"><div className="little-note"><Sparkles size={18} /><p>Good ideas need<br />a little space.</p><span>Make yourself at home.</span></div><div className="storage-status"><span />Saved on this device<MoreHorizontal size={16} /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNav(!mobileNav)}><Menu /></Button><span className="breadcrumb">My workspace <span>/</span> <b>{title}</b></span></div><div className="topbar-end"><span>A little room for your ideas</span><span className="user-avatar">M</span></div></header>
      <main className="main-content">
        <section className="welcome-banner"><img src={cover} alt="An open notebook with a green pencil, stacked books and a brass paperclip on a sunlit linen desk" width={1536} height={512} /><div className="welcome-copy"><div className="eyebrow">YOUR PERSONAL NOTEBOOK</div><h1>A little room.<br />A lot of possibilities.</h1><p>For passing thoughts and things worth keeping.</p><Button variant="ghost" onClick={openNew} className="banner-cta">Make a little space <ArrowRight size={16} /></Button></div><span className="banner-caption">THINK IT. KEEP IT. MAKE IT.</span></section>
        <div className="collection-heading"><div><div className="section-eyebrow">THE THINGS ON YOUR MIND</div><h2>{title}<span>{visible.length}</span></h2></div><Button onClick={openNew}><Plus />New note</Button></div>
        <div className="collection-toolbar"><label className="search-field"><Search size={17} /><input aria-label="Search notes" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a thought…" />{search && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setSearch("")}><X /></Button>}</label><div className="toolbar-right"><span className="sort-label">Last edited <ChevronDown size={14} /></span><div className="view-toggle"><Button variant="ghost" size="icon" aria-label="Grid view" aria-pressed={layout === "grid"} className={layout === "grid" ? "selected" : ""} onClick={() => setLayout("grid")}><Grid2X2 /></Button><Button variant="ghost" size="icon" aria-label="List view" aria-pressed={layout === "list"} className={layout === "list" ? "selected" : ""} onClick={() => setLayout("list")}><List /></Button></div></div></div>
        {tagFilter && <div className="filter-line">Tagged #{tagFilter}<Button variant="ghost" size="icon" aria-label="Clear tag filter" onClick={() => setTagFilter(null)}><X /></Button></div>}
        {visible.length > 0 ? <div className={`note-collection ${layout}`}>
          {visible.map((n, i) => <article key={n.id} className={`note-card tone-${CAT_COLORS[n.category ? Math.max(0, cats.findIndex(c => c.name === n.category)) % CAT_COLORS.length : i % CAT_COLORS.length]}`}><div className="note-card-top"><span><Folder size={13} />{n.category || "Loose thoughts"}</span><Button variant="ghost" size="icon" aria-label={`${n.pinned ? "Unpin" : "Pin"} ${n.title}`} onClick={() => pin(n.id)} className={n.pinned ? "is-pinned" : ""}><Pin size={15} /></Button></div><Button variant="ghost" className="note-open" onClick={() => setEditing(n)}><h3>{n.title}</h3><p>{n.content || "A fresh page, waiting for a thought."}</p></Button><div className="note-card-footer"><div className="note-tags">{n.tags.slice(0, 2).map(t => <span key={t}>#{t}</span>)}</div><span>{relativeTime(n.updatedAt)}</span></div></article>)}
          <Button variant="ghost" className="add-note-card" onClick={openNew}><span className="add-symbol"><Plus /></span><strong>Room for one more</strong><span>Start with a thought.</span></Button>
        </div> : notes.length === 0 && !search && view === "all" && !catFilter && !tagFilter ? <><div className="starter-intro"><span>A blank page is a good beginning.</span><span>Pick a starting point <ArrowDownToLine size={14} /></span></div><div className="note-collection grid">{templates.map(t => <article className={`note-card template-card tone-${t.color}`} key={t.title}><div className="note-card-top"><span><t.icon size={15} />{t.category}</span><span>STARTER</span></div><Button variant="ghost" className="note-open" onClick={() => setEditing({ title: t.title, content: t.content, category: null, tags: t.tags })}><h3>{t.title}</h3><p>{t.caption}</p><span className="template-link">Make it yours <ArrowUpRight size={16} /></span></Button></article>)}</div></> : <div className="empty-results"><Search size={28} /><h3>{view === "pinned" ? "Keep the good ones close." : "No thoughts found."}</h3><p>{view === "pinned" ? "Your pinned notes will gather here." : "Try another search or clear your filters."}</p><Button variant="outline" onClick={() => { setSearch(""); navigate("all"); }}>Back to all notes</Button></div>}
        <footer className="collection-footer"><span><span className="footer-dot" /> A small space for a busy mind.</span><span>Made for the everyday.</span></footer>
      </main>
    </div>
    <Dialog open={catDialog} onOpenChange={setCatDialog}><DialogContent className="bg-surface"><DialogTitle>Give your thoughts a home.</DialogTitle><DialogDescription>A new collection</DialogDescription><form onSubmit={addCategory}><input autoFocus aria-label="Collection name" placeholder="e.g. Ideas, Work, Life…" value={newCat} onChange={e => { setNewCat(e.target.value); setCatError(""); }} className="collection-input" />{catError && <p role="alert" className="text-destructive text-sm my-2">{catError}</p>}<Button type="submit" className="mt-4"><Plus />Create collection</Button></form></DialogContent></Dialog>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="editor-dialog" aria-describedby={undefined}><DialogTitle className="sr-only">Note editor</DialogTitle>{editing && <Editor key={"id" in editing ? editing.id : "new"} initial={editing} cats={cats} onSave={save} onPin={pin} onDelete={id => { if (confirm("Delete this note? This can't be undone.")) { setNotes(p => p.filter(n => n.id !== id)); setEditing(null); } }} currentNote={"id" in editing ? notes.find(n => n.id === editing.id) : undefined} />}</DialogContent></Dialog>
  </div>;
}
function Editor({ initial, cats, onSave, onPin, onDelete, currentNote }: { initial: Note | Draft; cats: Category[]; onSave: (draft: Draft, id?: string) => void; onPin: (id: string) => void; onDelete: (id: string) => void; currentNote: Note | undefined }) {
  const id = "id" in initial ? initial.id : undefined;
  const [draft, setDraft] = useState<Draft>({ title: initial.title, content: initial.content, category: initial.category, tags: initial.tags });
  const [tagInput, setTagInput] = useState("");
  const [status, setStatus] = useState(id ? "Saved on this device" : "New note");
  const [error, setError] = useState("");
  const pending = useRef<Draft | null>(null);
  const saveRef = useRef(onSave); saveRef.current = onSave;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); if (pending.current && id) saveRef.current(pending.current, id); }, [id]);
  const change = (patch: Partial<Draft>) => { const next = { ...draft, ...patch }; setDraft(next); setError(""); if (!id) return; clearTimeout(timer.current); if (!next.title.trim()) { pending.current = null; setError("Give this thought a title."); return; } pending.current = { ...next, title: next.title.trim() }; setStatus("Saving…"); timer.current = setTimeout(() => { if (pending.current) { saveRef.current(pending.current, id); pending.current = null; setStatus("Saved on this device"); } }, 600); };
  const commitTags = () => { if (tagInput.trim()) change({ tags: addTags(draft.tags, tagInput) }); setTagInput(""); };
  const exportNote = () => { const blob = new Blob([`${draft.title}\n\n${draft.content}\n\n${draft.tags.map(t => `#${t}`).join(" ")}`], { type: "text/plain" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${draft.title || "note"}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <div className="editor-inner"><div className="editor-top"><span className="editor-label"><FileText size={15} />{id ? "YOUR NOTE" : "A FRESH PAGE"}</span><div className="flex gap-1">{id && <><Button variant="ghost" size="icon" aria-label={currentNote?.pinned ? "Unpin note" : "Pin note"} title="Pin note" onClick={() => onPin(id)} className={currentNote?.pinned ? "text-primary" : ""}><Pin /></Button><Button variant="ghost" size="icon" aria-label="Delete note" title="Delete note" onClick={() => onDelete(id)}><Trash2 /></Button></>}<Button variant="ghost" size="icon" aria-label="Download note" title="Download note" onClick={exportNote}><ArrowDownToLine /></Button></div></div><input aria-label="Note title" placeholder="A thought starts here…" value={draft.title} onChange={e => change({ title: e.target.value })} className="editor-title" autoFocus={!id} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="editor-meta"><select aria-label="Note collection" value={draft.category ?? ""} onChange={e => change({ category: e.target.value || null })}><option value="">Loose thoughts</option>{cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select><span className="meta-divider" />{draft.tags.map(t => <span className="editor-tag" key={t}>#{t}<Button variant="ghost" size="icon" aria-label={`Remove tag ${t}`} onClick={() => change({ tags: draft.tags.filter(x => x !== t) })}><X /></Button></span>)}<input aria-label="Add tags" placeholder="+ Add tag" value={tagInput} onChange={e => setTagInput(e.target.value)} onBlur={commitTags} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commitTags(); } }} /></div><textarea aria-label="Note content" value={draft.content} onChange={e => change({ content: e.target.value })} placeholder="Let your thoughts find their way onto the page…" className="editor-body" /><div className="editor-bottom"><span aria-live="polite"><Check size={14} />{status}</span><span>{draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0} words</span>{!id && <Button onClick={() => { if (!draft.title.trim()) return setError("Give this thought a title."); onSave({ ...draft, title: draft.title.trim(), tags: addTags(draft.tags, tagInput) }); }}>Create note<ArrowRight /></Button>}</div></div>;
}
