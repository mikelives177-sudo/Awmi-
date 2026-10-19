export type Note = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
};
export type Category = { name: string; color: string };

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

export function addTags(existing: string[], input: string): string[] {
  const out = [...existing];
  for (const part of input.split(",")) {
    const t = normalizeTag(part);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) =>
    a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.updatedAt - a.updatedAt,
  );
}

export function categoryExists(cats: Category[], name: string): boolean {
  const n = name.trim().toLowerCase();
  return cats.some((c) => c.name.toLowerCase() === n);
}

export function relativeTime(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
