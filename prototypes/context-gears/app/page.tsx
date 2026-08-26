"use client";

import { useEffect, useMemo, useState } from "react";

type Block = { id: string; category: string; title: string; body: string };
type Entry = {
  id: number; blockId: string; kind: "note" | "correction" | "expansion" | "revision";
  status: "unresolved" | "experimental" | "accepted" | "disputed" | "revised";
  category: string; body: string; createdAt: string;
};

const seedBlocks: Block[] = [
  { id: "cavity-pair", category: "quantum", title: "Paired cavity state", body: "Two boron-defined cavities form a differential logical cell. One controlled carrier is shared across the pair, while amplitude and phase encode the relationship between the cavities." },
  { id: "opposed-pulses", category: "magnetics", title: "Opposing pulse cycle", body: "Cavity A and cavity B receive phase-locked drives separated by 180 degrees. The field between them is the active region, and the pulse must preserve the stored relationship rather than force an ordinary alternating switch." },
  { id: "color-router", category: "optical", title: "Color-addressed routing", body: "Red routes, blue imports, yellow extracts, green connects, purple assimilates, and orange selects. Each wavelength addresses the same stored information through a different physical transition." },
  { id: "measurement-rule", category: "validation", title: "Measurement boundary", body: "The device remains an experimental quantum proposal until coherent phase, oscillation, and interference are measured. Synchronized classical switching is retained as the first useful hardware milestone." },
];
const kindOptions = ["note", "correction", "expansion", "revision"] as const;
const statusOptions = ["unresolved", "experimental", "accepted", "disputed", "revised"] as const;

export default function Home() {
  const [blocks, setBlocks] = useState(seedBlocks);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [kind, setKind] = useState<Entry["kind"]>("expansion");
  const [status, setStatus] = useState<Entry["status"]>("unresolved");
  const [category, setCategory] = useState("research");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("Select a gear beside any paragraph.");
  const activeBlock = useMemo(() => blocks.find((block) => block.id === selected) ?? null, [blocks, selected]);
  const activeEntries = entries.filter((entry) => entry.blockId === selected);

  useEffect(() => {
    fetch("/api/context-entries").then((response) => response.json()).then((data) => setEntries(data.entries ?? []))
      .catch(() => setNotice("History is temporarily offline; the document is still editable."));
  }, []);

  function openBlock(id: string) {
    setSelected(id);
    const block = blocks.find((item) => item.id === id);
    setCategory(block?.category ?? "research"); setDraft(""); setNotice(`Focused on ${block?.title ?? "selected block"}.`);
  }

  async function saveEntry() {
    if (!activeBlock || !draft.trim()) return;
    setSaving(true); setNotice("Recording token edit…");
    try {
      const response = await fetch("/api/context-entries", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ blockId: activeBlock.id, kind, status, category, body: draft }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Save failed");
      setEntries((current) => [...current, data.entry]);
      if (kind === "revision") setBlocks((current) => current.map((block) => block.id === activeBlock.id ? { ...block, body: draft, category } : block));
      setDraft(""); setNotice("Token edit attached to its exact paragraph.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Save failed"); } finally { setSaving(false); }
  }

  function exportHistory() {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), blocks, entries }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "context-gears-history.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <header className="topbar"><div><span className="eyebrow">Infinity research interface</span><h1>Context Gears</h1></div><button className="export" onClick={exportHistory}>Export history</button></header>
    <section className="workspace">
      <article className="document" aria-label="Editable research response">
        <div className="documentHead"><span className="modelDot" /><div><strong>Oxide Quantum Computer</strong><p>Every paragraph is an addressable token block.</p></div></div>
        {blocks.map((block, index) => <section className={`tokenBlock ${selected === block.id ? "active" : ""}`} key={block.id}>
          <button className="gear" onClick={() => openBlock(block.id)} aria-label={`Discuss ${block.title}`} title="Open focused conversation">⚙</button>
          <div className="blockMeta"><span>{String(index + 1).padStart(2, "0")}</span><span>{block.category}</span></div><h2>{block.title}</h2><p>{block.body}</p>
          <div className="threadCount">{entries.filter((entry) => entry.blockId === block.id).length} attached edits</div>
        </section>)}
      </article>
      <aside className={`focusPanel ${activeBlock ? "open" : ""}`} aria-live="polite">
        {!activeBlock ? <div className="emptyFocus"><span className="largeGear">⚙</span><h2>Pull a paragraph forward</h2><p>Use its gear to correct, expand, categorize, or revise it without losing your reading position.</p></div> : <>
          <div className="focusHead"><button className="back" onClick={() => setSelected(null)} aria-label="Close focused thread">←</button><div><span className="eyebrow">Focused context</span><h2>{activeBlock.title}</h2></div></div>
          <blockquote>{activeBlock.body}</blockquote>
          <div className="history">{activeEntries.length === 0 && <p className="muted">No edits attached yet.</p>}{activeEntries.map((entry) => <article className="entry" key={entry.id}><div><span className={`status ${entry.status}`}>{entry.status}</span><span>{entry.kind} · {entry.category}</span></div><p>{entry.body}</p><time>{new Date(entry.createdAt).toLocaleString()}</time></article>)}</div>
          <div className="composer"><div className="selectors">
            <label>Action<select value={kind} onChange={(e) => setKind(e.target.value as Entry["kind"])}>{kindOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as Entry["status"])}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Category<input value={category} onChange={(e) => setCategory(e.target.value)} /></label></div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Explain the error, add data, or write the replacement paragraph…" rows={5} />
            <button className="save" disabled={saving || !draft.trim()} onClick={saveEntry}>{saving ? "Recording…" : "Attach token edit"}</button>
          </div></>}
      </aside>
    </section>
    <footer><span>{notice}</span><span>{entries.length} recorded token edits</span></footer>
  </main>;
}
