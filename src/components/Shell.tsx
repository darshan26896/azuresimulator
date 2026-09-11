import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  Bell,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Cog,
  Gauge,
  Grid2x2,
  HelpCircle,
  Home,
  Layers,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  Smile,
  Terminal,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useAzure } from "../lib/store";
import { SERVICES, serviceById } from "../lib/catalog";
import type { BladeKind } from "../lib/types";

export const NAV: Record<string, { label: string; icon: React.ElementType; kind: BladeKind; params?: Record<string, any> }> = {
  home: { label: "Home", icon: Home, kind: "home" },
  rgs: { label: "Resource groups", icon: Layers, kind: "rgs" },
  resources: { label: "All resources", icon: Grid2x2, kind: "resources" },
  monitor: { label: "Monitor", icon: Gauge, kind: "monitor" },
  activity: { label: "Activity log", icon: ActivityIcon, kind: "activity" },
  alerts: { label: "Alerts", icon: Bell, kind: "alerts" },
  cost: { label: "Cost Management + Billing", icon: CircleDollarSign, kind: "cost" },
  labs: { label: "Practice labs", icon: BookOpen, kind: "labs" },
  cheatsheet: { label: "CLI cheat sheet", icon: Terminal, kind: "cheatsheet" },
  help: { label: "Help + support", icon: HelpCircle, kind: "help" },
  settings: { label: "Settings", icon: Cog, kind: "settings" },
  marketplace: { label: "Marketplace", icon: Cloud, kind: "marketplace" },
  entra: { label: "Microsoft Entra ID", icon: Users, kind: "entra" },
  policy: { label: "Policy", icon: ShieldCheck, kind: "policy" },
  subs: { label: "Subscriptions", icon: Wallet, kind: "subs" },
};

function MSLogo() {
  return (
    <span className="grid grid-cols-2 gap-[1px] w-[17px] h-[17px] shrink-0">
      <span style={{ background: "#f25022" }} />
      <span style={{ background: "#7fba00" }} />
      <span style={{ background: "#00a4ef" }} />
      <span style={{ background: "#ffb900" }} />
    </span>
  );
}

/* ------------------------------- top bar ------------------------------- */

export function TopBar({ onShellToggle, shellOpen }: { onShellToggle: () => void; shellOpen: boolean }) {
  const { state, api } = useAzure();
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    const services = SERVICES.filter((s) => (s.name + s.category + s.blurb + s.resourceType).toLowerCase().includes(t)).slice(0, 6);
    const resources = state.resources.filter((r) => (r.name + r.resourceType + r.rg).toLowerCase().includes(t)).slice(0, 6);
    const blades = Object.entries(NAV).filter(([k, v]) => (v.label + k).toLowerCase().includes(t)).slice(0, 5);
    return { services, resources, blades };
  }, [q, state.resources]);

  const go = (fn: () => void) => {
    fn();
    setOpen(false);
    setQ("");
  };

  return (
    <header className="h-12 flex items-center bg-[var(--header)] text-[var(--header-text)] px-2 gap-1 shrink-0 relative z-40">
      <button className="h-8 w-8 grid place-items-center hover:bg-white/10 rounded-[2px] cursor-pointer" title="Show menu" onClick={api.toggleSidebar}>
        <Menu size={17} />
      </button>
      <button className="flex items-center gap-2 px-1.5 h-8 rounded-[2px] hover:bg-white/10 cursor-pointer" onClick={() => api.open("home")}>
        <MSLogo />
        <span className="text-[15px] font-semibold whitespace-nowrap">Microsoft Azure</span>
      </button>

      <div className="flex-1 flex justify-center px-3 min-w-0">
        <div className="relative w-full max-w-[640px]">
          <div className="flex items-center gap-2 h-8 bg-white/12 border border-white/25 rounded-[2px] px-2">
            <Search size={15} className="opacity-80 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results) {
                  if (results.resources[0]) go(() => api.open("resource", { id: results.resources[0].id }, `resource-${results.resources[0].id}`));
                  else if (results.services[0]) go(() => api.open("create", { service: results.services[0].id }, `create-${results.services[0].id}`));
                }
              }}
              placeholder="Search resources, services, and docs (Ctrl+K)"
              className="bg-transparent outline-none w-full text-[13px] placeholder:text-white/60"
            />
            {q ? (
              <button className="opacity-80 hover:opacity-100 cursor-pointer" onClick={() => setQ("")}>
                <X size={14} />
              </button>
            ) : null}
          </div>

          {open && results ? (
            <div className="absolute top-9 left-0 right-0 bg-[var(--panel)] text-[var(--text)] shadow-[var(--shadow)] border border-[var(--border)] max-h-[70vh] overflow-auto az-scroll fade-in">
              {results.resources.length ? (
                <>
                  <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Resources</div>
                  {results.resources.map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] flex items-center gap-2 cursor-pointer"
                      onClick={() => go(() => api.open("resource", { id: r.id }, `resource-${r.id}`))}
                    >
                      <span className="text-[15px]">{serviceById(r.service)?.glyph}</span>
                      <span className="flex-1">
                        <span className="font-semibold">{r.name}</span>
                        <span className="block text-[11.5px] text-[var(--text-2)]">
                          {r.resourceType} · {r.rg}
                        </span>
                      </span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>
                  ))}
                </>
              ) : null}
              {results.services.length ? (
                <>
                  <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Services (Marketplace)</div>
                  {results.services.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] flex items-center gap-2 cursor-pointer"
                      onClick={() => go(() => api.open("create", { service: s.id }, `create-${s.id}`))}
                    >
                      <span className="text-[15px]">{s.glyph}</span>
                      <span className="flex-1">
                        <span className="font-semibold">{s.name}</span>
                        <span className="block text-[11.5px] text-[var(--text-2)]">{s.category} · create new</span>
                      </span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>
                  ))}
                </>
              ) : null}
              {results.blades.length ? (
                <>
                  <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Portal</div>
                  {results.blades.map(([k, v]) => (
                    <button
                      key={k}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--hover)] flex items-center gap-2 cursor-pointer"
                      onClick={() => go(() => api.open(v.kind, v.params, k))}
                    >
                      <v.icon size={15} />
                      <span className="flex-1">{v.label}</span>
                      <ChevronRight size={14} className="opacity-50" />
                    </button>
                  ))}
                </>
              ) : null}
              {!results.resources.length && !results.services.length && !results.blades.length ? (
                <div className="p-4 text-center text-[var(--text-2)]">No results for “{q}”.</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          title="Open Cloud Shell"
          onClick={onShellToggle}
          className={cn("h-8 w-8 grid place-items-center rounded-[2px] cursor-pointer hover:bg-white/12", shellOpen && "bg-white/20")}
        >
          <Terminal size={16} />
        </button>
        <div className="relative">
          <button title="Notifications" className="h-8 w-8 grid place-items-center rounded-[2px] hover:bg-white/12 cursor-pointer" onClick={() => setNotif((v) => !v)}>
            <Bell size={16} />
            {state.toasts.length ? <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#4da3f5]" /> : null}
          </button>
          {notif ? (
            <div className="absolute right-0 top-9 w-[380px] bg-[var(--panel)] text-[var(--text)] border border-[var(--border)] shadow-[var(--shadow)] fade-in">
              <div className="px-3 py-2 border-b border-[var(--border)] font-semibold">Notifications</div>
              <div className="max-h-[340px] overflow-auto az-scroll">
                {state.activity.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    className="w-full text-left px-3 py-2 border-b border-[var(--border)] hover:bg-[var(--hover)] cursor-pointer"
                    onClick={() => go(() => api.open("activity"))}
                  >
                    <div className="text-[13px] font-semibold">{a.operation}</div>
                    <div className="text-[11.5px] text-[var(--text-2)]">
                      {a.resource ?? a.rg} · {new Date(a.ts).toLocaleTimeString()}
                    </div>
                  </button>
                ))}
              </div>
              <button className="w-full py-2 text-[12.5px] text-[var(--accent)] hover:bg-[var(--hover)] cursor-pointer" onClick={() => go(() => api.open("activity"))}>
                See all activity log events
              </button>
            </div>
          ) : null}
        </div>
        <button title="Settings" className="h-8 w-8 grid place-items-center rounded-[2px] hover:bg-white/12 cursor-pointer" onClick={() => api.open("settings")}>
          <Cog size={16} />
        </button>
        <button title="Feedback" className="h-8 w-8 grid place-items-center rounded-[2px] hover:bg-white/12 cursor-pointer" onClick={() => api.toast({ title: "Thanks!", body: "This is a simulation – feedback is stored locally.", kind: "info" })}>
          <Smile size={16} />
        </button>
        <button title="Help + support" className="h-8 w-8 grid place-items-center rounded-[2px] hover:bg-white/12 cursor-pointer" onClick={() => api.open("help")}>
          <HelpCircle size={16} />
        </button>
        <button
          title="Account"
          className="ml-1 h-8 px-2 flex items-center gap-2 rounded-[2px] hover:bg-white/12 cursor-pointer"
          onClick={() => api.open("settings")}
        >
          <span className="grid place-items-center h-6 w-6 rounded-full bg-white/20 text-[11px] font-bold">ST</span>
          <span className="hidden lg:block text-left leading-tight">
            <span className="block text-[12px]">student@azsim.onmicrosoft.com</span>
            <span className="block text-[10.5px] opacity-70">SIM tenant · Free simulation</span>
          </span>
        </button>
      </div>
    </header>
  );
}

/* -------------------------------- sidebar ------------------------------ */

export function Sidebar() {
  const { state, api } = useAzure();
  const collapsed = state.sidebarCollapsed;
  const recent = state.resources.slice(-4).reverse();

  const item = (id: string, active: boolean) => {
    const n = NAV[id];
    if (!n) return null;
    return (
      <button
        key={id}
        title={n.label}
        onClick={() => api.open(n.kind, n.params, id)}
        className={cn(
          "w-full flex items-center gap-3 h-8 px-2 rounded-[2px] text-[13px] cursor-pointer",
          active ? "bg-[var(--selected)] font-semibold" : "hover:bg-[var(--hover)]"
        )}
      >
        <n.icon size={15} className="shrink-0 text-[var(--accent)]" />
        {!collapsed ? <span className="truncate">{n.label}</span> : null}
      </button>
    );
  };

  return (
    <nav
      className="shrink-0 bg-[var(--panel)] border-r border-[var(--border)] overflow-y-auto az-scroll py-2"
      style={{ width: collapsed ? 48 : 200, transition: "width .15s ease" }}
    >
      {item("home", state.blades.some((b) => b.id === "home"))}
      {!collapsed ? <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Favorites</div> : <div className="h-px my-2 mx-2 bg-[var(--border)]" />}
      {state.favorites.map((f) => item(f, state.blades.some((b) => b.id === f)))}
      {!collapsed ? (
        <>
          <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Recent</div>
          {recent.length ? (
            recent.map((r) => (
              <button
                key={r.id}
                onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}
                className="w-full flex items-center gap-2 h-8 px-2 rounded-[2px] text-[13px] hover:bg-[var(--hover)] cursor-pointer"
              >
                <span className="text-[14px]">{serviceById(r.service)?.glyph}</span>
                <span className="truncate">{r.name}</span>
              </button>
            ))
          ) : (
            <div className="px-2 text-[11.5px] text-[var(--text-2)]">No recent resources</div>
          )}
          <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">All services</div>
        </>
      ) : (
        <div className="h-px my-2 mx-2 bg-[var(--border)]" />
      )}
      {Object.entries(NAV)
        .filter(([k]) => k !== "home" && !state.favorites.includes(k))
        .map(([k]) => item(k, state.blades.some((b) => b.id === k)))}
      {!collapsed ? (
        <>
          <div className="px-2 pt-3 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-2)]">Learn</div>
          <button onClick={() => api.open("cheatsheet")} className="w-full flex items-center gap-3 h-8 px-2 rounded-[2px] text-[13px] hover:bg-[var(--hover)] cursor-pointer">
            <MessageSquare size={15} className="text-[var(--accent)]" />
            <span className="truncate">CLI cheat sheet</span>
          </button>
        </>
      ) : null}
    </nav>
  );
}

/* -------------------------------- toasts ------------------------------- */

export function Toasts() {
  const { state, api } = useAzure();
  useEffect(() => {
    if (!state.toasts.length) return;
    const timers = state.toasts.map((t) => window.setTimeout(() => api.dismiss(t.id), 5200));
    return () => timers.forEach(window.clearTimeout);
  }, [state.toasts, api]);

  return (
    <div className="fixed top-14 right-3 z-50 w-[340px] space-y-2">
      {state.toasts.map((t) => (
        <div key={t.id} className="toast-in border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)] p-3 flex gap-2">
          <span
            className="h-6 w-6 shrink-0 grid place-items-center rounded-full text-white"
            style={{ background: t.kind === "success" ? "var(--ok)" : t.kind === "error" ? "var(--err)" : "var(--accent)" }}
          >
            {t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "i"}
          </span>
          <div className="flex-1">
            <div className="font-semibold text-[13px]">{t.title}</div>
            {t.body ? <div className="text-[12px] text-[var(--text-2)]">{t.body}</div> : null}
          </div>
          <button className="text-[var(--text-2)] hover:text-[var(--text)] cursor-pointer" onClick={() => api.dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
