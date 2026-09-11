import { useState } from "react";
import { Trash2, TrendingDown } from "lucide-react";
import { monthlyCost, serviceById } from "../../lib/catalog";
import { costByRg, costByService, totalMonthly, useAzure } from "../../lib/store";
import { BarList, Btn, Card, DataTable, EmptyState, SelectInput, Tabs, money } from "../ui";

export function CostBlade() {
  const { state, api } = useAzure();
  const [tab, setTab] = useState("overview");
  const [group, setGroup] = useState("service");
  const total = totalMonthly(state);
  const daily = total / 30;
  const byService = costByService(state);
  const byRg = costByRg(state);
  const sorted = [...state.resources].sort((a, b) => monthlyCost(b) - monthlyCost(a));

  const regionMap = new Map<string, number>();
  state.resources.forEach((r) => regionMap.set(r.location, (regionMap.get(r.location) ?? 0) + monthlyCost(r)));

  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">Cost Management + Billing</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">Estimated prices based on public Azure list prices. No money is charged — this is a simulation.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-3">
        {[
          { k: "Current month", v: money(total * 0.62), s: "Month to date" },
          { k: "Forecast (30 days)", v: money(total), s: `${state.resources.length} resources` },
          { k: "Daily run rate", v: money(daily), s: "If nothing changes" },
          { k: "Budget", v: money(200), s: total > 200 ? "Over budget" : `${Math.round((total / 200) * 100)}% used` },
        ].map((c) => (
          <div key={c.k} className="border border-[var(--border)] bg-[var(--panel)] p-3 rounded-[2px]">
            <div className="text-[11.5px] text-[var(--text-2)]">{c.k}</div>
            <div className="text-[22px] font-light leading-tight">{c.v}</div>
            <div className="text-[11.5px] text-[var(--text-2)]">{c.s}</div>
          </div>
        ))}
      </div>

      <div className="px-3 pt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Cost analysis" },
            { id: "resources", label: "By resource", count: state.resources.length },
            { id: "savings", label: "Cost optimisation" },
          ]}
        />
      </div>

      <div className="p-3 space-y-3">
        {tab === "overview" ? (
          <>
            <Card
              title="Accumulated cost"
              actions={
                <div className="w-[190px]">
                  <SelectInput
                    value={group}
                    onChange={setGroup}
                    options={[
                      { value: "service", label: "Group by: service" },
                      { value: "rg", label: "Group by: resource group" },
                      { value: "region", label: "Group by: region" },
                    ]}
                  />
                </div>
              }
            >
              {group === "service" ? (
                <BarList items={byService.map((s) => ({ label: s.label, value: s.cost, sub: `${s.count} resource(s)` }))} />
              ) : group === "rg" ? (
                <BarList items={byRg.map((g) => ({ label: g.name, value: g.cost, sub: `${g.count} resource(s)` }))} />
              ) : (
                <BarList items={[...regionMap.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }))} />
              )}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-baseline gap-2">
                <span className="text-[13px] text-[var(--text-2)]">Total</span>
                <span className="text-[20px] font-light">{money(total)}</span>
                <span className="text-[12px] text-[var(--text-2)]">/ month · {money(total * 12)} / year</span>
              </div>
            </Card>
            <Card title="Cost by resource group">
              <DataTable
                cols={[
                  {
                    label: "Resource group",
                    render: (g: any) => (
                      <button className="text-[var(--accent)] hover:underline cursor-pointer" onClick={() => api.open("rg", { name: g.name }, `rg-${g.name}`)}>
                        {g.name}
                      </button>
                    ),
                  },
                  { label: "Resources", align: "right", render: (g: any) => g.count },
                  { label: "Monthly", align: "right", render: (g: any) => money(g.cost) },
                  { label: "Share", align: "right", render: (g: any) => `${total ? Math.round((g.cost / total) * 100) : 0}%` },
                ]}
                rows={byRg}
              />
            </Card>
          </>
        ) : null}

        {tab === "resources" ? (
          <Card title="Resources sorted by cost">
            <DataTable
              cols={[
                {
                  label: "Resource",
                  render: (r: any) => (
                    <button className="flex items-center gap-2 text-[var(--accent)] hover:underline cursor-pointer" onClick={() => api.open("resource", { id: r.id }, `resource-${r.id}`)}>
                      <span>{serviceById(r.service)?.glyph}</span>
                      <span className="font-semibold">{r.name}</span>
                    </button>
                  ),
                },
                { label: "Type", render: (r: any) => serviceById(r.service)?.name ?? "" },
                { label: "Resource group", render: (r: any) => r.rg },
                { label: "Status", render: (r: any) => r.status },
                { label: "Monthly", align: "right", render: (r: any) => money(monthlyCost(r)) },
                {
                  label: "",
                  render: (r: any) => (
                    <Btn variant="toolbar" icon={<Trash2 size={13} />} title="Delete resource" onClick={() => api.deleteResource(r.id)} />
                  ),
                },
              ]}
              rows={sorted}
              empty={<EmptyState title="Nothing to show" body="Create resources to see cost estimates." />}
            />
          </Card>
        ) : null}

        {tab === "savings" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card title="Quick wins in this subscription">
              <ul className="text-[12.5px] space-y-2">
                {state.resources
                  .filter((r) => monthlyCost(r) > 0)
                  .sort((a, b) => monthlyCost(b) - monthlyCost(a))
                  .slice(0, 6)
                  .map((r) => {
                    const save =
                      r.service === "vm" && r.status === "Running"
                        ? "Deallocate it when you are not using it"
                        : r.service === "vm" && r.props.size !== "Standard_B1s"
                        ? "Resize to a smaller / burstable SKU"
                        : r.service === "webapp" && r.props.planTier === "S1"
                        ? "Downgrade to Basic (B1)"
                        : r.service === "sql" && r.props.tier !== "Basic"
                        ? "Move to the Basic 5 DTU tier"
                        : r.service === "cosmos" && !r.props.freeTier
                        ? "Apply the free tier (1000 RU/s)"
                        : "Delete it if it is no longer used";
                    return (
                      <li key={r.id} className="flex items-start gap-2 border-b border-[var(--border)] pb-2">
                        <TrendingDown size={14} className="text-[var(--ok)] mt-0.5" />
                        <span>
                          <b>{r.name}</b> · {money(monthlyCost(r))}/mo — {save}
                        </span>
                      </li>
                    );
                  })}
                {!state.resources.length ? <li className="text-[var(--text-2)]">No resources yet.</li> : null}
              </ul>
            </Card>
            <Card title="Rules the real Azure bill follows">
              <ol className="list-decimal pl-5 text-[12.5px] space-y-2 text-[var(--text-2)]">
                <li>
                  <b className="text-[var(--text)]">Deallocated ≠ stopped.</b> A stopped-but-allocated VM still pays for its memory reservation.
                </li>
                <li>
                  <b className="text-[var(--text)]">Disks and public IPs always bill</b>, even when the VM is off.
                </li>
                <li>
                  <b className="text-[var(--text)]">Use tiers honestly.</b> Free/Basic tiers are for labs; Standard/Premium for production.
                </li>
                <li>
                  <b className="text-[var(--text)]">Tags drive chargeback.</b> Tag every resource with owner + env so cost reports are meaningful.
                </li>
                <li>
                  <b className="text-[var(--text)]">Reserved instances / savings plans</b> cut compute cost by up to 60% for steady workloads.
                </li>
                <li>
                  <b className="text-[var(--text)]">Region matters.</b> The same VM is cheaper in East US than in Switzerland or Japan.
                </li>
              </ol>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
