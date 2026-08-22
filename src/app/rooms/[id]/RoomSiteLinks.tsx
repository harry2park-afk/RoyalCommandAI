"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, Link2, Plus, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";

type SiteLink = { name: string; url: string };
type RoomRecord = { name?: string; description?: string };

const MARKER_START = "[RC_SITE_LINKS_V1]";
const MARKER_END = "[/RC_SITE_LINKS_V1]";

const ACCOUNTING_AU_SITES: SiteLink[] = [
  { name: "ATO Online Services", url: "https://onlineservices.ato.gov.au/" },
  { name: "ASIC Connect", url: "https://asicconnect.asic.gov.au/" },
  { name: "Australian Business Register", url: "https://www.abr.gov.au/" },
  { name: "Tax Practitioners Board", url: "https://www.tpb.gov.au/" },
  { name: "Fair Work Ombudsman", url: "https://www.fairwork.gov.au/" },
  { name: "Xero", url: "https://login.xero.com/" },
  { name: "MYOB", url: "https://app.myob.com/" },
  { name: "QuickBooks Online", url: "https://qbo.intuit.com/" },
];

const HOBBY_GAME_SITES: SiteLink[] = [
  { name: "Chess.com", url: "https://www.chess.com/" },
  { name: "Lichess", url: "https://lichess.org/" },
  { name: "Steam", url: "https://store.steampowered.com/" },
  { name: "PlayStation", url: "https://www.playstation.com/" },
  { name: "Xbox", url: "https://www.xbox.com/" },
];

function normaliseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function extractLinks(description: string) {
  const start = description.indexOf(MARKER_START);
  const end = description.indexOf(MARKER_END);
  if (start < 0 || end <= start) return [] as SiteLink[];
  const raw = description.slice(start + MARKER_START.length, end).trim();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.name === "string" && typeof item.url === "string")
      .map((item) => ({ name: item.name.slice(0, 80), url: normaliseUrl(item.url) }))
      .filter((item) => Boolean(item.name && item.url))
      .slice(0, 30);
  } catch {
    return [];
  }
}

function writeLinks(description: string, links: SiteLink[]) {
  const start = description.indexOf(MARKER_START);
  const end = description.indexOf(MARKER_END);
  const base = start >= 0 && end > start
    ? `${description.slice(0, start).trimEnd()}${description.slice(end + MARKER_END.length)}`.trim()
    : description.trim();
  const block = `${MARKER_START}\n${JSON.stringify(links)}\n${MARKER_END}`;
  return base ? `${base}\n\n${block}` : block;
}

export default function RoomSiteLinks() {
  const params = useParams<{ id: string }>();
  const roomId = params?.id || "";
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [customLinks, setCustomLinks] = useState<SiteLink[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomId) return;
    void fetch(`/api/rooms/${encodeURIComponent(roomId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const nextRoom = payload?.room as RoomRecord | undefined;
        if (!nextRoom) return;
        setRoom(nextRoom);
        setCustomLinks(extractLinks(String(nextRoom.description || "")));
      })
      .catch(() => undefined);
  }, [roomId]);

  const roomKind = useMemo(() => {
    const text = `${room?.name || ""}\n${room?.description || ""}`.toLowerCase();
    if (/(accounting|tax office|bookkeeping|gst|bas|payroll)/.test(text)) return "accounting";
    if (/(hobby|game|gaming|esports|chess|janggi|baduk|go room|board game)/.test(text)) return "hobby";
    return "general";
  }, [room]);

  const presetLinks = roomKind === "accounting" ? ACCOUNTING_AU_SITES : roomKind === "hobby" ? HOBBY_GAME_SITES : [];
  const allLinks = [...presetLinks, ...customLinks].filter((item, index, items) =>
    items.findIndex((candidate) => candidate.url === item.url) === index
  );

  async function persist(nextLinks: SiteLink[]) {
    if (!roomId || !room) return false;
    setSaving(true);
    setError("");
    try {
      const description = writeLinks(String(room.description || ""), nextLinks);
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!response.ok) throw new Error("Could not save site links.");
      setRoom((current) => current ? { ...current, description } : current);
      setCustomLinks(nextLinks);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save site links.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addSite(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim().slice(0, 80);
    const cleanUrl = normaliseUrl(url);
    if (!cleanName || !cleanUrl) {
      setError("Enter a site name and a valid web address.");
      return;
    }
    const next = [...customLinks.filter((item) => item.url !== cleanUrl), { name: cleanName, url: cleanUrl }].slice(-30);
    if (await persist(next)) {
      setName("");
      setUrl("");
    }
  }

  async function removeCustom(urlToRemove: string) {
    await persist(customLinks.filter((item) => item.url !== urlToRemove));
  }

  const roomName = String(room?.name || "").trim().toLowerCase();
  if (!room || roomName === "command room") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-[184px] top-[52px] z-[355] flex h-8 items-center gap-1.5 rounded-md border border-[#d7bb68]/70 bg-[#0b1725]/95 px-3 text-[10px] font-semibold text-[#f3d98c] shadow-lg hover:border-[#d7bb68]"
        title={roomKind === "accounting" ? "Accounting Sites" : "My Sites"}
      >
        <Link2 size={13} /> {roomKind === "accounting" ? "Accounting Sites" : "My Sites"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[520] flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label="Saved sites">
          <section className="h-full w-full max-w-[430px] overflow-y-auto border-l border-[#d7bb68]/60 bg-[#08131f] p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-sm font-semibold text-[#f3d98c]">{roomKind === "accounting" ? "Accounting Sites" : "My Sites"}</div>
                <div className="mt-1 text-[11px] leading-4 text-white/55">Add any service or website you already use and open it from this Room. Royal Command stores links only, never passwords.</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-white/65 hover:bg-white/5" title="Close"><X size={15} /></button>
            </div>

            <div className="mt-4 space-y-1">
              {allLinks.map((site) => {
                const isCustom = customLinks.some((item) => item.url === site.url);
                return (
                  <div key={site.url} className="flex items-center gap-2 border-b border-white/8 py-2">
                    <a href={site.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-semibold hover:text-[#f3d98c]">
                      <ExternalLink size={13} className="shrink-0" />
                      <span className="truncate">{site.name}</span>
                    </a>
                    {isCustom ? (
                      <button type="button" disabled={saving} onClick={() => void removeCustom(site.url)} className="grid h-7 w-7 place-items-center text-white/45 hover:text-red-300" title="Remove"><Trash2 size={13} /></button>
                    ) : null}
                  </div>
                );
              })}
              {!allLinks.length ? <div className="py-5 text-center text-[11px] text-white/45">No sites added yet.</div> : null}
            </div>

            <form onSubmit={addSite} className="mt-5 rounded-xl border border-[#d7bb68]/25 bg-white/[0.02] p-3">
              <div className="text-xs font-semibold text-[#f3d98c]">Add Your Site</div>
              <input value={name} onChange={(event) => setName(event.target.value)} className="rc-input mt-3" placeholder="Site name" maxLength={80} />
              <input value={url} onChange={(event) => setUrl(event.target.value)} className="rc-input mt-2" placeholder="https://..." inputMode="url" />
              {error ? <div className="mt-2 text-[11px] text-red-300">{error}</div> : null}
              <button type="submit" disabled={saving} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#d7bb68] text-xs font-semibold text-black disabled:opacity-50"><Plus size={14} /> {saving ? "Saving…" : "Add Site"}</button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
