import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ---------------------------------------------------------
   Prize definitions
--------------------------------------------------------- */
const PRIZES = {
  drink: { label: "A free drink", icon: "🍸" },
  tickets: { label: "2 event tickets", icon: "🎟️" },
  photobooth: { label: "A complimentary photobooth session", icon: "📸" },
  noWin: { label: "Sorry, you haven't won this time", icon: "✕" },
};
const PRIZE_ORDER = ["drink", "tickets", "photobooth"];
const PRIZE_ICON_LIST = PRIZE_ORDER.map((k) => PRIZES[k].icon);
const DECORATIVE_ICONS = ["🍺", "🥂", "🎪", "🎡", "🎶", "✨", "🌉", "🎈", "🍭", "🎷", "🥳", "🍾", "BTB"];
const ADMIN_PASSWORD = "promo2026";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(counts, cap) {
  let arr = [];
  PRIZE_ORDER.forEach((k) => {
    for (let i = 0; i < counts[k]; i++) arr.push(k);
  });
  const noWin = Math.max(cap - arr.length, 0);
  for (let i = 0; i < noWin; i++) arr.push("noWin");
  return shuffle(arr);
}

function isLive(c) {
  return c.usedCount < c.cap && (!c.expiresAt || Date.now() < c.expiresAt);
}

function wonSoFar(campaign) {
  const tally = { drink: 0, tickets: 0, photobooth: 0, noWin: 0 };
  (campaign.queue || []).slice(0, campaign.usedCount).forEach((k) => {
    tally[k] = (tally[k] || 0) + 1;
  });
  return tally;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function serial(id) {
  return "No. " + String(id).slice(-6).padStart(6, "0");
}

const GRID_SIZE = 9;

function buildGrid(prizeKey) {
  if (prizeKey !== "noWin") {
    const target = PRIZES[prizeKey].icon;
    const otherPool = shuffle(DECORATIVE_ICONS.filter((i) => i !== target));
    const fillers = otherPool.slice(0, GRID_SIZE - 3);
    return shuffle([target, target, target, ...fillers]);
  }
  const pool = shuffle([...PRIZE_ICON_LIST, ...DECORATIVE_ICONS]);
  const pairIcons = pool.slice(0, 3);
  const singleIcons = pool.slice(3, 6);
  const cells = [...pairIcons.flatMap((icon) => [icon, icon]), ...singleIcons];
  return shuffle(cells);
}

/* ---------------------------------------------------------
   Scratch card canvas
--------------------------------------------------------- */
function ScratchPanel({ prizeKey, onRevealed }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scratchingRef = useRef(false);
  const revealedRef = useRef(false);
  const [justRevealed, setJustRevealed] = useState(false);
  const W = 300,
    H = 260;

  const symbols = useMemo(() => buildGrid(prizeKey), [prizeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#ffcf5c");
    grad.addColorStop(0.5, "#ffb400");
    grad.addColorStop(1, "#c47f00");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (let x = -H; x < W; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(22,24,41,0.55)";
    ctx.font = "700 15px 'Bebas Neue', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH TO REVEAL", W / 2, H / 2);
  }, []);

  const pctCleared = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0,
      total = 0;
    for (let i = 3; i < data.length; i += 4 * 6) {
      total++;
      if (data[i] < 40) cleared++;
    }
    return cleared / total;
  }, []);

  const scratchAt = useCallback(
    (clientX, clientY) => {
      if (revealedRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;
      const ctx = canvas.getContext("2d");
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      if (pctCleared() > 0.88) {
        revealedRef.current = true;
        canvas.style.transition = "opacity 1s ease";
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
        setJustRevealed(true);
        setTimeout(() => onRevealed(), 2600);
      }
    },
    [onRevealed, pctCleared]
  );

  useEffect(() => {
    const el = containerRef.current;
    const down = (e) => {
      scratchingRef.current = true;
      const t = e.touches ? e.touches[0] : e;
      scratchAt(t.clientX, t.clientY);
    };
    const move = (e) => {
      if (!scratchingRef.current) return;
      if (e.touches) e.preventDefault();
      const t = e.touches ? e.touches[0] : e;
      scratchAt(t.clientX, t.clientY);
    };
    const up = () => {
      scratchingRef.current = false;
    };
    el.addEventListener("mousedown", down);
    el.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    return () => {
      el.removeEventListener("mousedown", down);
      el.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
    };
  }, [scratchAt]);

  return (
    <div ref={containerRef} className="scratchWrap">
      <div className="symbolsRow">
        {symbols.map((s, i) => (
          <div className="symbolCell" key={i}>
            {s === "BTB" ? <span className="brandBadge">BTB</span> : s}
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="scratchCanvas" />
      {justRevealed && <div className="revealingTag">Revealing your result…</div>}
    </div>
  );
}

/* ---------------------------------------------------------
   Ticket frame wrapper (shared visual identity)
--------------------------------------------------------- */
const BUNTING_COLORS = ["var(--tube-red)", "var(--gold)", "var(--coral)", "var(--teal)", "var(--gold)"];

function BackgroundArt() {
  const spokes = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    return {
      x1: 100 + Math.cos(angle) * 14,
      y1: 100 + Math.sin(angle) * 14,
      x2: 100 + Math.cos(angle) * 82,
      y2: 100 + Math.sin(angle) * 82,
    };
  });
  return (
    <>
      <svg className="bgArt bgArtEye" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="82" fill="none" stroke="var(--teal)" strokeWidth="3" />
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--teal)" strokeWidth="1.5" />
        ))}
        <circle cx="100" cy="100" r="14" fill="none" stroke="var(--teal)" strokeWidth="3" />
        <rect x="94" y="178" width="12" height="16" fill="var(--teal)" />
      </svg>
      <svg className="bgArt bgArtStein" viewBox="0 0 160 200" aria-hidden="true">
        <path
          d="M35 55 h70 v120 a10 10 0 0 1 -10 10 h-50 a10 10 0 0 1 -10 -10 Z"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="4"
        />
        <path d="M105 75 h20 a14 14 0 0 1 14 14 v40 a14 14 0 0 1 -14 14 h-20" fill="none" stroke="var(--gold)" strokeWidth="4" />
        <path d="M35 55 q35 -25 70 0" fill="none" stroke="var(--gold)" strokeWidth="4" />
        <line x1="45" y1="42" x2="45" y2="28" stroke="var(--gold)" strokeWidth="3" />
        <line x1="60" y1="38" x2="60" y2="22" stroke="var(--gold)" strokeWidth="3" />
        <line x1="75" y1="42" x2="75" y2="28" stroke="var(--gold)" strokeWidth="3" />
      </svg>
      <svg className="bgArt bgArtCocktail" viewBox="0 0 140 200" aria-hidden="true">
        <path d="M20 20 h100 l-50 60 Z" fill="none" stroke="var(--coral)" strokeWidth="4" />
        <line x1="70" y1="80" x2="70" y2="150" stroke="var(--coral)" strokeWidth="4" />
        <line x1="40" y1="170" x2="100" y2="170" stroke="var(--coral)" strokeWidth="4" />
        <line x1="70" y1="150" x2="70" y2="170" stroke="var(--coral)" strokeWidth="4" />
        <circle cx="88" cy="34" r="7" fill="none" stroke="var(--coral)" strokeWidth="3" />
        <line x1="82" y1="34" x2="60" y2="46" stroke="var(--coral)" strokeWidth="3" />
      </svg>
      <svg className="bgArt bgArtDecks" viewBox="0 0 220 140" aria-hidden="true">
        <circle cx="55" cy="70" r="48" fill="none" stroke="var(--tube-red)" strokeWidth="3.5" />
        <circle cx="55" cy="70" r="14" fill="none" stroke="var(--tube-red)" strokeWidth="3" />
        <line x1="88" y1="38" x2="108" y2="20" stroke="var(--tube-red)" strokeWidth="3.5" />
        <circle cx="165" cy="70" r="48" fill="none" stroke="var(--tube-red)" strokeWidth="3.5" />
        <circle cx="165" cy="70" r="14" fill="none" stroke="var(--tube-red)" strokeWidth="3" />
        <line x1="132" y1="38" x2="112" y2="20" stroke="var(--tube-red)" strokeWidth="3.5" />
        <rect x="95" y="46" width="30" height="48" rx="4" fill="none" stroke="var(--tube-red)" strokeWidth="3" />
        <line x1="103" y1="56" x2="103" y2="84" stroke="var(--tube-red)" strokeWidth="2.5" />
        <line x1="110" y1="56" x2="110" y2="84" stroke="var(--tube-red)" strokeWidth="2.5" />
        <line x1="117" y1="56" x2="117" y2="84" stroke="var(--tube-red)" strokeWidth="2.5" />
      </svg>
    </>
  );
}

function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 400 90" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <rect x="0" y="55" width="400" height="35" fill="var(--ink-soft)" />
      <rect x="18" y="30" width="26" height="25" fill="var(--ink-softer)" />
      <rect x="52" y="20" width="18" height="35" fill="var(--ink-softer)" />
      <circle cx="120" cy="40" r="34" fill="none" stroke="var(--teal)" strokeWidth="2.5" opacity="0.55" />
      <circle cx="120" cy="40" r="3" fill="var(--teal)" opacity="0.55" />
      <line x1="120" y1="40" x2="120" y2="6" stroke="var(--teal)" strokeWidth="1" opacity="0.4" />
      <line x1="120" y1="40" x2="120" y2="74" stroke="var(--teal)" strokeWidth="1" opacity="0.4" />
      <line x1="120" y1="40" x2="86" y2="40" stroke="var(--teal)" strokeWidth="1" opacity="0.4" />
      <line x1="120" y1="40" x2="154" y2="40" stroke="var(--teal)" strokeWidth="1" opacity="0.4" />
      <rect x="118" y="72" width="4" height="14" fill="var(--teal)" opacity="0.4" />
      {[
        [154, 40, "var(--coral)", "0s"],
        [144, 64, "var(--gold)", "0.3s"],
        [120, 74, "var(--teal)", "0.6s"],
        [96, 64, "var(--tube-red)", "0.9s"],
        [86, 40, "var(--coral)", "1.2s"],
        [96, 16, "var(--gold)", "1.5s"],
        [120, 6, "var(--teal)", "1.8s"],
        [144, 16, "var(--tube-red)", "2.1s"],
      ].map(([cx, cy, color, delay], i) => (
        <circle
          key={i}
          className="wheelLight"
          cx={cx}
          cy={cy}
          r="3"
          fill={color}
          style={{ animationDelay: delay }}
        />
      ))}
      <path d="M170 55 q40 -34 80 0" fill="none" stroke="var(--tube-red)" strokeWidth="2.5" opacity="0.5" />
      <rect x="266" y="15" width="20" height="40" fill="var(--ink-softer)" />
      <rect x="292" y="32" width="14" height="23" fill="var(--ink-softer)" />
      <rect x="330" y="8" width="22" height="47" fill="var(--ink-softer)" />
      <rect x="358" y="26" width="16" height="29" fill="var(--ink-softer)" />
    </svg>
  );
}

function TicketFrame({ eyebrow, id, children }) {
  return (
    <div className="ticketOuter">
      <Skyline />
      <div className="ticket">
        <div className="fairyLights">
          {Array.from({ length: 13 }).map((_, i) => (
            <span key={i} style={{ "--flag-color": BUNTING_COLORS[i % BUNTING_COLORS.length] }} />
          ))}
        </div>
        <div className="bunting">
          {Array.from({ length: 13 }).map((_, i) => (
            <span key={i} style={{ "--flag-color": BUNTING_COLORS[(i + 2) % BUNTING_COLORS.length] }} />
          ))}
        </div>
        <div className="ticketTop">
          <span className="eyebrow">{eyebrow}</span>
          {id && <span className="serial">{serial(id)}</span>}
        </div>
        <div className="perf" />
        <div className="ticketBody">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main App
--------------------------------------------------------- */
export default function App() {
  const [view, setView] = useState("entry"); // entry | scratch | result | adminLogin | admin
  const [campaigns, setCampaigns] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", company: "", campaignId: "", marketingConsent: false });
  const [formError, setFormError] = useState("");
  const [currentEntry, setCurrentEntry] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [adminTab, setAdminTab] = useState("entries");

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    cap: 100,
    drink: 10,
    tickets: 5,
    photobooth: 5,
    expiresAt: "",
  });
  const [campaignError, setCampaignError] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [marketingOnly, setMarketingOnly] = useState(false);

  const [urlEventId] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("event") || "";
    } catch {
      return "";
    }
  });
  const [copiedId, setCopiedId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [baseUrlSaved, setBaseUrlSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await window.storage.get("sc_campaigns", true);
        const loaded = c ? JSON.parse(c.value) : [];
        setCampaigns(loaded);
        if (urlEventId) {
          setForm((f) => ({ ...f, campaignId: urlEventId }));
        }
      } catch {
        setCampaigns([]);
      }
      try {
        const e = await window.storage.get("sc_entries", true);
        setEntries(e ? JSON.parse(e.value) : []);
      } catch {
        setEntries([]);
      }
      try {
        const b = await window.storage.get("sc_base_url", true);
        if (b && b.value) {
          setBaseUrl(b.value);
          setBaseUrlInput(b.value);
        }
      } catch {
        // no base URL saved yet
      }
      setLoading(false);
    })();
  }, []);

  const liveCampaigns = campaigns.filter(isLive);
  const lockedCampaign = urlEventId ? campaigns.find((c) => c.id === urlEventId) : null;

  function campaignLink(id) {
    const base = baseUrl ? baseUrl.replace(/\/$/, "") : `${window.location.origin}${window.location.pathname}`;
    return `${base}?event=${id}`;
  }

  async function saveBaseUrl(e) {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = baseUrlInput.trim();
    try {
      await window.storage.set("sc_base_url", trimmed, true);
      setBaseUrl(trimmed);
      setBaseUrlSaved(true);
      setTimeout(() => setBaseUrlSaved(false), 2000);
    } catch {
      // ignore
    }
  }

  function copyLink(id) {
    const url = campaignLink(id);
    let ok = false;
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      ok = false;
    }
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(""), 2000);
        },
        () => setCopiedId(id + ":manual")
      );
    } else {
      setCopiedId(id + ":manual");
    }
  }

  async function submitEntry(e) {
    if (e && e.preventDefault) e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      setFormError("Please fill in every field.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setFormError("Please enter a valid work email.");
      return;
    }
    if (!form.campaignId) {
      setFormError("Please choose your event or company.");
      return;
    }
    const idx = campaigns.findIndex((c) => c.id === form.campaignId);
    if (idx === -1) {
      setFormError("That event could not be found.");
      return;
    }
    const campaign = campaigns[idx];
    if (campaign.usedCount >= campaign.cap) {
      setFormError("This event has reached its scratch card limit.");
      return;
    }
    if (campaign.expiresAt && Date.now() > campaign.expiresAt) {
      setFormError("This event has now ended.");
      return;
    }
    const emailLower = form.email.trim().toLowerCase();
    const alreadyEntered = entries.some(
      (en) => en.campaignId === campaign.id && en.email.trim().toLowerCase() === emailLower
    );
    if (alreadyEntered) {
      setFormError("This email address has already been used to enter this promotion.");
      return;
    }
    const prizeKey = campaign.queue[campaign.usedCount];
    const updatedCampaign = { ...campaign, usedCount: campaign.usedCount + 1 };
    const updatedCampaigns = campaigns.map((c) =>
      c.id === campaign.id ? updatedCampaign : c
    );

    const entry = {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      prize: prizeKey,
      marketingConsent: !!form.marketingConsent,
      timestamp: Date.now(),
    };
    const updatedEntries = [...entries, entry];

    try {
      await window.storage.set("sc_campaigns", JSON.stringify(updatedCampaigns), true);
      await window.storage.set("sc_entries", JSON.stringify(updatedEntries), true);
    } catch {
      setFormError("Something went wrong saving your entry. Please try again.");
      return;
    }

    setCampaigns(updatedCampaigns);
    setEntries(updatedEntries);
    setCurrentEntry(entry);
    setRevealed(false);
    setView("scratch");
  }

  function resetToStart() {
    setForm({ name: "", email: "", company: "", campaignId: "", marketingConsent: false });
    setCurrentEntry(null);
    setRevealed(false);
    setView("entry");
  }

  async function createCampaign(e) {
    if (e && e.preventDefault) e.preventDefault();
    setCampaignError("");
    const cap = parseInt(newCampaign.cap, 10);
    const drink = parseInt(newCampaign.drink, 10) || 0;
    const tickets = parseInt(newCampaign.tickets, 10) || 0;
    const photobooth = parseInt(newCampaign.photobooth, 10) || 0;
    if (!newCampaign.name.trim()) {
      setCampaignError("Give this event or company a name.");
      return;
    }
    if (!cap || cap < 1) {
      setCampaignError("Card limit must be at least 1.");
      return;
    }
    if (drink + tickets + photobooth > cap) {
      setCampaignError("Winners can't add up to more than the card limit.");
      return;
    }
    let expiresAt = null;
    if (newCampaign.expiresAt) {
      const d = new Date(newCampaign.expiresAt + "T23:59:59");
      if (isNaN(d.getTime())) {
        setCampaignError("That expiry date doesn't look right.");
        return;
      }
      if (d.getTime() < Date.now()) {
        setCampaignError("Expiry date can't be in the past.");
        return;
      }
      expiresAt = d.getTime();
    }
    const counts = { drink, tickets, photobooth };
    const campaign = {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      name: newCampaign.name.trim(),
      cap,
      counts,
      queue: buildQueue(counts, cap),
      usedCount: 0,
      expiresAt,
      createdAt: Date.now(),
    };
    const updated = [campaign, ...campaigns];
    try {
      await window.storage.set("sc_campaigns", JSON.stringify(updated), true);
    } catch {
      setCampaignError("Could not save this event. Please try again.");
      return;
    }
    setCampaigns(updated);
    setNewCampaign({ name: "", cap: 100, drink: 10, tickets: 5, photobooth: 5, expiresAt: "" });
  }

  function exportCSV() {
    const rows = [
      ["Name", "Email", "Company", "Event", "Prize", "Marketing opt-in", "Date"],
      ...filteredEntries.map((e) => [
        e.name,
        e.email,
        e.company,
        e.campaignName,
        PRIZES[e.prize]?.label || e.prize,
        e.marketingConsent ? "Yes" : "No",
        fmtDate(e.timestamp),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scratch-card-entries.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const pwInputRef = useRef(null);

  function loginAdmin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const typed = (pwInputRef.current ? pwInputRef.current.value : pw) || "";
    if (typed.trim() === ADMIN_PASSWORD) {
      setPwError("");
      setPw("");
      setView("admin");
    } else {
      setPwError("Incorrect password. Please check for extra spaces and try again.");
    }
  }

  const filteredEntries = entries
    .filter((e) => campaignFilter === "all" || e.campaignId === campaignFilter)
    .filter((e) => !marketingOnly || e.marketingConsent);

  const prizeResult = currentEntry ? PRIZES[currentEntry.prize] : null;
  const isWin = currentEntry && currentEntry.prize !== "noWin";

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');

        :root {
          --ink: #14151c;
          --ink-soft: #1c1f28;
          --ink-softer: #272b36;
          --gold: #ffb400;
          --gold-light: #ffcf5c;
          --coral: #ff3d78;
          --tube-red: #e32017;
          --teal: #17a3a0;
          --cream: #f2ede1;
          --text-light: #ece9e2;
          --text-muted: #8d94a3;
        }
        * { box-sizing: border-box; }
        .app {
          background-color: var(--ink);
          background-image:
            radial-gradient(circle at 12% 15%, rgba(255,61,120,0.32), transparent 42%),
            radial-gradient(circle at 88% 20%, rgba(23,163,160,0.30), transparent 44%),
            radial-gradient(circle at 50% 95%, rgba(255,180,0,0.28), transparent 48%),
            radial-gradient(circle at 85% 80%, rgba(227,32,23,0.18), transparent 40%),
            radial-gradient(rgba(255,180,0,0.1) 1px, transparent 1.5px);
          background-size: auto, auto, auto, auto, 22px 22px;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--text-light);
          padding: 48px 20px 80px;
          position: relative;
        }
        .content {
          position: relative;
          z-index: 1;
        }
        .bgArt {
          position: fixed;
          z-index: 0;
          opacity: 0.09;
          pointer-events: none;
        }
        .bgArtEye {
          top: 30px;
          right: -70px;
          width: 300px;
          height: 300px;
        }
        .bgArtStein {
          bottom: -10px;
          left: -30px;
          width: 180px;
          height: 220px;
          transform: rotate(-6deg);
        }
        .bgArtCocktail {
          top: 20px;
          left: -30px;
          width: 150px;
          height: 210px;
          transform: rotate(6deg);
        }
        .bgArtDecks {
          bottom: 10px;
          right: -50px;
          width: 260px;
          height: 165px;
        }
        @media (max-width: 640px) {
          .bgArtEye { width: 200px; height: 200px; right: -60px; }
          .bgArtStein { width: 130px; height: 160px; left: -25px; }
          .bgArtCocktail { width: 100px; height: 140px; left: -20px; top: 10px; }
          .bgArtDecks { width: 170px; height: 108px; right: -35px; }
        }
        .logo {
          text-align: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 34px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 4px;
          background: linear-gradient(90deg, var(--gold-light), var(--coral));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          line-height: 1;
        }
        .subLogo {
          text-align: center;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 34px;
        }
        .fairyLights {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 12px 0 6px;
          background: var(--ink-soft);
        }
        .fairyLights span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--flag-color, var(--gold));
          box-shadow: 0 0 6px 2px var(--flag-color, var(--gold));
        }
        .bunting {
          display: flex;
          justify-content: center;
          gap: 5px;
          padding: 0 0 10px;
          background: var(--ink-soft);
        }
        .bunting span {
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 11px solid var(--flag-color, var(--gold));
        }
        .ticketOuter {
          position: relative;
          max-width: 400px;
          margin: 0 auto;
        }
        .skyline {
          position: absolute;
          left: 50%;
          bottom: -18px;
          transform: translateX(-50%);
          width: 118%;
          height: 90px;
          z-index: 0;
          pointer-events: none;
        }
        .ticket {
          position: relative;
          z-index: 1;
          max-width: 400px;
          margin: 0 auto;
          background: var(--ink-soft);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 30px 60px rgba(0,0,0,0.45), 0 0 50px -10px rgba(255,61,120,0.25), 0 0 70px -20px rgba(23,163,160,0.25);
          border: 1px solid var(--ink-softer);
        }
        .ticketTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
        }
        .eyebrow {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-light);
        }
        .serial {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-muted);
        }
        .perf {
          height: 0;
          border-top: 2px dashed var(--ink-softer);
          position: relative;
          margin: 0 -1px;
        }
        .perf::before, .perf::after {
          content: '';
          position: absolute;
          top: -9px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--ink);
        }
        .perf::before { left: -9px; }
        .perf::after { right: -9px; }
        .ticketBody { padding: 28px 26px 30px; }
        h1.headline {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px;
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1.1;
          margin: 0 0 8px;
        }
        .sub {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 24px;
          line-height: 1.5;
        }
        label {
          display: block;
          font-size: 12px;
          font-family: 'Space Mono', monospace;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          margin-top: 16px;
        }
        input[type=text], input[type=email], input[type=number], select {
          width: 100%;
          background: var(--ink);
          border: 1px solid var(--ink-softer);
          border-radius: 8px;
          padding: 11px 12px;
          color: var(--text-light);
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }
        input:focus, select:focus {
          outline: 2px solid var(--gold);
          outline-offset: 1px;
        }
        .btn {
          margin-top: 24px;
          width: 100%;
          background: linear-gradient(90deg, var(--gold-light), var(--gold) 55%, var(--coral));
          color: var(--ink);
          border: none;
          border-radius: 8px;
          padding: 13px;
          font-family: 'Bebas Neue', sans-serif;
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 0.03em;
          cursor: pointer;
        }
        .btn:hover { filter: brightness(1.08); box-shadow: 0 8px 26px -4px rgba(255,61,120,0.45); }
        .btnGhost {
          background: transparent;
          border: 1px solid var(--ink-softer);
          color: var(--text-light);
        }
        .err {
          color: var(--coral);
          font-size: 13px;
          margin-top: 14px;
        }
        .checkRow {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 20px;
          cursor: pointer;
        }
        .checkRow input {
          margin-top: 3px;
          width: 15px;
          height: 15px;
          flex-shrink: 0;
          accent-color: var(--gold);
        }
        .checkRow span {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .scratchWrap {
          position: relative;
          width: 300px;
          height: 260px;
          margin: 4px auto 0;
          border-radius: 10px;
          overflow: hidden;
          touch-action: none;
        }
        .revealingTag {
          position: absolute;
          left: 50%;
          bottom: 10px;
          transform: translateX(-50%);
          background: rgba(22,24,41,0.82);
          color: var(--gold-light);
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.04em;
          padding: 6px 12px;
          border-radius: 999px;
          animation: pulseTag 1.2s ease-in-out infinite;
        }
        @keyframes pulseTag {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        .symbolsRow {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          background: var(--cream);
        }
        .symbolCell {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          border-right: 1px dashed rgba(22,24,41,0.15);
          border-bottom: 1px dashed rgba(22,24,41,0.15);
        }
        .symbolCell:nth-child(3n) { border-right: none; }
        .symbolCell:nth-child(n+7) { border-bottom: none; }
        .brandBadge {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          letter-spacing: 0.04em;
          color: var(--ink);
          background: var(--gold);
          border-radius: 6px;
          padding: 3px 8px;
          line-height: 1;
        }
        .scratchCanvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }
        .lockedEvent {
          background: rgba(255,180,0,0.12);
          border: 1px solid var(--gold);
          color: var(--gold-light);
          border-radius: 8px;
          padding: 11px 12px;
          font-weight: 600;
          font-size: 14px;
        }
        .hint {
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 14px;
        }
        .resultBanner {
          text-align: center;
          padding: 10px 0 4px;
        }
        .resultIcon { font-size: 44px; margin-bottom: 10px; }
        .resultTitle {
          font-family: 'Bebas Neue', sans-serif;
          font-weight: 700;
          font-size: 20px;
          margin: 0 0 8px;
        }
        .win .resultTitle { color: var(--gold-light); }
        .resultNote { color: var(--text-muted); font-size: 13px; line-height: 1.5; }
        .adminLink {
          position: fixed;
          bottom: 14px;
          right: 18px;
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.6;
        }
        .adminLink:hover { opacity: 1; }

        .adminWrap { max-width: 1000px; margin: 0 auto; }
        .adminHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .adminHeader h1 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          margin: 0;
        }
        .tabs { display: flex; gap: 8px; margin-bottom: 22px; }
        .tab {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--ink-softer);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
        }
        .tab.active { background: var(--gold); color: var(--ink); border-color: var(--gold); font-weight: 700; }
        .panel {
          background: var(--ink-soft);
          border: 1px solid var(--ink-softer);
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 20px;
        }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left;
          font-family: 'Space Mono', monospace;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding: 8px 10px;
          border-bottom: 1px solid var(--ink-softer);
        }
        td {
          padding: 10px;
          border-bottom: 1px solid var(--ink-softer);
          font-family: 'Inter', sans-serif;
        }
        .prizeTag {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--ink-softer);
          display: inline-block;
        }
        .prizeTag.win { background: rgba(255,180,0,0.18); color: var(--gold-light); }
        .prizeTag.p-drink { background: rgba(255,61,120,0.18); color: var(--coral); }
        .prizeTag.p-tickets { background: rgba(255,180,0,0.18); color: var(--gold-light); }
        .prizeTag.p-photobooth { background: rgba(23,163,160,0.2); color: var(--teal); }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .statusTag {
          display: inline-block;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 999px;
          vertical-align: middle;
        }
        .statusTag.open { background: rgba(23,163,160,0.2); color: var(--teal); }
        .statusTag.closed { background: rgba(255,61,120,0.18); color: var(--coral); }
        .campaignCard {
          border: 1px solid var(--ink-softer);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .campaignCardHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .campaignCard h3 {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 15px;
          margin: 0 0 6px;
        }
        .btnSmall {
          width: auto;
          margin-top: 0;
          padding: 6px 12px;
          font-size: 11px;
          letter-spacing: 0.04em;
        }
        .linkPreview {
          display: block;
          width: 100%;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--ink);
          border: 1px solid var(--ink-softer);
          border-radius: 6px;
          padding: 7px 9px;
          margin: 4px 0 10px;
        }
        .statRow {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 10px;
        }
        .statRow b { color: var(--text-light); }
        .barOuter {
          height: 6px;
          background: var(--ink-softer);
          border-radius: 4px;
          margin-top: 10px;
          overflow: hidden;
        }
        .barInner { height: 100%; background: linear-gradient(90deg, var(--coral), var(--gold), var(--teal)); }
        .empty { color: var(--text-muted); font-size: 13px; text-align: center; padding: 30px 0; }
        @media (max-width: 640px) {
          .grid2 { grid-template-columns: 1fr; }
          table { font-size: 12px; }
        }
      `}</style>

      <BackgroundArt />
      <div className="content">
      {loading ? (
        <div className="empty">Loading…</div>
      ) : view === "entry" ? (
        <>
          <div className="logo">Between The Bridges Scratch &amp; Win</div>
          <div className="subLogo">London Waterloo &middot; Southbank</div>
          <TicketFrame eyebrow="Tap in to play">
            <h1 className="headline">Scratch. Reveal. Win.</h1>
            <p className="sub">
              Pop in your details to unlock your scratch card — match three
              symbols to see what you've won.
            </p>
            <form onSubmit={submitEntry}>
              <label>Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jordan Lee"
              />
              <label>Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jordan@company.com"
              />
              <label>Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Corp"
              />
              {urlEventId ? (
                <>
                  <label>Event / company promotion</label>
                  {lockedCampaign && isLive(lockedCampaign) ? (
                    <div className="lockedEvent">🎫 {lockedCampaign.name}</div>
                  ) : lockedCampaign && lockedCampaign.expiresAt && Date.now() > lockedCampaign.expiresAt ? (
                    <p className="err">This event has now ended.</p>
                  ) : lockedCampaign ? (
                    <p className="err">This event has reached its scratch card limit.</p>
                  ) : (
                    <p className="err">This event link is invalid or no longer live.</p>
                  )}
                </>
              ) : (
                <>
                  <label>Event / company promotion</label>
                  <select
                    value={form.campaignId}
                    onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {liveCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {liveCampaigns.length === 0 && (
                    <p className="hint">No live scratch card promotions right now.</p>
                  )}
                </>
              )}
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })}
                />
                <span>
                  I'm happy to be contacted by email about future events, offers and promotions.
                </span>
              </label>
              {formError && <div className="err">{formError}</div>}
              <button className="btn" type="submit" onClick={submitEntry}>
                Reveal my card
              </button>
            </form>
          </TicketFrame>
          <button className="adminLink" onClick={() => setView("adminLogin")}>
            Admin login
          </button>
        </>
      ) : view === "scratch" ? (
        <>
          <div className="logo">Between The Bridges Scratch &amp; Win</div>
          <div className="subLogo">London Waterloo &middot; Southbank</div>
          <TicketFrame eyebrow={currentEntry.campaignName} id={currentEntry.id}>
            <h1 className="headline">Good luck, {currentEntry.name.split(" ")[0]}</h1>
            <p className="sub">Scratch off the whole gold panel to reveal all your symbols.</p>
            <ScratchPanel
              prizeKey={currentEntry.prize}
              onRevealed={() => {
                setRevealed(true);
                setView("result");
              }}
            />
            <p className="hint">Find 3 matching symbols among the 9 to win.</p>
          </TicketFrame>
        </>
      ) : view === "result" ? (
        <>
          <div className="logo">Between The Bridges Scratch &amp; Win</div>
          <div className="subLogo">London Waterloo &middot; Southbank</div>
          <TicketFrame eyebrow={currentEntry.campaignName} id={currentEntry.id}>
            <div className={"resultBanner " + (isWin ? "win" : "")}>
              <div className="resultIcon">{isWin ? "🎉" : "😔"}</div>
              <h1 className="resultTitle">
                {isWin ? "You're a winner!" : "So close!"}
              </h1>
              <p className="sub" style={{ marginBottom: 4 }}>
                {prizeResult.label}
              </p>
              <p className="resultNote">
                {isWin
                  ? "A member of staff will be in touch with your prize."
                  : "Thanks for playing — keep an eye out for more chances to win."}
              </p>
            </div>
            <button className="btn btnGhost" onClick={resetToStart}>
              Done
            </button>
          </TicketFrame>
        </>
      ) : view === "adminLogin" ? (
        <>
          <div className="logo">Between The Bridges Scratch &amp; Win</div>
          <div className="subLogo">London Waterloo &middot; Southbank</div>
          <TicketFrame eyebrow="Control room">
            <h1 className="headline">Admin login</h1>
            <p className="sub">Enter the password to view entries and manage events.</p>
            <form onSubmit={loginAdmin}>
              <label>Password</label>
              <input
                ref={pwInputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
              />
              {pwError && <div className="err">{pwError}</div>}
              <button className="btn" type="submit" onClick={loginAdmin}>
                Log in
              </button>
              <button
                type="button"
                className="btn btnGhost"
                style={{ marginTop: 10 }}
                onClick={() => setView("entry")}
              >
                Back to scratch card
              </button>
            </form>
          </TicketFrame>
        </>
      ) : (
        <div className="adminWrap">
          <div className="adminHeader">
            <h1>Back of house</h1>
            <button className="btn btnGhost" style={{ width: "auto", marginTop: 0 }} onClick={() => setView("entry")}>
              Log out
            </button>
          </div>
          <div className="tabs">
            <button
              className={"tab " + (adminTab === "entries" ? "active" : "")}
              onClick={() => setAdminTab("entries")}
            >
              Entries
            </button>
            <button
              className={"tab " + (adminTab === "campaigns" ? "active" : "")}
              onClick={() => setAdminTab("campaigns")}
            >
              Events &amp; campaigns
            </button>
          </div>

          {adminTab === "entries" ? (
            <div className="panel">
              <div className="toolbar">
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  style={{ maxWidth: 260 }}
                >
                  <option value="all">All events ({entries.length})</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <label className="checkRow" style={{ marginTop: 0 }}>
                  <input
                    type="checkbox"
                    checked={marketingOnly}
                    onChange={(e) => setMarketingOnly(e.target.checked)}
                  />
                  <span>Marketing opt-ins only</span>
                </label>
                <button className="btn" style={{ marginTop: 0, width: "auto", padding: "10px 18px" }} onClick={exportCSV}>
                  Export CSV
                </button>
              </div>
              {filteredEntries.length === 0 ? (
                <div className="empty">No entries yet.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Event</th>
                      <th>Prize</th>
                      <th>Marketing</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredEntries].reverse().map((e) => (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{e.email}</td>
                        <td>{e.company}</td>
                        <td>{e.campaignName}</td>
                        <td>
                          <span className={"prizeTag " + (e.prize !== "noWin" ? "p-" + e.prize : "")}>
                            {PRIZES[e.prize]?.label}
                          </span>
                        </td>
                        <td>{e.marketingConsent ? "✓ Yes" : "—"}</td>
                        <td>{fmtDate(e.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <>
              <div className="panel">
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", marginTop: 0 }}>
                  Published site link
                </h3>
                <p className="sub" style={{ marginBottom: 8 }}>
                  Paste the real public URL you get from "Share" once you publish this app.
                  This is what individual company links are built from — without it, links
                  generated below may not open correctly for people outside this chat.
                </p>
                <form onSubmit={saveBaseUrl}>
                  <input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://claude.site/artifacts/your-app-id"
                  />
                  <button className="btn" type="submit" onClick={saveBaseUrl} style={{ marginTop: 12 }}>
                    {baseUrlSaved ? "Saved!" : "Save link"}
                  </button>
                </form>
                {!baseUrl && (
                  <p className="hint" style={{ marginTop: 12 }}>
                    Not set yet — individual links currently fall back to this preview's
                    address, which won't work once shared outside this chat.
                  </p>
                )}
              </div>
              <div className="panel">
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", marginTop: 0 }}>
                  Set up a new event or company batch
                </h3>
                <p className="sub" style={{ marginBottom: 8 }}>
                  Set the total card limit and how many of each prize to give away —
                  the rest are automatically non-winners. Use this on the spot at a
                  pop-up, or ahead of time for a company email batch (e.g. 600 cards).
                </p>
                <form onSubmit={createCampaign}>
                  <label>Event or company name</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Acme Corp — Summer Launch"
                  />
                  <div className="grid2">
                    <div>
                      <label>Total scratch cards (cap)</label>
                      <input
                        type="number"
                        min="1"
                        value={newCampaign.cap}
                        onChange={(e) => setNewCampaign({ ...newCampaign, cap: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Free drink winners</label>
                      <input
                        type="number"
                        min="0"
                        value={newCampaign.drink}
                        onChange={(e) => setNewCampaign({ ...newCampaign, drink: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>2 event ticket winners</label>
                      <input
                        type="number"
                        min="0"
                        value={newCampaign.tickets}
                        onChange={(e) => setNewCampaign({ ...newCampaign, tickets: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Photobooth winners</label>
                      <input
                        type="number"
                        min="0"
                        value={newCampaign.photobooth}
                        onChange={(e) => setNewCampaign({ ...newCampaign, photobooth: e.target.value })}
                      />
                    </div>
                    <div>
                      <label>Expiry date (optional)</label>
                      <input
                        type="date"
                        value={newCampaign.expiresAt}
                        onChange={(e) => setNewCampaign({ ...newCampaign, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                  {campaignError && <div className="err">{campaignError}</div>}
                  <button className="btn" type="submit" onClick={createCampaign}>
                    Create event
                  </button>
                </form>
              </div>

              <div className="panel">
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", marginTop: 0 }}>
                  Live &amp; past events
                </h3>
                {campaigns.length === 0 ? (
                  <div className="empty">No events yet — create one above.</div>
                ) : (
                  campaigns.map((c) => {
                    const won = wonSoFar(c);
                    const pct = Math.round((c.usedCount / c.cap) * 100);
                    const expired = c.expiresAt && Date.now() > c.expiresAt;
                    const full = c.usedCount >= c.cap;
                    return (
                      <div className="campaignCard" key={c.id}>
                        <div className="campaignCardHead">
                          <h3>
                            {c.name}{" "}
                            <span className={"statusTag " + (expired || full ? "closed" : "open")}>
                              {expired ? "Expired" : full ? "Full" : "Live"}
                            </span>
                          </h3>
                          <button
                            type="button"
                            className="btn btnGhost btnSmall"
                            onClick={() => copyLink(c.id)}
                          >
                            {copiedId === c.id ? "Copied!" : "Copy link"}
                          </button>
                        </div>
                        {c.expiresAt && (
                          <p className="hint" style={{ margin: "0 0 6px", textAlign: "left" }}>
                            {expired ? "Expired" : "Expires"} {fmtDate(c.expiresAt)}
                          </p>
                        )}
                        <input
                          className="linkPreview"
                          readOnly
                          value={campaignLink(c.id)}
                          onFocus={(e) => e.target.select()}
                        />
                        {copiedId === c.id + ":manual" && (
                          <p className="hint" style={{ margin: "0 0 10px" }}>
                            Couldn't auto-copy — tap the link field above to select it, then copy manually.
                          </p>
                        )}
                        <div className="statRow">
                          <span>
                            Cards used: <b>{c.usedCount} / {c.cap}</b>
                          </span>
                          <span>
                            🍹 <b>{won.drink} / {c.counts.drink}</b>
                          </span>
                          <span>
                            🎟️ <b>{won.tickets} / {c.counts.tickets}</b>
                          </span>
                          <span>
                            📸 <b>{won.photobooth} / {c.counts.photobooth}</b>
                          </span>
                          <span>
                            No win remaining: <b>{c.cap - c.counts.drink - c.counts.tickets - c.counts.photobooth - won.noWin}</b>
                          </span>
                        </div>
                        <div className="barOuter">
                          <div className="barInner" style={{ width: pct + "%" }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
