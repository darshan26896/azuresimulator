import { useState } from "react";
import { Database, FileKey2, FolderPlus, KeyRound, Link2, Plus, RefreshCw, Shield, Trash2, UploadCloud, FileText } from "lucide-react";
import { armTemplate, bicepScript, cliScript, psScript, sasToken, storageKeys, useAzure } from "../../lib/store";
import { regionLabel, serviceById } from "../../lib/catalog";
import { Btn, Card, CopyBox, DataTable, EmptyState, Field, SelectInput, TextInput, Toggle } from "../ui";
import { IamPanel } from "./Identity";
import type { Resource } from "../../lib/types";

/* ------------------------------ code views ----------------------------- */

export function CodeViews({ r }: { r: Resource }) {
  const [view, setView] = useState<"arm" | "bicep" | "cli" | "ps">("bicep");
  const tabs: [typeof view, string][] = [
    ["bicep", "Bicep"],
    ["arm", "ARM (JSON)"],
    ["cli", "Azure CLI"],
    ["ps", "PowerShell"],
  ];
  const code = view === "arm" ? armTemplate(r) : view === "bicep" ? bicepScript(r) : view === "cli" ? cliScript(r) : psScript(r);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(([id, label]) => (
          <Btn key={id} variant={view === id ? "primary" : "toolbar"} onClick={() => setView(id)}>
            {label}
          </Btn>
        ))}
      </div>
      <Card title={view === "arm" ? "ARM template" : view === "bicep" ? "Bicep file (main.bicep)" : view === "cli" ? "Azure CLI command" : "Azure PowerShell command"}>
        <pre className="mono text-[12px] whitespace-pre-wrap bg-[var(--panel-2)] p-2 border border-[var(--border)] max-h-[440px] overflow-auto az-scroll">{code}</pre>
        {view === "bicep" ? (
          <p className="text-[12px] text-[var(--text-2)] mt-2">
            Bicep is Azure's modern deployment language — it compiles to the ARM JSON you see in the next tab. Deploy with{" "}
            <span className="mono">az deployment group create -g {r.rg} --template-file main.bicep</span>.
          </p>
        ) : null}
      </Card>
      <Card title="Resource ID">
        <CopyBox value={r.id} />
      </Card>
    </div>
  );
}

/* ------------------------------ storage -------------------------------- */

export function StorageTabs({ r }: { r: Resource }) {
  const { state, api } = useAzure();
  const [tab, setTab] = useState<"containers" | "shares" | "keys" | "lifecycle">("containers");
  const containers = state.containers.filter((c) => c.storageId === r.id);
  const shares = state.shares.filter((s) => s.storageId === r.id);

  const [cName, setCName] = useState("");
  const [cAccess, setCAccess] = useState(containers[0]?.accessLevel ?? "Private (no anonymous access)");
  const [cErr, setCErr] = useState<string | null>(null);

  const [sName, setSName] = useState("");
  const [sQuota, setSQuota] = useState(10);
  const [sTier, setSTier] = useState<"TransactionOptimized" | "Hot" | "Cool">("TransactionOptimized");
  const [sErr, setSErr] = useState<string | null>(null);

  const [blobName, setBlobName] = useState("");
  const [blobTier, setBlobTier] = useState<"Hot" | "Cool" | "Archive">("Hot");
  const [openContainer, setOpenContainer] = useState<string | null>(null);

  const keys = storageKeys(r.name);
  const [rotate, setRotate] = useState(0);
  const rotated = rotate ? storageKeys(r.name + String(rotate)) : keys;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["containers", `Containers (${containers.length})`],
            ["shares", `File shares (${shares.length})`],
            ["keys", "Access keys"],
            ["lifecycle", "Lifecycle management"],
          ] as [typeof tab, string][]
        ).map(([id, label]) => (
          <Btn key={id} variant={tab === id ? "primary" : "toolbar"} onClick={() => setTab(id)}>
            {label}
          </Btn>
        ))}
      </div>

      {tab === "containers" ? (
        <>
          <Card title="New container">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-[220px]">
                <Field label="Name" error={cErr}>
                  <TextInput value={cName} onChange={(v) => { setCName(v); setCErr(null); }} placeholder="data-archive" mono />
                </Field>
              </div>
              <div className="w-[260px]">
                <Field label="Anonymous access level" help="Private is the secure default — never expose blobs publicly unless required.">
                  <SelectInput
                    value={cAccess}
                    onChange={(v) => setCAccess(v as typeof cAccess)}
                    options={[
                      { value: "Private (no anonymous access)", label: "Private (no anonymous access)" },
                      { value: "Blob (anonymous read access for blobs)", label: "Blob (read blobs anonymously)" },
                      { value: "Container (anonymous read access for containers and blobs)", label: "Container (list + read anonymously)" },
                    ]}
                  />
                </Field>
              </div>
              <Btn
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  const e = api.addContainer({ storageId: r.id, name: cName.trim(), accessLevel: cAccess });
                  if (e) return setCErr(e);
                  setCName("");
                }}
              >
                Create
              </Btn>
            </div>
          </Card>
          <div className="space-y-2">
            {containers.map((c) => (
              <Card key={c.id}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Database size={16} className="text-[var(--accent)]" />
                  <button className="font-semibold text-[var(--accent)] hover:underline cursor-pointer" onClick={() => setOpenContainer(openContainer === c.id ? null : c.id)}>
                    {c.name}
                  </button>
                  <span className="text-[11.5px] text-[var(--text-2)]">{c.accessLevel}</span>
                  <div className="ml-auto flex gap-1.5">
                    <Btn variant="toolbar" icon={<UploadCloud size={13} />} onClick={() => setOpenContainer(c.id)}>
                      Upload blob
                    </Btn>
                    <Btn
                      variant="toolbar"
                      title={c.accessLevel.startsWith("Private") ? "Make public" : "Make private"}
                      onClick={() =>
                        api.setContainerAccess(
                          c.id,
                          c.accessLevel.startsWith("Private")
                            ? "Blob (anonymous read access for blobs)"
                            : "Private (no anonymous access)"
                        )
                      }
                    >
                      {c.accessLevel.startsWith("Private") ? "Make public" : "Make private"}
                    </Btn>
                    <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delContainer(c.id)} />
                  </div>
                </div>
                {openContainer === c.id ? (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <div className="flex flex-wrap items-end gap-2 mb-2">
                      <div className="w-[220px]">
                        <Field label="Blob name">
                          <TextInput value={blobName} onChange={setBlobName} placeholder="uploads/photo.jpg" mono />
                        </Field>
                      </div>
                      <div className="w-[150px]">
                        <Field label="Access tier" help="Hot = frequent, Cool = 30d+, Archive = write-once">
                          <SelectInput value={blobTier} onChange={(v) => setBlobTier(v as typeof blobTier)} options={[
                            { value: "Hot", label: "Hot" },
                            { value: "Cool", label: "Cool" },
                            { value: "Archive", label: "Archive" },
                          ]} />
                        </Field>
                      </div>
                      <Btn
                        variant="primary"
                        disabled={!blobName.trim()}
                        onClick={() => {
                          api.addBlob(c.id, { name: blobName.trim(), sizeKB: Math.round(20 + Math.random() * 2400), tier: blobTier });
                          setBlobName("");
                        }}
                      >
                        Upload (simulated)
                      </Btn>
                    </div>
                    <DataTable
                      cols={[
                        { label: "Name", render: (b: any) => <span className="mono">{b.name}</span> },
                        { label: "Size", render: (b: any) => (b.sizeKB > 1024 ? `${(b.sizeKB / 1024).toFixed(1)} MB` : `${b.sizeKB} KB`) },
                        { label: "Tier", render: (b: any) => b.tier },
                        { label: "Last modified", render: (b: any) => new Date(b.lastModified).toLocaleString() },
                      ]}
                      rows={c.blobs}
                      empty={<div className="text-[12.5px] text-[var(--text-2)] py-2">Empty container — upload your first blob.</div>}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
            {!containers.length ? (
              <EmptyState title="No containers yet" body="Blob containers organise unstructured data: documents, images, backups." icon={<Database size={20} />} />
            ) : null}
          </div>
        </>
      ) : null}

      {tab === "shares" ? (
        <>
          <Card title="New file share">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-[220px]">
                <Field label="Name" error={sErr}>
                  <TextInput value={sName} onChange={(v) => { setSName(v); setSErr(null); }} placeholder="team-files" mono />
                </Field>
              </div>
              <div className="w-[150px]">
                <Field label="Quota (GiB)">
                  <TextInput value={String(sQuota)} onChange={(v) => setSQuota(Number(v) || 10)} />
                </Field>
              </div>
              <div className="w-[200px]">
                <Field label="Tier">
                  <SelectInput value={sTier} onChange={(v) => setSTier(v as typeof sTier)} options={[
                    { value: "TransactionOptimized", label: "TransactionOptimized" },
                    { value: "Hot", label: "Hot" },
                    { value: "Cool", label: "Cool" },
                  ]} />
                </Field>
              </div>
              <Btn
                variant="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  const e = api.addShare({ storageId: r.id, name: sName.trim(), quotaGiB: sQuota, tier: sTier });
                  if (e) return setSErr(e);
                  setSName("");
                }}
              >
                Create
              </Btn>
            </div>
          </Card>
          <DataTable
            cols={[
              { label: "Name", render: (s: any) => <span className="mono">{s.name}</span> },
              { label: "Tier", render: (s: any) => s.tier },
              { label: "Quota", render: (s: any) => `${s.quotaGiB} GiB` },
              { label: "Path", render: (s: any) => <span className="mono text-[12px]">\\{r.name}.file.core.windows.net\{s.name}</span> },
              { label: "", render: (s: any) => <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delShare(s.id)} /> },
            ]}
            rows={shares}
            empty={<EmptyState title="No file shares" body="Mount an Azure Files share from Windows, Linux or macOS." icon={<FolderPlus size={20} />} />}
          />
        </>
      ) : null}

      {tab === "keys" ? (
        <Card title="Access keys">
          <p className="text-[12.5px] text-[var(--text-2)] mb-3">
            Two 512-bit account keys. Key1 is used by apps; rotate to Key2, then regenerate Key1 with no downtime.
          </p>
          <div className="space-y-3">
            {[["key1", rotated.key1], ["key2", rotated.key2]].map(([label, k]) => (
              <div key={label}>
                <div className="text-[12px] font-semibold mb-1">{label === "key1" ? "Key 1 (primary)" : "Key 2 (secondary)"}</div>
                <CopyBox value={k as string} />
              </div>
            ))}
            <div>
              <div className="text-[12px] font-semibold mb-1">Connection string</div>
              <CopyBox value={rotated.conn1} />
            </div>
            <div>
              <div className="text-[12px] font-semibold mb-1">SAS URL (1 hour, read/write)</div>
              <CopyBox value={sasToken(r.name)} />
            </div>
            <div className="flex gap-2">
              <Btn
                variant="primary"
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  setRotate((x) => x + 1);
                  api.toast({ title: "Access key regenerated", body: "Update connection strings in your apps. Old key is now invalid.", kind: "warn" });
                }}
              >
                Regenerate key
              </Btn>
              <Btn
                icon={<KeyRound size={14} />}
                onClick={() =>
                  api.patch(r.id, {
                    props: { ...r.props, publicAccess: !r.props.publicAccess, secureTransfer: r.props.secureTransfer },
                  })
                }
              >
                Toggle "Allow storage account key access"
              </Btn>
            </div>
            <div className="text-[12px] text-[var(--text-2)]">
              Allow storage account key access: <b>{r.props.publicAccess === false ? "disabled" : "enabled"}</b> · Secure transfer (HTTPS):{" "}
              <b>{r.props.secureTransfer ? "required" : "not required"}</b>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "lifecycle" ? (
        <Card title="Lifecycle management">
          <p className="text-[12.5px] text-[var(--text-2)] mb-3">
            Move blobs to cheaper tiers or delete them automatically based on age — the single biggest storage cost lever.
          </p>
          <div className="space-y-2 text-[13px]">
            <LifecycleRule
              r={r}
              name="Default rule: cool after 30 days"
              summary="Base blobs → Cool after 30 days, → Archive after 90 days, delete after 365 days."
              defaultOn
            />
            <LifecycleRule r={r} name="Snapshots: delete after 90 days" summary="Delete blob snapshots older than 90 days." />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function LifecycleRule({ r, name, summary, defaultOn: def }: { r: Resource; name: string; summary: string; defaultOn?: boolean }) {
  const { api } = useAzure();
  const on = (r.props.lifecycle as Record<string, boolean> | undefined)?.[name] ?? !!def;
  return (
    <div className="flex items-center gap-3 border border-[var(--border)] p-2.5">
      <Toggle value={on} onChange={(v) => api.patch(r.id, { props: { ...r.props, lifecycle: { ...(r.props.lifecycle as object), [name]: v } } })} />
      <div>
        <div className="font-semibold">{name}</div>
        <div className="text-[12px] text-[var(--text-2)]">{summary}</div>
      </div>
      <span className={`ml-auto text-[11.5px] ${on ? "text-[var(--ok)]" : "text-[var(--text-2)]"}`}>{on ? "Enabled" : "Disabled"}</span>
    </div>
  );
}

/* ------------------------------- vnet ---------------------------------- */

export function VnetTabs({ r }: { r: Resource }) {
  const { state, api } = useAzure();
  const [tab, setTab] = useState<"subnets" | "peerings">("subnets");
  const [sName, setSName] = useState("");
  const [sCidr, setSCidr] = useState("");
  const [sErr, setSErr] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pPeer, setPPeer] = useState("");
  const [pErr, setPErr] = useState<string | null>(null);
  const [fwd, setFwd] = useState(true);

  const subnets = (r.props.subnets as { name: string; cidr: string }[] | undefined) ?? [
    { name: r.props.subnetName ?? "default", cidr: r.props.subnetCidr ?? "" },
  ];
  const peerings = state.peerings.filter((p) => p.vnetId === r.id);
  const otherVnets = state.resources.filter((x) => x.service === "vnet" && x.id !== r.id);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Btn variant={tab === "subnets" ? "primary" : "toolbar"} onClick={() => setTab("subnets")}>
          Subnets ({subnets.length})
        </Btn>
        <Btn variant={tab === "peerings" ? "primary" : "toolbar"} onClick={() => setTab("peerings")}>
          Peerings ({peerings.length})
        </Btn>
      </div>

      {tab === "subnets" ? (
        <>
          <Card title="Add subnet">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-[200px]">
                <Field label="Name">
                  <TextInput value={sName} onChange={(v) => { setSName(v); setSErr(null); }} placeholder="app-subnet" mono />
                </Field>
              </div>
              <div className="w-[200px]">
                <Field label="Address range (CIDR)" error={sErr}>
                  <TextInput value={sCidr} onChange={(v) => { setSCidr(v); setSErr(null); }} placeholder="10.0.1.0/24" mono />
                </Field>
              </div>
              <Btn
                variant="primary"
                icon={<Plus size={14} />}
                disabled={!sName || !sCidr}
                onClick={() => {
                  const e = api.addSubnet(r.id, { name: sName.trim(), cidr: sCidr.trim() });
                  if (e) return setSErr(e);
                  setSName("");
                  setSCidr("");
                  api.toast({ title: "Subnet created", body: `${sName} (${sCidr}) was added to ${r.name}.`, kind: "success" });
                }}
              >
                Save
              </Btn>
            </div>
          </Card>
          <DataTable
            cols={[
              { label: "Name", render: (s: any) => <span className="mono">{s.name}</span> },
              { label: "Address range", render: (s: any) => <span className="mono">{s.cidr}</span> },
              { label: "Available IPs", render: (s: any) => ipsInCidr(s.cidr) },
              { label: "NICs", align: "right", render: () => 0 },
              { label: "NSG", render: () => "None" },
            ]}
            rows={subnets}
          />
          <p className="text-[12px] text-[var(--text-2)]">
            Azure reserves 5 addresses in every subnet (network, broadcast, 3 for Azure services). Peering needs non-overlapping address spaces.
          </p>
        </>
      ) : null}

      {tab === "peerings" ? (
        <>
          <Card title="Add peering">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-[200px]">
                <Field label="Peering name">
                  <TextInput value={pName} onChange={(v) => { setPName(v); setPErr(null); }} placeholder="peer-to-hub" mono />
                </Field>
              </div>
              <div className="w-[260px]">
                <Field label="Remote virtual network" error={pErr}>
                  <SelectInput
                    value={pPeer}
                    onChange={(v) => { setPPeer(v); setPErr(null); }}
                    options={[
                      { value: "", label: "— select a VNet —", disabled: true },
                      ...otherVnets.map((v) => ({ value: v.id, label: `${v.name} (${v.props.cidr})` })),
                    ]}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Toggle value={fwd} onChange={setFwd} />
                <span className="text-[12.5px]">Allow forwarded traffic</span>
              </div>
              <Btn
                variant="primary"
                icon={<Link2 size={14} />}
                disabled={!pName || !pPeer}
                onClick={() => {
                  const e = api.addPeering(r.id, pName.trim(), pPeer, fwd);
                  if (e) return setPErr(e);
                  setPName("");
                  setPPeer("");
                  api.toast({ title: "Peering connected", body: "Both sides of the peering were created.", kind: "success" });
                }}
              >
                Add
              </Btn>
            </div>
          </Card>
          <DataTable
            cols={[
              { label: "Name", render: (p: any) => p.name },
              {
                label: "Remote VNet",
                render: (p: any) => state.resources.find((x) => x.id === p.peerVnetId)?.name ?? "—",
              },
              { label: "Status", render: (p: any) => <span className="text-[var(--ok)]">{p.status}</span> },
              { label: "Forwarded traffic", render: (p: any) => (p.allowForwarded ? "Allowed" : "Blocked") },
              { label: "", render: (p: any) => <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delPeering(p.id)} /> },
            ]}
            rows={peerings}
            empty={<EmptyState title="No peerings" body="Connect two VNets so workloads in both can talk using private IPs." icon={<Link2 size={20} />} />}
          />
        </>
      ) : null}
    </div>
  );
}

function ipsInCidr(cidr: string) {
  const bits = Number(cidr?.split("/")[1] ?? 24);
  if (!bits) return "—";
  return Math.max(0, 2 ** (32 - bits) - 5);
}

/* -------------------------------- DNS ---------------------------------- */

export function DnsRecords({ r }: { r: Resource }) {
  const records = (r.props.records as { type: string; name: string; value: string; ttl: number }[] | undefined) ?? [
    { type: r.props.recordType ?? "A", name: r.props.recordName ?? "www", value: r.props.recordValue ?? "10.10.1.4", ttl: r.props.ttl ?? 3600 },
  ];
  return (
    <div className="space-y-3">
      <Card title={`Zone ${r.name}`}>
        <div className="text-[12.5px] text-[var(--text-2)] mb-2">
          At your registrar, delegate the domain to these name servers:
        </div>
        <div className="space-y-1.5 mono text-[12px]">
          {["ns1-09.azure-dns.com", "ns2-09.azure-dns.net", "ns3-09.azure-dns.org", "ns4-09.azure-dns.info"].map((n) => (
            <CopyBox key={n} value={n} />
          ))}
        </div>
      </Card>
      <Card title="Record sets">
        <DataTable
          cols={[
            { label: "Name", render: (x: any) => <span className="mono">{x.name}</span> },
            { label: "Type", render: (x: any) => x.type },
            { label: "Value", render: (x: any) => <span className="mono">{x.value}</span> },
            { label: "TTL", align: "right", render: (x: any) => `${x.ttl}s` },
          ]}
          rows={records}
        />
      </Card>
    </div>
  );
}

/* ------------------------------- backup -------------------------------- */

export function BackupTabs({ r }: { r: Resource }) {
  const { state, api } = useAzure();
  const items = (r.props.protectedItems as { vmName: string; policy: string; lastBackup: number }[] | undefined) ?? [];
  const vms = state.resources.filter((x) => x.service === "vm");
  const [pick, setPick] = useState(vms[0]?.id ?? "");
  const [restore, setRestore] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Card title="Protected items">
        <DataTable
          cols={[
            {
              label: "Virtual machine",
              render: (x: any) => (
                <button className="text-[var(--accent)] hover:underline cursor-pointer" onClick={() => {
                  const vm = state.resources.find((v) => v.name === x.vmName);
                  if (vm) api.open("resource", { id: vm.id }, `resource-${vm.id}`);
                }}>
                  {x.vmName}
                </button>
              ),
            },
            { label: "Backup policy", render: (x: any) => x.policy },
            { label: "Last backup", render: (x: any) => new Date(x.lastBackup).toLocaleString() },
            {
              label: "Restore point",
              render: (x: any) => (
                <Btn
                  variant="toolbar"
                  icon={restore === x.vmName ? <Shield size={13} /> : <RefreshCw size={13} />}
                  onClick={() => {
                    setRestore(x.vmName);
                    api.toast({ title: `Restore point created for ${x.vmName}`, body: "A simulated recovery point is available in the vault.", kind: "success" });
                  }}
                >
                  {restore === x.vmName ? "Restore point ✓" : "Create restore point"}
                </Btn>
              ),
            },
          ]}
          rows={items}
          empty={<div className="text-[12.5px] text-[var(--text-2)] py-2">No protected items — enable backup on a VM to fill this vault.</div>}
        />
        {vms.length ? (
          <div className="flex flex-wrap items-end gap-2 mt-3 border-t border-[var(--border)] pt-3">
            <div className="w-[260px]">
              <Field label="Add a VM to this vault">
                <SelectInput value={pick} onChange={setPick} options={vms.map((v) => ({ value: v.id, label: v.name }))} />
              </Field>
            </div>
            <Btn variant="primary" icon={<Plus size={14} />} disabled={!pick} onClick={() => api.enableBackup(r.id, pick)}>
              Enable backup
            </Btn>
          </div>
        ) : (
          <div className="text-[12.5px] text-[var(--text-2)] mt-2">Create a virtual machine first, then protect it here.</div>
        )}
      </Card>
    </div>
  );
}

export function VmBackupPanel({ r }: { r: Resource }) {
  const { state, api } = useAzure();
  const vaults = state.resources.filter((x) => x.service === "backup");
  const protectedBy = vaults.find((v) => ((v.props.protectedItems as { vmName: string }[] | undefined) ?? []).some((i) => i.vmName === r.name));
  return (
    <Card title="Backup">
      {protectedBy ? (
        <div>
          <div className="text-[12.5px] text-[var(--ok)] mb-1">✓ This VM is protected by {protectedBy.name} (DailyPolicy).</div>
          <div className="text-[12px] text-[var(--text-2)]">
            Daily recovery point at 02:00 UTC · 30-day retention · {protectedBy.props.redundancy === "GeoRedundant" ? "GRS storage" : "LRS storage"}
          </div>
        </div>
      ) : vaults.length ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[280px]">
            <Field label="Recovery Services vault" help="Backups are stored in a vault, not on the VM.">
              <SelectInput value={vaults[0].id} onChange={() => {}} options={vaults.map((v) => ({ value: v.id, label: `${v.name} (${v.rg})` }))} />
            </Field>
          </div>
          <Btn variant="primary" icon={<Plus size={14} />} onClick={() => api.enableBackup(vaults[0].id, r.id)}>
            Enable backup
          </Btn>
        </div>
      ) : (
        <div className="text-[12.5px] text-[var(--text-2)]">
          No Recovery Services vault yet. Create one first: Marketplace → Recovery Services vault (Lab 17).
        </div>
      )}
    </Card>
  );
}

/* ------------------------------ IAM / diag ----------------------------- */

export function ResourceIam({ r }: { r: Resource }) {
  return <IamPanel scope="resource" scopeName={r.id} title={`Access control (IAM) — ${r.name}`} />;
}

export function DiagnosticPanel({ r }: { r: Resource }) {
  const { state, api } = useAzure();
  const workspaces = state.resources.filter((x) => x.service === "log");
  const enabled = !!(r.props.diagnosticSettings as { enabled?: boolean } | undefined)?.enabled;
  const wsId = (r.props.diagnosticSettings as { workspaceId?: string } | undefined)?.workspaceId;
  const ws = workspaces.find((w) => w.id === wsId);
  const [pick, setPick] = useState(wsId ?? workspaces[0]?.id ?? "");
  return (
    <Card title="Diagnostic settings">
      <p className="text-[12.5px] text-[var(--text-2)] mb-3">
        Send platform logs and metrics to a Log Analytics workspace so you can query them with KQL.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[300px]">
          <Field label="Destination workspace">
            <SelectInput
              value={pick}
              onChange={setPick}
              options={
                workspaces.length
                  ? workspaces.map((w) => ({ value: w.id, label: `${w.name} (${regionLabel(w.location)})` }))
                  : [{ value: "", label: "No workspace — create one first" }]
              }
            />
          </Field>
        </div>
        <Btn
          variant="primary"
          disabled={!pick}
          onClick={() => {
            const diag = { enabled: true, workspaceId: pick };
            api.patch(r.id, { props: { ...r.props, diagnosticSettings: diag } });
            api.toast({ title: "Diagnostic setting created", body: `${r.name} → ${state.resources.find((w) => w.id === pick)?.name}`, kind: "success" });
          }}
        >
          {enabled ? "Update" : "Enable"}
        </Btn>
        {enabled ? (
          <Btn
            variant="danger"
            onClick={() => {
              const { diagnosticSettings: _d, ...rest } = r.props;
              void _d;
              api.patch(r.id, { props: rest });
              api.toast({ title: "Diagnostic setting deleted", body: `${r.name} will no longer send logs.`, kind: "warn" });
            }}
          >
            Disable
          </Btn>
        ) : null}
      </div>
      <div className="text-[12.5px] mt-3">
        {enabled ? (
          <span className="text-[var(--ok)]">
            ✓ Sending allLogs + allMetrics to <b>{ws?.name ?? "workspace"}</b>
          </span>
        ) : (
          <span className="text-[var(--text-2)]">
            No diagnostic setting. In real Azure, <span className="mono">AzureActivity</span> and resource logs only exist once you enable this.
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--text-2)]">
        <FileText size={14} />
        {serviceById(r.service)?.name} platform logs: {enabled ? "streaming" : "not configured"}
      </div>
    </Card>
  );
}

export { FileKey2 };
