import { useState } from "react";
import { AlertTriangle, Bell, Play, RefreshCw, RotateCw, Square, Trash2, Power } from "lucide-react";
import { metricSeries, monthlyCost, regionLabel, serviceById } from "../../lib/catalog";
import { useAzure } from "../../lib/store";
import { AreaChart, Btn, Card, CopyBox, DataTable, Essentials, Field, LearnBox, SelectInput, StatusDot, Tabs, TagsEditor, TextInput, Toggle, money } from "../ui";
import { BackupTabs, CodeViews, DiagnosticPanel, DnsRecords, ResourceIam, StorageTabs, VmBackupPanel, VnetTabs } from "./ServiceTabs";
import type { Resource } from "../../lib/types";

const RANGES = [
  { label: "Live (30 s)", points: 24, bucket: 2000 },
  { label: "Last 30 minutes", points: 24, bucket: 60_000 },
  { label: "Last 24 hours", points: 24, bucket: 3_600_000 },
  { label: "Last 7 days", points: 24, bucket: 86_400_000 },
];

export function ResourceBlade({ id }: { id: string }) {
  const { state, api } = useAzure();
  const r = state.resources.find((x) => x.id === id);
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState(0);
  const [panel, setPanel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, any> | null>(null);
  const [alert, setAlert] = useState({ name: "", metric: 0, op: ">", threshold: 75, severity: 2 });

  if (!r)
    return (
      <div className="p-4">
        <p className="text-[13px]">This resource no longer exists. It may have been deleted.</p>
        <Btn className="mt-3" onClick={() => api.open("resources")}>
          Go to All resources
        </Btn>
      </div>
    );

  const svc = serviceById(r.service)!;
  const rules = state.alertRules.filter((a) => a.resourceId === r.id);
  const acts = state.activity.filter((a) => a.resource === r.name);
  const rgName = state.rgs.find((g) => g.name === r.rg);
  const props = draft ?? r.props;

  const connectInfo = () => {
    if (svc.id === "vm")
      return r.props.image?.startsWith("Win")
        ? { title: "Connect with RDP", body: `mstsc /v:${r.name}.${r.location}.cloudapp.azure.com` }
        : { title: "Connect with SSH", body: `ssh ${r.props.adminUsername}@${r.name}.${r.location}.cloudapp.azure.com` };
    if (svc.id === "webapp" || svc.id === "swa" || svc.id === "func")
      return { title: "Browse the app", body: `https://${r.name}.azurewebsites.net` };
    if (svc.id === "aks") return { title: "Connect to the cluster", body: `az aks get-credentials -g ${r.rg} -n ${r.name} --overwrite-existing` };
    if (svc.id === "acr") return { title: "Log in to the registry", body: `az acr login --name ${r.name}` };
    return null;
  };

  return (
    <div>
      <div className="p-3 border-b border-[var(--border)] flex flex-wrap gap-2">
        {svc.actions?.includes("start") ? (
          <Btn variant="primary" icon={<Play size={14} />} onClick={() => api.act(r.id, "start")} disabled={r.status === "Running"}>
            Start
          </Btn>
        ) : null}
        {svc.actions?.includes("stop") ? (
          <Btn icon={<Square size={14} />} onClick={() => api.act(r.id, "stop")} disabled={r.status === "Stopped"}>
            Stop
          </Btn>
        ) : null}
        {svc.actions?.includes("restart") ? (
          <Btn icon={<RotateCw size={14} />} onClick={() => api.act(r.id, "restart")}>
            Restart
          </Btn>
        ) : null}
        {svc.actions?.includes("deallocate") ? (
          <Btn icon={<Power size={14} />} onClick={() => api.act(r.id, "deallocate")} title="Stops billing for compute">
            Deallocate
          </Btn>
        ) : null}
        {connectInfo() ? <Btn onClick={() => setPanel(panel === "connect" ? null : "connect")}>{connectInfo()!.title}</Btn> : null}
        <Btn icon={<RefreshCw size={14} />} onClick={() => api.toast({ title: `${r.name} refreshed`, body: `Status: ${r.status}`, kind: "info" })}>
          Refresh
        </Btn>
        <Btn icon={<Bell size={14} />} onClick={() => setTab("alerts")}>
          Alerts {rules.length ? `(${rules.length})` : ""}
        </Btn>
        <Btn variant="danger" icon={<Trash2 size={14} />} className="ml-auto" onClick={() => api.deleteResource(r.id)}>
          Delete
        </Btn>
      </div>

      {panel === "connect" && connectInfo() ? (
        <div className="p-3 bg-[var(--panel-2)] border-b border-[var(--border)]">
          <div className="font-semibold text-[13px] mb-2">{connectInfo()!.title}</div>
          <CopyBox value={connectInfo()!.body} />
          <p className="text-[12px] text-[var(--text-2)] mt-2">
            This is a simulation — the command is what you would run in a real terminal with a real Azure subscription.
          </p>
        </div>
      ) : null}

      <div className="p-3">
        <Essentials
          items={[
            { label: "Resource group", value: r.rg },
            { label: "Status", value: <StatusDot status={r.status} /> },
            { label: "Location", value: regionLabel(r.location) },
            { label: "Subscription", value: state.subscriptions[0].name },
            { label: "Type", value: svc.name },
            { label: "Created", value: new Date(r.createdAt).toLocaleString() },
            ...(svc.essentials?.(r) ?? []),
            { label: "Estimated cost", value: `${money(monthlyCost(r))} / month` },
            { label: "Tags", value: Object.entries(r.tags).map(([k, v]) => `${k}:${v}`).join(", ") || "—" },
          ]}
        />
        {!rgName ? (
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--err)] mt-1">
            <AlertTriangle size={14} /> The parent resource group is missing.
          </div>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "activity", label: "Activity log", count: acts.length },
          { id: "metrics", label: "Metrics" },
          { id: "config", label: "Configuration" },
          ...(svc.id === "storage" ? [{ id: "storage", label: "Data storage" }] : []),
          ...(svc.id === "vnet" ? [{ id: "vnet", label: "Subnets + peerings" }] : []),
          ...(svc.id === "dns" ? [{ id: "dns", label: "DNS records" }] : []),
          ...(svc.id === "backup" ? [{ id: "backup", label: "Protected items" }] : []),
          { id: "tags", label: "Tags" },
          { id: "alerts", label: "Alerts", count: rules.length },
          { id: "iam", label: "Access control (IAM)" },
          { id: "diag", label: "Diagnostic settings" },
          { id: "code", label: "Bicep + CLI" },
          { id: "learn", label: "Learn" },
        ]}
      />

      <div className="p-3">
        {tab === "overview" ? (
          <div className="space-y-3">
            {svc.metrics.slice(0, 2).map((m) => (
              <Card key={m.key} title={m.label}>
                <AreaChart points={metricSeries(r, m, RANGES[range].points, RANGES[range].bucket)} unit={m.unit} />
              </Card>
            ))}
            {svc.metrics.length ? (
              <div className="flex flex-wrap gap-2">
                {RANGES.map((rr, i) => (
                  <Btn key={rr.label} variant={i === range ? "primary" : "toolbar"} onClick={() => setRange(i)}>
                    {rr.label}
                  </Btn>
                ))}
              </div>
            ) : (
              <LearnBox items={svc.learn} title={`About ${svc.name}`} />
            )}
            {svc.id === "vm" ? <VmBackupPanel r={r} /> : null}
          </div>
        ) : null}

        {tab === "activity" ? (
          <DataTable
            cols={[
              { label: "Time", render: (a: any) => new Date(a.ts).toLocaleString() },
              { label: "Operation", render: (a: any) => a.operation },
              { label: "Status", render: (a: any) => <StatusDot status={a.status} /> },
              { label: "Caller", render: (a: any) => <span className="mono">{a.caller}</span> },
            ]}
            rows={acts}
            empty={<Card>No activity recorded for this resource yet.</Card>}
          />
        ) : null}

        {tab === "metrics" ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {svc.metrics.map((m) => (
              <Card key={m.key} title={m.label}>
                <AreaChart points={metricSeries(r, m, RANGES[range].points, RANGES[range].bucket)} unit={m.unit} />
              </Card>
            ))}
            <div className="xl:col-span-2 flex flex-wrap gap-2">
              {RANGES.map((rr, i) => (
                <Btn key={rr.label} variant={i === range ? "primary" : "toolbar"} onClick={() => setRange(i)}>
                  {rr.label}
                </Btn>
              ))}
              <span className="text-[12px] text-[var(--text-2)] self-center">Metrics are generated locally with deterministic pseudo-random data.</span>
            </div>
          </div>
        ) : null}

        {tab === "config" ? (
          <div className="max-w-xl">
            <p className="text-[12.5px] text-[var(--text-2)] mb-3">
              Changing a value here behaves like the real portal: some settings can be updated in place, others would require a redeploy.
            </p>
            {svc.steps.flatMap((s) =>
              s.fields.map((f) => {
                if (f.when && !f.when(props)) return null;
                if (f.dynamic) return null;
                if (f.type === "toggle")
                  return (
                    <Field key={f.key} label={f.label} help={f.help}>
                      <Toggle value={!!props[f.key]} onChange={(v) => setDraft({ ...props, [f.key]: v })} />
                    </Field>
                  );
                if (f.type === "select")
                  return (
                    <Field key={f.key} label={f.label} help={f.help}>
                      <SelectInput value={String(props[f.key] ?? "")} onChange={(v) => setDraft({ ...props, [f.key]: v })} options={f.options ?? []} />
                    </Field>
                  );
                return (
                  <Field key={f.key} label={f.label} help={f.help}>
                    <TextInput
                      value={String(props[f.key] ?? "")}
                      onChange={(v) => setDraft({ ...props, [f.key]: v })}
                      mono={f.mono}
                      type={f.type === "password" ? "password" : "text"}
                    />
                  </Field>
                );
              })
            )}
            <div className="flex gap-2">
              <Btn
                variant="primary"
                disabled={!draft}
                onClick={() => {
                  if (!draft) return;
                  api.patch(r.id, { props: draft, status: "Updating" });
                  window.setTimeout(() => api.patch(r.id, { status: svc.status }), 1600);
                  api.toast({ title: "Configuration saved", body: `${r.name} was updated.`, kind: "success" });
                  setDraft(null);
                }}
              >
                Save
              </Btn>
              <Btn onClick={() => setDraft(null)} disabled={!draft}>
                Discard
              </Btn>
            </div>
          </div>
        ) : null}

        {tab === "tags" ? (
          <div className="max-w-xl">
            <TagsEditor
              tags={r.tags}
              onChange={(t) => {
                api.patch(r.id, { tags: t });
                api.toast({ title: "Tags updated", body: `${Object.keys(t).length} tag(s) on ${r.name}.`, kind: "success" });
              }}
            />
          </div>
        ) : null}

        {tab === "alerts" ? (
          <div className="space-y-3 max-w-2xl">
            <Card title="New alert rule">
              <Field label="Alert rule name" required>
                <TextInput value={alert.name} onChange={(v) => setAlert({ ...alert, name: v })} placeholder={`${r.name} – high CPU`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Signal / metric">
                  <SelectInput
                    value={String(alert.metric)}
                    onChange={(v) => setAlert({ ...alert, metric: Number(v) })}
                    options={svc.metrics.map((m, i) => ({ value: String(i), label: `${m.label} (${m.unit})` }))}
                  />
                </Field>
                <Field label="Condition">
                  <div className="flex gap-2">
                    <SelectInput
                      value={alert.op}
                      onChange={(v) => setAlert({ ...alert, op: v })}
                      options={[
                        { value: ">", label: "Greater than" },
                        { value: "<", label: "Less than" },
                      ]}
                    />
                    <TextInput value={String(alert.threshold)} onChange={(v) => setAlert({ ...alert, threshold: Number(v) || 0 })} />
                  </div>
                </Field>
              </div>
              <Field label="Severity">
                <SelectInput
                  value={String(alert.severity)}
                  onChange={(v) => setAlert({ ...alert, severity: Number(v) as 0 })}
                  options={[
                    { value: "0", label: "0 – Critical" },
                    { value: "1", label: "1 – Error" },
                    { value: "2", label: "2 – Warning" },
                    { value: "3", label: "3 – Informational" },
                  ]}
                />
              </Field>
              <Btn
                variant="primary"
                icon={<Bell size={14} />}
                disabled={!alert.name.trim()}
                onClick={() => {
                  const m = svc.metrics[alert.metric];
                  api.addAlert({
                    name: alert.name,
                    resourceId: r.id,
                    metricKey: m.key,
                    metricLabel: m.label,
                    op: alert.op as ">" | "<",
                    threshold: alert.threshold,
                    severity: alert.severity as 0 | 1 | 2 | 3,
                    enabled: true,
                  });
                  setAlert({ ...alert, name: "" });
                }}
              >
                Create alert rule
              </Btn>
              <p className="text-[12px] text-[var(--text-2)] mt-2">
                Alert rules in this simulator are evaluated every few seconds against the generated metric values — watch the bell icon.
              </p>
            </Card>
            <Card title="Alert rules on this resource">
              <DataTable
                cols={[
                  { label: "Name", render: (a: any) => a.name },
                  { label: "Condition", render: (a: any) => `${a.metricLabel} ${a.op} ${a.threshold}` },
                  { label: "Severity", render: (a: any) => `Sev ${a.severity}` },
                  { label: "Fired", render: (a: any) => String(a.firedCount) },
                  {
                    label: "",
                    render: (a: any) => (
                      <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delAlert(a.id)}>
                        Delete
                      </Btn>
                    ),
                  },
                ]}
                rows={rules}
                empty={<div className="text-[var(--text-2)]">No alert rules on this resource yet.</div>}
              />
            </Card>
          </div>
        ) : null}

        {tab === "code" ? <CodeViews r={r} /> : null}

        {tab === "storage" ? <StorageTabs r={r} /> : null}
        {tab === "vnet" ? <VnetTabs r={r} /> : null}
        {tab === "dns" ? <DnsRecords r={r} /> : null}
        {tab === "backup" ? <BackupTabs r={r} /> : null}

        {tab === "iam" ? <ResourceIam r={r} /> : null}

        {tab === "diag" ? <DiagnosticPanel r={r} /> : null}

        {tab === "learn" ? (
          <div className="space-y-3 max-w-2xl">
            <LearnBox items={svc.learn} title={`How ${svc.name} works`} />
            <Card title="Key properties">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {Object.entries(r.props).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-[12.5px] border-b border-[var(--border)] py-1.5">
                    <span className="w-40 text-[var(--text-2)]">{k}</span>
                    <span className="mono break-all">{String(v)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Try it in Cloud Shell">
              <CopyBox value={`az resource show --ids ${r.id} -o json`} />
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { Resource };
