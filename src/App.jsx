import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bot,
  Cpu,
  HardDrive,
  Terminal,
  Music2,
  Workflow,
  Settings,
  Wifi,
  BatteryCharging,
  Clock3,
  ChevronRight,
  Send,
  Mic,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Radio,
  Zap,
  ShieldCheck,
  Database,
  Server,
  Gauge,
  Monitor,
  Command,
  Sparkles,
  CircleHelp,
  CheckCircle2,
  AlertTriangle,
  Power,
  Trash2,
  ExternalLink,
  MessageSquare,
  SlidersHorizontal,
  Laptop,
  Network,
  ListChecks,
  X,
} from "lucide-react";

const API = "http://127.0.0.1:8765/api";
const tabs = [
  { id: "Dashboard", icon: Activity },
  { id: "AI Assistant", icon: Bot },
  { id: "System Monitor", icon: Gauge },
  { id: "Terminal", icon: Terminal },
  { id: "Media Center", icon: Music2 },
  { id: "Automation", icon: Workflow },
  { id: "Settings", icon: Settings },
];
const fmtBytes = (n = 0) => {
  if (!Number.isFinite(Number(n))) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    v = Number(n);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};
const pct = (n) => `${Math.max(0, Math.min(100, Number(n) || 0)).toFixed(0)}%`;
const mockSystem = {
  available: false,
  cpu: {
    percent: 0,
    model: "Waiting for backend",
    cores: 0,
    physical_cores: 0,
    frequency_mhz: null,
  },
  memory: { percent: 0, total: 0, used: 0, available: 0 },
  disks: [],
  network: { sent: 0, received: 0, interfaces: [] },
  battery: null,
  os: {
    system: "Linux",
    release: "—",
    kernel: "—",
    architecture: "—",
    hostname: "—",
    uptime_seconds: 0,
  },
  processes: [],
  temperatures: [],
  timestamp: null,
};
function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div className="panel-title">
          {Icon && <Icon size={15} />}
          <span>{title}</span>
        </div>
        <span className="live-dot" />
      </div>
      {children}
    </section>
  );
}
function Stat({ label, value, sub, icon: Icon, percent }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <div className="stat-value">{value}</div>
      {percent !== undefined && (
        <div className="meter">
          <span style={{ width: pct(percent) }} />
        </div>
      )}
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
function Ring({ value, label, color = "cyan" }) {
  const n = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className={`ring ring-${color}`}
      style={{ "--progress": `${n * 3.6}deg` }}
    >
      <div className="ring-inner">
        <b>{pct(n)}</b>
        <span>{label}</span>
      </div>
    </div>
  );
}
function Hologram({ state = "ONLINE", compact = false }) {
  return (
    <div className={`holo-stage ${compact ? "holo-compact" : ""}`}>
      <div className="holo-grid" />
      <div className="holo-orbit orbit-one" />
      <div className="holo-orbit orbit-two" />
      <div className="holo-orbit orbit-three" />
      <div className="holo-beam" />
      <img
        className="holo-person"
        src="/assets/lisa-hologram.png"
        alt="LISA holographic AI avatar"
      />
      <div className="holo-base">
        <div />
        <div />
        <div />
      </div>
      <div className="holo-label">
        <span className="tiny-led" />
        {state}
      </div>
      {!compact && (
        <div className="holo-name">
          LISA <span>AI SYSTEM</span>
        </div>
      )}
      <div className="holo-wave">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} style={{ "--i": i }} />
        ))}
      </div>
    </div>
  );
}
function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({ icon: Icon = CircleHelp, title, desc }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <b>{title}</b>
      <span>{desc}</span>
    </div>
  );
}
function App() {
  const [active, setActive] = useState("Dashboard");
  const [system, setSystem] = useState(mockSystem);
  const [backend, setBackend] = useState("connecting");
  const [media, setMedia] = useState([]);
  const [mediaError, setMediaError] = useState("");
  const [chat, setChat] = useState([
    {
      role: "assistant",
      content:
        "Hello, I am LISA. Your local system assistant. I can help you inspect system health, media sessions, and common Linux tasks.",
    },
  ]);
  const [message, setMessage] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [term, setTerm] = useState("");
  const [termHistory, setTermHistory] = useState([
    {
      kind: "system",
      text: 'LISA safe terminal demo. Type "help" to see supported commands.',
    },
  ]);
  const [automations, setAutomations] = useState([
    {
      name: "System diagnostics",
      desc: "Refresh CPU, memory, storage and OS telemetry",
      status: "Ready",
      icon: Activity,
    },
    {
      name: "Open Media Center",
      desc: "Jump to currently exposed MPRIS media sessions",
      status: "Ready",
      icon: Music2,
    },
    {
      name: "Refresh telemetry",
      desc: "Fetch a fresh snapshot from the local backend",
      status: "Ready",
      icon: RefreshCw,
    },
    {
      name: "Launch approved application",
      desc: "Application launching is not enabled in this build",
      status: "Unavailable",
      icon: Power,
    },
  ]);
  const [settings, setSettings] = useState({
    animations: true,
    density: "Comfortable",
  });
  const [now, setNow] = useState(new Date());
  const [showClear, setShowClear] = useState(false);

  const fetchSystem = useCallback(async () => {
    try {
      const r = await fetch(`${API}/system`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!r.ok) throw new Error("API request failed");
      const d = await r.json();
      setSystem({ ...mockSystem, ...d, available: true });
      setBackend("connected");
    } catch {
      setBackend("offline");
      setSystem((s) => ({ ...s, available: false }));
    }
  }, []);
  const fetchMedia = useCallback(async () => {
    try {
      const r = await fetch(`${API}/media`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!r.ok) throw new Error("Media API unavailable");
      const d = await r.json();
      setMedia(d.players || []);
      setMediaError(d.error || "");
    } catch {
      setMedia([]);
      setMediaError(
        "Start the Python backend and install playerctl to discover MPRIS sessions.",
      );
    }
  }, []);
  useEffect(() => {
    fetchSystem();
    fetchMedia();
    const a = setInterval(fetchSystem, 3000),
      b = setInterval(fetchMedia, 5000),
      c = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
      clearInterval(c);
    };
  }, [fetchSystem, fetchMedia]);
  const uptime = system.os?.uptime_seconds
    ? `${Math.floor(system.os.uptime_seconds / 86400)}d ${Math.floor((system.os.uptime_seconds % 86400) / 3600)}h`
    : "—";
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";

  async function sendChat(e) {
    e?.preventDefault();
    const q = message.trim();
    if (!q || chatBusy) return;
    setChat((c) => [...c, { role: "user", content: q }]);
    setMessage("");
    setChatBusy(true);
    try {
      const r = await fetch(`${API}/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await r.json();
      setChat((c) => [
        ...c,
        {
          role: "assistant",
          content: d.reply || d.error || "No response returned.",
        },
      ]);
    } catch {
      const low = q.toLowerCase();
      let reply =
        "The AI provider is not configured. You can still use the System Monitor and Media Center when the local backend is running.";
      if (low.includes("cpu") || low.includes("system"))
        reply = system.available
          ? `CPU usage is ${pct(system.cpu?.percent)} and memory usage is ${pct(system.memory?.percent)}. Backend telemetry is live.`
          : "System telemetry is unavailable. Start backend/server.py and try again.";
      if (low.includes("battery"))
        reply = system.battery
          ? `Battery is ${system.battery.percent}% (${system.battery.plugged ? "charging / plugged in" : "on battery"}).`
          : "Battery information is unavailable on this device or backend.";
      if (low.includes("media") || low.includes("music"))
        reply = `I can currently see ${media.length} exposed media session(s). Open Media Center for controls.`;
      setChat((c) => [...c, { role: "assistant", content: reply }]);
    } finally {
      setChatBusy(false);
    }
  }
  async function mediaAction(player, action) {
    try {
      const r = await fetch(`${API}/media/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Control failed");
      await fetchMedia();
    } catch (e) {
      setMediaError(e.message || "Media control failed.");
    }
  }
  function runTerminal(e) {
    e.preventDefault();
    const raw = term.trim();
    if (!raw) return;
    const known = {
      help: "Supported demo commands: help, status, date, uptime, media, clear",
      date: now.toString(),
      uptime: `System uptime: ${uptime}`,
      status: system.available
        ? `CPU ${pct(system.cpu?.percent)} | RAM ${pct(system.memory?.percent)} | backend connected`
        : "Backend offline. Start the Flask service.",
      media: `${media.length} exposed media session(s). Open Media Center for metadata.`,
    };
    const cmd = raw.toLowerCase();
    if (cmd === "clear") {
      setTermHistory([]);
      setTerm("");
      return;
    }
    const output =
      known[cmd] ||
      `Command not executed: "${raw}". This terminal is a safe demo and does not run arbitrary shell commands.`;
    setTermHistory((h) => [
      ...h,
      { kind: "input", text: `lisa@local:~$ ${raw}` },
      { kind: cmd in known ? "output" : "warn", text: output },
    ]);
    setTerm("");
  }
  function runAutomation(name) {
    if (name === "Open Media Center") {
      setActive("Media Center");
      return;
    }
    if (name === "Refresh telemetry" || name === "System diagnostics") {
      fetchSystem();
      fetchMedia();
      setAutomations((a) =>
        a.map((x) =>
          x.name === name
            ? { ...x, lastRun: new Date().toLocaleTimeString() }
            : x,
        ),
      );
      return;
    }
  }
  const cpu = system.cpu || {},
    mem = system.memory || {};
  const currentTab = tabs.find((t) => t.id === active);
  return (
    <div
      className={`app-shell ${settings.animations ? "" : "reduce-motion"} density-${settings.density.toLowerCase()}`}
    >
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="background-grid" />
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setActive("Dashboard")}
          aria-label="Go to dashboard"
        >
          <div className="brand-mark">
            <Sparkles size={21} />
          </div>
          <div>
            <strong>LISA</strong>
            <small>LOCAL INTELLIGENT SYSTEM ASSISTANT</small>
          </div>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`nav-tab ${active === t.id ? "active" : ""}`}
            >
              <t.icon size={16} />
              <span>{t.id}</span>
            </button>
          ))}
        </nav>
        <div className="top-status">
          <span
            className={`status-light ${backend === "connected" ? "ok" : ""}`}
          />
          <span>
            {backend === "connected" ? "SYSTEM LINKED" : "BACKEND OFFLINE"}
          </span>
          <button
            className="icon-button"
            title="Refresh system"
            onClick={() => {
              fetchSystem();
              fetchMedia();
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: settings.animations ? 0.22 : 0 }}
            className="page"
          >
            {active === "Dashboard" && (
              <div className="dashboard">
                <div className="welcome-row">
                  <div>
                    <div className="eyebrow">
                      {now.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <h1>
                      {greeting}, <span>Commander.</span>
                    </h1>
                    <p>Your personal command center is ready.</p>
                  </div>
                  <div className="clock-block">
                    <Clock3 size={17} />
                    <strong>
                      {now.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </strong>
                    <span>LOCAL TIME</span>
                  </div>
                </div>
                <div className="dash-grid">
                  <Panel
                    title="LISA HOLOGRAPHIC CORE"
                    icon={Sparkles}
                    className="hero-panel"
                  >
                    <div className="hero-copy">
                      <span className="pill">
                        <span className="tiny-led" />
                        {backend === "connected"
                          ? "SYSTEM ONLINE"
                          : "STANDBY MODE"}
                      </span>
                      <h2>
                        How can I help
                        <br />
                        you today?
                      </h2>
                      <p>Intelligence at your command.</p>
                      <button
                        className="primary-button"
                        onClick={() => setActive("AI Assistant")}
                      >
                        Talk to LISA <ChevronRight size={16} />
                      </button>
                    </div>
                    <Hologram
                      state={backend === "connected" ? "ONLINE" : "STANDBY"}
                    />
                    <div className="hero-coordinate">
                      CORE // 01&nbsp;&nbsp; · &nbsp;&nbsp;SECURE LOCAL LINK
                    </div>
                  </Panel>
                  <div className="dash-side">
                    <Panel title="SYSTEM VITALS" icon={Activity}>
                      <div className="rings-row">
                        <Ring value={cpu.percent} label="CPU" />
                        <Ring value={mem.percent} label="RAM" color="purple" />
                        <Ring
                          value={system.disks?.[0]?.percent || 0}
                          label="DISK"
                          color="blue"
                        />
                      </div>
                      <div className="panel-foot">
                        {system.available
                          ? "Live telemetry · 3 sec refresh"
                          : "Waiting for local Python backend"}
                      </div>
                    </Panel>
                    <Panel title="HARDWARE SNAPSHOT" icon={Cpu}>
                      <div className="info-list">
                        <div>
                          <Cpu />
                          <span>Processor</span>
                          <b>{cpu.model || "Unavailable"}</b>
                        </div>
                        <div>
                          <Database />
                          <span>Memory</span>
                          <b>{mem.total ? fmtBytes(mem.total) : "—"} total</b>
                        </div>
                        <div>
                          <HardDrive />
                          <span>Storage</span>
                          <b>{system.disks?.length || 0} partitions</b>
                        </div>
                        <div>
                          <BatteryCharging />
                          <span>Battery</span>
                          <b>
                            {system.battery
                              ? `${system.battery.percent}%${system.battery.plugged ? " · charging" : ""}`
                              : "Not detected"}
                          </b>
                        </div>
                      </div>
                    </Panel>
                    <Panel title="QUICK ACCESS" icon={Zap}>
                      <div className="quick-grid">
                        {[
                          { name: "System Monitor", icon: Gauge },
                          { name: "Media Center", icon: Music2 },
                          { name: "Terminal", icon: Terminal },
                          { name: "Automation", icon: Workflow },
                        ].map((q) => (
                          <button
                            key={q.name}
                            onClick={() => setActive(q.name)}
                          >
                            <q.icon size={18} />
                            <span>{q.name}</span>
                            <ChevronRight size={13} />
                          </button>
                        ))}
                      </div>
                    </Panel>
                  </div>
                  <Panel
                    title="NETWORK ACTIVITY"
                    icon={Network}
                    className="network-panel"
                  >
                    <div className="network-stats">
                      <div>
                        <span>DATA RECEIVED</span>
                        <b>{fmtBytes(system.network?.received || 0)}</b>
                      </div>
                      <div>
                        <span>DATA SENT</span>
                        <b>{fmtBytes(system.network?.sent || 0)}</b>
                      </div>
                      <div>
                        <span>ACTIVE INTERFACES</span>
                        <b>{system.network?.interfaces?.length || 0}</b>
                      </div>
                      <div className="network-wave">
                        {Array.from({ length: 32 }, (_, i) => (
                          <i key={i} style={{ "--i": i }} />
                        ))}
                      </div>
                    </div>
                  </Panel>
                  <Panel
                    title="MEDIA SESSIONS"
                    icon={Music2}
                    className="media-mini"
                  >
                    <div className="mini-media">
                      {media.length ? (
                        media.slice(0, 2).map((p) => (
                          <div className="mini-track" key={p.name}>
                            <div className="album-placeholder">
                              <Music2 />
                            </div>
                            <div>
                              <b>{p.title || p.name}</b>
                              <span>
                                {p.artist || p.status || "Metadata unavailable"}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                mediaAction(
                                  p.name,
                                  p.status === "Playing" ? "pause" : "play",
                                )
                              }
                              title="Play/pause"
                            >
                              {p.status === "Playing" ? (
                                <Pause size={15} />
                              ) : (
                                <Play size={15} />
                              )}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="inline-empty">
                          <Radio size={18} />
                          <span>No exposed media sessions</span>
                          <button onClick={() => setActive("Media Center")}>
                            View center <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>
                <div className="footer-note">
                  <span>LOCAL-FIRST BY DESIGN</span>
                  <span>
                    OS: {system.os?.system || "Linux"} · Kernel:{" "}
                    {system.os?.kernel || "—"} · Uptime: {uptime}
                  </span>
                  <span>LISA / v1.0.0</span>
                </div>
              </div>
            )}

            {active === "AI Assistant" && (
              <>
                <PageHeader
                  eyebrow="CONVERSATIONAL INTELLIGENCE"
                  title="AI Assistant"
                  description="Talk to LISA about your system, media, and everyday workflows."
                  action={
                    <span
                      className={`pill ${backend === "connected" ? "" : "pill-warn"}`}
                    >
                      <span className="tiny-led" />
                      {backend === "connected"
                        ? "LOCAL SERVICE CONNECTED"
                        : "SERVICE OFFLINE"}
                    </span>
                  }
                />
                <div className="assistant-layout">
                  <Panel
                    title="LISA CORE"
                    icon={Sparkles}
                    className="assistant-character"
                  >
                    <Hologram
                      state={chatBusy ? "THINKING" : "LISTENING FOR INPUT"}
                      compact
                    />
                    <div className="assistant-core-copy">
                      <b>I'm here to help.</b>
                      <span>
                        AI provider:{" "}
                        {backend === "connected"
                          ? "Not configured unless you add one"
                          : "Backend offline"}
                      </span>
                    </div>
                    <div className="audio-bars">
                      {Array.from({ length: 38 }, (_, i) => (
                        <i key={i} style={{ "--i": i }} />
                      ))}
                    </div>
                  </Panel>
                  <Panel
                    title="SECURE CHAT CHANNEL"
                    icon={MessageSquare}
                    className="chat-panel"
                  >
                    <div className="chat-messages">
                      {chat.map((m, i) => (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={i}
                          className={`chat-message ${m.role}`}
                        >
                          <div className="chat-avatar">
                            {m.role === "assistant" ? (
                              <Sparkles size={15} />
                            ) : (
                              <span>YOU</span>
                            )}
                          </div>
                          <div>
                            <span className="chat-role">
                              {m.role === "assistant" ? "LISA" : "YOU"}
                            </span>
                            <p>{m.content}</p>
                          </div>
                        </motion.div>
                      ))}
                      {chatBusy && (
                        <div className="thinking">
                          <i />
                          <i />
                          <i /> LISA is processing…
                        </div>
                      )}
                    </div>
                    <div className="prompt-chips">
                      {[
                        "Check system status",
                        "How is my battery?",
                        "Show media sessions",
                      ].map((q) => (
                        <button key={q} onClick={() => setMessage(q)}>
                          {q}
                        </button>
                      ))}
                    </div>
                    <form className="chat-input" onSubmit={sendChat}>
                      <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Message LISA..."
                        aria-label="Message LISA"
                      />
                      <button
                        type="button"
                        title="Voice input is not configured"
                        className="voice-button"
                        onClick={() =>
                          setChat((c) => [
                            ...c,
                            {
                              role: "assistant",
                              content:
                                "Voice input is a prototype in this build. Connect a speech-to-text provider and browser microphone permission to enable it.",
                            },
                          ])
                        }
                      >
                        <Mic size={17} />
                      </button>
                      <button
                        className="send-button"
                        disabled={!message.trim() || chatBusy}
                      >
                        <Send size={17} />
                      </button>
                    </form>
                    <div className="chat-disclaimer">
                      <ShieldCheck size={13} /> Local system answers use
                      telemetry. An LLM provider is not configured by default.
                    </div>
                  </Panel>
                </div>
              </>
            )}

            {active === "System Monitor" && (
              <>
                <PageHeader
                  eyebrow="LIVE TELEMETRY"
                  title="System Monitor"
                  description="Detailed hardware, operating system, network and process telemetry."
                  action={
                    <button
                      className="secondary-button"
                      onClick={() => {
                        fetchSystem();
                        fetchMedia();
                      }}
                    >
                      <RefreshCw size={15} /> Refresh data
                    </button>
                  }
                />
                <div className="monitor-grid">
                  <Stat
                    label="CPU UTILIZATION"
                    value={pct(cpu.percent)}
                    sub={`${cpu.cores || "—"} logical cores · ${cpu.frequency_mhz ? `${cpu.frequency_mhz} MHz` : "frequency unavailable"}`}
                    icon={Cpu}
                    percent={cpu.percent}
                  />
                  <Stat
                    label="MEMORY IN USE"
                    value={mem.total ? fmtBytes(mem.used) : "—"}
                    sub={`${mem.total ? fmtBytes(mem.available) + " available" : "Waiting for backend"} · ${pct(mem.percent)}`}
                    icon={Database}
                    percent={mem.percent}
                  />
                  <Stat
                    label="SYSTEM UPTIME"
                    value={uptime}
                    sub={`${system.os?.hostname || "Hostname unavailable"}`}
                    icon={Clock3}
                  />
                  <Stat
                    label="NETWORK RECEIVED"
                    value={fmtBytes(system.network?.received || 0)}
                    sub={`Sent ${fmtBytes(system.network?.sent || 0)}`}
                    icon={Network}
                  />
                </div>
                <div className="two-col">
                  <Panel title="PROCESSOR DETAILS" icon={Cpu}>
                    <div className="detail-table">
                      <div>
                        <span>CPU model</span>
                        <b>{cpu.model || "Unavailable"}</b>
                      </div>
                      <div>
                        <span>Physical cores</span>
                        <b>{cpu.physical_cores ?? "—"}</b>
                      </div>
                      <div>
                        <span>Logical cores</span>
                        <b>{cpu.cores ?? "—"}</b>
                      </div>
                      <div>
                        <span>Current frequency</span>
                        <b>
                          {cpu.frequency_mhz
                            ? `${cpu.frequency_mhz} MHz`
                            : "Unavailable"}
                        </b>
                      </div>
                      <div>
                        <span>CPU temperature</span>
                        <b>
                          {system.temperatures?.length
                            ? `${system.temperatures[0].current} °C`
                            : "Not exposed by hardware"}
                        </b>
                      </div>
                    </div>
                  </Panel>
                  <Panel title="OPERATING SYSTEM" icon={Monitor}>
                    <div className="detail-table">
                      <div>
                        <span>Distribution</span>
                        <b>
                          {system.os?.system || "—"} {system.os?.release || ""}
                        </b>
                      </div>
                      <div>
                        <span>Kernel</span>
                        <b>{system.os?.kernel || "—"}</b>
                      </div>
                      <div>
                        <span>Architecture</span>
                        <b>{system.os?.architecture || "—"}</b>
                      </div>
                      <div>
                        <span>Hostname</span>
                        <b>{system.os?.hostname || "—"}</b>
                      </div>
                      <div>
                        <span>Backend status</span>
                        <b
                          className={
                            backend === "connected"
                              ? "success-text"
                              : "warning-text"
                          }
                        >
                          {backend}
                        </b>
                      </div>
                    </div>
                  </Panel>
                </div>
                <Panel title="STORAGE PARTITIONS" icon={HardDrive}>
                  {system.disks?.length ? (
                    <div className="partition-list">
                      {system.disks.map((d, i) => (
                        <div className="partition" key={`${d.mountpoint}-${i}`}>
                          <div className="partition-head">
                            <b>{d.mountpoint}</b>
                            <span>
                              {fmtBytes(d.used)} / {fmtBytes(d.total)}
                            </span>
                            <strong>{pct(d.percent)}</strong>
                          </div>
                          <div className="meter">
                            <span style={{ width: pct(d.percent) }} />
                          </div>
                          <small>
                            {d.device} · {fmtBytes(d.free)} free ·{" "}
                            {d.fstype || "filesystem unknown"}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={HardDrive}
                      title="No storage data yet"
                      desc="Start the Python backend to read mounted partitions."
                    />
                  )}
                </Panel>
                <Panel title="RUNNING PROCESSES" icon={ListChecks}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>PROCESS</th>
                          <th>PID</th>
                          <th>CPU</th>
                          <th>MEMORY</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(system.processes || []).slice(0, 12).map((p) => (
                          <tr key={p.pid}>
                            <td>{p.name}</td>
                            <td>{p.pid}</td>
                            <td>{pct(p.cpu_percent)}</td>
                            <td>{fmtBytes(p.memory_bytes)}</td>
                            <td>
                              <span className="process-status">
                                {p.status || "running"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!system.processes?.length && (
                    <div className="muted-line">
                      Process list unavailable while backend is offline.
                    </div>
                  )}
                </Panel>
              </>
            )}

            {active === "Terminal" && (
              <>
                <PageHeader
                  eyebrow="SAFE COMMAND CONSOLE"
                  title="Terminal"
                  description="A guarded interface for LISA demo commands. Arbitrary shell execution is intentionally disabled."
                />
                <Panel
                  title="LISA LOCAL SHELL"
                  icon={Terminal}
                  className="terminal-panel"
                >
                  <div className="terminal-toolbar">
                    <span>
                      <i /> LOCAL SESSION
                    </span>
                    <button onClick={() => setTermHistory([])}>
                      <Trash2 size={14} /> Clear
                    </button>
                  </div>
                  <div className="terminal-output">
                    {termHistory.map((h, i) => (
                      <div key={i} className={`term-line ${h.kind}`}>
                        {h.text}
                      </div>
                    ))}
                    <div className="terminal-cursor-line">
                      <span>lisa@local:~$</span>
                      <span className="cursor-block" />
                    </div>
                  </div>
                  <form className="terminal-input" onSubmit={runTerminal}>
                    <span>❯</span>
                    <input
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      placeholder="Type help to list safe commands..."
                      autoComplete="off"
                    />
                    <button>
                      <Send size={15} />
                    </button>
                  </form>
                </Panel>
                <div className="command-hints">
                  {["help", "status", "uptime", "date", "media", "clear"].map(
                    (c) => (
                      <button key={c} onClick={() => setTerm(c)}>
                        <Command size={13} />
                        {c}
                      </button>
                    ),
                  )}
                </div>
                <div className="notice">
                  <ShieldCheck size={17} />
                  <div>
                    <b>Safety boundary</b>
                    <span>
                      This UI does not expose a shell endpoint. For real
                      terminal access, use your system terminal. The backend
                      only provides typed, allowlisted application APIs.
                    </span>
                  </div>
                </div>
              </>
            )}

            {active === "Media Center" && (
              <>
                <PageHeader
                  eyebrow="DESKTOP MEDIA CONTROL"
                  title="Media Center"
                  description="Control media sessions exposed by Linux MPRIS/D-Bus, including compatible Brave and Chrome tabs."
                  action={
                    <button className="secondary-button" onClick={fetchMedia}>
                      <RefreshCw size={15} /> Scan sessions
                    </button>
                  }
                />
                {mediaError && (
                  <div className="notice warning-notice">
                    <AlertTriangle size={17} />
                    <div>
                      <b>Media integration status</b>
                      <span>{mediaError}</span>
                    </div>
                  </div>
                )}
                <div className="media-explainer">
                  <div className="media-icon">
                    <Music2 size={25} />
                  </div>
                  <div>
                    <b>
                      {media.length} session{media.length === 1 ? "" : "s"}{" "}
                      detected
                    </b>
                    <span>
                      Only sessions published to MPRIS are discoverable. This is
                      not arbitrary speaker-audio recognition.
                    </span>
                  </div>
                  <span className="pill">
                    <span className="tiny-led" />
                    {media.length ? "SESSION ACTIVE" : "WAITING"}
                  </span>
                </div>
                {media.length ? (
                  <div className="media-grid">
                    {media.map((p, i) => (
                      <Panel
                        key={p.name}
                        title={p.name}
                        icon={Music2}
                        className="player-card"
                      >
                        <div className="player-art">
                          {p.art_url ? (
                            <img
                              src={p.art_url}
                              alt="Album artwork"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="art-placeholder">
                              <Music2 size={45} />
                              <span>LISA AUDIO</span>
                            </div>
                          )}
                          <div className="art-overlay" />
                          <span className="player-status">
                            <i />
                            {p.status || "Unknown"}
                          </span>
                        </div>
                        <div className="track-info">
                          <h3>{p.title || "Unknown title"}</h3>
                          <p>{p.artist || "Unknown artist"}</p>
                          <span>{p.album || "Album not provided"}</span>
                        </div>
                        <div className="track-progress">
                          <div>
                            <span>Position</span>
                            <span>{p.position_label || "—"}</span>
                          </div>
                          <div className="progress-track">
                            <span
                              style={{
                                width: p.duration
                                  ? `${Math.min(100, ((p.position || 0) / p.duration) * 100)}%`
                                  : "0%",
                              }}
                            />
                          </div>
                          <div className="track-times">
                            <span>00:00</span>
                            <span>{p.duration_label || "—"}</span>
                          </div>
                        </div>
                        <div className="player-controls">
                          <button
                            onClick={() => mediaAction(p.name, "previous")}
                            title="Previous track"
                          >
                            <SkipBack />
                          </button>
                          <button
                            className="play-control"
                            onClick={() =>
                              mediaAction(
                                p.name,
                                p.status === "Playing" ? "pause" : "play",
                              )
                            }
                            title="Play/pause"
                          >
                            {p.status === "Playing" ? <Pause /> : <Play />}
                          </button>
                          <button
                            onClick={() => mediaAction(p.name, "next")}
                            title="Next track"
                          >
                            <SkipForward />
                          </button>
                        </div>
                        <div className="player-foot">
                          <span>
                            <Radio size={13} /> MPRIS / D-Bus
                          </span>
                          <span>
                            {p.can_control
                              ? "Controls available"
                              : "Control support varies"}
                          </span>
                        </div>
                      </Panel>
                    ))}
                  </div>
                ) : (
                  <div className="empty-media">
                    <div className="empty-disc">
                      <Music2 size={32} />
                    </div>
                    <h2>No media sessions found</h2>
                    <p>
                      Start playing media in Brave or Chrome. If no session
                      appears, confirm that the browser publishes an MPRIS
                      player and that <code>playerctl</code> is installed.
                    </p>
                    <button className="primary-button" onClick={fetchMedia}>
                      <RefreshCw size={15} /> Scan again
                    </button>
                    <div className="media-checklist">
                      <span>
                        <CheckCircle2 /> Install playerctl
                      </span>
                      <span>
                        <CheckCircle2 /> Play a track in browser
                      </span>
                      <span>
                        <CheckCircle2 /> Keep local backend running
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {active === "Automation" && (
              <>
                <PageHeader
                  eyebrow="WORKFLOW CONTROL"
                  title="Automation"
                  description="Run supported local tasks and inspect their current availability."
                />
                <div className="automation-grid">
                  {automations.map((a, i) => (
                    <div className="automation-card" key={a.name}>
                      <div className="automation-icon">
                        <a.icon size={21} />
                      </div>
                      <div className="automation-main">
                        <div className="automation-title">
                          <h3>{a.name}</h3>
                          <span
                            className={`automation-status ${a.status === "Unavailable" ? "unavailable" : ""}`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <p>{a.desc}</p>
                        {a.lastRun && <small>Last run: {a.lastRun}</small>}
                      </div>
                      <button
                        disabled={a.status === "Unavailable"}
                        className="automation-run"
                        onClick={() => runAutomation(a.name)}
                      >
                        {a.status === "Unavailable" ? "Unavailable" : "Run"}{" "}
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="notice">
                  <Workflow size={17} />
                  <div>
                    <b>Task safety</b>
                    <span>
                      Application launching and arbitrary shell commands are not
                      enabled. Only the explicitly implemented refresh and
                      navigation actions run.
                    </span>
                  </div>
                </div>
              </>
            )}

            {active === "Settings" && (
              <>
                <PageHeader
                  eyebrow="PREFERENCES & CONNECTIONS"
                  title="Settings"
                  description="Configure interface behavior and inspect integration status."
                />
                <div className="settings-layout">
                  <Panel title="INTERFACE PREFERENCES" icon={SlidersHorizontal}>
                    <div className="setting-row">
                      <div>
                        <b>Interface animations</b>
                        <span>
                          Enable page transitions, hologram effects and animated
                          meters.
                        </span>
                      </div>
                      <button
                        className={`toggle ${settings.animations ? "on" : ""}`}
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            animations: !s.animations,
                          }))
                        }
                        aria-pressed={settings.animations}
                      >
                        <i />
                      </button>
                    </div>
                    <div className="setting-row">
                      <div>
                        <b>Interface density</b>
                        <span>
                          Adjust the spacing of panels and dashboard sections.
                        </span>
                      </div>
                      <select
                        value={settings.density}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            density: e.target.value,
                          }))
                        }
                      >
                        <option>Comfortable</option>
                        <option>Compact</option>
                      </select>
                    </div>
                    <div className="setting-row">
                      <div>
                        <b>Theme</b>
                        <span>
                          Deep navy · cyan · violet holographic palette.
                        </span>
                      </div>
                      <span className="theme-chip">
                        <i /> LISA NEON
                      </span>
                    </div>
                  </Panel>
                  <Panel title="INTEGRATION STATUS" icon={Server}>
                    <div className="connection-list">
                      {[
                        {
                          name: "Python system backend",
                          detail: "localhost:8765",
                          status:
                            backend === "connected" ? "Connected" : "Offline",
                          ok: backend === "connected",
                        },
                        {
                          name: "System telemetry",
                          detail: "psutil / Linux APIs",
                          status: system.available
                            ? "Available"
                            : "Unavailable",
                          ok: system.available,
                        },
                        {
                          name: "Media integration",
                          detail: "playerctl / MPRIS / D-Bus",
                          status: media.length
                            ? "Sessions found"
                            : "No active sessions",
                          ok: media.length > 0,
                        },
                        {
                          name: "AI model provider",
                          detail: "Configure server-side provider in backend",
                          status: "Not configured",
                          ok: false,
                        },
                      ].map((x) => (
                        <div key={x.name}>
                          <div
                            className={`connection-icon ${x.ok ? "connected" : ""}`}
                          >
                            {x.ok ? (
                              <CheckCircle2 size={17} />
                            ) : (
                              <AlertTriangle size={17} />
                            )}
                          </div>
                          <div className="connection-text">
                            <b>{x.name}</b>
                            <span>{x.detail}</span>
                          </div>
                          <span
                            className={`connection-state ${x.ok ? "success-text" : "warning-text"}`}
                          >
                            {x.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="APPLICATION INFORMATION" icon={Laptop}>
                    <div className="detail-table">
                      <div>
                        <span>Application</span>
                        <b>LISA — Local Intelligent System Assistant</b>
                      </div>
                      <div>
                        <span>Version</span>
                        <b>1.0.0 · Prototype</b>
                      </div>
                      <div>
                        <span>Frontend</span>
                        <b>React + Vite + Tailwind CDN</b>
                      </div>
                      <div>
                        <span>Motion / icons</span>
                        <b>Framer Motion · Lucide React</b>
                      </div>
                      <div>
                        <span>Backend</span>
                        <b>Python 3 · Flask · psutil</b>
                      </div>
                      <div>
                        <span>Platform</span>
                        <b>Arch Linux / Chromium browsers</b>
                      </div>
                    </div>
                  </Panel>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="app-footer">
        <span>◈ LISA / LOCAL INTELLIGENCE</span>
        <span>
          <span
            className={`status-light ${backend === "connected" ? "ok" : ""}`}
          />
          {backend === "connected"
            ? "BACKEND CONNECTED"
            : "RUNNING IN OFFLINE UI MODE"}
        </span>
        <span>BUILT FOR YOUR WORKSTATION</span>
      </footer>
    </div>
  );
}
export default App;
