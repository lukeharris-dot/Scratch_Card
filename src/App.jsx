import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

/* ---------------------------------------------------------
   Between The Bridges — scratch card promo
   Waterloo / Southbank · dancing, music, riverside events
--------------------------------------------------------- */
const PRIZES = {
  dj: { label: "A complimentary DJ set", icon: "dj" },
  tickets: { label: "2 pairs of event tickets", icon: "ticket" },
  photobooth: { label: "A complimentary photobooth session", icon: "camera" },
  chocolate: { label: "A box of chocolates", icon: "chocolate" },
  noWin: { label: "No luck this time", icon: "cross" },
};
const PRIZE_ORDER = ["dj", "tickets", "photobooth", "chocolate"];
const PRIZE_ICON_LIST = PRIZE_ORDER.map((k) => PRIZES[k].icon);
const DECORATIVE_ICONS = ["disco", "note", "cocktail", "speaker", "mic", "wheel", "bolt"];
const ADMIN_PASSWORD = "promo2026";

const TICKER = "Live music · Late DJs · Riverside dancing · Corporate events · Private hire · Waterloo";

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
  const tally = { dj: 0, tickets: 0, photobooth: 0, chocolate: 0, noWin: 0 };
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
   Icon set — music / dancing / riverside
--------------------------------------------------------- */
function GridIcon({ name, size = 46 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    fill: "none",
    strokeWidth: 2.3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const gold = "#B87A00";
  const pink = "#D4156B";
  const cyan = "#0A8F85";
  const violet = "#5F35C4";
  const grey = "#7E75A0";
  switch (name) {
    case "stein":
      return (
        <svg {...common} stroke={gold}>
          <rect x="8" y="12" width="16" height="21" rx="2" />
          <path d="M24 17h5a4 4 0 0 1 0 9h-5" />
          <path d="M8 18h16" />
          <path d="M12 9V5M17 8V4M22 9V5" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...common} stroke={pink}>
          <rect x="4" y="13" width="32" height="15" rx="3" />
          <path d="M20 13v15" strokeDasharray="2 3" />
          <circle cx="11" cy="20.5" r="1.6" />
          <circle cx="29" cy="20.5" r="1.6" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common} stroke={violet}>
          <rect x="5" y="13" width="30" height="19" rx="3" />
          <circle cx="20" cy="22" r="6" />
          <rect x="14" y="8" width="9" height="5" rx="1" />
        </svg>
      );
    case "disco":
      return (
        <svg {...common} stroke={cyan}>
          <circle cx="20" cy="23" r="11" />
          <path d="M9 23h22M20 12v22M12 15l16 16M28 15L12 31" />
          <path d="M20 12V4" />
        </svg>
      );
    case "note":
      return (
        <svg {...common} stroke={pink}>
          <circle cx="13" cy="29" r="4.5" />
          <path d="M17.5 29V11l14-3v18" />
          <circle cx="27" cy="26" r="4.5" />
        </svg>
      );
    case "cocktail":
      return (
        <svg {...common} stroke={gold}>
          <path d="M8 10h24L20 24z" />
          <path d="M20 24v9M13 33h14" />
          <circle cx="27" cy="12" r="2" />
        </svg>
      );
    case "speaker":
      return (
        <svg {...common} stroke={violet}>
          <rect x="11" y="5" width="18" height="30" rx="3" />
          <circle cx="20" cy="25" r="6" />
          <circle cx="20" cy="12" r="2.6" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common} stroke={cyan}>
          <rect x="15" y="5" width="10" height="16" rx="5" />
          <path d="M10 19a10 10 0 0 0 20 0M20 29v6M14 35h12" />
        </svg>
      );
    case "wheel":
      return (
        <svg {...common} stroke={pink}>
          <circle cx="20" cy="18" r="12" />
          <path d="M20 6v24M8 18h24M11.5 9.5l17 17M28.5 9.5l-17 17" />
          <path d="M17 34h6" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...common} stroke={gold}>
          <path d="M23 4 10 23h8l-1.5 13L31 17h-9z" />
        </svg>
      );
    case "cross":
      return (
        <svg {...common} stroke={grey}>
          <path d="M12 12l16 16M28 12L12 28" />
        </svg>
      );
    case "dj":
      return (
        <svg {...common} stroke={cyan}>
          <path d="M10 20a10 10 0 0 1 20 0" />
          <rect x="6" y="19" width="7" height="11" rx="3" />
          <rect x="27" y="19" width="7" height="11" rx="3" />
        </svg>
      );
    case "chocolate":
      return (
        <svg {...common} stroke={gold}>
          <rect x="6" y="10" width="28" height="20" rx="2" />
          <path d="M13 10v20M20 10v20M27 10v20M6 20h28" />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------------------------------------------------------
   Scratch panel
--------------------------------------------------------- */
function ScratchPanel({ prizeKey, onRevealed }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scratchingRef = useRef(false);
  const revealedRef = useRef(false);
  const W = 600,
    H = 500;

  const symbols = useMemo(() => buildGrid(prizeKey), [prizeKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = W;
    canvas.height = H;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#FFD873");
    grad.addColorStop(0.45, "#FFB01F");
    grad.addColorStop(1, "#C97C05");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 4;
    for (let x = -H; x < W; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(11,7,20,0.55)";
    ctx.font = "700 34px 'Anton', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH HERE", W / 2, H / 2);
  }, []);

  const pctCleared = useCallback(() => {
    const ctx = canvasRef.current.getContext("2d");
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0,
      total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) {
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
      ctx.arc(x, y, 42, 0, Math.PI * 2);
      ctx.fill();

      if (pctCleared() > 0.62) {
        revealedRef.current = true;
        canvas.style.transition = "opacity 0.7s ease";
        canvas.style.opacity = "0";
        canvas.style.pointerEvents = "none";
        setTimeout(() => onRevealed(), 1600);
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
      <div className="symbolsGrid">
        {symbols.map((s, i) => (
          <div className="symbolCell" key={i}>
            <GridIcon name={s} />
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="scratchCanvas" />
    </div>
  );
}

/* ---------------------------------------------------------
   Chrome: ticker, lights, disco ball, equaliser
--------------------------------------------------------- */
function Ticker() {
  return (
    <div className="ticker">
      <div className="tickerTrack">
        <span>{TICKER}</span>
        <span>{TICKER}</span>
        <span>{TICKER}</span>
        <span>{TICKER}</span>
      </div>
    </div>
  );
}

function FairyLights() {
  const colors = ["#FFC531", "#00E5D0", "#FF2E93", "#8B5CF6", "#FFC531", "#00E5D0", "#FF2E93"];
  return (
    <div className="fairyLights">
      {colors.map((c, i) => (
        <span key={i} style={{ background: c, boxShadow: `0 0 12px 3px ${c}aa`, animationDelay: `${i * 0.25}s` }} />
      ))}
    </div>
  );
}

function Equaliser() {
  const bars = [
    ["#FF2E93", "30%", "1.1s", "0s"],
    ["#00E5D0", "60%", "0.8s", "0.15s"],
    ["#FFC531", "40%", "1.4s", "0.3s"],
    ["#FF2E93", "80%", "0.95s", "0.05s"],
    ["#8B5CF6", "50%", "1.25s", "0.4s"],
    ["#00E5D0", "70%", "0.7s", "0.2s"],
    ["#FFC531", "35%", "1.5s", "0.1s"],
    ["#FF2E93", "65%", "1.05s", "0.35s"],
    ["#8B5CF6", "45%", "0.85s", "0.5s"],
    ["#00E5D0", "75%", "1.3s", "0.25s"],
  ];
  return (
    <div className="equaliser" aria-hidden="true">
      {bars.map(([c, h, dur, delay], i) => (
        <span key={i} style={{ background: c, height: h, animationDuration: dur, animationDelay: delay }} />
      ))}
    </div>
  );
}

function Card({ eyebrow, right, accent = "gold", children }) {
  return (
    <div className={"card card-" + accent}>
      <div className="cardStripe">
        <span /><span /><span /><span /><span /><span />
      </div>
      <div className="cardTop">
        <span className="eyebrow">{eyebrow}</span>
        {right && <span className="serial">{right}</span>}
      </div>
      <div className="perf" />
      <div className="cardBody">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   Main App
--------------------------------------------------------- */
export default function App() {
  const [view, setView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("portal") === "btb2026") return "adminLogin";
    } catch {
      /* ignore */
    }
    return "entry";
  });
  const [campaigns, setCampaigns] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", company: "", campaignId: "", code: "", marketingConsent: false });
  const [formError, setFormError] = useState("");
  const [currentEntry, setCurrentEntry] = useState(null);

  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [adminTab, setAdminTab] = useState("entries");

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    code: "",
    cap: 100,
    dj: 10,
    tickets: 5,
    photobooth: 5,
    chocolate: 5,
    expiresAt: "",
  });
  const [campaignError, setCampaignError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ cap: "", dj: "", tickets: "", photobooth: "", chocolate: "", expiresAt: "" });
  const [editError, setEditError] = useState("");
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
        if (urlEventId) setForm((f) => ({ ...f, campaignId: urlEventId }));
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
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

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
      /* ignore */
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
    if (!form.name.trim() || !form.email.trim() || (!urlEventId && !form.company.trim())) {
      setFormError("Please fill in every field.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setFormError("Please enter a valid email.");
      return;
    }
    let resolvedCampaignId = form.campaignId;

    if (!urlEventId) {
      const codeInput = (form.code || "").trim().toUpperCase();
      if (!codeInput) {
        setFormError("Please enter your event code.");
        return;
      }
      const matched = campaigns.find((c) => (c.code || "").trim().toUpperCase() === codeInput);
      if (!matched) {
        setFormError("That code wasn't recognised. Please check and try again.");
        return;
      }
      resolvedCampaignId = matched.id;
    }

    const campaign = campaigns.find((c) => c.id === resolvedCampaignId);
    if (!campaign) {
      setFormError("That event could not be found.");
      return;
    }
    if (campaign.usedCount >= campaign.cap) {
      setFormError("This event has reached its scratch card limit.");
      return;
    }
    if (campaign.expiresAt && Date.now() > campaign.expiresAt) {
      setFormError("This event has now ended.");
      return;
    }
    const emailLower = form.email.trim().toLowerCase();
    if (entries.some((en) => en.campaignId === campaign.id && en.email.trim().toLowerCase() === emailLower)) {
      setFormError("This email address has already been used to enter this promotion.");
      return;
    }
    const prizeKey = campaign.queue[campaign.usedCount];
    const updatedCampaigns = campaigns.map((c) =>
      c.id === campaign.id ? { ...c, usedCount: c.usedCount + 1 } : c
    );

    const entry = {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      name: form.name.trim(),
      email: form.email.trim(),
      company: urlEventId ? campaign.name : form.company.trim(),
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
    setView("scratch");
  }

  function resetToStart() {
    setForm({ name: "", email: "", company: "", campaignId: "", code: "", marketingConsent: false });
    setCurrentEntry(null);
    setView("entry");
  }

  async function createCampaign(e) {
    if (e && e.preventDefault) e.preventDefault();
    setCampaignError("");
    const cap = parseInt(newCampaign.cap, 10);
    const dj = parseInt(newCampaign.dj, 10) || 0;
    const tickets = parseInt(newCampaign.tickets, 10) || 0;
    const photobooth = parseInt(newCampaign.photobooth, 10) || 0;
    const chocolate = parseInt(newCampaign.chocolate, 10) || 0;
    if (!newCampaign.name.trim()) {
      setCampaignError("Give this event or company a name.");
      return;
    }
    const code = newCampaign.code.trim().toUpperCase();
    if (!code) {
      setCampaignError("Give this event a code for guests to enter.");
      return;
    }
    if (!/^[A-Z0-9-]+$/.test(code)) {
      setCampaignError("Codes can only contain letters, numbers and hyphens.");
      return;
    }
    if (campaigns.some((c) => (c.code || "").toUpperCase() === code)) {
      setCampaignError("That code is already in use — please choose another.");
      return;
    }
    if (!cap || cap < 1) {
      setCampaignError("Card limit must be at least 1.");
      return;
    }
    if (dj + tickets + photobooth + chocolate > cap) {
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
    const counts = { dj, tickets, photobooth, chocolate };
    const campaign = {
      id: Date.now().toString() + Math.floor(Math.random() * 1000),
      name: newCampaign.name.trim(),
      code,
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
    setNewCampaign({ name: "", code: "", cap: 100, dj: 10, tickets: 5, photobooth: 5, chocolate: 5, expiresAt: "" });
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditError("");
    setEditForm({
      cap: c.cap,
      dj: c.counts.dj,
      tickets: c.counts.tickets,
      photobooth: c.counts.photobooth,
      chocolate: c.counts.chocolate,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
    });
  }

  async function saveEdit(e, id) {
    if (e && e.preventDefault) e.preventDefault();
    setEditError("");
    const campaign = campaigns.find((c) => c.id === id);
    if (!campaign) return;

    const newCap = parseInt(editForm.cap, 10);
    const dj = parseInt(editForm.dj, 10) || 0;
    const tickets = parseInt(editForm.tickets, 10) || 0;
    const photobooth = parseInt(editForm.photobooth, 10) || 0;
    const chocolate = parseInt(editForm.chocolate, 10) || 0;

    if (!newCap || newCap < 1) {
      setEditError("Card limit must be at least 1.");
      return;
    }
    if (newCap < campaign.usedCount) {
      setEditError(
        `Can't set the limit below ${campaign.usedCount} — that many cards have already been given out.`
      );
      return;
    }
    if (dj + tickets + photobooth + chocolate > newCap) {
      setEditError("Winners can't add up to more than the new card limit.");
      return;
    }

    let expiresAt = null;
    if (editForm.expiresAt) {
      const d = new Date(editForm.expiresAt + "T23:59:59");
      if (isNaN(d.getTime())) {
        setEditError("That expiry date doesn't look right.");
        return;
      }
      expiresAt = d.getTime();
    }

    // Cards already scratched keep whatever they already revealed — we only
    // reshuffle what's left, so past results are never changed retroactively.
    const already = wonSoFar(campaign);
    const remainingSlots = newCap - campaign.usedCount;
    const remainingCounts = {
      dj: Math.max(dj - already.dj, 0),
      tickets: Math.max(tickets - already.tickets, 0),
      photobooth: Math.max(photobooth - already.photobooth, 0),
      chocolate: Math.max(chocolate - already.chocolate, 0),
    };
    const remainingTotal = remainingCounts.dj + remainingCounts.tickets + remainingCounts.photobooth + remainingCounts.chocolate;
    if (remainingTotal > remainingSlots) {
      setEditError(
        "Not enough cards left to fit those winner counts alongside what's already been given out."
      );
      return;
    }

    const usedPrefix = campaign.queue.slice(0, campaign.usedCount);
    const newRemainingQueue = buildQueue(remainingCounts, remainingSlots);
    const newQueue = [...usedPrefix, ...newRemainingQueue];

    const updatedCampaign = {
      ...campaign,
      cap: newCap,
      counts: { dj, tickets, photobooth, chocolate },
      queue: newQueue,
      expiresAt,
    };
    const updated = campaigns.map((c) => (c.id === id ? updatedCampaign : c));
    try {
      await window.storage.set("sc_campaigns", JSON.stringify(updated), true);
    } catch {
      setEditError("Could not save changes. Please try again.");
      return;
    }
    setCampaigns(updated);
    setEditingId(null);
  }

  const filteredEntries = entries
    .filter((e) => campaignFilter === "all" || e.campaignId === campaignFilter)
    .filter((e) => !marketingOnly || e.marketingConsent);

  function exportCSV() {
    const rows = [
      ["Name", "Email", "Company", "Event", "Code", "Prize", "Marketing opt-in", "Date"],
      ...filteredEntries.map((e) => {
        const c = campaigns.find((x) => x.id === e.campaignId);
        return [
          e.name,
          e.email,
          e.company,
          e.campaignName,
          c?.code || "",
          PRIZES[e.prize]?.label || e.prize,
          e.marketingConsent ? "Yes" : "No",
          fmtDate(e.timestamp),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    const sel = campaignFilter !== "all" ? campaigns.find((c) => c.id === campaignFilter) : null;
    const suffix = sel ? "-" + (sel.code || sel.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "";
    a.download = `scratch-card-entries${suffix}.csv`;
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

  const prizeResult = currentEntry ? PRIZES[currentEntry.prize] : null;
  const isWin = currentEntry && currentEntry.prize !== "noWin";

  const Masthead = (
    <div className="masthead">
      <div className="logo">Between The Bridges</div>
      <div className="subLogo">Waterloo · Southbank · London</div>
    </div>
  );

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; }
        .app {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background-color: #0B0714;
          background-image:
            radial-gradient(circle at 14% 8%, rgba(255,46,147,0.34), transparent 46%),
            radial-gradient(circle at 86% 14%, rgba(0,229,208,0.26), transparent 46%),
            radial-gradient(circle at 50% 102%, rgba(255,197,49,0.22), transparent 55%);
          font-family: 'Space Grotesk', sans-serif;
          color: #F3EDE4;
          padding-bottom: 150px;
        }
        .app a { color: #00E5D0; text-decoration: none; }
        .app a:hover { color: #FF2E93; }

        @keyframes btbMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes btbSpin { to { transform: rotate(360deg); } }
        @keyframes btbBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes btbTwinkle { 0%,100% { opacity: .3; transform: scale(.85); } 50% { opacity: 1; transform: scale(1.15); } }
        @keyframes btbEq { 0%,100% { height: 14%; } 50% { height: 100%; } }
        @keyframes btbGlow { 0%,100% { text-shadow: 0 0 18px rgba(255,46,147,.55); } 50% { text-shadow: 0 0 34px rgba(0,229,208,.75); } }
        @keyframes btbPop { from { transform: scale(.7) rotate(-4deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes btbWobble { 0%,100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
        @keyframes btbDrift { from { background-position: 0 0; } to { background-position: 420px 0; } }

        .waterline {
          position: absolute; left: 0; right: 0; bottom: 0; height: 130px; opacity: .5; pointer-events: none;
          background-image:
            repeating-linear-gradient(180deg, rgba(0,229,208,.20) 0 1px, transparent 1px 7px),
            repeating-linear-gradient(90deg, rgba(255,46,147,.12) 0 2px, transparent 2px 16px);
          animation: btbDrift 9s linear infinite;
        }
        .equaliser {
          position: absolute; left: 0; right: 0; bottom: 26px; height: 78px;
          display: flex; align-items: flex-end; justify-content: center; gap: 7px;
          pointer-events: none; opacity: .55;
        }
        .equaliser span { width: 8px; border-radius: 3px 3px 0 0; animation-name: btbEq; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }

        .ticker { position: relative; z-index: 3; background: #FF2E93; color: #0B0714; overflow: hidden; border-bottom: 3px solid #0B0714; }
        .tickerTrack {
          display: flex; width: max-content; animation: btbMarquee 26s linear infinite;
          font-family: 'Anton', sans-serif; font-size: 19px; letter-spacing: .14em; text-transform: uppercase; padding: 9px 0;
        }
        .tickerTrack span { padding-right: 28px; }

        .fairyLights { position: relative; z-index: 2; display: flex; justify-content: center; gap: 26px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .fairyLights span { width: 9px; height: 9px; border-radius: 50%; animation: btbTwinkle 1.8s ease-in-out infinite; }

        .discoWrap { position: absolute; top: 44px; left: 50%; transform: translateX(-50%); z-index: 1; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
        .discoCord { width: 2px; height: 46px; background: linear-gradient(#ffffff55, #ffffff11); }
        .discoBall {
          width: 92px; height: 92px; border-radius: 50%; animation: btbSpin 9s linear infinite; opacity: .75;
          background-image:
            repeating-conic-gradient(from 0deg, rgba(255,46,147,.85) 0deg 12deg, rgba(0,229,208,.85) 12deg 24deg, rgba(255,197,49,.75) 24deg 36deg, rgba(139,92,246,.85) 36deg 48deg),
            radial-gradient(circle at 32% 28%, rgba(255,255,255,.9), transparent 55%);
          box-shadow: 0 0 70px 18px rgba(255,46,147,.28), inset -14px -14px 30px rgba(0,0,0,.6);
        }

        .masthead { position: relative; z-index: 2; padding: 74px 18px 0; text-align: center; }
        .logo {
          font-family: 'Anton', sans-serif; font-size: 42px; line-height: .92; letter-spacing: .02em; text-transform: uppercase;
          background: linear-gradient(96deg, #FFC531, #FF2E93 55%, #00E5D0);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: btbGlow 4s ease-in-out infinite;
        }
        .subLogo { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .26em; text-transform: uppercase; color: #A79BC4; margin-top: 8px; }

        .stage { position: relative; z-index: 2; padding: 26px 18px 0; }
        .hero {
          max-width: 440px; margin: 0 auto 20px; font-family: 'Anton', sans-serif; font-weight: 400;
          font-size: 74px; line-height: .86; text-transform: uppercase; text-align: center;
        }
        .hero span { display: block; }
        .hero .l1 { color: #FFC531; transform: rotate(-2deg); }
        .hero .l2 { color: #FF2E93; transform: rotate(1.5deg); }
        .hero .l3 { color: #00E5D0; transform: rotate(-1deg); }
        @media (max-width: 480px) { .hero { font-size: 56px; } .logo { font-size: 34px; } }

        .card {
          max-width: 440px; margin: 0 auto; background: #14102A; border: 1px solid rgba(255,255,255,.09);
          border-radius: 22px; overflow: hidden;
          box-shadow: 0 34px 70px rgba(0,0,0,.55), 0 0 60px -14px rgba(255,46,147,.35), 0 0 80px -20px rgba(0,229,208,.3);
        }
        .card-teal { box-shadow: 0 34px 70px rgba(0,0,0,.55), 0 0 70px -14px rgba(0,229,208,.4); }
        .card-win { box-shadow: 0 34px 70px rgba(0,0,0,.55), 0 0 80px -12px rgba(255,197,49,.45); animation: btbPop .5s cubic-bezier(.2,1.3,.4,1) both; }
        .cardStripe { display: flex; height: 12px; }
        .cardStripe span:nth-child(1) { flex: 1; background: #FF2E93; }
        .cardStripe span:nth-child(2) { flex: 1; background: #FFC531; }
        .cardStripe span:nth-child(3) { flex: 1; background: #00E5D0; }
        .cardStripe span:nth-child(4) { flex: 1; background: #8B5CF6; }
        .cardStripe span:nth-child(5) { flex: 1; background: #FF2E93; }
        .cardStripe span:nth-child(6) { flex: 1; background: #FFC531; }
        .cardTop { display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; }
        .eyebrow { font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #FFC531; }
        .serial { font-family: 'Space Mono', monospace; font-size: 11px; color: #7E75A0; }
        .perf { height: 0; border-top: 2px dashed rgba(255,255,255,.16); }
        .cardBody { padding: 26px 24px 30px; }

        .lede { margin: 0 0 22px; font-size: 15px; line-height: 1.55; color: #BDB3D6; }
        label.field { display: block; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #8E85AE; margin: 18px 0 7px; }
        label.field:first-of-type { margin-top: 0; }
        .app input[type=text], .app input[type=email], .app input[type=number], .app input[type=password], .app input[type=date], .app select {
          width: 100%; background: #0B0714; border: 1px solid rgba(255,255,255,.12); border-radius: 10px;
          padding: 13px 14px; color: #F3EDE4; font-family: 'Space Grotesk', sans-serif; font-size: 15px;
        }
        .app input:focus, .app select:focus { outline: 2px solid #FFC531; outline-offset: 1px; }
        .codeInput { font-family: 'Space Mono', monospace !important; letter-spacing: .12em; text-transform: uppercase; }
        .hint { margin: 9px 0 0; font-size: 12px; color: #7E75A0; }
        .checkRow { display: flex; align-items: flex-start; gap: 11px; margin-top: 20px; cursor: pointer; }
        .checkRow input { margin-top: 3px; width: 16px; height: 16px; flex-shrink: 0; accent-color: #FF2E93; }
        .checkRow span { font-size: 12.5px; line-height: 1.5; color: #8E85AE; }
        .err { margin-top: 14px; color: #FF2E93; font-size: 13.5px; }

        .btn {
          margin-top: 22px; width: 100%; border: none; border-radius: 12px; padding: 16px; cursor: pointer;
          background: linear-gradient(96deg, #FFC531, #FF2E93 60%, #8B5CF6); color: #0B0714;
          font-family: 'Anton', sans-serif; font-size: 20px; letter-spacing: .06em; text-transform: uppercase;
        }
        .btn:hover { filter: brightness(1.1); box-shadow: 0 12px 34px -6px rgba(255,46,147,.6); }
        .btnGhost { background: transparent; border: 1px solid rgba(255,255,255,.18); color: #F3EDE4; }
        .btnGhost:hover { border-color: #00E5D0; color: #00E5D0; box-shadow: none; filter: none; }
        .btnSmall { width: auto; margin-top: 0; padding: 9px 18px; font-size: 14px; border-radius: 999px; }

        .lockedEvent { margin-top: 18px; background: rgba(255,197,49,.12); border: 1px solid #FFC531; color: #FFC531; border-radius: 10px; padding: 13px 14px; font-weight: 700; font-size: 15px; }

        .scratchWrap { position: relative; width: 100%; max-width: 320px; aspect-ratio: 6 / 5; margin: 0 auto; border-radius: 14px; overflow: hidden; box-shadow: 0 0 0 3px rgba(255,197,49,.35); touch-action: none; }
        .symbolsGrid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(3,1fr); background: #F7F1E3; }
        .symbolCell { display: flex; align-items: center; justify-content: center; border-right: 1px dashed rgba(11,7,20,.14); border-bottom: 1px dashed rgba(11,7,20,.14); }
        .symbolCell:nth-child(3n) { border-right: none; }
        .symbolCell:nth-child(n+7) { border-bottom: none; }
        .scratchCanvas { position: absolute; inset: 0; width: 100%; height: 100%; cursor: grab; }
        .scratchTitle { margin: 0 0 6px; font-family: 'Anton', sans-serif; font-weight: 400; font-size: 40px; line-height: 1; text-transform: uppercase; color: #FFC531; }
        .scratchNote { text-align: center; margin: 16px 0 0; font-family: 'Space Mono', monospace; font-size: 11.5px; letter-spacing: .08em; color: #7E75A0; }

        .resultBody { text-align: center; }
        .resultIcon { animation: btbBob 2.2s ease-in-out infinite; }
        .resultTitle { margin: 14px 0 10px; font-family: 'Anton', sans-serif; font-weight: 400; font-size: 58px; line-height: .9; text-transform: uppercase; color: #FFC531; animation: btbWobble 2.4s ease-in-out infinite; }
        .prizeLabel { margin: 0 0 10px; font-size: 19px; font-weight: 700; }
        .resultNote { margin: 0; font-size: 14px; line-height: 1.55; color: #8E85AE; }

        .adminWrap { position: relative; z-index: 2; max-width: 1000px; margin: 0 auto; padding: 26px 18px 0; }
        .adminHeader { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .adminHeader h1 { margin: 0; font-family: 'Anton', sans-serif; font-weight: 400; font-size: 30px; text-transform: uppercase; }
        .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .tab { font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; padding: 10px 18px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(255,255,255,.14); background: transparent; color: #8E85AE; }
        .tab.active { border-color: #FF2E93; background: #FF2E93; color: #0B0714; font-weight: 700; }
        .panel { background: #14102A; border: 1px solid rgba(255,255,255,.09); border-radius: 16px; padding: 20px; margin-bottom: 18px; }
        .panel h3 { margin: 0 0 6px; font-family: 'Anton', sans-serif; font-weight: 400; font-size: 22px; text-transform: uppercase; }
        .panel p.sub { margin: 0 0 16px; font-size: 13.5px; color: #8E85AE; }
        .chipRow { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        .chip { font-family: 'Space Mono', monospace; font-size: 12px; padding: 9px 15px; border-radius: 999px; cursor: pointer; border: 1px solid rgba(255,255,255,.14); background: #0B0714; color: #8E85AE; }
        .chip.active { border-color: #FFC531; background: #FFC531; color: #0B0714; font-weight: 700; }
        .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .app table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .app th { text-align: left; font-family: 'Space Mono', monospace; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: #A79BC4; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.15); }
        .app td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,.08); color: #F3EDE4; }
        .app tbody tr:nth-child(odd) { background: rgba(255,255,255,.03); }
        .prizeTag { font-family: 'Space Mono', monospace; font-size: 11px; padding: 4px 9px; border-radius: 999px; background: rgba(255,255,255,.07); color: #7E75A0; display: inline-block; }
        .prizeTag.win { background: rgba(255,197,49,.18); color: #FFC531; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
        .campaignCard { border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .campaignCard h4 { margin: 0; font-family: 'Anton', sans-serif; font-weight: 400; font-size: 19px; text-transform: uppercase; }
        .campaignHead { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .statusTag { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; background: rgba(0,229,208,.18); color: #00E5D0; }
        .statusTag.closed { background: rgba(255,46,147,.18); color: #FF2E93; }
        .meta { margin: 8px 0 10px; font-family: 'Space Mono', monospace; font-size: 12px; color: #8E85AE; }
        .meta b { color: #FFC531; }
        .barOuter { height: 8px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
        .barInner { height: 100%; background: linear-gradient(90deg, #FF2E93, #FFC531, #00E5D0); }
        .linkPreview { margin-top: 10px; font-family: 'Space Mono', monospace !important; font-size: 11px !important; color: #8E85AE !important; }
        .empty { text-align: center; padding: 34px 0; color: #7E75A0; font-size: 13px; }
        @media (max-width: 640px) { .app table { font-size: 12px; } }
      `}</style>

      <Ticker />
      <FairyLights />
      <div className="discoWrap">
        <div className="discoCord" />
        <div className="discoBall" />
      </div>
      <div className="waterline" />
      <Equaliser />

      {loading ? (
        <div className="empty">Loading…</div>
      ) : view === "entry" ? (
        <>
          {Masthead}
          <div className="stage">
            <h1 className="hero">
              <span className="l1">Scratch.</span>
              <span className="l2">Reveal.</span>
              <span className="l3">Dance.</span>
            </h1>
            <Card eyebrow="Tap in to play" right="Free entry">
              <p className="lede">
                Three matching symbols is all it takes. Drop your details in and see what you have won.
              </p>
              <form onSubmit={submitEntry}>
                <label className="field">Full name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jordan Lee" />

                <label className="field">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jordan@company.com" />

                {!urlEventId && (
                  <>
                    <label className="field">Company</label>
                    <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
                  </>
                )}

                {urlEventId ? (
                  lockedCampaign && isLive(lockedCampaign) ? (
                    <div className="lockedEvent">{lockedCampaign.name}</div>
                  ) : lockedCampaign && lockedCampaign.expiresAt && Date.now() > lockedCampaign.expiresAt ? (
                    <p className="err">This event has now ended.</p>
                  ) : lockedCampaign ? (
                    <p className="err">This event has reached its scratch card limit.</p>
                  ) : (
                    <p className="err">This event link is invalid or no longer live.</p>
                  )
                ) : (
                  <>
                    <label className="field">Event code</label>
                    <input
                      className="codeInput"
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. TEST"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    <p className="hint">The code from your host, your company, or the door team.</p>
                  </>
                )}

                <label className="checkRow">
                  <input type="checkbox" checked={form.marketingConsent} onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} />
                  <span>Keep me posted on gigs, parties and offers by the river.</span>
                </label>

                {formError && <div className="err">{formError}</div>}
                <button className="btn" type="submit">Get my card</button>
              </form>
            </Card>
          </div>
        </>
      ) : view === "scratch" ? (
        <>
          {Masthead}
          <div className="stage">
            <Card eyebrow={currentEntry.campaignName} right={serial(currentEntry.id)} accent="teal">
              <h1 className="scratchTitle">Good luck, {currentEntry.name.split(" ")[0]}</h1>
              <p className="lede">Rub the foil off. Three of a kind and you're winning.</p>
              <ScratchPanel prizeKey={currentEntry.prize} onRevealed={() => setView("result")} />
              <p className="scratchNote">FIND 3 MATCHING SYMBOLS TO WIN</p>
            </Card>
          </div>
        </>
      ) : view === "result" ? (
        <>
          {Masthead}
          <div className="stage">
            <Card eyebrow={currentEntry.campaignName} right={serial(currentEntry.id)} accent="win">
              <div className="resultBody">
                <div className="resultIcon">
                  <GridIcon name={prizeResult.icon} size={76} />
                </div>
                <h1 className="resultTitle">{isWin ? "Winner!" : "So close"}</h1>
                <p className="prizeLabel">{prizeResult.label}</p>
                <p className="resultNote">
                  {isWin
                    ? "Show this screen to a member of the team to claim."
                    : "Thanks for playing — there'll be more chances by the river."}
                </p>
                <button className="btn btnGhost" onClick={resetToStart}>Done</button>
              </div>
            </Card>
          </div>
        </>
      ) : view === "adminLogin" ? (
        <>
          {Masthead}
          <div className="stage">
            <Card eyebrow="Control room">
              <h1 className="scratchTitle">Back of house</h1>
              <p className="lede">Password required to see entries and run campaigns.</p>
              <form onSubmit={loginAdmin}>
                <label className="field">Password</label>
                <input ref={pwInputRef} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false" />
                {pwError && <div className="err">{pwError}</div>}
                <button className="btn" type="submit" onClick={loginAdmin}>Log in</button>
                <button type="button" className="btn btnGhost" style={{ marginTop: 10 }} onClick={() => setView("entry")}>
                  Back to the card
                </button>
              </form>
            </Card>
          </div>
        </>
      ) : (
        <div className="adminWrap">
          <div className="adminHeader">
            <h1>Back of house</h1>
            <button className="btn btnGhost btnSmall" onClick={() => setView("entry")}>Log out</button>
          </div>
          <div className="tabs">
            <button className={"tab " + (adminTab === "entries" ? "active" : "")} onClick={() => setAdminTab("entries")}>Entries</button>
            <button className={"tab " + (adminTab === "campaigns" ? "active" : "")} onClick={() => setAdminTab("campaigns")}>Events</button>
          </div>

          {adminTab === "entries" ? (
            <div className="panel">
              <div className="chipRow">
                <button className={"chip " + (campaignFilter === "all" ? "active" : "")} onClick={() => setCampaignFilter("all")}>
                  All ({entries.length})
                </button>
                {campaigns.map((c) => {
                  const count = entries.filter((e) => e.campaignId === c.id).length;
                  return (
                    <button key={c.id} className={"chip " + (campaignFilter === c.id ? "active" : "")} onClick={() => setCampaignFilter(c.id)}>
                      {c.code || c.name} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="toolbar">
                <label className="checkRow" style={{ marginTop: 0 }}>
                  <input type="checkbox" checked={marketingOnly} onChange={(e) => setMarketingOnly(e.target.checked)} />
                  <span>Marketing opt-ins only</span>
                </label>
                <button className="btn btnSmall" onClick={exportCSV}>Export CSV</button>
              </div>
              {filteredEntries.length === 0 ? (
                <div className="empty">No entries yet.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Company</th><th>Event</th><th>Prize</th><th>Marketing</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredEntries].reverse().map((e) => (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{e.email}</td>
                        <td>{e.company}</td>
                        <td>{e.campaignName}</td>
                        <td><span className={"prizeTag " + (e.prize !== "noWin" ? "win" : "")}>{PRIZES[e.prize]?.label}</span></td>
                        <td>{e.marketingConsent ? "Yes" : "—"}</td>
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
                <h3>Published site link</h3>
                <p className="sub">Paste the real public URL you get from "Share" once you publish this app — individual event links are built from it.</p>
                <form onSubmit={saveBaseUrl}>
                  <input type="text" value={baseUrlInput} onChange={(e) => setBaseUrlInput(e.target.value)} placeholder="https://claude.site/artifacts/your-app-id" />
                  <button className="btn btnSmall" type="submit" style={{ marginTop: 12 }}>{baseUrlSaved ? "Saved!" : "Save link"}</button>
                </form>
              </div>

              <div className="panel">
                <h3>New event or company batch</h3>
                <p className="sub">Set the total card limit and how many of each prize to give away — everything else is a non-winner.</p>
                <form onSubmit={createCampaign}>
                  <div className="grid">
                    <div>
                      <label className="field">Event name</label>
                      <input type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="Acme Corp — Summer Launch" />
                    </div>
                    <div>
                      <label className="field">Entry code</label>
                      <input className="codeInput" type="text" value={newCampaign.code} onChange={(e) => setNewCampaign({ ...newCampaign, code: e.target.value })} placeholder="ACME2026" />
                    </div>
                    <div>
                      <label className="field">Total cards</label>
                      <input type="number" min="1" value={newCampaign.cap} onChange={(e) => setNewCampaign({ ...newCampaign, cap: e.target.value })} />
                    </div>
                    <div>
                      <label className="field">Comp DJ sets</label>
                      <input type="number" min="0" value={newCampaign.dj} onChange={(e) => setNewCampaign({ ...newCampaign, dj: e.target.value })} />
                    </div>
                    <div>
                      <label className="field">Ticket pairs</label>
                      <input type="number" min="0" value={newCampaign.tickets} onChange={(e) => setNewCampaign({ ...newCampaign, tickets: e.target.value })} />
                    </div>
                    <div>
                      <label className="field">Photobooth</label>
                      <input type="number" min="0" value={newCampaign.photobooth} onChange={(e) => setNewCampaign({ ...newCampaign, photobooth: e.target.value })} />
                    </div>
                    <div>
                      <label className="field">Chocolate</label>
                      <input type="number" min="0" value={newCampaign.chocolate} onChange={(e) => setNewCampaign({ ...newCampaign, chocolate: e.target.value })} />
                    </div>
                    <div>
                      <label className="field">Expiry date (optional)</label>
                      <input type="date" value={newCampaign.expiresAt} onChange={(e) => setNewCampaign({ ...newCampaign, expiresAt: e.target.value })} />
                    </div>
                  </div>
                  {campaignError && <div className="err">{campaignError}</div>}
                  <button className="btn btnSmall" type="submit" style={{ marginTop: 18 }}>Create event</button>
                </form>
              </div>

              <div className="panel">
                <h3>Live &amp; past events</h3>
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
                        <div className="campaignHead">
                          <h4>{c.name}</h4>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span className={"statusTag " + (expired || full ? "closed" : "")}>
                              {expired ? "Expired" : full ? "Full" : "Live"}
                            </span>
                            <button type="button" className="btn btnGhost btnSmall" onClick={() => copyLink(c.id)}>
                              {copiedId === c.id ? "Copied!" : "Copy link"}
                            </button>
                            <button
                              type="button"
                              className="btn btnGhost btnSmall"
                              onClick={() => (editingId === c.id ? setEditingId(null) : startEdit(c))}
                            >
                              {editingId === c.id ? "Cancel" : "Edit"}
                            </button>
                          </div>
                        </div>
                        <p className="meta">
                          Code <b>{c.code}</b> · {c.usedCount} of {c.cap} cards used
                          {c.expiresAt ? ` · ${expired ? "Expired" : "Expires"} ${fmtDate(c.expiresAt)}` : ""}
                        </p>
                        <div className="barOuter"><div className="barInner" style={{ width: pct + "%" }} /></div>
                        <p className="meta" style={{ marginBottom: 0 }}>
                          DJ {won.dj}/{c.counts.dj} · Tickets {won.tickets}/{c.counts.tickets} · Photobooth {won.photobooth}/{c.counts.photobooth} · Chocolate {won.chocolate}/{c.counts.chocolate}
                        </p>
                        {editingId === c.id ? (
                          <form onSubmit={(e) => saveEdit(e, c.id)} style={{ marginTop: 14 }}>
                            <p className="hint" style={{ margin: "0 0 10px" }}>
                              {c.usedCount} card{c.usedCount === 1 ? "" : "s"} already scratched — those results
                              stay as they are. This only changes what's left.
                            </p>
                            <div className="grid">
                              <div>
                                <label className="field">Total cards</label>
                                <input
                                  type="number"
                                  min={c.usedCount}
                                  value={editForm.cap}
                                  onChange={(e) => setEditForm({ ...editForm, cap: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="field">Comp DJ sets</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.dj}
                                  onChange={(e) => setEditForm({ ...editForm, dj: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="field">Ticket pairs</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.tickets}
                                  onChange={(e) => setEditForm({ ...editForm, tickets: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="field">Photobooth</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.photobooth}
                                  onChange={(e) => setEditForm({ ...editForm, photobooth: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="field">Chocolate</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.chocolate}
                                  onChange={(e) => setEditForm({ ...editForm, chocolate: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="field">Expiry date (optional)</label>
                                <input
                                  type="date"
                                  value={editForm.expiresAt}
                                  onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                                />
                              </div>
                            </div>
                            {editError && <div className="err">{editError}</div>}
                            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                              <button className="btn btnSmall" type="submit" onClick={(e) => saveEdit(e, c.id)}>
                                Save changes
                              </button>
                              <button
                                type="button"
                                className="btn btnGhost btnSmall"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <input className="linkPreview" readOnly value={campaignLink(c.id)} onFocus={(e) => e.target.select()} />
                            {copiedId === c.id + ":manual" && (
                              <p className="hint">Couldn't auto-copy — tap the link field to select it, then copy manually.</p>
                            )}
                          </>
                        )}
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
  );
}


