import { useState } from "react";
import { Bell, Filter, Search, Trash2 } from "lucide-react";
import { metricSeries, serviceById } from "../../lib/catalog";
import { useAzure } from "../../lib/store";
import { AreaChart, Btn, Card, DataTable, EmptyState, SelectInput, StatusDot, Tabs } from "../ui";

export function MonitorBlade() {
  const { state, api } = useAzure();
  const [tab, setTab] = useState("overview");
  const [sel, setSel] = useState(state.resources[0]?.id ?? "");

  const targets = state.resources.filter((r) => (serviceById(r.service)?.metrics.length ?? 0) > 0).slice(0, 4);
  const chosen = state.resources.find((r) => r.id === sel) ?? targets[0];

  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">Monitor</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">A single place to see metrics, activity and alerts across every resource in the subscription.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "metrics", label: "Metrics" },
          { id: "activity", label: "Activity log", count: state.activity.length },
          { id: "alerts", label: "Alerts", count: state.alertRules.length },
        ]}
      />
      <div className="p-3 space-y-3">
        {tab === "overview" ? (
          <>
            <Card title="Platform metrics (top 4 resources by primary metric)">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {targets.map((r) => {
                  const m = serviceById(r.service)!.metrics[0];
                  return (
                    <div key={r.id}>
                      <button className="text-[13px] font-semibold text-[var(--accent)] hover:underline cursor-pointer mb-1" onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}>
                        {r.name}
                      </button>
                      <AreaChart points={metricSeries(r, m, 24, 2000)} unit={m.unit} height={110} />
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="Service health (simulated)">
              <DataTable
                cols={[
                  { label: "Region", render: (x: any) => x.region },
                  { label: "Service", render: (x: any) => x.service },
                  { label: "Status", render: (x: any) => <StatusDot status={x.status} /> },
                  { label: "Note", render: (x: any) => x.note },
                ]}
                rows={[
                  { region: "East US", service: "Virtual Machines", status: "Succeeded", note: "No events" },
                  { region: "West Europe", service: "Azure SQL Database", status: "Succeeded", note: "No events" },
                  { region: "Global", service: "Azure DevOps", status: "Updating", note: "Planned maintenance 02:00 UTC" },
                ]}
              />
            </Card>
          </>
        ) : null}

        {tab === "metrics" ? (
          <Card title="Metrics explorer">
            <div className="w-[280px] mb-3">
              <SelectInput
                value={chosen?.id ?? ""}
                onChange={setSel}
                options={state.resources.map((r) => ({ value: r.id, label: `${r.name} (${serviceById(r.service)?.name})` }))}
              />
            </div>
            {chosen ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {serviceById(chosen.service)!.metrics.map((m) => (
                  <div key={m.key}>
                    <div className="text-[13px] font-semibold mb-1">{m.label}</div>
                    <AreaChart points={metricSeries(chosen, m, 24, 2000)} unit={m.unit} height={120} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No resources to monitor" />
            )}
          </Card>
        ) : null}

        {tab === "activity" ? <ActivityTable /> : null}

        {tab === "alerts" ? <AlertsTable /> : null}
      </div>
    </div>
  );
}

export function ActivityBlade() {
  return (
    <div className="p-3">
      <h2 className="text-[18px] font-semibold mb-0.5">Activity log</h2>
      <p className="text-[12.5px] text-[var(--text-2)] mb-3">
        Every create, update, delete and control-plane operation in the subscription, with caller and status.
      </p>
      <ActivityTable />
    </div>
  );
}

function ActivityTable() {
  const { state, api } = useAzure();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = state.activity.filter(
    (a) => (status === "all" || a.status === status) && (!q || (a.operation + (a.resource ?? "") + (a.rg ?? "")).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <Card>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1.5 h-8 px-2 border border-[var(--border-2)] bg-[var(--panel)] rounded-[2px] w-[220px]">
          <Search size={14} className="text-[var(--text-2)]" />
          <input className="bg-transparent outline-none w-full text-[13px]" placeholder="Search operations" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-[180px]">
          <SelectInput
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All statuses" },
              { value: "Succeeded", label: "Succeeded" },
              { value: "Started", label: "Started" },
              { value: "Failed", label: "Failed" },
            ]}
          />
        </div>
        <Btn icon={<Filter size={14} />} onClick={() => api.toast({ title: "Activity log", body: "Retention is 90 days in a real workspace.", kind: "info" })}>
          Add filter
        </Btn>
      </div>
      <DataTable
        cols={[
          { label: "Time", render: (a: any) => new Date(a.ts).toLocaleString() },
          { label: "Operation", render: (a: any) => a.operation },
          {
            label: "Resource",
            render: (a: any) => (a.resource ? <span className="text-[var(--accent)]">{a.resource}</span> : "—"),
          },
          { label: "Resource group", render: (a: any) => a.rg ?? "—" },
          { label: "Status", render: (a: any) => <StatusDot status={a.status} /> },
          { label: "Caller", render: (a: any) => <span className="mono">{a.caller}</span> },
        ]}
        rows={rows}
        empty={<EmptyState title="No activity yet" body="Create or delete something and it will show up here." />}
      />
    </Card>
  );
}

export function AlertsBlade() {
  return (
    <div className="p-3">
      <h2 className="text-[18px] font-semibold mb-0.5">Alerts</h2>
      <p className="text-[12.5px] text-[var(--text-2)] mb-3">
        Alert rules fire when a metric crosses a threshold. Create them from any resource blade (Alerts tab).
      </p>
      <AlertsTable />
    </div>
  );
}

function AlertsTable() {
  const { state, api } = useAzure();
  return (
    <Card>
      <DataTable
        cols={[
          { label: "Severity", render: (a: any) => `Sev ${a.severity}` },
          { label: "Rule", render: (a: any) => a.name },
          {
            label: "Resource",
            render: (a: any) => {
              const r = state.resources.find((x) => x.id === a.resourceId);
              return r ? (
                <button className="text-[var(--accent)] hover:underline cursor-pointer" onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}>
                  {r.name}
                </button>
              ) : (
                "—"
              );
            },
          },
          { label: "Condition", render: (a: any) => `${a.metricLabel} ${a.op} ${a.threshold}` },
          { label: "Times fired", render: (a: any) => String(a.firedCount) },
          { label: "Last fired", render: (a: any) => (a.firedAt ? new Date(a.firedAt).toLocaleTimeString() : "—") },
          {
            label: "",
            render: (a: any) => (
              <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delAlert(a.id)}>
                Delete
              </Btn>
            ),
          },
        ]}
        rows={state.alertRules}
        empty={
          <EmptyState
            title="No alert rules"
            body="Open a resource → Alerts tab → New alert rule to create one."
            icon={<Bell size={20} />}
          />
        }
      />
    </Card>
  );
}
