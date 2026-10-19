import { describe, it, expect } from "vitest";
import { addTags, sortNotes, categoryExists, type Note } from "@/lib/notes";

const n = (id: string, pinned: boolean, updatedAt: number): Note => ({
  id, title: id, content: "", category: null, tags: [], pinned, createdAt: 0, updatedAt,
});

describe("notes rules", () => {
  it("tags are trimmed, lowercased and de-duplicated", () => {
    expect(addTags(["work"], "  Work , Ideas,ideas")).toEqual(["work", "ideas"]);
  });
  it("pinned first, then newest edited", () => {
    expect(sortNotes([n("a", false, 3), n("b", true, 1), n("c", false, 5)]).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
  it("category names are unique case-insensitively", () => {
    expect(categoryExists([{ name: "Work", color: "" }], " work ")).toBe(true);
  });
});
