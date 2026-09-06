import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  TriangleAlert, User, Ban, Route, WifiOff, Battery, HelpCircle,
  LayoutGrid, Bot, Users, Flame, Waypoints, Building2, Radar, ScrollText,
  FileText, Plus, X, ZoomIn, ZoomOut, Crosshair, Radio, Loader2, Check, Search, Download,
  Compass, Undo2, PauseCircle
} from "lucide-react";

/* ---------- theme config ---------- */
const THEMES = {
  tactical: {
    label: "Tactical",
    bg: "#0A0C09", panel: "#12140F", panel2: "#181B13", border: "#2B2F22",
    text: "#D8E0C8", textMuted: "#7C8368", accent: "#7DD35A",
    warn: "#E0A93B", danger: "#E15B4E", info: "#4FB3D9", font: "ui-monospace, monospace",
    scene: {
      bg: 0x0a0c09, ground: 0x171911, grid: 0x2b2f22, gridOpacity: 0.5, wireframe: false,
      building: [0x2c3123, 0x323828, 0x272b1e], roof: 0x3d4530, edge: 0x4a5138, edgeOpacity: 0.5,
      robot: 0x8fe86a, hazard: 0xf0b542, survivor: 0x8fe86a, blocked: 0xf0685a,
      newRoute: 0x5fc3ea, accessRoute: 0x8fe86a, fog: 0x4c5a3a, fogAlpha: 0.6, unknown: 0xc9a8ff, glow: 0.5,
    },
  },
  blueprint: {
    label: "Blueprint",
    bg: "#EEF1F5", panel: "#FFFFFF", panel2: "#F4F6F9", border: "#D3DAE3",
    text: "#1D2836", textMuted: "#6B7686", accent: "#2C7BE5",
    warn: "#D9822B", danger: "#D14343", info: "#7B5FD9", font: "ui-sans-serif, system-ui",
    scene: {
      // deep blueprint-blue backdrop, but every marker/icon color is chosen to sit far
      // from the blue/cyan grid & building family so nothing blends into the linework.
      bg: 0x081a30, ground: 0x0a2240, grid: 0x3d6ea3, gridOpacity: 0.22, wireframe: true,
      building: [0x0f2c4d], roof: 0x0f2c4d, edge: 0x5fa3e0, edgeOpacity: 0.35,
      robot: 0xffd23f, hazard: 0xff7a45, survivor: 0x3ce691, blocked: 0xff4d6a,
      newRoute: 0xc98bff, accessRoute: 0x3ce691, fog: 0xdce8fb, fogAlpha: 0.4, unknown: 0xffb84d, glow: 0.6,
    },
  },
  holographic: {
    label: "Holographic",
    bg: "#05040C", panel: "#0C0A1C", panel2: "#120F26", border: "#2A2450",
    text: "#DCE0FF", textMuted: "#8A85C2", accent: "#4FE3E0",
    warn: "#E8A33D", danger: "#FF4FA0", info: "#7C6BFF", font: "ui-monospace, monospace",
    scene: {
      bg: 0x05040c, ground: 0x0a0818, grid: 0x2a2450, gridOpacity: 0.6, wireframe: false,
      building: [0x140f2e, 0x181233, 0x110c26], roof: 0x241a4a, edge: 0x4fe3e0, edgeOpacity: 0.55,
      robot: 0x4fe3e0, hazard: 0xffb14f, survivor: 0x4fe3e0, blocked: 0xff4fa0,
      newRoute: 0x7c6bff, accessRoute: 0x4fe3e0, fog: 0x5c4fb0, fogAlpha: 0.55, unknown: 0xb08fff, glow: 1,
    },
  },
};

/* ---------- mock world data ---------- */
const INITIAL_MARKERS = [
  { id: "R-01", type: "robot", status: "exploring", battery: 78, pos: [-10, -6], sector: "B2" },
  { id: "R-02", type: "robot", status: "returning", battery: 63, pos: [4, -9], sector: "F3" },
  { id: "R-03", type: "robot", status: "searching", battery: 89, pos: [9, 4], sector: "E4" },
  { id: "R-04", type: "robot", status: "blocked", battery: 21, pos: [-3, 7], sector: "C7" },
  { id: "R-05", type: "robot", status: "exploring", battery: 74, pos: [-13, 3], sector: "A3" },
  { id: "R-06", type: "robot", status: "standby", battery: 100, pos: [0, 0], sector: "D1" },
  { id: "H-1", type: "hazard", label: "Unstable building", severity: "high", detectedBy: "R-04", pos: [6, -3], sector: "D4" },
  { id: "H-2", type: "hazard", label: "Gas leak", severity: "high", detectedBy: "R-05", pos: [-8, -2], sector: "A3" },
  { id: "H-3", type: "hazard", label: "Fire", severity: "medium", detectedBy: "R-02", pos: [2, 6], sector: "C2" },
  { id: "S-1", type: "survivor", detectedBy: "R-03", pos: [8, 3], sector: "B4" },
  { id: "S-2", type: "survivor", detectedBy: "R-01", pos: [-11, -8], sector: "A1" },
  { id: "S-3", type: "survivor", detectedBy: "R-05", pos: [-2, -10], sector: "F1" },
  { id: "D-1", type: "deadzone", pos: [10, -8], sector: "F4" },
];
const INITIAL_ROUTES = [
  { id: "rt1", type: "accessible", pts: [[-10, -6], [-4, -3], [0, 0]], from: "A3", to: "D1", discoveredBy: "R-01" },
  { id: "rt3", type: "blocked", pts: [[-3, 7], [2, 6]], from: "C7", to: "C2", discoveredBy: "R-04" },
];
const INITIAL_ZONES = [
  { id: "Z-1", x: -16, z: -11, w: 13, d: 9, status: "unexplored" },
  { id: "Z-2", x: 13, z: 9, w: 12, d: 9, status: "unexplored" },
  { id: "Z-3", x: 14, z: -10, w: 11, d: 7, status: "unexplored" },
];
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "robots", label: "Robots", icon: Bot },
  { id: "survivors", label: "Survivors", icon: Users },
  { id: "hazards", label: "Hazards", icon: Flame },
  { id: "routes", label: "Routes", icon: Waypoints },
  { id: "structural", label: "Structural analysis", icon: Building2 },
  { id: "comms", label: "Communications", icon: Radar },
  { id: "log", label: "Mission log", icon: ScrollText },
  { id: "reports", label: "Reports", icon: FileText },
];
const TABS = [
  { id: "robot", label: "Robots", icon: Bot },
  { id: "survivor", label: "Survivors", icon: Users },
  { id: "hazard", label: "Hazards", icon: Flame },
];
const ALERT_TEMPLATES = [
  { severity: "critical", text: "Structural instability detected", markerType: "hazard" },
  { severity: "warning", text: "Gas leak detected", markerType: "hazard" },
  { severity: "success", text: "Survivor detected", markerType: "survivor" },
  { severity: "warning", text: "Communication degraded", markerType: "robot" },
];
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// shortest distance from a point to a line segment — used to test whether a
// newly-discovered hazard sits close enough to an existing route to block it
function pointToSegmentDist(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let tt = lenSq === 0 ? 0 : ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  tt = Math.max(0, Math.min(1, tt));
  const cx = x1 + tt * dx, cz = z1 + tt * dz;
  return Math.hypot(px - cx, pz - cz);
}
function pointToRouteDist(pos, pts) {
  let min = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = pointToSegmentDist(pos[0], pos[1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < min) min = d;
  }
  return min;
}
const formatTime = (totalSeconds) => {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};
const MISSION_START_KEY = "resq-mission-start-time";
const STATUS_OPTIONS = [
  { label: "deploy", status: "exploring", icon: Compass },
  { label: "return", status: "returning", icon: Undo2 },
  { label: "hold", status: "standby", icon: PauseCircle },
  { label: "regroup", status: "searching", icon: Search },
];

/* ---------- canvas-drawn glowing icon sprite ---------- */
function makeIconTexture(type, colorHex, glowStrength) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const hex = "#" + colorHex.toString(16).padStart(6, "0");
  const cx = 64, cy = 64;
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 62);
  grad.addColorStop(0, hex + "e6");
  grad.addColorStop(0.35, hex + Math.round(110 * glowStrength).toString(16).padStart(2, "0"));
  grad.addColorStop(1, hex + "00");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  if (type === "robot") {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(40, 40, 48, 40, 8); else ctx.rect(40, 40, 48, 40);
    ctx.fill();
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.arc(56, 58, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(72, 58, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(64, 40); ctx.lineTo(64, 28); ctx.stroke();
    ctx.beginPath(); ctx.arc(64, 24, 4, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
  } else if (type === "survivor") {
    ctx.beginPath(); ctx.arc(64, 42, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(48, 90); ctx.quadraticCurveTo(64, 58, 80, 90); ctx.closePath(); ctx.fill();
  } else if (type === "hazard") {
    ctx.beginPath(); ctx.moveTo(64, 26); ctx.lineTo(96, 92); ctx.lineTo(32, 92); ctx.closePath();
    ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(60, 50, 8, 22);
    ctx.beginPath(); ctx.arc(64, 80, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === "unknown") {
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("?", 64, 66);
  } else {
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(64, 64, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(44, 44); ctx.lineTo(84, 84); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ---------- soft fog-puff sprite texture ---------- */
function makeFogTexture(colorHex) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const hex = "#" + colorHex.toString(16).padStart(6, "0");
  const cx = 128, cy = 128;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 126);
  grad.addColorStop(0, hex + "cc");
  grad.addColorStop(0.45, hex + "77");
  grad.addColorStop(0.8, hex + "22");
  grad.addColorStop(1, hex + "00");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ---------- report generation ---------- */
function buildReportText(title, { markers, routes, alerts, seconds, commsUnstable }) {
  const robots = markers.filter((m) => m.type === "robot");
  const survivors = markers.filter((m) => m.type === "survivor");
  const hazards = markers.filter((m) => m.type === "hazard");
  const ts = formatTime(seconds);
  const line = (n = 44) => "-".repeat(n);

  if (title === "Mission summary") {
    return [
      "MISSION SUMMARY REPORT",
      "Mission: Aftershock Response",
      `Generated at mission time ${ts}`,
      line(),
      "",
      "KEY METRICS",
      `  Robots deployed:     ${robots.length}`,
      `  Survivors located:   ${survivors.length}`,
      `  Active hazards:      ${hazards.length}`,
      `  Routes discovered:   ${routes.length}`,
      `  Comms status:        ${commsUnstable ? "Unstable" : "Stable"}`,
      "",
      "ROBOT FLEET",
      ...robots.map((r) => `  ${r.id.padEnd(6)} status: ${r.status.padEnd(10)} battery: ${String(r.battery).padStart(3)}%  sector: ${r.sector}`),
      "",
      "SURVIVORS",
      ...(survivors.length ? survivors.map((s) => `  ${s.id.padEnd(6)} sector: ${s.sector.padEnd(5)} detected by: ${s.detectedBy}`) : ["  None located yet."]),
      "",
      "ACTIVE HAZARDS",
      ...(hazards.length ? hazards.map((h) => `  ${h.id.padEnd(6)} ${h.label.padEnd(22)} risk: ${h.severity.padEnd(6)} sector: ${h.sector}`) : ["  None detected."]),
      "",
      "RECENT LOG",
      ...(alerts.slice(0, 8).map((a) => `  [${a.time}] (${a.severity}) ${a.text} — sector ${a.sector}`)),
      "",
      "— End of report —",
    ].join("\n");
  }

  if (title === "Robot performance") {
    const avgBatt = robots.length ? Math.round(robots.reduce((a, r) => a + r.battery, 0) / robots.length) : 0;
    const statusCounts = robots.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    return [
      "ROBOT PERFORMANCE REPORT",
      `Generated at mission time ${ts}`,
      line(),
      "",
      `  Fleet size:        ${robots.length}`,
      `  Average battery:   ${avgBatt}%`,
      `  Status breakdown:  ${Object.entries(statusCounts).map(([k, v]) => `${k} (${v})`).join(", ") || "n/a"}`,
      "",
      "PER-ROBOT DETAIL",
      ...robots.map((r) => `  ${r.id.padEnd(6)} status: ${r.status.padEnd(10)} battery: ${String(r.battery).padStart(3)}%  sector: ${r.sector}  signal: ${r.battery > 60 ? "good" : r.battery > 30 ? "fair" : "weak"}`),
      "",
      "ROUTE ACTIVITY",
      ...(routes.length ? routes.map((r) => `  ${r.id.padEnd(8)} ${r.from} -> ${r.to}  [${r.type}]  discovered by ${r.discoveredBy}`) : ["  No routes discovered yet."]),
      "",
      "— End of report —",
    ].join("\n");
  }

  if (title === "Hazard report") {
    const bySev = (sv) => hazards.filter((h) => h.severity === sv).length;
    return [
      "HAZARD REPORT",
      `Generated at mission time ${ts}`,
      line(),
      "",
      `  Total active hazards: ${hazards.length}`,
      `  High risk:            ${bySev("high")}`,
      `  Medium risk:          ${bySev("medium")}`,
      `  Low risk:             ${bySev("low")}`,
      "",
      "DETAIL",
      ...(hazards.length ? hazards.map((h) => `  ${h.id.padEnd(6)} ${h.label.padEnd(22)} risk: ${h.severity.padEnd(6)} sector: ${h.sector}  detected by: ${h.detectedBy}`) : ["  No hazards detected."]),
      "",
      "— End of report —",
    ].join("\n");
  }

  // Structural report
  const bySev = (sv) => hazards.filter((h) => h.severity === sv).length;
  return [
    "STRUCTURAL ANALYSIS REPORT",
    `Generated at mission time ${ts}`,
    line(),
    "",
    `  Flagged buildings:   ${hazards.length}`,
    `  High risk:           ${bySev("high")}`,
    `  Sectors surveyed:    ${new Set(markers.map((m) => m.sector)).size}`,
    "",
    "RISK BY BUILDING",
    ...(hazards.length
      ? hazards.map((h) => {
          const riskPct = h.severity === "high" ? 90 : h.severity === "medium" ? 55 : 28;
          return `  Sector ${h.sector.padEnd(5)} ${h.label.padEnd(22)} risk score: ${riskPct}%  (${h.severity})`;
        })
      : ["  No structural flags yet."]),
    "",
    "— End of report —",
  ].join("\n");
}

/* ---------- pretty report viewer (download stays plain text; this is view-only) ---------- */
function parseReportText(text) {
  const lines = (text || "").split("\n");
  const title = lines[0] || "";
  let i = 1;
  const meta = [];
  while (i < lines.length && lines[i].trim() !== "" && !/^-{3,}$/.test(lines[i].trim())) {
    meta.push(lines[i].trim());
    i++;
  }
  if (i < lines.length && /^-{3,}$/.test(lines[i].trim())) i++;
  const sections = [];
  let current = null;
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    const isHeader = !raw.startsWith(" ") && /^[A-Z][A-Z \-]+$/.test(raw);
    if (isHeader) {
      current = { header: raw.trim(), lines: [] };
      sections.push(current);
    } else {
      if (!current) { current = { header: null, lines: [] }; sections.push(current); }
      current.lines.push(raw.trim());
    }
  }
  return { title, meta, sections };
}

function reportValueColor(label, value, t) {
  const l = label.toLowerCase();
  const v = value.toLowerCase();
  if (l.includes("battery")) {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n > 60 ? t.accent : n > 30 ? t.warn : t.danger;
  }
  if (l.includes("risk") || l.includes("severity")) {
    if (v.includes("high") || v.includes("critical")) return t.danger;
    if (v.includes("medium") || v.includes("warning")) return t.warn;
    return t.accent;
  }
  if (l.includes("status") || l.includes("comms")) {
    if (v === "blocked" || v.includes("unstable")) return t.danger;
    if (v === "returning" || v === "fair") return t.warn;
    return t.accent;
  }
  return t.text;
}

function ReportLine({ line, t }) {
  const logMatch = line.match(/^\[(\d{2}:\d{2})\]\s*\((\w+)\)\s*(.+)$/);
  if (logMatch) {
    const [, time, severity, rest] = logMatch;
    const sevColor = severity === "critical" ? t.danger : severity === "warning" ? t.warn : severity === "success" ? t.accent : t.info;
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "5px 0", borderBottom: `0.5px solid ${t.border}` }}>
        <span style={{ fontSize: 10, color: t.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{time}</span>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: sevColor, flexShrink: 0 }}>{severity}</span>
        <span style={{ fontSize: 12, color: t.text }}>{rest}</span>
      </div>
    );
  }

  const segments = line.split(/\s{2,}/).filter(Boolean);

  if (segments.length > 1) {
    const hasId = !segments[0].includes(":");
    const id = hasId ? segments[0] : null;
    const pairs = (hasId ? segments.slice(1) : segments).map((seg) => {
      const idxColon = seg.indexOf(":");
      if (idxColon === -1) return { label: null, value: seg };
      return { label: seg.slice(0, idxColon).trim(), value: seg.slice(idxColon + 1).trim() };
    });
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "6px 0", borderBottom: `0.5px solid ${t.border}` }}>
        {id && (
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, monospace", color: t.text, background: t.panel2, border: `0.5px solid ${t.border}`, borderRadius: 5, padding: "2px 7px" }}>{id}</span>
        )}
        {pairs.map((p, i) =>
          p.label ? (
            <span key={i} style={{ fontSize: 10.5, color: t.textMuted, display: "flex", gap: 4, alignItems: "baseline" }}>
              {p.label}
              <span style={{ fontWeight: 600, color: reportValueColor(p.label, p.value, t) }}>{p.value}</span>
            </span>
          ) : (
            <span key={i} style={{ fontSize: 11, color: t.text }}>{p.value}</span>
          )
        )}
      </div>
    );
  }

  const single = segments[0] || line;
  const colonIdx = single.indexOf(":");
  if (colonIdx > -1 && colonIdx < 30) {
    const label = single.slice(0, colonIdx).trim();
    const value = single.slice(colonIdx + 1).trim();
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `0.5px solid ${t.border}` }}>
        <span style={{ fontSize: 11, color: t.textMuted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: reportValueColor(label, value, t) }}>{value}</span>
      </div>
    );
  }

  const isFooter = line.startsWith("—") || line.toLowerCase().includes("end of report");
  return (
    <div style={{ fontSize: isFooter ? 10 : 11.5, color: t.textMuted, fontStyle: isFooter ? "italic" : "normal", textAlign: isFooter ? "center" : "left", padding: "5px 0" }}>
      {line}
    </div>
  );
}

function ReportView({ text, t }) {
  const { title, meta, sections } = useMemo(() => parseReportText(text || ""), [text]);
  return (
    <div style={{ overflowY: "auto", background: t.panel2, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: 16 }}>
      <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `0.5px solid ${t.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.4, color: t.text }}>{title}</div>
        {meta.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            {meta.map((m, i) => (
              <span key={i} style={{ fontSize: 10.5, color: t.textMuted }}>{m}</span>
            ))}
          </div>
        )}
      </div>
      {sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: 16 }}>
          {sec.header && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.accent, textTransform: "uppercase", marginBottom: 6 }}>
              {sec.header}
            </div>
          )}
          <div>
            {sec.lines.map((line, li) => <ReportLine key={li} line={line} t={t} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResqCommand() {
  const [themeKey, setThemeKey] = useState("tactical");
  const t = THEMES[themeKey];
  const [nav, setNav] = useState("overview");
  const [leftTab, setLeftTab] = useState("robot");
  const [markers, setMarkers] = useState(() => INITIAL_MARKERS.map((m) => ({ ...m })));
  const [routes, setRoutes] = useState(() => INITIAL_ROUTES.map((r) => ({ ...r })));
  const [zones, setZones] = useState(() => INITIAL_ZONES.map((z) => ({ ...z })));
  const [selected, setSelected] = useState(null);
  const [zonePopup, setZonePopup] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [routeToasts, setRouteToasts] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [commsUnstable, setCommsUnstable] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [robotName, setRobotName] = useState("");
  const [sceneVersion, setSceneVersion] = useState(0);
  const [reportStatus, setReportStatus] = useState({});
  const [reportContent, setReportContent] = useState({});
  const [reportViewer, setReportViewer] = useState(null);
  const bump = () => setSceneVersion((v) => v + 1);

  const canvasWrapRef = useRef(null);
  const apiRef = useRef(null);
  const camStateRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const selectRef = useRef(null); selectRef.current = setSelected;
  const zonePopupRef = useRef(null); zonePopupRef.current = setZonePopup;
  const markersRef = useRef(markers); markersRef.current = markers;
  const routesRef = useRef(routes); routesRef.current = routes;
  const zonesRef = useRef(zones); zonesRef.current = zones;
  const alertsRef = useRef(alerts); alertsRef.current = alerts;
  const commsUnstableRef = useRef(commsUnstable); commsUnstableRef.current = commsUnstable;

  const secondsRef = useRef(0);
  const missionStartRef = useRef(Date.now());

  // Mission clock: driven by real elapsed time (not a plain counter) and, when
  // this is running inside an environment that offers persistent artifact
  // storage, anchored to a saved start timestamp — so reopening/remounting the
  // dashboard resumes the clock instead of restarting it from 0.
  useEffect(() => {
    let cancelled = false;
    let iv;
    async function init() {
      let start = Date.now();
      const store = typeof window !== "undefined" ? window.storage : null;
      if (store) {
        try {
          const existing = await store.get(MISSION_START_KEY);
          if (existing && existing.value) start = parseInt(existing.value, 10) || start;
          else await store.set(MISSION_START_KEY, String(start));
        } catch (e) {
          try { await store.set(MISSION_START_KEY, String(start)); } catch (e2) { /* storage unavailable, fall back to session-only clock */ }
        }
      }
      if (cancelled) return;
      missionStartRef.current = start;
      const tick = () => {
        const elapsed = Math.max(0, Math.floor((Date.now() - missionStartRef.current) / 1000));
        secondsRef.current = elapsed;
        setSeconds(elapsed);
      };
      tick();
      iv = setInterval(tick, 1000);
    }
    init();
    return () => { cancelled = true; if (iv) clearInterval(iv); };
  }, []);

  function pushAlert(tpl, marker) {
    const pool = marker ? [marker] : markersRef.current.filter((m) => m.type === tpl.markerType);
    const m = marker || pool[Math.floor(Math.random() * pool.length)] || markersRef.current[0];
    // read the live ref rather than a closed-over render value — this function
    // can be called from a long-lived interval set up on mount, so a captured
    // `seconds` value would otherwise be frozen at whatever it was on mount.
    const alert = { id: Date.now() + Math.random(), severity: tpl.severity, text: tpl.text, sector: m?.sector || "?", markerId: m?.id, time: formatTime(secondsRef.current) };
    setAlerts((prev) => [alert, ...prev].slice(0, 30));
    setToasts((prev) => [...prev, alert].slice(-3));
    setTimeout(() => setToasts((prev) => prev.filter((a) => a.id !== alert.id)), 5500);
  }

  function spawnRoute() {
    const from = pick(markersRef.current.filter((m) => m.type === "robot"));
    if (!from) return;
    const end = [from.pos[0] + rnd(-8, 8), from.pos[1] + rnd(-8, 8)];
    const id = "rt" + Date.now();
    const route = { id, type: "new", pts: [from.pos, end], from: from.sector, to: "?" + Math.floor(rnd(1, 9)), discoveredBy: from.id };
    setRoutes((prev) => [...prev, route]);
    setRouteToasts((prev) => [...prev, route].slice(-2));
    setTimeout(() => setRouteToasts((prev) => prev.filter((r) => r.id !== id)), 10000);
    bump();
  }

  function decideRoute(id, follow) {
    if (follow) {
      setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, type: "accessible" } : r)));
    } else {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    }
    setRouteToasts((prev) => prev.filter((r) => r.id !== id));
    bump();
  }

  // Zoom the map onto a discovered route. Used by the "new route" toast and by
  // the Routes table page. If the map isn't mounted (we're on a different nav
  // page), stash the request and switch to Overview so the scene-creation
  // effect can pick it up once the canvas exists (see pendingFocusRef below).
  function focusRoute(route) {
    if (!route || !route.pts) return;
    if (nav !== "overview" || !apiRef.current) {
      pendingFocusRef.current = { type: "route", pts: route.pts };
      setNav("overview");
    } else {
      apiRef.current.focusRoute(route.pts);
    }
  }

  function spawnDiscovery() {
    const type = Math.random() < 0.55 ? "survivor" : "hazard";
    const existingCount = markersRef.current.filter((m) => m.type === type).length;
    if (existingCount >= 14) return; // cap growth so the scene doesn't accumulate indefinitely
    const from = pick(markersRef.current.filter((m) => m.type === "robot"));
    if (!from) return;
    const pos = [from.pos[0] + rnd(-4, 4), from.pos[1] + rnd(-4, 4)];
    const id = (type === "survivor" ? "S-" : "H-") + Date.now().toString().slice(-4);
    const marker = type === "survivor"
      ? { id, type, detectedBy: from.id, pos, sector: from.sector }
      : { id, type, label: pick(["Unstable wall", "Gas leak", "Debris collapse", "Fire spread"]), severity: pick(["high", "medium", "low"]), detectedBy: from.id, pos, sector: from.sector };
    setMarkers((prev) => [...prev, marker]);
    pushAlert({ severity: type === "survivor" ? "success" : "warning", text: type === "survivor" ? "Survivor detected" : "Structural hazard detected", markerType: type }, marker);
    if (type === "hazard") {
      const HAZARD_BLOCK_RADIUS = 3.5;
      const blockedRoute = routesRef.current.find((r) => r.type !== "blocked" && pointToRouteDist(pos, r.pts) < HAZARD_BLOCK_RADIUS);
      if (blockedRoute) {
        setRoutes((prev) => prev.map((r) => (r.id === blockedRoute.id ? { ...r, type: "blocked" } : r)));
        setRouteToasts((prev) => prev.filter((r) => r.id !== blockedRoute.id));
        pushAlert({ severity: "warning", text: `Route ${blockedRoute.from} → ${blockedRoute.to} blocked`, markerType: "hazard" }, marker);
      }
    }
    bump();
  }

  useEffect(() => {
    const iv = setInterval(() => {
      const roll = Math.random();
      if (roll < 0.4) spawnDiscovery();
      else if (roll < 0.65) spawnRoute();
      else pushAlert({ severity: "warning", text: "Communication degraded", markerType: "robot" });
      setCommsUnstable(Math.random() < 0.65);
    }, 16000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus a marker on the 3D map. If we're not currently on the Overview page,
  // the canvas (and its imperative flyTo API) doesn't exist yet, so we stash
  // the request in pendingFocusRef and switch to Overview — the scene-creation
  // effect checks that ref once the canvas mounts and flies there immediately.
  function focusMarker(id) {
    const m = markersRef.current.find((x) => x.id === id);
    if (!m) return;
    if (nav !== "overview" || !apiRef.current) {
      pendingFocusRef.current = { type: "marker", id };
      setNav("overview");
    } else {
      apiRef.current.flyTo(m.pos, id);
    }
    setSelected(m);
    setZonePopup(null);
  }

  function updateRobotStatus(id, status) {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setSelected((s) => (s && s.id === id ? { ...s, status } : s));
  }

  function requestExtraction(m) { pushAlert({ severity: "success", text: "Extraction requested", markerType: "survivor" }, m); }

  function requestExplore(zoneId) {
    setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, status: "scanning" } : z)));
    setZonePopup((p) => (p ? { ...p, status: "scanning" } : p));
    bump();
    setTimeout(() => {
      setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, status: "explored" } : z)));
      const zone = zonesRef.current.find((z) => z.id === zoneId);
      const from = pick(markersRef.current.filter((m) => m.type === "robot"));
      if (zone && from && Math.random() < 0.8) {
        const type = Math.random() < 0.5 ? "survivor" : "hazard";
        const pos = [zone.x + rnd(-3, 3), zone.z + rnd(-3, 3)];
        const id = (type === "survivor" ? "S-" : "H-") + Date.now().toString().slice(-4);
        const marker = type === "survivor"
          ? { id, type, detectedBy: from.id, pos, sector: zoneId }
          : { id, type, label: "Unstable structure", severity: "medium", detectedBy: from.id, pos, sector: zoneId };
        setMarkers((prev) => [...prev, marker]);
      }
      pushAlert({ severity: "info", text: `Sector ${zoneId} mapped` });
      setZonePopup((p) => (p && p.id === zoneId ? { ...p, status: "explored" } : p));
      bump();
    }, 3200);
  }

  function linkRobot() {
    if (!robotName.trim()) return;
    setLinking(true);
    setTimeout(() => {
      const id = robotName.trim();
      setMarkers((prev) => [...prev, { id, type: "robot", status: "exploring", battery: 100, pos: [rnd(-16, 16), rnd(-11, 11)], sector: "NEW" }]);
      setLinking(false); setModalOpen(false); setRobotName(""); bump();
    }, 1100);
  }

  function runReport(title) {
    setReportStatus((prev) => ({ ...prev, [title]: "generating" }));
    setTimeout(() => {
      const text = buildReportText(title, {
        markers: markersRef.current,
        routes: routesRef.current,
        alerts: alertsRef.current,
        seconds: secondsRef.current,
        commsUnstable: commsUnstableRef.current,
      });
      setReportContent((prev) => ({ ...prev, [title]: text }));
      setReportStatus((prev) => ({ ...prev, [title]: formatTime(secondsRef.current) }));
      pushAlert({ severity: "info", text: `${title} generated` });
    }, 900);
  }

  function downloadReport(title) {
    const text = reportContent[title];
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- three.js scene ---------------- */
  useEffect(() => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const cfg = THEMES[themeKey].scene;
    const currentMarkers = markersRef.current;
    const currentRoutes = routesRef.current;
    const currentZones = zonesRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.bg);
    scene.fog = new THREE.Fog(cfg.bg, 28, 60);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wrap.innerHTML = "";
    wrap.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(12, 24, 8);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(cfg.robot, 0.25);
    rim.position.set(-10, 6, -10);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 52), new THREE.MeshStandardMaterial({ color: cfg.ground, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const grid = new THREE.GridHelper(64, 32, cfg.grid, cfg.grid);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = cfg.gridOpacity ?? 0.5;
    scene.add(grid);

    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    let seed = 7;
    const srand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = -19; i <= 19; i += 3) {
      for (let j = -13; j <= 13; j += 3) {
        if (srand() < 0.3) continue;
        const h = 1.2 + srand() * 5.2;
        const w = 1.5 + srand() * 0.7;
        const d = 1.5 + srand() * 0.7;
        const dmg = srand() < 0.15;
        const color = cfg.building[Math.floor(srand() * cfg.building.length)];
        let body;
        if (cfg.wireframe) {
          body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18 }));
        } else {
          body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 }));
          const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.08, d * 1.02), new THREE.MeshStandardMaterial({ color: cfg.roof, roughness: 0.6 }));
          roof.position.set(0, h / 2 + 0.04, 0);
          body.add(roof);
        }
        body.position.set(i + (srand() - 0.5) * 0.6, h / 2, j + (srand() - 0.5) * 0.6);
        if (dmg) body.rotation.z = (srand() - 0.5) * 0.22;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: cfg.edge, transparent: true, opacity: cfg.edgeOpacity ?? (cfg.wireframe ? 0.9 : 0.5) }));
        body.add(edges);
        worldGroup.add(body);
      }
    }

    // fog-of-war zones (unexplored / scanning) — layered drifting fog puffs, not a flat slab
    const zonePulsers = [];
    const fogDrifters = [];
    const fogTex = makeFogTexture(cfg.fog);
    currentZones.forEach((z) => {
      if (z.status === "explored") return;
      const baseAlpha = (cfg.fogAlpha ?? 0.5) * (z.status === "scanning" ? 0.55 : 1);
      const puffCount = 6;
      for (let k = 0; k < puffCount; k++) {
        const angle = (k / puffCount) * Math.PI * 2 + srand() * 0.6;
        const rad = Math.min(z.w, z.d) * (0.15 + srand() * 0.32);
        const ox = Math.cos(angle) * rad * (z.w / Math.min(z.w, z.d));
        const oz = Math.sin(angle) * rad * (z.d / Math.min(z.w, z.d));
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: baseAlpha }));
        const s = Math.max(z.w, z.d) * (0.55 + srand() * 0.35);
        puff.scale.set(s, s * 0.6, 1);
        puff.position.set(z.x + ox, 1.4 + srand() * 1.2, z.z + oz);
        worldGroup.add(puff);
        fogDrifters.push({ sprite: puff, cx: z.x + ox, cz: z.z + oz, phase: srand() * 10, amp: 0.5 + srand() * 0.6, speed: 0.15 + srand() * 0.15 });
      }
      const tex = makeIconTexture("unknown", cfg.unknown, cfg.glow);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(2, 2, 1);
      sprite.position.set(z.x, 3.4, z.z);
      sprite.userData = { zoneId: z.id };
      worldGroup.add(sprite);
      zonePulsers.push({ sprite, base: 2, amp: 0.25, speed: z.status === "scanning" ? 7 : 2 });
    });

    // routes
    currentRoutes.forEach((r) => {
      const pts = r.pts.map(([x, z]) => new THREE.Vector3(x, 0.18, z));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const color = r.type === "blocked" ? cfg.blocked : r.type === "new" ? cfg.newRoute : cfg.accessRoute;
      const mat = r.type === "blocked"
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.4, gapSize: 0.25 })
        : new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geo, mat);
      if (r.type === "blocked") line.computeLineDistances();
      worldGroup.add(line);
    });

    // markers
    const pulsers = [];
    const pickables = [];
    const robotSprites = {};
    currentMarkers.forEach((m) => {
      const colorHex = m.type === "hazard" ? cfg.hazard : m.type === "survivor" ? cfg.survivor : m.type === "deadzone" ? cfg.blocked : cfg.robot;
      if (m.type === "deadzone") {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.05, 28), new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.18 }));
        disc.position.set(m.pos[0], 0.05, m.pos[1]);
        worldGroup.add(disc);
      }
      const tex = makeIconTexture(m.type, colorHex, cfg.glow);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      const baseScale = m.type === "robot" ? 1.6 : 1.8;
      sprite.scale.set(baseScale, baseScale, 1);
      sprite.position.set(m.pos[0], 1.1, m.pos[1]);
      sprite.userData = { id: m.id };
      worldGroup.add(sprite);
      pickables.push(sprite);
      if (m.type !== "robot") pulsers.push({ sprite, base: baseScale, amp: baseScale * 0.14, speed: 3.2 });
      if (m.type === "robot") robotSprites[m.id] = { sprite, base: [m.pos[0], m.pos[1]], phase: Math.random() * 10 };
    });
    zonePulsers.forEach((p) => pickables.push(p.sprite));

    if (!camStateRef.current) camStateRef.current = { radius: 34, theta: 0.9, phi: 0.85, target: new THREE.Vector3(0, 0, 0) };
    const camState = camStateRef.current;
    function applyCam() {
      const { radius, theta, phi, target } = camState;
      camera.position.set(target.x + radius * Math.sin(phi) * Math.sin(theta), target.y + radius * Math.cos(phi), target.z + radius * Math.sin(phi) * Math.cos(theta));
      camera.lookAt(target);
    }
    applyCam();

    let dragging = false, lastX = 0, lastY = 0, moved = 0;
    function onDown(e) { dragging = true; lastX = e.clientX; lastY = e.clientY; moved = 0; }
    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      camState.theta -= dx * 0.006;
      camState.phi = Math.min(1.5, Math.max(0.2, camState.phi - dy * 0.006));
      lastX = e.clientX; lastY = e.clientY;
      applyCam();
    }
    function onUp(e) {
      dragging = false;
      if (moved < 5) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouse, camera);
        const hit = ray.intersectObjects(pickables)[0];
        if (hit && hit.object.userData.zoneId) {
          const z = zonesRef.current.find((zz) => zz.id === hit.object.userData.zoneId);
          zonePopupRef.current({ id: hit.object.userData.zoneId, status: z ? z.status : "unexplored" });
          selectRef.current(null);
        } else if (hit && hit.object.userData.id) {
          const mk = markersRef.current.find((x) => x.id === hit.object.userData.id);
          if (mk) flyTo(mk.pos, mk.id);
        }
      }
    }
    function onWheel(e) { e.preventDefault(); camState.radius = Math.min(55, Math.max(6, camState.radius + e.deltaY * 0.02)); applyCam(); }
    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    let fly = null;
    // Wraps an angle delta to the shortest path in [-PI, PI]. Used below so a
    // flight always takes the closest turn to its target angle instead of an
    // unbounded amount.
    function shortestDelta(from, to) {
      let d = (to - from) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      return d;
    }
    function flyTo(pos, id) {
      if (!pos) return;
      // Aim from a fixed, repeatable angle computed from the *target's own*
      // position, not from the camera's current orbit angle. The old version
      // added a flat +0.5 to whatever theta happened to be, so every repeated
      // click kept spinning the camera further around — after a few clicks the
      // accumulated rotation could swing the view behind a building and make
      // it look like it had flown to the wrong (empty) spot, even though the
      // target itself was correctly centered the whole time.
      const targetTheta = Math.atan2(pos[0], pos[1]) + 0.6;
      const delta = shortestDelta(camState.theta, targetTheta);
      fly = { t0: performance.now(), duration: 1300, startTarget: camState.target.clone(), endTarget: new THREE.Vector3(pos[0], 0.4, pos[1]),
        startRadius: camState.radius, endRadius: 7, startPhi: camState.phi, endPhi: 0.75, startTheta: camState.theta, endTheta: camState.theta + delta };
      const m = markersRef.current.find((x) => x.id === id);
      if (m && selectRef.current) selectRef.current(m);
    }
    function focusRoute(pts) {
      if (!pts || pts.length === 0) return;
      const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 4);
      const targetTheta = Math.atan2(cx, cz) + 0.6;
      const delta = shortestDelta(camState.theta, targetTheta);
      fly = { t0: performance.now(), duration: 1300, startTarget: camState.target.clone(), endTarget: new THREE.Vector3(cx, 0.4, cz),
        startRadius: camState.radius, endRadius: Math.min(30, Math.max(11, span * 1.9)), startPhi: camState.phi, endPhi: 0.8, startTheta: camState.theta, endTheta: camState.theta + delta };
    }
    function zoomBy(f) { camState.radius = Math.min(55, Math.max(6, camState.radius * f)); applyCam(); }
    apiRef.current = { flyTo, focusRoute, zoomIn: () => zoomBy(0.8), zoomOut: () => zoomBy(1.25) };

    // if something asked to be focused while the map wasn't mounted (e.g. clicked from
    // a table page or the mission log), honor it now that the scene exists.
    if (pendingFocusRef.current) {
      const pending = pendingFocusRef.current;
      pendingFocusRef.current = null;
      if (pending.type === "marker") {
        const mk = currentMarkers.find((x) => x.id === pending.id);
        if (mk) flyTo(mk.pos, mk.id);
      } else if (pending.type === "route" && pending.pts) {
        focusRoute(pending.pts);
      }
    }

    function resize() {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf;
    function animate(now) {
      raf = requestAnimationFrame(animate);
      const time = now * 0.001;
      pulsers.forEach((p) => { const s = p.base + Math.sin(time * p.speed) * p.amp; p.sprite.scale.set(s, s, 1); });
      zonePulsers.forEach((p) => { const s = p.base + Math.sin(time * p.speed) * p.amp; p.sprite.scale.set(s, s, 1); });
      fogDrifters.forEach((f) => {
        f.sprite.position.x = f.cx + Math.sin(time * f.speed + f.phase) * f.amp;
        f.sprite.position.z = f.cz + Math.cos(time * f.speed * 0.8 + f.phase) * f.amp;
      });
      Object.values(robotSprites).forEach((r) => {
        r.sprite.position.x = r.base[0] + Math.sin(time * 0.4 + r.phase) * 0.6;
        r.sprite.position.z = r.base[1] + Math.cos(time * 0.35 + r.phase) * 0.6;
      });
      if (fly) {
        const p = Math.min(1, (now - fly.t0) / fly.duration);
        const e = easeInOutCubic(p);
        camState.target.lerpVectors(fly.startTarget, fly.endTarget, e);
        camState.radius = fly.startRadius + (fly.endRadius - fly.startRadius) * e;
        camState.phi = fly.startPhi + (fly.endPhi - fly.startPhi) * e;
        camState.theta = fly.startTheta + (fly.endTheta - fly.startTheta) * e;
        applyCam();
        if (p >= 1) fly = null;
      }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dom.removeEventListener("wheel", onWheel);
      renderer.dispose();
      wrap.innerHTML = "";
    };
  }, [themeKey, sceneVersion, nav]);

  const sevColor = { critical: t.danger, warning: t.warn, info: t.info, success: t.accent };
  const glow = (color, strength = 14) => `0 0 ${strength}px ${color}55`;
  const card = { background: `${t.panel}c8`, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 12, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", "--card-glow": `${t.accent}59` };
  const th = { textAlign: "left", fontSize: 10, color: t.textMuted, padding: "6px 8px", textTransform: "uppercase", borderBottom: `0.5px solid ${t.border}` };
  const td = { fontSize: 12, padding: "7px 8px", borderBottom: `0.5px solid ${t.border}` };

  function renderTablePage() {
    const pageHead = (title, sub) => (
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
    );
    const split = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 230px", gap: 12, alignItems: "start" };

    if (nav === "robots") {
      const robots = markers.filter((m) => m.type === "robot");
      const blockedCt = robots.filter((r) => r.status === "blocked").length;
      const avgBatt = robots.length ? Math.round(robots.reduce((a, r) => a + r.battery, 0) / robots.length) : 0;
      return (
        <div>
          <StatRow items={[
            { t, label: "TOTAL ROBOTS", value: robots.length },
            { t, label: "BLOCKED", value: blockedCt, color: blockedCt ? t.danger : t.accent },
            { t, label: "AVG BATTERY", value: `${avgBatt}%`, color: t.accent },
            { t, label: "STANDBY", value: robots.filter((r) => r.status === "standby").length },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Robot fleet")}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID", "Status", "Battery", "Signal", "Location", "Task", "Quick actions"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {robots.map((r) => (
                    <tr key={r.id} onClick={() => focusMarker(r.id)} className="resq-row" style={{ "--row-hover": `${t.panel2}`, cursor: "pointer" }}>
                      <td style={{ ...td, color: t.accent, fontWeight: 600 }}>{r.id}</td>
                      <td style={td}><Pill t={t} text={r.status} color={r.status === "blocked" ? t.danger : r.status === "standby" ? t.textMuted : t.accent} /></td>
                      <td style={td}><div className="flex items-center gap-2"><MiniBar t={t} pct={r.battery} color={r.battery > 40 ? t.accent : t.danger} /><span style={{ fontSize: 11 }}>{r.battery}%</span></div></td>
                      <td style={{ ...td, color: t.textMuted }}>{r.battery > 60 ? "good" : r.battery > 30 ? "fair" : "weak"}</td>
                      <td style={td}>{r.sector}</td>
                      <td style={{ ...td, color: t.textMuted }}>{{ exploring: "Explore area", returning: "Return to base", searching: "Search & locate", blocked: "Blocked", standby: "Standby" }[r.status]}</td>
                      <td style={td}><StatusButtons t={t} currentStatus={r.status} compact onChange={(status) => updateRobotStatus(r.id, status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="resq-card" style={card}>
                <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Fleet positions</div>
                <MiniMap t={t} onOpen={() => setNav("overview")} points={robots.map((r) => ({ x: r.pos[0], z: r.pos[1], color: r.status === "blocked" ? t.danger : t.accent }))} />
              </div>
              <div className="resq-card" style={{ ...card, textAlign: "center" }}>
                <button onClick={() => setModalOpen(true)} className="resq-btn" style={{ "--glow": `${t.accent}90`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", fontSize: 12, fontWeight: 500, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", background: t.accent, color: t.bg, boxShadow: glow(t.accent, 14) }}>
                  <Plus size={14} aria-hidden="true" /> deploy new robot
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (nav === "survivors") {
      const survivors = markers.filter((m) => m.type === "survivor");
      return (
        <div>
          <StatRow items={[
            { t, label: "TOTAL SURVIVORS", value: survivors.length, color: t.accent },
            { t, label: "SECTORS COVERED", value: new Set(survivors.map((s) => s.sector)).size },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Survivors found")}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID", "Location", "Status", "Detected by", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {survivors.map((s) => (
                    <tr key={s.id} className="resq-row" style={{ "--row-hover": `${t.panel2}`, cursor: "pointer" }}>
                      <td onClick={() => focusMarker(s.id)} style={{ ...td, color: t.accent, fontWeight: 600 }}>{s.id}</td>
                      <td onClick={() => focusMarker(s.id)} style={td}>{s.sector}</td>
                      <td onClick={() => focusMarker(s.id)} style={td}><Pill t={t} text="alive" color={t.accent} /></td>
                      <td onClick={() => focusMarker(s.id)} style={{ ...td, color: t.textMuted }}>{s.detectedBy}</td>
                      <td style={td}>
                        <button onClick={() => requestExtraction(s)} style={{ fontSize: 10, padding: "4px 9px", borderRadius: 6, border: "none", background: t.accent, color: t.bg, cursor: "pointer" }}>extract</button>
                      </td>
                    </tr>
                  ))}
                  {survivors.length === 0 && <tr><td colSpan={5} style={{ ...td, color: t.textMuted, textAlign: "center" }}>no survivors located yet</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="resq-card" style={card}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Survivor locations</div>
              <MiniMap t={t} onOpen={() => setNav("overview")} points={survivors.map((s) => ({ x: s.pos[0], z: s.pos[1], color: t.accent }))} emptyLabel="no survivors on sensors" />
            </div>
          </div>
        </div>
      );
    }

    if (nav === "hazards") {
      const hazards = markers.filter((m) => m.type === "hazard");
      const bySev = (sv) => hazards.filter((h) => h.severity === sv).length;
      return (
        <div>
          <StatRow items={[
            { t, label: "ACTIVE HAZARDS", value: hazards.length, color: t.warn },
            { t, label: "HIGH RISK", value: bySev("high"), color: t.danger },
            { t, label: "MEDIUM", value: bySev("medium"), color: t.warn },
            { t, label: "LOW", value: bySev("low"), color: t.textMuted },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Active hazards")}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID", "Type", "Location", "Severity", "Detected by"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {hazards.map((h) => (
                    <tr key={h.id} onClick={() => focusMarker(h.id)} className="resq-row" style={{ "--row-hover": `${t.panel2}`, cursor: "pointer" }}>
                      <td style={{ ...td, color: t.accent, fontWeight: 600 }}>{h.id}</td>
                      <td style={td}>{h.label}</td>
                      <td style={td}>{h.sector}</td>
                      <td style={td}><Pill t={t} text={h.severity} color={h.severity === "high" ? t.danger : h.severity === "medium" ? t.warn : t.textMuted} /></td>
                      <td style={{ ...td, color: t.textMuted }}>{h.detectedBy}</td>
                    </tr>
                  ))}
                  {hazards.length === 0 && <tr><td colSpan={5} style={{ ...td, color: t.textMuted, textAlign: "center" }}>no hazards detected</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="resq-card" style={card}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Hazard map</div>
              <MiniMap t={t} onOpen={() => setNav("overview")} points={hazards.map((h) => ({ x: h.pos[0], z: h.pos[1], color: h.severity === "high" ? t.danger : h.severity === "medium" ? t.warn : t.textMuted }))} emptyLabel="no hazards on sensors" />
            </div>
          </div>
        </div>
      );
    }

    if (nav === "routes") {
      const accessible = routes.filter((r) => r.type === "accessible").length;
      const blockedR = routes.filter((r) => r.type === "blocked").length;
      const newR = routes.filter((r) => r.type === "new").length;
      return (
        <div>
          <StatRow items={[
            { t, label: "TOTAL ROUTES", value: routes.length },
            { t, label: "ACCESSIBLE", value: accessible, color: t.accent },
            { t, label: "BLOCKED", value: blockedR, color: t.danger },
            { t, label: "NEW", value: newR, color: t.info },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Discovered routes")}
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["ID", "From", "To", "Status", "Discovered by", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} onClick={() => focusRoute(r)} className="resq-row" style={{ "--row-hover": `${t.panel2}`, cursor: "pointer" }}>
                      <td style={{ ...td, color: t.accent, fontWeight: 600 }}>{r.id}</td>
                      <td style={td}>{r.from}</td>
                      <td style={td}>{r.to}</td>
                      <td style={td}><Pill t={t} text={r.type} color={r.type === "blocked" ? t.danger : r.type === "new" ? t.info : t.accent} /></td>
                      <td style={{ ...td, color: t.textMuted }}>{r.discoveredBy}</td>
                      <td style={td}>
                        {r.type === "new" && (
                          <div className="flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); decideRoute(r.id, true); }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: "none", background: t.accent, color: t.bg, cursor: "pointer" }}>follow</button>
                            <button onClick={(e) => { e.stopPropagation(); decideRoute(r.id, false); }} style={{ fontSize: 10, padding: "4px 8px", borderRadius: 6, border: `0.5px solid ${t.border}`, background: "transparent", color: t.textMuted, cursor: "pointer" }}>ignore</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {routes.length === 0 && <tr><td colSpan={6} style={{ ...td, color: t.textMuted, textAlign: "center" }}>no routes discovered yet</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="resq-card" style={card}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Route map</div>
              <MiniMap t={t} onOpen={() => setNav("overview")} emptyLabel="no routes on sensors"
                lines={routes.map((r) => ({ x1: r.pts[0][0], z1: r.pts[0][1], x2: r.pts[r.pts.length - 1][0], z2: r.pts[r.pts.length - 1][1], color: r.type === "blocked" ? t.danger : r.type === "new" ? t.info : t.accent, dashed: r.type === "blocked" }))} />
            </div>
          </div>
        </div>
      );
    }

    if (nav === "structural") {
      const hazards = markers.filter((m) => m.type === "hazard");
      const highRisk = hazards.filter((h) => h.severity === "high").length;
      return (
        <div>
          <StatRow items={[
            { t, label: "FLAGGED BUILDINGS", value: hazards.length },
            { t, label: "HIGH RISK", value: highRisk, color: t.danger },
            { t, label: "SECTORS SURVEYED", value: new Set(markers.map((m) => m.sector)).size },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Structural integrity", "Relative risk per flagged building — taller / redder bars need priority review")}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150, padding: "0 4px 4px", borderBottom: `0.5px solid ${t.border}` }}>
                {hazards.map((h) => {
                  const riskPct = h.severity === "high" ? 90 : h.severity === "medium" ? 55 : 28;
                  const color = h.severity === "high" ? t.danger : h.severity === "medium" ? t.warn : t.accent;
                  // a CSS % height only resolves against a parent with a *definite* height —
                  // this column's immediate parent is an auto-sized flex item, so a
                  // percentage here would silently collapse to 0. Use a computed px value instead.
                  const barPx = Math.round((riskPct / 100) * 120);
                  return (
                    <div key={h.id} onClick={() => focusMarker(h.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: 130, cursor: "pointer", flex: "0 0 auto" }}>
                      <span style={{ fontSize: 9, color, fontWeight: 600 }}>{riskPct}%</span>
                      <div style={{ width: 26, height: barPx, borderRadius: "4px 4px 0 0", background: `linear-gradient(180deg, ${color}, ${color}33)`, boxShadow: glow(color, 12) }} />
                      <span style={{ fontSize: 9, color: t.textMuted }}>{h.sector}</span>
                    </div>
                  );
                })}
                {hazards.length === 0 && <div style={{ fontSize: 11, color: t.textMuted, alignSelf: "center" }}>no structural flags yet</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {hazards.map((h) => (
                  <div key={h.id} onClick={() => focusMarker(h.id)} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "8px 10px", border: `0.5px solid ${t.border}`, borderRadius: 8, cursor: "pointer" }}>
                    <span>Building {h.sector} — {h.label}</span>
                    <Pill t={t} text={`${h.severity} risk`} color={h.severity === "high" ? t.danger : t.warn} />
                  </div>
                ))}
              </div>
            </div>
            <div className="resq-card" style={card}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Risk map</div>
              <MiniMap t={t} onOpen={() => setNav("overview")} emptyLabel="no risk data yet"
                points={hazards.map((h) => ({ x: h.pos[0], z: h.pos[1], color: h.severity === "high" ? t.danger : t.warn, r: h.severity === "high" ? 4.2 : 3 }))} />
            </div>
          </div>
        </div>
      );
    }

    if (nav === "comms") {
      const robots = markers.filter((m) => m.type === "robot");
      const deadzones = markers.filter((m) => m.type === "deadzone").length;
      const packetLoss = commsUnstable ? 18 + Math.round((100 - (robots[0]?.battery ?? 60)) / 6) : 4;
      return (
        <div>
          <StatRow items={[
            { t, label: "UPLINK QUALITY", value: commsUnstable ? "62%" : "94%", color: commsUnstable ? t.warn : t.accent },
            { t, label: "PACKET LOSS", value: `${packetLoss}%`, color: packetLoss > 15 ? t.danger : t.accent },
            { t, label: "DEAD ZONES", value: deadzones },
            { t, label: "LINKS UP", value: `${robots.length}/${robots.length}` },
          ]} />
          <div style={split}>
            <div className="resq-card" style={card}>
              {pageHead("Communication links")}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {robots.map((r) => (
                  <div key={r.id} onClick={() => focusMarker(r.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, cursor: "pointer" }}>
                    <span style={{ width: 46 }}>{r.id}</span>
                    <div style={{ flex: 1, margin: "0 12px", height: 6, background: t.panel2, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${r.battery}%`, height: "100%", background: r.battery > 40 ? t.accent : t.danger, boxShadow: glow(r.battery > 40 ? t.accent : t.danger, 8) }} />
                    </div>
                    <Pill t={t} text={r.battery > 40 ? "stable" : "weak"} color={r.battery > 40 ? t.accent : t.danger} />
                  </div>
                ))}
              </div>
            </div>
            <div className="resq-card" style={card}>
              <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 8, textTransform: "uppercase" }}>Network overview</div>
              <MiniMap t={t} onOpen={() => setNav("overview")} emptyLabel="no active links"
                points={[{ x: 0, z: 0, color: t.info, r: 4 }, ...robots.map((r) => ({ x: r.pos[0], z: r.pos[1], color: r.battery > 40 ? t.accent : t.danger }))]}
                lines={robots.map((r) => ({ x1: 0, z1: 0, x2: r.pos[0], z2: r.pos[1], color: r.battery > 40 ? t.accent : t.danger, dashed: r.battery <= 40 }))} />
            </div>
          </div>
        </div>
      );
    }

    if (nav === "log") {
      return (
        <div className="resq-card" style={card}>
          {pageHead("Mission log", "Auto-generated events from the field — click a row's marker to jump to it")}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {["critical", "warning", "success", "info"].map((sv) => (
              <span key={sv} style={{ fontSize: 9, textTransform: "uppercase" }}><Pill t={t} text={`${sv} · ${alerts.filter((a) => a.severity === sv).length}`} color={sevColor[sv]} /></span>
            ))}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Time", "Severity", "Event", "Sector"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} onClick={() => a.markerId && focusMarker(a.markerId)} className="resq-row" style={{ "--row-hover": `${t.panel2}`, cursor: a.markerId ? "pointer" : "default" }}>
                  <td style={{ ...td, color: t.textMuted }}>{a.time}</td>
                  <td style={td}><Pill t={t} text={a.severity} color={sevColor[a.severity]} /></td>
                  <td style={td}>{a.text}</td>
                  <td style={{ ...td, color: t.textMuted }}>{a.sector}</td>
                </tr>
              ))}
              {alerts.length === 0 && <tr><td colSpan={4} style={{ ...td, color: t.textMuted, textAlign: "center" }}>no events logged yet</td></tr>}
            </tbody>
          </table>
        </div>
      );
    }

    if (nav === "reports") {
      const reports = [
        { title: "Mission summary", desc: "Overview of mission status and key metrics." },
        { title: "Robot performance", desc: "Detailed robot activity and route analytics." },
        { title: "Hazard report", desc: "Summary of all detected hazards and severity." },
        { title: "Structural report", desc: "Structural analysis and building risk report." },
      ];
      return (
        <div>
          {pageHead("Reports", "Auto-generated from current mission data")}
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {reports.map((r) => {
              const status = reportStatus[r.title];
              const hasContent = !!reportContent[r.title];
              return (
                <div key={r.title} className="resq-card" style={card}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: t.panel2, color: t.accent, border: `0.5px solid ${t.border}` }}>
                      <FileText size={13} aria-hidden="true" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>{r.desc}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => runReport(r.title)} disabled={status === "generating"}
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 7, border: "none",
                        background: status === "generating" ? t.panel2 : t.accent, color: status === "generating" ? t.textMuted : t.bg,
                        cursor: status === "generating" ? "default" : "pointer", boxShadow: status === "generating" ? "none" : glow(t.accent, 10) }}>
                      {status === "generating" ? (<><Loader2 size={12} className="animate-spin" aria-hidden="true" /> generating…</>) : status ? "Regenerate" : "Generate"}
                    </button>
                    {hasContent && (
                      <button onClick={() => setReportViewer(r.title)}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 7, border: `0.5px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer" }}>
                        <FileText size={12} aria-hidden="true" /> View
                      </button>
                    )}
                    {hasContent && (
                      <button onClick={() => downloadReport(r.title)}
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 12px", borderRadius: 7, border: `0.5px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer" }}>
                        <Download size={12} aria-hidden="true" /> Download
                      </button>
                    )}
                  </div>
                  {status && status !== "generating" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: t.accent, marginTop: 8 }}>
                      <Check size={11} aria-hidden="true" /> generated at {status} — ready to export
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  }

  const isLight = themeKey === "blueprint";
  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: t.font, padding: 12, minHeight: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* ambient backdrop: slow-drifting glow orbs + drifting particles + faint scanlines for HUD depth.
          Rendered once, behind everything, on every page (not just Overview) so the Robots/Survivors/
          Hazards/etc tables don't look flat — the cards above are semi-transparent with backdrop-blur
          so this glow bleeds through them too, rather than being fully hidden behind opaque panels. */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
        <div style={{ position: "absolute", top: "-16%", left: "-10%", width: 480, height: 480, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.accent}${isLight ? "26" : "38"}, transparent 68%)`, filter: "blur(54px)",
          animation: "resq-blob-drift 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-12%", width: 560, height: 560, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.info}${isLight ? "20" : "30"}, transparent 70%)`, filter: "blur(64px)",
          animation: "resq-blob-drift-alt 24s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "28%", right: "6%", width: 340, height: 340, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.warn}${isLight ? "16" : "22"}, transparent 72%)`, filter: "blur(58px)",
          animation: "resq-blob-drift 28s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", bottom: "6%", left: "22%", width: 300, height: 300, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.danger}${isLight ? "14" : "1e"}, transparent 72%)`, filter: "blur(50px)",
          animation: "resq-blob-drift-alt 22s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", top: "58%", left: "-8%", width: 260, height: 260, borderRadius: "50%",
          background: `radial-gradient(circle, ${t.accent}${isLight ? "18" : "26"}, transparent 70%)`, filter: "blur(46px)",
          animation: "resq-blob-drift 26s ease-in-out infinite" }} />
        <FloatingParticles t={t} />
        {!isLight && (
          <div style={{ position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 3px)",
            animation: "resq-scan-move 6s linear infinite", mixBlendMode: "overlay", opacity: 0.5 }} />
        )}
      </div>
      <style>{`
        html{scrollbar-color:${t.accent} ${t.panel2};scrollbar-width:thin;}
        ::-webkit-scrollbar{width:9px;height:9px;}
        ::-webkit-scrollbar-track{background:${t.panel2};}
        ::-webkit-scrollbar-thumb{background:${t.accent}aa;border-radius:8px;border:2px solid ${t.panel2};}
        ::-webkit-scrollbar-thumb:hover{background:${t.accent};}
        ::-webkit-scrollbar-corner{background:${t.panel2};}
        @keyframes resq-pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes resq-toast-in{from{transform:translateY(-10px) scale(0.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
        @keyframes resq-fade-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes resq-pop{0%{transform:scale(1.18)}100%{transform:scale(1)}}
        @keyframes resq-blob-drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(24px,-18px) scale(1.1)}}
        @keyframes resq-blob-drift-alt{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-20px,16px) scale(1.06)}}
        @keyframes resq-particle-float{0%,100%{transform:translate(0,0);opacity:0.15}50%{transform:translate(14px,-22px);opacity:0.85}}
        @keyframes resq-scan-move{0%{background-position:0 0}100%{background-position:0 48px}}
        @keyframes resq-title-flicker{0%,92%,100%{opacity:1}93%{opacity:0.55}94%{opacity:1}96%{opacity:0.7}97%{opacity:1}}
        @keyframes resq-spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes resq-glow-breathe{0%,100%{box-shadow:0 0 0px 0px transparent}50%{box-shadow:0 0 22px 1px var(--card-glow, transparent)}}
        .resq-btn{transition:transform 0.15s ease,box-shadow 0.15s ease,filter 0.15s ease,background 0.15s ease;}
        .resq-btn:hover{transform:translateY(-1px);filter:brightness(1.15);box-shadow:0 0 14px var(--glow, transparent);}
        .resq-btn:active{transform:translateY(0) scale(0.96);}
        .resq-row{transition:background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;}
        .resq-row:hover{background:var(--row-hover, rgba(255,255,255,0.045));transform:translateX(2px);}
        .resq-page-enter{animation:resq-fade-up 0.35s ease;}
        .resq-stat-value{display:inline-block;animation:resq-pop 0.32s ease;}
        .resq-title-flicker{animation:resq-title-flicker 6s ease-in-out infinite;}
        .resq-radar-spin{animation:resq-spin-slow 4s linear infinite;}
        .resq-card{transition:transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;}
        .resq-card:hover{transform:translateY(-3px);box-shadow:0 12px 28px -10px var(--card-glow, transparent), 0 0 0 1px var(--card-glow, transparent) inset;}
        .resq-stat-card{transition:transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;}
        .resq-stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px -8px var(--card-glow, transparent);}
        .resq-legend-item{transition:transform 0.15s ease, opacity 0.15s ease; display:inline-flex; align-items:center; opacity:0.85;}
        .resq-legend-item:hover{transform:translateY(-1px) scale(1.05);opacity:1;}
        .resq-minimap-btn{transition:transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;}
        .resq-minimap-btn:hover{transform:translateY(-1px);filter:brightness(1.2);}
        .resq-toast{transition:transform 0.15s ease, box-shadow 0.15s ease;}
        .resq-toast:hover{transform:translateY(-2px) scale(1.015);}
        .resq-input{transition:border-color 0.15s ease, box-shadow 0.15s ease;}
        .resq-input:focus{outline:none;border-color:var(--focus-glow, currentColor);box-shadow:0 0 0 3px var(--focus-glow-soft, transparent);}
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-3">
          <Radar size={16} className="resq-radar-spin" style={{ color: t.accent, filter: `drop-shadow(0 0 6px ${t.accent}99)` }} aria-hidden="true" />
          <span className="resq-title-flicker" style={{ fontSize: 16, fontWeight: 500, letterSpacing: 1, textShadow: glow(t.accent, 18) }}>RESQ // COMMAND</span>
          <span style={{ fontSize: 11, color: t.textMuted }}>MISSION: AFTERSHOCK RESPONSE</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12 }}>
          <HeaderStat t={t} icon={ScrollText} label="MISSION TIME" value={formatTime(seconds)} color={t.text} />
          <HeaderStat t={t} icon={Bot} label="ROBOTS" value={`${markers.filter((m) => m.type === "robot").length} ACTIVE`} color={t.accent} />
          <HeaderStat t={t} icon={Users} label="SURVIVORS" value={`${markers.filter((m) => m.type === "survivor").length} FOUND`} color={t.accent} />
          <HeaderStat t={t} icon={TriangleAlert} label="HAZARDS" value={`${markers.filter((m) => m.type === "hazard").length} ACTIVE`} color={t.warn} />
          <HeaderStat t={t} icon={WifiOff} label="COMMS" value={commsUnstable ? "UNSTABLE" : "STABLE"} color={t.danger} pulse={commsUnstable} />
          <div style={{ display: "flex", gap: 4, background: t.panel2, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: 3 }}>
            {Object.entries(THEMES).map(([k, thm]) => (
              <button key={k} onClick={() => setThemeKey(k)} className="resq-btn"
                style={{ "--glow": `${t.accent}70`, fontSize: 11, padding: "5px 9px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: k === themeKey ? t.accent : "transparent", color: k === themeKey ? t.bg : t.textMuted,
                  boxShadow: k === themeKey ? glow(t.accent, 10) : "none" }}>
                {thm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: nav === "overview" ? "210px minmax(0,1fr) 290px" : "180px minmax(0,1fr)", flex: 1, alignItems: "stretch" }}>
        {/* sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 8 }}>
            {NAV.map((n) => {
              const Icon = n.icon; const active = nav === n.id;
              return (
                <button key={n.id} onClick={() => setNav(n.id)} className="resq-btn"
                  style={{ "--glow": `${t.accent}70`, display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", fontSize: 12,
                    padding: "7px 8px", borderRadius: 7, border: "none", cursor: "pointer", marginBottom: 2,
                    background: active ? t.panel2 : "transparent", color: active ? t.accent : t.textMuted,
                    boxShadow: active ? glow(t.accent, 8) : "none" }}>
                  <Icon size={14} aria-hidden="true" /> {n.label}
                </button>
              );
            })}
          </div>

          {nav === "overview" && (
            <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 10, flex: 1, display: "flex", flexDirection: "column" }}>
              <button onClick={() => setModalOpen(true)} className="resq-btn"
                style={{ "--glow": `${t.accent}90`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 500,
                  padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 10,
                  background: t.accent, color: t.bg, boxShadow: glow(t.accent, 16) }}>
                <Plus size={14} aria-hidden="true" /> add robot
              </button>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {TABS.map((tb) => {
                  const Icon = tb.icon; const active = leftTab === tb.id;
                  return (
                    <button key={tb.id} onClick={() => setLeftTab(tb.id)} className="resq-btn"
                      style={{ "--glow": `${t.accent}60`, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 9,
                        padding: "6px 2px", borderRadius: 7, border: `0.5px solid ${active ? t.accent : t.border}`, cursor: "pointer",
                        background: active ? t.panel2 : "transparent", color: active ? t.accent : t.textMuted }}>
                      <Icon size={13} aria-hidden="true" /> {tb.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {markers.filter((m) => m.type === leftTab).map((m) => {
                  const isSel = selected?.id === m.id;
                  return (
                    <div key={m.id} onClick={() => focusMarker(m.id)} className="resq-row" role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") focusMarker(m.id); }}
                      style={{ "--row-hover": `${t.panel2}`, textAlign: "left", padding: "7px 8px", borderRadius: 7, cursor: "pointer",
                        border: `0.5px solid ${isSel ? t.accent : t.border}`, background: isSel ? t.panel2 : "transparent",
                        boxShadow: isSel ? glow(t.accent, 10) : "none" }}>
                      <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 500 }}>{m.id}</span>
                        {m.type === "robot" && <span style={{ fontSize: 10, color: m.status === "blocked" ? t.danger : t.accent }}>{m.status.toUpperCase()}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2, marginBottom: m.type === "robot" ? 6 : 0 }}>
                        {m.type === "robot" ? (<span className="flex items-center gap-1"><Battery size={11} aria-hidden="true" /> {m.battery}%</span>) : (m.label || `sector ${m.sector}`)}
                      </div>
                      {m.type === "robot" && (
                        <StatusButtons t={t} currentStatus={m.status} compact onChange={(status) => updateRobotStatus(m.id, status)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {nav !== "overview" ? (
          <div key={nav} className="resq-page-enter" style={{ display: "flex", flexDirection: "column" }}>{renderTablePage()}</div>
        ) : (
          <>
            {/* map */}
            <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 8, position: "relative", boxShadow: t.scene?.glow > 0.6 ? glow(t.accent, 20) : "none" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: t.textMuted }}>DISASTER MAP · drag to rotate · scroll to zoom · click the "?" to explore fog</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => apiRef.current?.zoomIn()} className="resq-btn" style={iconBtn(t)} aria-label="Zoom in"><ZoomIn size={13} aria-hidden="true" /></button>
                  <button onClick={() => apiRef.current?.zoomOut()} className="resq-btn" style={iconBtn(t)} aria-label="Zoom out"><ZoomOut size={13} aria-hidden="true" /></button>
                  <button onClick={() => setSelected(null)} className="resq-btn" style={iconBtn(t)} aria-label="Reset selection"><Crosshair size={13} aria-hidden="true" /></button>
                </div>
              </div>
              <div ref={canvasWrapRef} style={{ width: "100%", height: 460, borderRadius: 8, overflow: "hidden", cursor: "grab", border: `0.5px solid ${t.border}` }} />

              {/* toasts: alerts + route decisions */}
              <div style={{ position: "absolute", top: 44, right: 16, display: "flex", flexDirection: "column", gap: 6, width: 250 }}>
                {routeToasts.map((r) => (
                  <div key={r.id} onClick={() => focusRoute(r)} className="resq-toast"
                    style={{ animation: "resq-toast-in 0.25s ease-out", background: `${t.panel2}ee`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `0.5px solid ${t.info}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, boxShadow: glow(t.info, 16), cursor: "pointer" }}>
                    <div style={{ color: t.info, fontWeight: 500, textTransform: "uppercase", fontSize: 10 }}>New route discovered</div>
                    <div style={{ color: t.text, marginBottom: 6 }}>{r.discoveredBy} found a path from {r.from} · click to view</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={(e) => { e.stopPropagation(); decideRoute(r.id, true); }} style={{ flex: 1, fontSize: 10, padding: "5px 0", borderRadius: 6, border: "none", background: t.accent, color: t.bg, cursor: "pointer" }}>follow route</button>
                      <button onClick={(e) => { e.stopPropagation(); decideRoute(r.id, false); }} style={{ flex: 1, fontSize: 10, padding: "5px 0", borderRadius: 6, border: `0.5px solid ${t.border}`, background: "transparent", color: t.textMuted, cursor: "pointer" }}>ignore</button>
                    </div>
                  </div>
                ))}
                {toasts.map((a) => (
                  <button key={a.id} onClick={() => focusMarker(a.markerId)} className="resq-toast"
                    style={{ animation: "resq-toast-in 0.25s ease-out", textAlign: "left", cursor: "pointer",
                      background: `${t.panel2}ee`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `0.5px solid ${sevColor[a.severity]}`, borderRadius: 8, padding: "8px 10px", fontSize: 11,
                      boxShadow: glow(sevColor[a.severity], 16) }}>
                    <div style={{ color: sevColor[a.severity], fontWeight: 500, textTransform: "uppercase", fontSize: 10 }}>{a.severity}</div>
                    <div style={{ color: t.text }}>{a.text}</div>
                    <div style={{ color: t.textMuted, fontSize: 10 }}>Sector {a.sector} · click to zoom in</div>
                  </button>
                ))}
              </div>

              {/* zone popup */}
              {zonePopup && (
                <div style={{ position: "absolute", left: 16, bottom: 44, width: 230, background: t.panel2, border: `0.5px solid ${t.accent}`, borderRadius: 10, padding: 12, boxShadow: glow(t.accent, 18) }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Sector {zonePopup.id}</span>
                    <button onClick={() => setZonePopup(null)} aria-label="Close" style={{ background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}><X size={13} aria-hidden="true" /></button>
                  </div>
                  {zonePopup.status === "unexplored" && (
                    <>
                      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>Unmapped territory. No robot has surveyed this sector yet.</div>
                      <button onClick={() => requestExplore(zonePopup.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, padding: "7px 0", borderRadius: 7, border: "none", background: t.accent, color: t.bg, cursor: "pointer", boxShadow: glow(t.accent, 10) }}>
                        <Search size={12} aria-hidden="true" /> request exploration
                      </button>
                    </>
                  )}
                  {zonePopup.status === "scanning" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.textMuted }}>
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" /> robot en route, scanning sector…
                    </div>
                  )}
                  {zonePopup.status === "explored" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.accent }}>
                      <Check size={13} aria-hidden="true" /> sector mapped
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3" style={{ marginTop: 8, fontSize: 10, color: t.textMuted }}>
                <span className="resq-legend-item"><Route size={11} style={{ color: t.accent, display: "inline", marginRight: 4 }} aria-hidden="true" />accessible route</span>
                <span className="resq-legend-item"><Route size={11} style={{ color: t.info, display: "inline", marginRight: 4 }} aria-hidden="true" />new route</span>
                <span className="resq-legend-item"><Ban size={11} style={{ color: t.danger, display: "inline", marginRight: 4 }} aria-hidden="true" />blocked</span>
                <span className="resq-legend-item"><TriangleAlert size={11} style={{ color: t.warn, display: "inline", marginRight: 4 }} aria-hidden="true" />hazard</span>
                <span className="resq-legend-item"><User size={11} style={{ color: t.accent, display: "inline", marginRight: 4 }} aria-hidden="true" />survivor</span>
                <span className="resq-legend-item"><HelpCircle size={11} style={{ color: t.info, display: "inline", marginRight: 4 }} aria-hidden="true" />unexplored</span>
              </div>
            </div>

            {/* right panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 560, overflowY: "auto" }}>
              {selected ? (
                <div key={selected.id} className="resq-page-enter resq-card" style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.accent}`, borderRadius: 10, padding: 10, boxShadow: glow(t.accent, 14), "--card-glow": `${t.accent}70` }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{selected.id} DETAIL</span>
                    <button onClick={() => setSelected(null)} aria-label="Close" className="resq-btn" style={{ "--glow": `${t.danger}80`, background: "none", border: "none", color: t.textMuted, cursor: "pointer" }}><X size={13} aria-hidden="true" /></button>
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
                    Sector {selected.sector}{selected.type === "robot" && ` · ${selected.status}`}{selected.label && ` · ${selected.label}`}
                  </div>
                  {selected.type === "robot" && (
                    <StatusButtons t={t} currentStatus={selected.status} onChange={(status) => updateRobotStatus(selected.id, status)} />
                  )}
                  {selected.type === "survivor" && (
                    <button onClick={() => requestExtraction(selected)} className="resq-btn"
                      style={{ "--glow": `${t.accent}90`, width: "100%", fontSize: 11, padding: "8px 0", borderRadius: 7, border: "none", background: t.accent, color: t.bg, cursor: "pointer", boxShadow: glow(t.accent, 12) }}>
                      REQUEST EXTRACTION
                    </button>
                  )}
                  {selected.type === "hazard" && <div style={{ fontSize: 11, color: t.warn }}>Flagged for structural review. Nearby robots rerouted.</div>}
                  {selected.type === "deadzone" && <div style={{ fontSize: 11, color: t.danger }}>No telemetry in this zone. Last known contact unreliable.</div>}
                </div>
              ) : (
                <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 10, fontSize: 11, color: t.textMuted }}>
                  Select a robot, survivor, or hazard from the list or map to see details.
                </div>
              )}

              <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>SENSOR DATA</div>
                {["thermal", "depth", "gas", "structural"].map((s) => <SensorRow key={s} label={s} t={t} />)}
              </div>

              <div style={{ background: `${t.panel}c8`, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 10 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: t.textMuted }}>ALERTS</span>
                  <button onClick={spawnDiscovery}
                    style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4, color: t.accent, background: "none", border: "none", cursor: "pointer" }}>
                    <Plus size={12} aria-hidden="true" /> simulate event
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {alerts.slice(0, 6).map((a) => (
                    <button key={a.id} onClick={() => focusMarker(a.markerId)} className="resq-btn"
                      style={{ "--glow": `${sevColor[a.severity]}80`, textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "inherit", background: t.panel2, color: t.text, border: `0.5px solid ${t.border}`, borderLeft: `3px solid ${sevColor[a.severity]}`, borderRadius: 7, padding: "6px 8px" }}>
                      <div style={{ fontSize: 11 }}>{a.text}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>Sector {a.sector} · {a.time}</div>
                    </button>
                  ))}
                  {alerts.length === 0 && <div style={{ fontSize: 11, color: t.textMuted }}>No alerts yet.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}>
          <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", width: "100%", padding: "40px 0", borderRadius: 12, display: "flex", justifyContent: "center" }}>
            <div className="resq-page-enter" style={{ background: `${t.panel}dd`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 12, padding: 20, width: 320, border: `0.5px solid ${t.accent}`, boxShadow: glow(t.accent, 20) }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Link a new robot</span>
                <button onClick={() => setModalOpen(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><X size={16} aria-hidden="true" /></button>
              </div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Robot call sign</label>
              <input value={robotName} onChange={(e) => setRobotName(e.target.value)} placeholder="e.g. R-07" className="resq-input"
                style={{ width: "100%", marginTop: 6, marginBottom: 14, background: t.panel2, color: t.text, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", "--focus-glow": t.accent, "--focus-glow-soft": `${t.accent}33` }} />
              <button onClick={linkRobot} disabled={linking}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0",
                  borderRadius: 10, border: "none", cursor: "pointer", background: t.accent, color: t.bg, fontSize: 13, fontWeight: 500, boxShadow: glow(t.accent, 16) }}>
                {linking ? (<><Loader2 size={14} className="animate-spin" aria-hidden="true" /> connecting…</>) : (<><Radio size={14} aria-hidden="true" /> link robot</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportViewer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
          onClick={() => setReportViewer(null)}>
          <div onClick={(e) => e.stopPropagation()}
            className="resq-page-enter"
            style={{ background: `${t.panel}dd`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 12, padding: 20, width: "min(640px, 100%)", maxHeight: "80vh", display: "flex", flexDirection: "column", border: `0.5px solid ${t.accent}`, boxShadow: glow(t.accent, 20) }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{reportViewer}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadReport(reportViewer)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "6px 10px", borderRadius: 7, border: `0.5px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer" }}>
                  <Download size={12} aria-hidden="true" /> Download
                </button>
                <button onClick={() => setReportViewer(null)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted }}><X size={16} aria-hidden="true" /></button>
              </div>
            </div>
            <ReportView text={reportContent[reportViewer]} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small reusable dashboard bits ---------- */

// Drifting glow-dust specks scattered across the backdrop — positions/sizes/delays are
// randomized once per theme (via useMemo) so they don't reshuffle on every re-render.
function FloatingParticles({ t }) {
  const particles = useMemo(() => {
    const colors = [t.accent, t.info, t.warn];
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 2 + Math.random() * 3,
      color: colors[i % colors.length],
      duration: 7 + Math.random() * 9,
      delay: Math.random() * -12,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.accent, t.info, t.warn]);
  return (
    <>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.left}%`, top: `${p.top}%`,
          width: p.size, height: p.size, borderRadius: "50%", background: p.color,
          boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          animation: `resq-particle-float ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </>
  );
}

function HeaderStat({ icon: Icon, label, value, color, t, pulse }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 8, border: `0.5px solid ${t.border}`, background: t.panel2 }}>
      <Icon size={13} style={{ color, animation: pulse ? "resq-pulse 1.1s ease-in-out infinite" : "none" }} aria-hidden="true" />
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 8, color: t.textMuted, letterSpacing: 0.6 }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color }}>{value}</div>
      </div>
    </div>
  );
}

// Robot status control — one clickable icon per possible status, with a hover glow
// and a highlighted "active" state for whichever status the robot currently has.
// Used both in the map detail panel (full labels) and inline in the Robots table
// (icon-only, compact) so a robot's task can be changed from either place.
function StatusButtons({ t, currentStatus, onChange, compact }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
      {STATUS_OPTIONS.map(({ label, status, icon: Icon }) => {
        const active = currentStatus === status;
        return (
          <button
            key={status}
            onClick={(e) => { e.stopPropagation(); onChange(status); }}
            className="resq-btn"
            title={compact ? label : undefined}
            aria-label={label}
            style={{
              "--glow": `${t.accent}90`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              fontSize: 11, padding: compact ? 0 : "6px 0",
              width: compact ? 26 : undefined, height: compact ? 26 : undefined,
              flex: compact ? "0 0 auto" : "1 1 auto",
              borderRadius: 7, cursor: "pointer",
              border: `0.5px solid ${active ? t.accent : t.border}`,
              background: active ? t.accent : t.panel2,
              color: active ? t.bg : t.text,
              boxShadow: active ? `0 0 12px ${t.accent}66` : "none",
            }}
          >
            <Icon size={compact ? 13 : 12} aria-hidden="true" />
            {!compact && label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ text, color, t }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 999, color, border: `0.5px solid ${color}66`, background: color + "18", whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

function MiniBar({ pct, color, t }) {
  return (
    <div style={{ width: 46, height: 5, borderRadius: 4, background: t.panel2, border: `0.5px solid ${t.border}`, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, boxShadow: `0 0 6px ${color}99`, transition: "width 0.5s ease" }} />
    </div>
  );
}

// tiny SVG "sensor map" thumbnail — plots marker positions on a mini radar-style grid
function MiniMap({ t, points = [], lines = [], height = 128, onOpen, emptyLabel = "nothing on sensors yet" }) {
  const W = 200, H = 130;
  const cx = W / 2, cy = H / 2, scale = 4.4;
  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `0.5px solid ${t.border}`, background: t.panel2 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} style={{ display: "block" }}>
        <defs>
          <pattern id="resq-grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke={t.border} strokeWidth="0.6" />
          </pattern>
          <radialGradient id="resq-vign" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor={t.panel} stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#resq-grid)" opacity="0.6" />
        <line x1={cx} y1="0" x2={cx} y2={H} stroke={t.border} strokeWidth="0.7" />
        <line x1="0" y1={cy} x2={W} y2={cy} stroke={t.border} strokeWidth="0.7" />
        {lines.map((l, i) => (
          <line key={i} x1={cx + l.x1 * scale} y1={cy + l.z1 * scale} x2={cx + l.x2 * scale} y2={cy + l.z2 * scale}
            stroke={l.color} strokeWidth="1.4" strokeDasharray={l.dashed ? "3 3" : undefined} opacity="0.85" />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={cx + p.x * scale} cy={cy + p.z * scale} r={p.r || 3.2} fill={p.color}
            style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
        ))}
        <rect width={W} height={H} fill="url(#resq-vign)" />
      </svg>
      {points.length === 0 && lines.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: t.textMuted }}>
          {emptyLabel}
        </div>
      )}
      {onOpen && (
        <button onClick={onOpen} className="resq-minimap-btn" style={{ position: "absolute", right: 6, bottom: 6, fontSize: 9, padding: "3px 8px", borderRadius: 6, border: `0.5px solid ${t.accent}`, background: t.panel, color: t.accent, cursor: "pointer" }}>
          view full map
        </button>
      )}
    </div>
  );
}

function StatRow({ items }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {items.map((it, i) => (
        <div key={i} className="resq-stat-card" style={{ flex: "1 1 120px", background: `${it.t.panel2}dd`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: `0.5px solid ${it.t.border}`, borderRadius: 9, padding: "8px 12px", "--card-glow": `${it.color || it.t.accent}55` }}>
          <div style={{ fontSize: 9, color: it.t.textMuted, letterSpacing: 0.5, marginBottom: 3 }}>{it.label}</div>
          {/* key={it.value} forces a remount on change, retriggering the pop animation as a lightweight "value changed" cue */}
          <div key={it.value} className="resq-stat-value" style={{ fontSize: 18, fontWeight: 600, color: it.color || it.t.text, textShadow: it.color ? `0 0 10px ${it.color}55` : "none" }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function iconBtn(t) {
  return { "--glow": `${t.accent}80`, background: t.panel2, border: `0.5px solid ${t.border}`, borderRadius: 6, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", color: t.text, cursor: "pointer" };
}

function SensorRow({ label, t }) {
  const [bars, setBars] = useState(() => Array.from({ length: 10 }, () => 20 + Math.random() * 60));
  useEffect(() => {
    const iv = setInterval(() => setBars((b) => b.map(() => 20 + Math.random() * 60)), 1200);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: t.textMuted, marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 22 }}>
        {bars.map((h, i) => (<div key={i} style={{ flex: 1, height: `${h}%`, background: t.accent, opacity: 0.6, borderRadius: 1, transition: "height 1s ease" }} />))}
      </div>
    </div>
  );
}
