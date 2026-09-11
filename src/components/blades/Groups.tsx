import { useMemo, useState } from "react";
import { Filter, Layers, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useAzure, validateRgName } from "../../lib/store";
import { REGIONS, regionLabel, serviceById, monthlyCost } from "../../lib/catalog";
import { Btn, Card, DataTable, EmptyState, Essentials, Field, SelectInput, Tabs, TagsEditor, TextInput, ServiceIcon, StatusDot, money } from "../ui";
import { IamPanel } from "./Identity";

/* --------------------------- resource groups --------------------------- */

export function ResourceGroupsBlade() {
  const { state, api } = useAzure();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [loc, setLoc] = useState("eastus");
  const [tags, setTags] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    const e = api.createRG(name.trim(), loc, tags);
    if (e) return setErr(e);
    setErr(null);
    setName("");
    setTags({});
    setCreating(false);
    api.open("rg", { name: name.trim() }, `rg-${name.trim()}`);
  };

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => setCreating((v) => !v)}>
          Create
        </Btn>
        <Btn icon={<RefreshCw size={14} />} onClick={() => api.toast({ title: "Refreshed", body: "Resource groups are up to date.", kind: "info" })}>
          Refresh
        </Btn>
        <span className="ml-auto text-[12px] text-[var(--text-2)]">{state.rgs.length} resource groups</span>
      </div>

      {creating ? (
        <Card title="Create resource group" className="mb-3">
          <div className="grid grid-cols-2 gap-x-4">
            <Field
              label="Resource group name"
              required
              error={name ? validateRgName(name, state.rgs.map((r) => r.name)) ?? err : err}
              help="Use a convention like rg-<project>-<environment>."
            >
              <TextInput value={name} onChange={(v) => { setName(v); setErr(null); }} placeholder="rg-my-project" invalid={!!err} />
            </Field>
            <Field label="Region" help="The region where metadata about your resources is stored.">
              <SelectInput value={loc} onChange={setLoc} options={REGIONS.map((r) => ({ value: r.value, label: `${r.label} (${r.value})` }))} />
            </Field>
          </div>
          <Field label="Tags">
            <TagsEditor tags={tags} onChange={setTags} />
          </Field>
          <div className="flex gap-2 justify-end">
            <Btn onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={submit} disabled={!name.trim()}>
              Review + create
            </Btn>
          </div>
        </Card>
      ) : null}

      <DataTable
        cols={[
          {
            label: "Name",
            render: (g: any) => (
              <button className="text-[var(--accent)] hover:underline cursor-pointer font-semibold text-left" onClick={() => api.open("rg", { name: g.name }, `rg-${g.name}`)}>
                {g.name}
              </button>
            ),
          },
          { label: "Location", render: (g: any) => regionLabel(g.location) },
          { label: "Resources", align: "right", render: (g: any) => state.resources.filter((r) => r.rg === g.name).length },
          {
            label: "Estimated cost",
            align: "right",
            render: (g: any) => money(state.resources.filter((r) => r.rg === g.name).reduce((s, r) => s + monthlyCost(r), 0)) + " /mo",
          },
          { label: "Tags", render: (g: any) => Object.entries(g.tags).map(([k, v]) => `${k}:${v}`).join(", ") || "—" },
          { label: "Status", render: () => <StatusDot status="Succeeded" /> },
        ]}
        rows={state.rgs}
        empty={
          <EmptyState
            title="No resource groups yet"
            body="A resource group is a container that holds related resources. Create your first one to start deploying."
            icon={<Layers size={22} />}
            action={<Btn variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>Create resource group</Btn>}
          />
        }
      />
      <p className="text-[12px] text-[var(--text-2)] mt-3">
        Tip: real Azure names resource groups like <span className="mono">rg-&lt;app&gt;-&lt;env&gt;</span>, e.g. <span className="mono">rg-billing-prod</span>.
      </p>
    </div>
  );
}

/* ----------------------------- one RG blade ---------------------------- */

export function ResourceGroupBlade({ name }: { name: string }) {
  const { state, api } = useAzure();
  const [tab, setTab] = useState("overview");
  const [tags, setTags] = useState<Record<string, string>>(() => state.rgs.find((g) => g.name === name)?.tags ?? {});
  const rg = state.rgs.find((g) => g.name === name);
  const items = state.resources.filter((r) => r.rg === name);
  const deployments = state.activity.filter((a) => a.rg === name).slice(0, 12);
  const [confirm, setConfirm] = useState("");

  if (!rg)
    return (
      <div className="p-4">
        <EmptyState title="Resource group not found" body="It may have been deleted. Open the Resource groups blade to see the current list." />
      </div>
    );

  return (
    <div>
      <div className="p-3 border-b border-[var(--border)]">
        <div className="flex gap-2 flex-wrap">
          <Btn variant="primary" icon={<Plus size={14} />} onClick={() => api.open("marketplace", { rg: name }, "marketplace")}>
            Create resources
          </Btn>
          <Btn icon={<RefreshCw size={14} />} onClick={() => api.toast({ title: "Refreshed", kind: "info" })}>Refresh</Btn>
          <Btn icon={<Trash2 size={14} />} variant="danger" onClick={() => setTab("delete")}>Delete resource group</Btn>
        </div>
      </div>

      <div className="p-3">
        <Essentials
          items={[
            { label: "Resource group", value: rg.name, mono: true },
            { label: "Location", value: regionLabel(rg.location) },
            { label: "Subscription", value: state.subscriptions[0].name },
            { label: "Created", value: new Date(rg.createdAt).toLocaleString() },
            { label: "Resource count", value: String(items.length) },
            { label: "Estimated monthly cost", value: money(items.reduce((s, r) => s + monthlyCost(r), 0)) },
          ]}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview", count: items.length },
          { id: "deployments", label: "Deployments", count: deployments.length },
          { id: "tags", label: "Tags" },
          { id: "iam", label: "Access control (IAM)" },
          { id: "delete", label: "Delete" },
        ]}
      />

      <div className="p-3">
        {tab === "overview" ? (
          items.length ? (
            <DataTable
              cols={[
                {
                  label: "Name",
                  render: (r: any) => (
                    <button className="flex items-center gap-2 text-[var(--accent)] hover:underline cursor-pointer" onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}>
                      <ServiceIcon service={r.service} size={20} />
                      <span className="font-semibold">{r.name}</span>
                    </button>
                  ),
                },
                { label: "Type", render: (r: any) => serviceById(r.service)?.name ?? r.resourceType },
                { label: "Location", render: (r: any) => regionLabel(r.location) },
                { label: "Status", render: (r: any) => <StatusDot status={r.status} /> },
                { label: "Cost / month", align: "right", render: (r: any) => money(monthlyCost(r)) },
              ]}
              rows={items}
            />
          ) : (
            <EmptyState title="This resource group is empty" body="Create a resource and it will appear here." action={<Btn variant="primary" onClick={() => api.open("marketplace", { rg: name }, "marketplace")}>Create resources</Btn>} />
          )
        ) : null}

        {tab === "deployments" ? (
          <div className="space-y-3">
            {state.deployments
              .filter((d) => d.rg === name)
              .map((d) => (
                <Card key={d.id} title={`Deployment: ${d.name}`}>
                  {d.steps.map((s, i) => (
                    <div key={i} className="text-[12.5px] py-0.5">
                      {s.status === "succeeded" ? "✓" : s.status === "running" ? "…" : "○"} {s.name}
                    </div>
                  ))}
                </Card>
              ))}
            <DataTable
              cols={[
                { label: "Operation", render: (a: any) => a.operation },
                { label: "Resource", render: (a: any) => a.resource ?? "—" },
                { label: "Status", render: (a: any) => <StatusDot status={a.status} /> },
                { label: "Time", render: (a: any) => new Date(a.ts).toLocaleTimeString() },
              ]}
              rows={deployments}
              empty={<EmptyState title="No deployments yet" body="Deployment history for this resource group will appear here." />}
            />
          </div>
        ) : null}

        {tab === "tags" ? (
          <div className="max-w-md">
            <p className="text-[12.5px] text-[var(--text-2)] mb-3">
              Tags applied to a resource group are not inherited by its resources — you must tag each resource separately (a very common exam question!).
            </p>
            <TagsEditor
              tags={tags}
              onChange={(t) => {
                setTags(t);
                api.patchRg(rg.name, { tags: t });
              }}
            />
            <div className="mt-2 text-[12px] text-[var(--text-2)]">
              Current group tags: {Object.entries(rg.tags).map(([k, v]) => `${k}:${v}`).join(", ") || "none"}
            </div>
            <div className="mt-3 flex gap-2">
              <Btn
                variant="primary"
                onClick={() => api.toast({ title: "Tags applied", body: `${Object.keys(tags).length} tag(s) saved to ${rg.name}.`, kind: "success" })}
                disabled={!Object.keys(tags).length}
              >
                Apply tags
              </Btn>
              <Btn
                onClick={() => {
                  setTags({});
                  api.patchRg(rg.name, { tags: {} });
                }}
              >
                Discard
              </Btn>
            </div>
          </div>
        ) : null}

        {tab === "iam" ? <IamPanel scope="rg" scopeName={rg.name} title={`Access control (IAM) — ${rg.name}`} /> : null}

        {tab === "delete" ? (
          <div className="max-w-lg">
            <p className="mb-2">
              Deleting resource group <b>{rg.name}</b> will delete all {items.length} resource(s) inside it. This cannot be undone.
            </p>
            <ul className="text-[12.5px] text-[var(--text-2)] list-disc pl-5 mb-3">
              {items.map((r) => (
                <li key={r.id}>
                  {r.name} · {serviceById(r.service)?.name}
                </li>
              ))}
            </ul>
            <Field label={`Type the resource group name to confirm`}>
              <TextInput value={confirm} onChange={setConfirm} placeholder={rg.name} />
            </Field>
            <Btn
              variant="danger"
              disabled={confirm !== rg.name}
              icon={<Trash2 size={14} />}
              onClick={() => {
                api.deleteRG(rg.name);
                api.open("rgs");
              }}
            >
              Delete
            </Btn>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------- all resources --------------------------- */

export function AllResourcesBlade() {
  const { state, api } = useAzure();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [rg, setRg] = useState("all");
  const [group, setGroup] = useState("none");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.resources.filter(
      (r) =>
        (!t || (r.name + r.resourceType + (serviceById(r.service)?.name ?? "")).toLowerCase().includes(t)) &&
        (type === "all" || r.service === type) &&
        (rg === "all" || r.rg === rg)
    );
  }, [state.resources, q, type, rg]);

  const groups = useMemo(() => {
    if (group === "type") {
      const m = new Map<string, typeof rows>();
      rows.forEach((r) => {
        const k = serviceById(r.service)?.name ?? r.resourceType;
        m.set(k, [...(m.get(k) ?? []), r]);
      });
      return [...m.entries()];
    }
    if (group === "rg") {
      const m = new Map<string, typeof rows>();
      rows.forEach((r) => m.set(r.rg, [...(m.get(r.rg) ?? []), r]));
      return [...m.entries()];
    }
    return [["", rows] as [string, typeof rows]];
  }, [rows, group]);

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="w-[200px]">
          <div className="flex items-center gap-1.5 h-8 px-2 border border-[var(--border-2)] bg-[var(--panel)] rounded-[2px]">
            <Search size={14} className="text-[var(--text-2)]" />
            <input className="bg-transparent outline-none w-full text-[13px]" placeholder="Filter by name..." value={q} onChange={(e) => setQ(e.target.value)} />
            {q ? <button onClick={() => setQ("")} className="cursor-pointer"><X size={13} /></button> : null}
          </div>
        </div>
        <div className="w-[210px]">
          <SelectInput
            value={type}
            onChange={setType}
            options={[{ value: "all", label: "All types" }, ...[...new Set(state.resources.map((r) => r.service))].map((s) => ({ value: s, label: serviceById(s)?.name ?? s }))]}
          />
        </div>
        <div className="w-[190px]">
          <SelectInput value={rg} onChange={setRg} options={[{ value: "all", label: "All resource groups" }, ...state.rgs.map((g) => ({ value: g.name, label: g.name }))]} />
        </div>
        <div className="w-[160px]">
          <SelectInput
            value={group}
            onChange={setGroup}
            options={[
              { value: "none", label: "Group by: none" },
              { value: "type", label: "Group by: type" },
              { value: "rg", label: "Group by: resource group" },
            ]}
          />
        </div>
        <Btn icon={<Filter size={14} />} onClick={() => api.toast({ title: "Filters", body: "Filtering is simulated — use the dropdowns above.", kind: "info" })}>
          Add filter
        </Btn>
        <span className="ml-auto text-[12px] text-[var(--text-2)]">{rows.length} of {state.resources.length} shown</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No resources match your filters"
          body="Try clearing the search box, or create a new resource."
          action={<Btn variant="primary" onClick={() => api.open("marketplace")}>Create a resource</Btn>}
        />
      ) : (
        groups.map(([label, list]) => (
          <div key={label} className="mb-4">
            {label ? (
              <div className="text-[12px] uppercase tracking-wide text-[var(--text-2)] mb-1 border-b border-[var(--border)] pb-1">
                {label} ({list.length})
              </div>
            ) : null}
            <DataTable
              cols={[
                {
                  label: "Name",
                  render: (r: any) => (
                    <button className="flex items-center gap-2 text-[var(--accent)] hover:underline cursor-pointer" onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}>
                      <ServiceIcon service={r.service} size={20} />
                      <span className="font-semibold">{r.name}</span>
                    </button>
                  ),
                },
                { label: "Type", render: (r: any) => <span className="text-[var(--text-2)]">{serviceById(r.service)?.name ?? r.resourceType}</span> },
                { label: "Resource group", render: (r: any) => r.rg },
                { label: "Location", render: (r: any) => regionLabel(r.location) },
                { label: "Status", render: (r: any) => <StatusDot status={r.status} /> },
                { label: "Cost / month", align: "right", render: (r: any) => money(monthlyCost(r)) },
              ]}
              rows={list}
            />
          </div>
        ))
      )}
    </div>
  );
}
