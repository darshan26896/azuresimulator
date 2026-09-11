import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AzureProvider, useAzure } from "./lib/store";
import { metricSeries, serviceById } from "./lib/catalog";
import { Sidebar, TopBar, Toasts, NAV } from "./components/Shell";
import { CloudShell } from "./components/CloudShell";
import { HomeBlade } from "./components/blades/Home";
import { AllResourcesBlade, ResourceGroupBlade, ResourceGroupsBlade } from "./components/blades/Groups";
import { MarketplaceBlade } from "./components/blades/Marketplace";
import { CreateBlade } from "./components/blades/Create";
import { ResourceBlade } from "./components/blades/Resource";
import { ActivityBlade, AlertsBlade, MonitorBlade } from "./components/blades/Monitor";
import { CostBlade } from "./components/blades/Cost";
import { CheatSheetBlade, HelpBlade, LabsBlade, SettingsBlade } from "./components/blades/Learn";
import { EntraBlade } from "./components/blades/Identity";
import { PolicyBlade, SubscriptionsBlade } from "./components/blades/Governance";
import type { BladeSpec } from "./lib/types";
import { cn } from "./utils/cn";

function useAlertEngine() {
  const { state, api } = useAzure();
  const ref = useRef({ state, api });
  ref.current = { state, api };
  useEffect(() => {
    const i = window.setInterval(() => {
      const { state: s, api: a } = ref.current;
      s.alertRules.forEach((rule) => {
        const r = s.resources.find((x) => x.id === rule.resourceId);
        if (!r || !rule.enabled) return;
        const svc = serviceById(r.service);
        const m = svc?.metrics.find((mm) => mm.key === rule.metricKey);
        if (!m) return;
        const cur = metricSeries(r, m, 2, 2000)[1]?.v ?? 0;
        const hit = rule.op === ">" ? cur > rule.threshold : cur < rule.threshold;
        if (hit && (!rule.firedAt || Date.now() - rule.firedAt > 26000)) {
          a.fire(rule.id);
          a.toast({
            title: `Alert fired: ${rule.name}`,
            body: `${m.label} = ${cur.toFixed(1)} ${m.unit} (${rule.op} ${rule.threshold}). Severity ${rule.severity}.`,
            kind: rule.severity <= 1 ? "error" : "warn",
          });
        }
      });
    }, 7000);
    return () => window.clearInterval(i);
  }, []);
}

function content(spec: BladeSpec) {
  switch (spec.kind) {
    case "home":
      return <HomeBlade />;
    case "rgs":
      return <ResourceGroupsBlade />;
    case "rg":
      return <ResourceGroupBlade name={spec.params?.name} />;
    case "resources":
      return <AllResourcesBlade />;
    case "marketplace":
      return <MarketplaceBlade rg={spec.params?.rg} />;
    case "create":
      return spec.params?.service && serviceById(spec.params?.service) ? (
        <CreateBlade service={spec.params.service} rg={spec.params?.rg} />
      ) : (
        <HomeBlade />
      );
    case "resource":
      return <ResourceBlade id={spec.params?.id} />;
    case "monitor":
      return <MonitorBlade />;
    case "activity":
      return <ActivityBlade />;
    case "alerts":
      return <AlertsBlade />;
    case "cost":
      return <CostBlade />;
    case "labs":
      return <LabsBlade key={spec.params?.lab ?? "all"} lab={spec.params?.lab} />;
    case "cheatsheet":
      return <CheatSheetBlade />;
    case "help":
      return <HelpBlade />;
    case "settings":
      return <SettingsBlade />;
    case "entra":
      return <EntraBlade />;
    case "policy":
      return <PolicyBlade />;
    case "subs":
      return <SubscriptionsBlade />;
    default:
      return null;
  }
}

function Blade({ spec, active }: { spec: BladeSpec; active: boolean }) {
  const { state, api } = useAzure();
  const r = spec.kind === "resource" ? state.resources.find((x) => x.id === spec.params?.id) : undefined;
  const rg = spec.kind === "rg" ? state.rgs.find((g) => g.name === spec.params?.name) : undefined;
  const svc = spec.kind === "create" ? serviceById(spec.params?.service) : undefined;

  const meta = (() => {
    switch (spec.kind) {
      case "home":
        return { title: "Home", sub: "Azure simulation", width: 880, nav: "home" };
      case "rgs":
        return { title: "Resource groups", sub: `${state.rgs.length} groups`, width: 760, nav: "rgs" };
      case "rg":
        return { title: spec.params?.name ?? "", sub: rg ? "Resource group" : "Resource group (missing)", width: 720, nav: "rgs" };
      case "resources":
        return { title: "All resources", sub: `${state.resources.length} resources`, width: 800, nav: "resources" };
      case "marketplace":
        return { title: "Marketplace", sub: "Create a resource", width: 880, nav: "marketplace" };
      case "create":
        return { title: svc?.name ?? "Create", sub: "Create", width: 840, nav: "marketplace" };
      case "resource":
        return { title: r?.name ?? "Resource", sub: r ? `${serviceById(r.service)?.name} · ${r.rg}` : "Resource", width: 780, nav: "resources" };
      case "monitor":
        return { title: "Monitor", sub: "Metrics · activity · alerts", width: 860, nav: "monitor" };
      case "activity":
        return { title: "Activity log", sub: `${state.activity.length} events`, width: 820, nav: "activity" };
      case "alerts":
        return { title: "Alerts", sub: `${state.alertRules.length} alert rules`, width: 780, nav: "alerts" };
      case "cost":
        return { title: "Cost Management + Billing", sub: "Estimated costs", width: 880, nav: "cost" };
      case "labs":
        return { title: "Practice labs", sub: "Guided exercises", width: 760, nav: "labs" };
      case "cheatsheet":
        return { title: "Cheat sheet", sub: "CLI + concepts", width: 780, nav: "cheatsheet" };
      case "help":
        return { title: "Help + support", sub: "How to use this simulator", width: 720, nav: "help" };
      case "settings":
        return { title: "Settings", sub: "Theme · favourites · data", width: 680, nav: "settings" };
      case "entra":
        return { title: "Microsoft Entra ID", sub: `${state.users.length} users · ${state.groups.length} groups`, width: 860, nav: "entra" };
      case "policy":
        return { title: "Policy", sub: "Definitions · assignments · compliance", width: 860, nav: "policy" };
      case "subs":
        return { title: state.subscriptions[0]?.name ?? "Subscription", sub: "Subscriptions", width: 860, nav: "subs" };
      default:
        return { title: "Azure", sub: "", width: 700, nav: "home" };
    }
  })();

  const NavIcon = NAV[meta.nav]?.icon;
  const activeId = state.blades[state.blades.length - 1]?.id;
  const isActive = spec.id === activeId || active;

  return (
    <section
      className={cn(
        "blade-in bg-[var(--panel)] border-r border-[var(--border)] flex flex-col shrink-0 h-full relative",
        !isActive && "shadow-[inset_-1px_0_0_var(--border)]"
      )}
      style={{ width: `min(${meta.width}px, 96vw)` }}
      onClick={() => {
        if (state.blades[state.blades.length - 1]?.id !== spec.id) api.open(spec.kind, spec.params, spec.id);
      }}
    >
      <header className="h-12 flex items-center gap-2 px-3 border-b border-[var(--border)] shrink-0 bg-[var(--panel)]">
        <span className="grid place-items-center h-7 w-7 rounded-[3px] shrink-0" style={{ background: "var(--panel-3)", color: "var(--accent)" }}>
          {r ? <span className="text-[15px]">{serviceById(r.service)?.glyph}</span> : NavIcon ? <NavIcon size={15} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold truncate leading-tight">{meta.title}</div>
          {meta.sub ? <div className="text-[11.5px] text-[var(--text-2)] truncate">{meta.sub}</div> : null}
        </div>
        <button className="h-8 w-8 grid place-items-center hover:bg-[var(--hover)] rounded-[2px] cursor-pointer" title="Close blade" onClick={(e) => { e.stopPropagation(); api.close(spec.id); }}>
          <X size={15} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto az-scroll">{content(spec)}</div>
    </section>
  );
}

function Welcome() {
  const { api } = useAzure();
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem("az-sim-seen-tour");
    } catch {
      return true;
    }
  });
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem("az-sim-seen-tour", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 fade-in" onClick={close}>
      <div
        className="w-full max-w-[720px] bg-[var(--panel)] border border-[var(--border)] shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start gap-3">
          <span className="grid grid-cols-2 gap-[2px] w-6 h-6 shrink-0 mt-0.5">
            <span style={{ background: "#f25022" }} />
            <span style={{ background: "#7fba00" }} />
            <span style={{ background: "#00a4ef" }} />
            <span style={{ background: "#ffb900" }} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold">Welcome to the Azure Portal Simulator</h1>
            <p className="text-[12.5px] text-[var(--text-2)]">No Azure subscription, no credit card, no internet needed — everything runs in your browser.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
          {[
            ["🧭", "Explore like the real portal", "Blades slide in from the left, wizards validate names exactly like Azure, and every resource has metrics, an activity log and a JSON view."],
            ["🛠️", "Create 20+ services", "Virtual machines, storage accounts, SQL, Cosmos DB, App Service, AKS, Key Vault, virtual networks and more."],
            ["⌨️", "Practise the Azure CLI", "Open Cloud Shell ( >_ in the top bar) and use real az commands: az group create, az vm create, az vm list -o table …"],
            ["🎓", "Follow 18 guided labs", "An AZ-104-style track: identity, RBAC, policy, storage, VMs, containers, networking, backup and monitoring — auto-verified as you go."],
          ].map(([icon, title, body]) => (
            <div key={title} className="border border-[var(--border)] p-3 rounded-[2px]">
              <div className="text-[16px] mb-1">{icon}</div>
              <div className="font-semibold text-[13px] mb-0.5">{title}</div>
              <div className="text-[12px] text-[var(--text-2)]">{body}</div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-[var(--border)] flex flex-wrap gap-2 justify-end">
          <button
            className="text-[13px] text-[var(--text-2)] hover:text-[var(--text)] px-2 h-8 cursor-pointer"
            onClick={() => {
              close();
              api.open("help");
            }}
          >
            How it works
          </button>
          <button
            className="text-[13px] px-3 h-8 border border-[var(--border-2)] rounded-[2px] hover:bg-[var(--hover)] cursor-pointer"
            onClick={() => {
              close();
              api.open("marketplace");
            }}
          >
            Open the Marketplace
          </button>
          <button
            className="text-[13px] px-3 h-8 rounded-[2px] bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] cursor-pointer"
            onClick={() => {
              close();
              api.open("labs");
            }}
          >
            Start Lab 01
          </button>
        </div>
      </div>
    </div>
  );
}

function Portal() {
  const { state } = useAzure();
  const [shell, setShell] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  useAlertEngine();

  useEffect(() => {
    const el = stack.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [state.blades.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShell(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--shell)]">
      <TopBar onShellToggle={() => setShell((v) => !v)} shellOpen={shell} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main ref={stack} className="flex-1 min-w-0 flex overflow-x-auto az-scroll">
          {state.blades.map((b) => (
            <Blade key={b.id} spec={b} active={false} />
          ))}
        </main>
      </div>
      {shell ? <CloudShell onClose={() => setShell(false)} /> : null}
      <Toasts />
      <Welcome />
    </div>
  );
}

export default function App() {
  return (
    <AzureProvider>
      <Portal />
    </AzureProvider>
  );
}
