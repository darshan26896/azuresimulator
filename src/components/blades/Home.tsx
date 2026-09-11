import { ArrowRight, BookOpen, CheckCircle2, Plus, Rocket, Trash2 } from "lucide-react";
import { useAzure, totalMonthly, costByService } from "../../lib/store";
import { SERVICES, serviceById, regionLabel } from "../../lib/catalog";
import { BarList, Btn, Card, ServiceIcon, StatusDot, money } from "../ui";
import { LABS } from "../../lib/labs";

const QUICK = ["vm", "storage", "webapp", "sql", "vnet", "aks", "func", "cosmos", "aci", "containerapp", "vmss", "backup", "dns", "avset"];

export function HomeBlade() {
  const { state, api } = useAzure();
  const recent = [...state.resources].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const total = totalMonthly(state);
  const top = costByService(state).slice(0, 4);
  const labsDone = LABS.filter((l) => (state.labProgress[l.id] ?? 0) >= l.steps.length).length;
  const nextLab = LABS.find((l) => (state.labProgress[l.id] ?? 0) < l.steps.length);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[21px] font-semibold">Home</h1>
          <p className="text-[12.5px] text-[var(--text-2)] mt-0.5">
            {state.subscriptions[0].name} · simulation · everything runs offline in your browser
          </p>
        </div>
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => api.open("marketplace")}>
          Create a resource
        </Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Azure services">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK.map((id) => {
              const s = serviceById(id)!;
              return (
                <button
                  key={id}
                  onClick={() => api.open("create", { service: id }, `create-${id}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-[2px] hover:bg-[var(--hover)] cursor-pointer text-center"
                  title={s.blurb}
                >
                  <ServiceIcon service={id} size={34} />
                  <span className="text-[12px] leading-tight">{s.name}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Your learning progress" actions={<Btn icon={<BookOpen size={14} />} onClick={() => api.open("labs")}>Practice labs</Btn>}>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--panel-3)" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  strokeDasharray={`${(labsDone / LABS.length) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[13px] font-semibold">
                {labsDone}/{LABS.length}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold mb-1">{nextLab ? `Up next: ${nextLab.title}` : "All labs complete — well done!"}</div>
              <div className="text-[12px] text-[var(--text-2)] mb-2">
                {nextLab ? `${nextLab.level} · ~${nextLab.minutes} min · ${nextLab.steps.length} steps` : "Try building your own architecture from the Marketplace."}
              </div>
              {nextLab ? (
                <Btn variant="primary" icon={<Rocket size={14} />} onClick={() => api.open("labs", { lab: nextLab.id }, "labs")}>
                  Continue
                </Btn>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Recent resources" actions={<Btn onClick={() => api.open("resources")}>All resources</Btn>}>
          {recent.length ? (
            <div className="divide-y divide-[var(--border)]">
              {recent.map((r) => (
                <button
                  key={r.id}
                  className="w-full flex items-center gap-2 py-2 text-left hover:bg-[var(--hover)] px-1 cursor-pointer"
                  onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}
                >
                  <ServiceIcon service={r.service} size={22} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{r.name}</span>
                    <span className="block text-[11.5px] text-[var(--text-2)] truncate">
                      {serviceById(r.service)?.name} · {regionLabel(r.location)}
                    </span>
                  </span>
                  <StatusDot status={r.status} />
                  <ArrowRight size={14} className="opacity-40" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[var(--text-2)] py-4 text-center">No resources yet — create your first one from the Marketplace.</div>
          )}
        </Card>

        <Card title="Cost snapshot (estimated)" actions={<Btn onClick={() => api.open("cost")}>Cost Management</Btn>}>
          <div className="text-[26px] font-light mb-1">
            {money(total)} <span className="text-[13px] text-[var(--text-2)]">/ month</span>
          </div>
          <div className="text-[12px] text-[var(--text-2)] mb-3">
            {state.resources.length} resources in {state.rgs.length} resource groups · {(total * 12).toFixed(0)} USD / year
          </div>
          {top.length ? <BarList items={top.map((t) => ({ label: t.label, value: t.cost, sub: `${t.count} resource${t.count > 1 ? "s" : ""}` }))} /> : null}
        </Card>
      </div>

      <Card title="Identity & governance">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { kind: "entra" as const, icon: "👥", title: "Microsoft Entra ID", body: "Users, groups and roles" },
            { kind: "policy" as const, icon: "🛡️", title: "Policy", body: "Definitions, assignments, compliance" },
            { kind: "subs" as const, icon: "💳", title: "Subscriptions + RBAC", body: "Billing boundary and access control" },
          ].map((c) => (
            <button key={c.kind} onClick={() => api.open(c.kind, {}, c.kind)} className="text-left border border-[var(--border)] p-3 rounded-[2px] hover:border-[var(--accent)] hover:shadow-[var(--shadow)] transition cursor-pointer">
              <div className="text-[16px] mb-1">{c.icon}</div>
              <div className="font-semibold text-[13px]">{c.title}</div>
              <div className="text-[12px] text-[var(--text-2)]">{c.body}</div>
            </button>
          ))}
        </div>
      </Card>

      {state.deployments.length ? (
        <Card title="Deployments in progress">
          <div className="space-y-3">
            {state.deployments.map((d) => (
              <div key={d.id}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-[var(--text-2)] mono">{d.rg}</span>
                </div>
                {d.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12.5px] py-0.5">
                    {s.status === "succeeded" ? (
                      <CheckCircle2 size={14} className="text-[var(--ok)]" />
                    ) : s.status === "running" ? (
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-[var(--border-2)] border-t-[var(--accent)] spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-[var(--border-2)]" />
                    )}
                    <span className={s.status === "pending" ? "text-[var(--text-2)]" : ""}>{s.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="Navigate the simulator">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
          <div>
            <div className="font-semibold mb-1">Marketplace</div>
            <p className="text-[var(--text-2)]">
              {SERVICES.length} Azure services you can create: VMs, storage, SQL, AKS, Cosmos, Key Vault and more. Every wizard validates names exactly like Azure does.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-1">Cloud Shell</div>
            <p className="text-[var(--text-2)]">
              Click <span className="mono">&gt;_</span> in the top bar to open the simulated bash shell and drive everything with the real <span className="mono">az</span> CLI syntax.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-1">Practice labs</div>
            <p className="text-[var(--text-2)]">12 guided labs that check your work as you go — from your first resource group to cost control and monitoring.</p>
          </div>
        </div>
      </Card>

      {state.resources.length || state.rgs.length ? (
        <div className="flex justify-end">
          <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => api.reset()}>
            Reset simulation data
          </Btn>
        </div>
      ) : null}
    </div>
  );
}
