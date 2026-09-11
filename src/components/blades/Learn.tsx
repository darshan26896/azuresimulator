import { useEffect, useState } from "react";
import { Check, ChevronDown, Download, RotateCcw, Sun, Moon } from "lucide-react";
import { LABS, labById } from "../../lib/labs";
import { useAzure } from "../../lib/store";
import { NAV } from "../Shell";
import { Btn, Card, CopyBox, Tabs } from "../ui";

/* -------------------------------- labs --------------------------------- */

export function LabsBlade({ lab: labId }: { lab?: string }) {
  const { state, api } = useAzure();
  const [open, setOpen] = useState<string | null>(labId ?? null);
  const [hints, setHints] = useState<Record<string, boolean>>({});

  const active = open ? labById(open) : null;

  /* auto-verify the steps of the lab that is open */
  useEffect(() => {
    if (!active) return;
    active.steps.forEach((_s, i) => {
      const prefixComplete = active.steps.slice(0, i + 1).every((x) => (x.check ? x.check(state) : false));
      if (prefixComplete && (state.labProgress[active.id] ?? 0) < i + 1) api.completeLabStep(active.id, i);
    });
  }, [active, state, api]);

  return (
    <div className="p-3 space-y-3">
      <div>
        <h2 className="text-[18px] font-semibold mb-0.5">Practice labs</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">
          Guided exercises that verify themselves against your simulated subscription. Complete them in any order.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {LABS.map((l) => {
          const p = state.labProgress[l.id] ?? 0;
          const isDone = p >= l.steps.length;
          return (
            <div key={l.id} className="border border-[var(--border)] bg-[var(--panel)] rounded-[2px]">
              <button className="w-full text-left p-3 flex items-start gap-3 cursor-pointer hover:bg-[var(--hover)]" onClick={() => setOpen(open === l.id ? null : l.id)}>
                <span
                  className="h-6 w-6 shrink-0 grid place-items-center rounded-full text-[12px] font-semibold"
                  style={{ background: isDone ? "var(--ok)" : "var(--panel-3)", color: isDone ? "#fff" : "var(--text-2)" }}
                >
                  {isDone ? "✓" : p}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-[13.5px]">{l.title}</span>
                  <span className="block text-[12px] text-[var(--text-2)]">
                    {l.level} · {l.minutes} min · {l.goal}
                  </span>
                </span>
                <ChevronDown size={16} className={`mt-1 transition-transform ${open === l.id ? "rotate-180" : ""}`} />
              </button>
              {open === l.id ? (
                <div className="px-3 pb-3">
                  <div className="h-1.5 bg-[var(--panel-3)] rounded-[1px] overflow-hidden mb-3">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${(p / l.steps.length) * 100}%` }} />
                  </div>
                  <ol className="space-y-2">
                    {l.steps.map((s, i) => {
                      const ok = i < p;
                      return (
                        <li key={i} className="flex gap-2 items-start text-[12.5px]">
                          <span
                            className="h-5 w-5 shrink-0 grid place-items-center rounded-full border text-[11px]"
                            style={{
                              borderColor: ok ? "var(--ok)" : "var(--border-2)",
                              color: ok ? "var(--ok)" : "var(--text-2)",
                              background: ok ? "rgba(16,124,16,.12)" : "transparent",
                            }}
                          >
                            {ok ? "✓" : i + 1}
                          </span>
                          <span className="flex-1">
                            <span className={ok ? "text-[var(--text-2)] line-through" : ""}>{s.text}</span>
                            {!ok ? (
                              <>
                                <button className="ml-2 text-[11.5px] text-[var(--accent)] hover:underline cursor-pointer" onClick={() => setHints((h) => ({ ...h, [`${l.id}-${i}`]: !h[`${l.id}-${i}`] }))}>
                                  {hints[`${l.id}-${i}`] ? "hide hint" : "hint"}
                                </button>
                                {hints[`${l.id}-${i}`] ? <span className="block text-[12px] text-[var(--text-2)] italic mt-0.5">{s.hint}</span> : null}
                                {!s.check ? (
                                  <span className="block mt-1.5">
                                    <Btn variant="toolbar" onClick={() => api.completeLabStep(l.id, i)}>
                                      Mark complete
                                    </Btn>
                                  </span>
                                ) : (
                                  <span className="block text-[11px] text-[var(--text-2)] mt-1 italic">auto-verified</span>
                                )}
                              </>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  {p === 0 ? <div className="mt-3 text-[12px] text-[var(--text-2)]">Follow step 1 — steps marked “auto-verified” check themselves, others have a Mark complete button.</div> : null}
                  {p >= l.steps.length ? <div className="mt-3 text-[12.5px] text-[var(--ok)] font-semibold">Lab complete! 🎉</div> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- help --------------------------------- */

export function HelpBlade() {
  return (
    <div className="p-3 space-y-3 max-w-3xl">
      <h2 className="text-[18px] font-semibold mb-0.5">Help + support</h2>
      <Card title="How this simulator works">
        <div className="text-[12.5px] space-y-2">
          <p>
            This is a <b>100% offline</b> clone of the Microsoft Azure portal. Nothing is sent anywhere, no subscription is required and no resources are billed —
            every blade, wizard, metric and CLI command is simulated locally in your browser. Your work is saved in <span className="mono">localStorage</span>.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-2)]">
            <li>Blades open from the left, exactly like the real portal — click one to bring it back to the front.</li>
            <li>Creation wizards validate names the same way Azure does (storage accounts: 3–24 lowercase letters/digits, no hyphens).</li>
            <li>
              26 services are covered: VMs, VM scale sets, availability sets, storage (blobs + files + lifecycle), App Service, Functions, Container Instances,
              Container Apps, AKS, ACR, SQL, Cosmos, PostgreSQL, Redis, Key Vault, Recovery Services vaults, VNets (+ subnets/peerings), NSGs, load balancers,
              DNS, public IPs, Log Analytics, Service Bus, AI services and more.
            </li>
            <li>
              Microsoft Entra ID (users + groups), Azure RBAC (role assignments at subscription / resource-group / resource scope) and Azure Policy
              (definitions, assignments, live compliance) are fully simulated.
            </li>
            <li>Every resource shows its Bicep, ARM template, Azure CLI and Azure PowerShell definitions.</li>
            <li>Metrics, the activity log, deployments and alert rules all behave like the real thing, but with generated data.</li>
            <li>Cloud Shell understands 40+ real <span className="mono">az</span> commands — see the CLI cheat sheet.</li>
          </ul>
        </div>
      </Card>
      <Card title="Suggested learning path">
        <ol className="list-decimal pl-5 text-[12.5px] space-y-1">
          <li>Start with <b>Lab 01</b> (Entra ID identities) and <b>Lab 03</b> (resource groups, four ways).</li>
          <li>Then <b>Lab 04–06</b>: storage redundancy, blob/file access, and your first VM.</li>
          <li>Explore any resource blade: metrics, activity log, Bicep/CLI/PS and diagnostic settings.</li>
          <li>Governance week: <b>Lab 02a</b> (RBAC), <b>Lab 02b</b> (Policy), then <b>Lab 11</b> (load balancing, DNS, peering).</li>
          <li>Finish with <b>Lab 17</b> (backup) and <b>Lab 18</b> (monitoring) — operations skills that matter in every job.</li>
        </ol>
      </Card>
      <Card title="Keyboard shortcuts">
        <div className="grid grid-cols-2 gap-2 text-[12.5px]">
          <span className="mono">Ctrl / ⌘ + K</span> <span>Portal search</span>
          <span className="mono">Esc</span> <span>Close search / shell panel</span>
          <span className="mono">↑ / ↓</span> <span>Cloud Shell command history</span>
        </div>
      </Card>
      <Card title="What is different from real Azure">
        <ul className="list-disc pl-5 text-[12.5px] text-[var(--text-2)] space-y-1">
          <li>No real network, so “Browse” and “SSH” show the command instead of opening a session.</li>
          <li>The service list is a curated subset of ~20 of the most-used Azure services.</li>
          <li>RBAC, policies and budgets are simplified to keep the focus on core concepts.</li>
          <li>Prices are static list-price estimates, not live metering.</li>
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------ cheat sheet ---------------------------- */

const CHEATS: { group: string; rows: [string, string][] }[] = [
  {
    group: "Accounts & groups",
    rows: [
      ["az login", "Sign in (simulated)"],
      ["az account show", "Show the active subscription"],
      ["az account list -o table", "List subscriptions"],
      ["az group create -n rg-demo -l eastus", "Create a resource group"],
      ["az group list -o table", "List resource groups"],
      ["az group delete -n rg-demo --yes", "Delete a resource group and everything in it"],
    ],
  },
  {
    group: "Virtual machines",
    rows: [
      ["az vm create -g rg-demo -n vm01 --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys", "Create a Linux VM"],
      ["az vm list -o table", "List VMs"],
      ["az vm show -g rg-demo -n vm01", "VM details"],
      ["az vm deallocate -g rg-demo -n vm01", "Stop billing for compute"],
      ["az vm start -g rg-demo -n vm01", "Start it again"],
      ["az vm delete -g rg-demo -n vm01 --yes", "Delete the VM"],
    ],
  },
  {
    group: "Storage & networking",
    rows: [
      ["az storage account create -g rg-demo -n mystorage01 --sku Standard_LRS", "Create a storage account"],
      ["az storage account list -o table", "List storage accounts"],
      ["az network vnet create -g rg-demo -n vnet01 --address-prefix 10.20.0.0/16", "Create a virtual network"],
      ["az network nsg create -g rg-demo -n nsg01", "Create a network security group"],
      ["az network public-ip create -g rg-demo -n pip01", "Create a public IP"],
    ],
  },
  {
    group: "Web, data and containers",
    rows: [
      ["az webapp create -g rg-demo -n myapp --plan F1 --runtime \"NODE:20-lts\"", "Create a web app"],
      ["az functionapp create -g rg-demo -n myfunc --storage-account mystorage01", "Create a function app"],
      ["az sql db create -g rg-demo -n mydb --server mysqlsrv --service-objective Basic", "Create a SQL database"],
      ["az cosmosdb create -g rg-demo -n mycosmos", "Create a Cosmos DB account"],
      ["az keyvault create -g rg-demo -n myvault --enable-rbac-authorization", "Create a key vault"],
      ["az aks create -g rg-demo -n mycluster --node-count 2", "Create an AKS cluster"],
      ["az acr create -g rg-demo -n myregistry --sku Basic", "Create a container registry"],
    ],
  },
  {
    group: "Monitoring & cost",
    rows: [
      ["az resource list -o table", "Everything in the subscription"],
      ["az monitor metrics list --resource vm01 -o table", "Metric values for a resource"],
      ["az monitor activity-log list -o table", "Recent activity log"],
      ["az consumption usage list -o table", "Estimated cost per resource"],
    ],
  },
];

export function CheatSheetBlade() {
  const [tab, setTab] = useState("cli");
  const { state, api } = useAzure();
  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">Cheat sheet</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">Everything you can type into the simulated Cloud Shell, plus the concepts behind it.</p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "cli", label: "Azure CLI" },
          { id: "ps", label: "Azure PowerShell" },
          { id: "bicep", label: "Bicep" },
          { id: "concepts", label: "Core concepts" },
          { id: "naming", label: "Naming rules" },
        ]}
      />
      <div className="p-3 space-y-3">
        {tab === "cli" ? (
          <>
            {CHEATS.map((c) => (
              <Card key={c.group} title={c.group}>
                <div className="space-y-2">
                  {c.rows.map(([cmd, desc]) => (
                    <div key={cmd}>
                      <div className="text-[12px] text-[var(--text-2)] mb-0.5">{desc}</div>
                      <CopyBox value={cmd} />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <Card title="Try them now">
              <Btn variant="primary" onClick={() => api.open("home")}>
                Open Cloud Shell from the top bar ( &gt;_ )
              </Btn>
            </Card>
          </>
        ) : null}

        {tab === "ps" ? (
          <>
            <Card title="Azure PowerShell — same operations, different syntax">
              <div className="space-y-2">
                {[
                  ["Connect-AzAccount", "Sign in (simulated)"],
                  ["Get-AzResourceGroup | ft", "List resource groups"],
                  ["New-AzResourceGroup -Name rg-demo -Location eastus", "Create a resource group"],
                  ["Remove-AzResourceGroup -Name rg-demo -Force", "Delete a resource group"],
                  ["Get-AzResource | ft Name, ResourceType", "List resources"],
                  ["New-AzVm -ResourceGroupName rg-demo -Name vm01 -ImageName Ubuntu2204", "Create a VM"],
                  ["Stop-AzVM -ResourceGroupName rg-demo -Name vm01 -Force", "Stop a VM"],
                  ["New-AzStorageAccount -ResourceGroupName rg-demo -Name stg123 -SkuName Standard_LRS", "Create a storage account"],
                  ["New-AzVirtualNetwork -ResourceGroupName rg-demo -Name vnet01 -AddressPrefix 10.0.0.0/16", "Create a VNet"],
                ].map(([cmd, desc]) => (
                  <div key={cmd}>
                    <div className="text-[12px] text-[var(--text-2)] mb-0.5">{desc}</div>
                    <CopyBox value={cmd} />
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[var(--text-2)] mt-3">
                Every resource in this simulator also shows its exact PowerShell command: open a resource → Bicep + CLI → PowerShell.
              </p>
            </Card>
            <Card title="Install the module (real world)">
              <pre className="mono text-[12px] bg-[var(--panel-2)] p-2 border border-[var(--border)]">{"Install-Module -Name Az -Scope CurrentUser -Force\nConnect-AzAccount\nGet-AzContext"}</pre>
            </Card>
          </>
        ) : null}

        {tab === "bicep" ? (
          <>
            <Card title="Why Bicep">
              <ul className="list-disc pl-5 text-[12.5px] text-[var(--text-2)] space-y-1.5">
                <li>Bicep is a domain-specific language for declaring Azure resources — it compiles to ARM JSON templates.</li>
                <li>Declarative, repeatable deployments: <span className="mono">az deployment group create -g rg-demo --template-file main.bicep</span></li>
                <li>Open any resource blade → Bicep + CLI tab to see the exact Bicep for that resource.</li>
              </ul>
            </Card>
            <Card title="Minimal Bicep example">
              <pre className="mono text-[12px] bg-[var(--panel-2)] p-2 border border-[var(--border)]">{`param location string = 'eastus'

resource stg 'Microsoft.Storage/storageAccounts@2024-01-01' = {
  name: 'myuniquename123'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}`}</pre>
            </Card>
            <Card title="Deploy it">
              <CopyBox value="az deployment group create -g rg-demo --template-file main.bicep" />
            </Card>
          </>
        ) : null}

        {tab === "concepts" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              ["Subscription", "The billing and security boundary. Everything you create belongs to one."],
              ["Resource group", "A logical container for related resources; you deploy, manage and delete them together."],
              ["Resource provider", "The service that offers resource types, e.g. Microsoft.Compute/virtualMachines."],
              ["ARM / Bicep", "Declarative JSON / template language Azure uses to deploy resources. See the JSON tab of any resource."],
              ["Region & availability zone", "A region is a set of datacenters; zones are separate power/network domains inside a region."],
              ["IaaS / PaaS / SaaS", "VM = IaaS, App Service/SQL = PaaS, Office 365 = SaaS. Less responsibility as you move right."],
              ["Deallocate vs stop", "Stop keeps the hardware reserved (you pay); deallocate releases it (you pay only for disks/IP)."],
              ["Managed identity", "An identity for your app to call Azure resources without storing credentials."],
              ["RBAC", "Role assignments: who can do what on which scope (subscription → RG → resource)."],
              ["Tags", "Name/value pairs for billing, automation and policy."],
            ].map(([t, d]) => (
              <div key={t} className="border border-[var(--border)] p-3 rounded-[2px]">
                <div className="font-semibold text-[13px] mb-1">{t}</div>
                <div className="text-[12.5px] text-[var(--text-2)]">{d}</div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "naming" ? (
          <Card title="Azure naming rules worth memorising">
            <div className="space-y-2 text-[12.5px]">
              {[
                ["Storage account", "3–24 chars, lowercase letters and numbers only, globally unique"],
                ["Key vault", "3–24 chars, letters/digits/hyphens, globally unique"],
                ["Container registry", "5–50 alphanumeric chars, globally unique"],
                ["Windows VM", "1–15 chars; Linux VM 1–64"],
                ["Web app", "Globally unique — becomes <name>.azurewebsites.net"],
                ["SQL server", "Lowercase, globally unique — becomes <name>.database.windows.net"],
                ["Resource group", "Up to 90 chars, letters/digits/._- and )"],
                ["Public IP / VNet", "Almost anything, but keep it lowercase-kebab for automation"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 border-b border-[var(--border)] pb-2">
                  <span className="w-40 font-semibold">{k}</span>
                  <span className="text-[var(--text-2)]">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="text-[12px] text-[var(--text-2)]">
          You currently have {state.cliHistory.length} commands in your shell history.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- settings ------------------------------ */

export function SettingsBlade() {
  const { state, api } = useAzure();
  const download = () => {
    const blob = new Blob([JSON.stringify({ resources: state.resources, rgs: state.rgs, labProgress: state.labProgress }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "azure-sim-state.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="p-3 space-y-3 max-w-2xl">
      <h2 className="text-[18px] font-semibold mb-0.5">Settings</h2>
      <Card title="Appearance">
        <div className="flex gap-2">
          <Btn variant={state.theme === "light" ? "primary" : "secondary"} icon={<Sun size={14} />} onClick={() => api.setTheme("light")}>
            Light
          </Btn>
          <Btn variant={state.theme === "dark" ? "primary" : "secondary"} icon={<Moon size={14} />} onClick={() => api.setTheme("dark")}>
            Dark
          </Btn>
        </div>
      </Card>
      <Card title="Favourites in the sidebar">
        <div className="flex flex-wrap gap-2">
          {Object.entries(NAV)
            .filter(([k]) => k !== "home" && k !== "settings")
            .map(([k, v]) => (
              <button
                key={k}
                onClick={() => api.toggleFav(k)}
                className="inline-flex items-center gap-1.5 border px-2 py-1 rounded-[2px] text-[12.5px] cursor-pointer"
                style={{
                  borderColor: state.favorites.includes(k) ? "var(--accent)" : "var(--border-2)",
                  background: state.favorites.includes(k) ? "var(--selected)" : "transparent",
                }}
              >
                <v.icon size={13} />
                {v.label}
                {state.favorites.includes(k) ? <Check size={12} /> : null}
              </button>
            ))}
        </div>
      </Card>
      <Card title="Data">
        <div className="flex flex-wrap gap-2">
          <Btn icon={<Download size={14} />} onClick={download}>
            Export my resources
          </Btn>
          <Btn variant="danger" icon={<RotateCcw size={14} />} onClick={() => api.reset()}>
            Reset to the default demo data
          </Btn>
        </div>
        <p className="text-[12px] text-[var(--text-2)] mt-2">
          Everything is stored in your browser only — clearing site data returns the simulator to its initial state.
        </p>
      </Card>
    </div>
  );
}
