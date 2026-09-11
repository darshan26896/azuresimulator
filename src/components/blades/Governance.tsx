import { useState } from "react";
import { Plus, Search, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { computeCompliance, POLICY_DEFS, policyDefById, previewCompliance, type PolicyEffect } from "../../lib/governance";
import { useAzure } from "../../lib/store";
import { Btn, Card, DataTable, EmptyState, Field, SelectInput, Tabs } from "../ui";
import { IamPanel } from "./Identity";

export function PolicyBlade() {
  const { state, api } = useAzure();
  const [tab, setTab] = useState("assignments");
  const [def, setDef] = useState(POLICY_DEFS[0].id);
  const [scope, setScope] = useState<"subscription" | "rg">("subscription");
  const [rgName, setRgName] = useState(state.rgs[0]?.name ?? "");
  const [enforcement, setEnforcement] = useState<"Enabled" | "Disabled">("Enabled");
  const [q, setQ] = useState("");

  const compliance = computeCompliance(state);
  const defs = POLICY_DEFS.filter((d) => !q || (d.name + d.description + d.category).toLowerCase().includes(q.toLowerCase()));
  const preview = previewCompliance(state, def, scope, scope === "subscription" ? state.currentSubscription : rgName);

  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">Policy</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">
          Azure Policy enforces organisational rules on resources — the same definitions Microsoft ships, evaluated live against your simulated subscription.
        </p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "assignments", label: "Assignments", count: state.policyAssignments.length },
          { id: "compliance", label: "Compliance" },
          { id: "definitions", label: "Definitions", count: POLICY_DEFS.length },
        ]}
      />
      <div className="p-3 space-y-3">
        {tab === "assignments" ? (
          <>
            <Card title="Assign a policy">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Policy definition">
                  <SelectInput value={def} onChange={setDef} options={POLICY_DEFS.map((d) => ({ value: d.id, label: d.name }))} />
                </Field>
                <Field label="Scope">
                  <SelectInput
                    value={scope}
                    onChange={(v) => setScope(v as "subscription" | "rg")}
                    options={[
                      { value: "subscription", label: state.subscriptions[0].name },
                      { value: "rg", label: "A resource group" },
                    ]}
                  />
                  {scope === "rg" ? (
                    <div className="mt-2">
                      <SelectInput value={rgName} onChange={setRgName} options={state.rgs.map((g) => ({ value: g.name, label: g.name }))} />
                    </div>
                  ) : null}
                </Field>
                <Field label="Policy enforcement" help="Disabled = audit only; resources still deploy but show non-compliant.">
                  <SelectInput
                    value={enforcement}
                    onChange={(v) => setEnforcement(v as PolicyEffect as "Enabled" | "Disabled")}
                    options={[
                      { value: "Enabled", label: "Enabled (Deny/Audit)" },
                      { value: "Disabled", label: "Disabled (don't evaluate)" },
                    ]}
                  />
                </Field>
                <Field label="Impact preview">
                  <div className="text-[12.5px]">
                    {preview ? (
                      preview.total === 0 ? (
                        <span className="text-[var(--text-2)]">No resources in scope yet.</span>
                      ) : preview.nonCompliant === 0 ? (
                        <span className="text-[var(--ok)]">✓ All {preview.total} in-scope resources are compliant.</span>
                      ) : (
                        <span className="text-[var(--err)]">
                          ✗ {preview.nonCompliant} of {preview.total} would be non-compliant: {preview.names.join(", ")}
                        </span>
                      )
                    ) : null}
                  </div>
                </Field>
              </div>
              <Btn
                variant="primary"
                icon={<Plus size={14} />}
                disabled={scope === "rg" && !rgName}
                onClick={() => {
                  const d = policyDefById(def);
                  const name = `assign-${(d?.name ?? "policy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${uidShort()}`;
                  api.assignPolicy({ name, definitionId: def, scope, scopeName: scope === "subscription" ? state.currentSubscription : rgName, enforcement });
                  setTab("compliance");
                }}
              >
                Review + assign
              </Btn>
            </Card>
            <Card title="Current assignments">
              <DataTable
                cols={[
                  { label: "Assignment", render: (a: any) => <span className="font-semibold">{a.name}</span> },
                  { label: "Definition", render: (a: any) => policyDefById(a.definitionId)?.name ?? "—" },
                  { label: "Scope", render: (a: any) => (a.scope === "subscription" ? state.subscriptions[0].name : a.scopeName) },
                  { label: "Enforcement", render: (a: any) => a.enforcement },
                  { label: "Assigned by", render: (a: any) => <span className="mono">{a.assignedBy}</span> },
                  {
                    label: "",
                    render: (a: any) => (
                      <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.unassignPolicy(a.id)}>
                        Delete
                      </Btn>
                    ),
                  },
                ]}
                rows={state.policyAssignments}
                empty={<EmptyState title="No policy assignments" body="Assign the 'Allowed locations' policy above and watch compliance change." icon={<ShieldCheck size={20} />} />}
              />
            </Card>
          </>
        ) : null}

        {tab === "compliance" ? (
          <div className="space-y-3">
            <div className="border border-[var(--border)] bg-[var(--panel)] p-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full grid place-items-center text-white"
                  style={{ background: compliance.pct >= 90 ? "var(--ok)" : compliance.pct >= 60 ? "#eaa300" : "var(--err)" }}
                >
                  <Shield size={20} />
                </div>
                <div>
                  <div className="text-[22px] font-light leading-none">{compliance.pct}%</div>
                  <div className="text-[12px] text-[var(--text-2)]">
                    {compliance.compliant} of {compliance.total} in-scope resources compliant
                  </div>
                </div>
              </div>
              <div className="h-2 bg-[var(--panel-3)] mt-3 rounded-[1px] overflow-hidden flex">
                {compliance.rows.map((r, i) => {
                  const ok = r.total === 0 ? 1 : r.compliant / r.total;
                  return <div key={i} className="h-full" style={{ width: `${r.total ? (1 / compliance.rows.length) * 100 : 0}%` }}>
                    <div className="h-full" style={{ width: `${ok * 100}%`, background: ok === 1 ? "var(--ok)" : ok > 0.5 ? "#eaa300" : "var(--err)" }} />
                  </div>;
                })}
              </div>
            </div>
            {compliance.rows.length ? (
              compliance.rows.map((r) => (
                <Card key={r.assignment.id} title={r.def?.name ?? "Unknown definition"} actions={<span className="text-[12px] text-[var(--text-2)]">{r.pct}%</span>}>
                  <DataTable
                    cols={[
                      { label: "Resource", render: (x: any) => x.name },
                      { label: "Reason", render: (x: any) => x.reason },
                      {
                        label: "",
                        render: (x: any) => (
                          <button className="text-[var(--accent)] text-[12.5px] hover:underline cursor-pointer" onClick={() => api.open("resource", { id: state.resources.find((rr) => rr.name === x.name)?.id }, `resource-${state.resources.find((rr) => rr.name === x.name)?.id}`)}>
                            Open resource
                          </button>
                        ),
                      },
                    ]}
                    rows={r.offenders}
                    empty={<div className="text-[12.5px] text-[var(--ok)]">✓ No non-compliant resources.</div>}
                  />
                </Card>
              ))
            ) : (
              <EmptyState title="No assignments to evaluate" body="Assign a policy on the Assignments tab." icon={<Shield size={20} />} />
            )}
          </div>
        ) : null}

        {tab === "definitions" ? (
          <Card title="Built-in policy definitions">
            <div className="w-[260px] mb-3">
              <div className="flex items-center gap-1.5 h-8 px-2 border border-[var(--border-2)] bg-[var(--panel)] rounded-[2px]">
                <Search size={14} className="text-[var(--text-2)]" />
                <input className="bg-transparent outline-none w-full text-[13px]" placeholder="Search definitions" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              {defs.map((d) => (
                <div key={d.id} className="border border-[var(--border)] p-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{d.name}</span>
                    <span className="text-[11px] bg-[var(--panel-3)] border border-[var(--border-2)] px-1.5 py-0.5">{d.category}</span>
                    <span
                      className="text-[11px] px-1.5 py-0.5 border"
                      style={{
                        borderColor: d.effect === "Deny" ? "var(--err)" : "var(--warn)",
                        color: d.effect === "Deny" ? "var(--err)" : "inherit",
                      }}
                    >
                      {d.effect}
                    </span>
                    <Btn variant="toolbar" className="ml-auto" icon={<Plus size={13} />} onClick={() => { setDef(d.id); setTab("assignments"); }}>
                      Assign
                    </Btn>
                  </div>
                  <div className="text-[12px] text-[var(--text-2)] mt-1">{d.description}</div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function uidShort() {
  return Math.random().toString(36).slice(2, 6);
}

export function SubscriptionsBlade() {
  const { state, api } = useAzure();
  const sub = state.subscriptions[0];
  const [tab, setTab] = useState("overview");
  const totalRes = state.resources.length;
  const totalRg = state.rgs.length;

  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">{sub.name}</h2>
        <p className="text-[12.5px] text-[var(--text-2)] mono">{sub.id}</p>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "iam", label: "Access control (IAM)" }, { id: "resources", label: "Resource providers" }]} />
      <div className="p-3 space-y-3">
        {tab === "overview" ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                ["Status", "Enabled"],
                ["Resource groups", String(totalRg)],
                ["Resources", String(totalRes)],
                ["Policy assignments", String(state.policyAssignments.length)],
              ].map(([k, v]) => (
                <div key={k} className="border border-[var(--border)] bg-[var(--panel)] p-3">
                  <div className="text-[11.5px] text-[var(--text-2)]">{k}</div>
                  <div className="text-[16px] font-light">{v}</div>
                </div>
              ))}
            </div>
            <Card title="Subscription concepts">
              <ul className="list-disc pl-5 text-[12.5px] text-[var(--text-2)] space-y-1.5">
                <li>A subscription is the billing and quota boundary — every resource belongs to exactly one.</li>
                <li>Management groups sit above subscriptions for enterprise-wide policy and role assignment.</li>
                <li>Quotas (vCPUs per region, etc.) are enforced at subscription level and can be increased via a support request.</li>
                <li>Resource providers (e.g. Microsoft.Compute) are registered per subscription — the table below shows the simulated state.</li>
              </ul>
            </Card>
          </>
        ) : null}
        {tab === "iam" ? <IamPanel scope="subscription" scopeName={sub.id} title="Role assignments for this subscription" /> : null}
        {tab === "resources" ? (
          <Card title="Resource providers">
            <DataTable
              cols={[
                { label: "Provider", render: (x: any) => <span className="mono">{x.name}</span> },
                { label: "Registered", render: (x: any) => (x.registered ? <span className="text-[var(--ok)]">Registered</span> : "NotRegistered") },
                { label: "Resource types", align: "right", render: (x: any) => x.types },
                {
                  label: "",
                  render: (x: any) => (
                    <Btn
                      variant="toolbar"
                      onClick={() =>
                        api.toast({
                          title: x.registered ? `Re-registered ${x.name}` : `Registered ${x.name}`,
                          body: "Resource provider registration is simulated.",
                          kind: "success",
                        })
                      }
                    >
                      {x.registered ? "Re-register" : "Register"}
                    </Btn>
                  ),
                },
              ]}
              rows={[
                { name: "Microsoft.Compute", registered: true, types: 6 },
                { name: "Microsoft.Storage", registered: true, types: 4 },
                { name: "Microsoft.Network", registered: true, types: 9 },
                { name: "Microsoft.Web", registered: true, types: 3 },
                { name: "Microsoft.Sql", registered: true, types: 3 },
                { name: "Microsoft.DocumentDB", registered: true, types: 2 },
                { name: "Microsoft.ContainerService", registered: true, types: 2 },
                { name: "Microsoft.App", registered: false, types: 1 },
                { name: "Microsoft.KeyVault", registered: true, types: 2 },
                { name: "Microsoft.CognitiveServices", registered: false, types: 2 },
              ]}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
