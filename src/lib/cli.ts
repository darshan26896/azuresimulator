import type { Resource, State } from "./types";
import { idOf, type Api } from "./store";
import { monthlyCost, publicIpFor, regionLabel, serviceById } from "./catalog";
import { POLICY_DEFS, roleName } from "./governance";

const ROLE_IDS: Record<string, string> = {
  owner: "8e3af657-a8ff-443c-a75c-2fe8c4bcb635",
  contributor: "b24988ac-6180-42a0-ab88-20f7382dd24c",
  reader: "acdd72a7-3385-48ef-bd42-f606fba81ae7",
};

/* ----------------------------- arg parsing ----------------------------- */

interface Parsed {
  pos: string[];
  flags: Record<string, string | boolean>;
}

function parse(cmd: string): Parsed {
  const tokens = cmd.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const pos: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-")) {
      const eq = t.indexOf("=");
      if (eq > 0) {
        flags[t.slice(0, eq)] = t.slice(eq + 1).replace(/^["']|["']$/g, "");
        continue;
      }
      const next = tokens[i + 1];
      if (next && !next.startsWith("-")) {
        flags[t] = next.replace(/^["']|["']$/g, "");
        i++;
      } else flags[t] = true;
    } else pos.push(t.replace(/^["']|["']$/g, ""));
  }
  return { pos, flags };
}

const val = (p: Parsed, ...names: string[]) => {
  for (const n of names) {
    const v = p.flags[n];
    if (typeof v === "string") return v;
  }
  return undefined;
};
const isSet = (p: Parsed, ...names: string[]) => names.some((n) => n in p.flags);

/* ------------------------------ formatting ----------------------------- */

const J = (o: unknown) => JSON.stringify(o, null, 2).split("\n");

function table(cols: string[], rows: (string | number)[][]): string[] {
  const all = [cols, ...rows.map((r) => r.map((c) => String(c)))];
  const w = cols.map((_, i) => Math.max(...all.map((r) => r[i]?.length ?? 0)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(w[i], " ")).join("  ").trimEnd();
  return [line(cols), w.map((x) => "-".repeat(x)).join("  "), ...rows.map((r) => line(r.map((c) => String(c))))];
}

function tsv(cols: string[], rows: (string | number)[][]): string[] {
  return [cols.join("\t"), ...rows.map((r) => r.join("\t"))];
}

function out(p: Parsed, cols: string[], rows: (string | number)[][], obj: unknown): string[] {
  const mode = val(p, "-o", "--output") ?? "json";
  if (mode === "table") return table(cols, rows);
  if (mode === "tsv") return tsv(cols, rows);
  if (mode === "none") return [];
  return J(obj);
}

const WELCOME = [
  "Azure Cloud Shell (simulated) — bash + Azure CLI 2.63.0",
  "",
  "This shell is 100% offline. It understands the az commands listed below.",
  "Tip: add `-o table` to any list command for a readable table.",
  "",
  "  az account show | az account list",
  "  az group create -n <name> -l <region>      az group list -o table",
  "  az group delete -n <name> --yes",
  "  az resource list [-g <rg>] -o table",
  "  az vm create -g <rg> -n <vm> --image Ubuntu2204 --size Standard_B1s --generate-ssh-keys",
  "  az vm list -o table | az vm show -g <rg> -n <vm> | az vm deallocate -g <rg> -n <vm>",
  "  az storage account create -g <rg> -n <name> --sku Standard_LRS",
  "  az network vnet create -g <rg> -n <vnet> --address-prefix 10.20.0.0/16",
  "  az network nsg create -g <rg> -n <nsg>     az network public-ip create -g <rg> -n <ip>",
  "  az webapp create -g <rg> -n <app> --plan F1 --runtime \"NODE:20-lts\"",
  "  az functionapp create -g <rg> -n <app> --storage-account <storage>",
  "  az sql db create -g <rg> -n <db> --server <server> --service-objective Basic",
  "  az cosmosdb create -g <rg> -n <account>",
  "  az keyvault create -g <rg> -n <vault> --enable-rbac-authorization",
  "  az aks create -g <rg> -n <cluster> --node-count 2 --node-vm-size Standard_D2s_v5",
  "  az acr create -g <rg> -n <registry> --sku Basic | az redis create -g <rg> -n <cache>",
  "  az postgres flexible-server create -g <rg> -n <server> --admin-user pgadmin",
  "  az monitor metrics list --resource <name> -o table",
  "  az monitor activity-log list -o table",
  "  az consumption usage list -o table      (cost by resource)",
  "",
  "  Identity + governance:",
  "  az ad user create --display-name \"P. Raman\" --user-principal-name priya@azsim.onmicrosoft.com",
  "  az role assignment create --assignee <upn> --role Reader --scope /subscriptions/<id>",
  "  az policy assignment create --policy \"Allowed locations\" -n loc-policy",
  "",
  "  More services:",
  "  az vmss create -g <rg> -n <name> --instance-count 2",
  "  az container create -g <rg> -n <name> --image nginx:latest",
  "  az containerapp create -g <rg> -n <name> --image nginx:latest",
  "  az vm availability-set create -g <rg> -n <avset>",
  "  az network dns zone create -g <rg> -n contoso.com",
  "  az storage container create --account-name <name> -n data",
  "  az network vnet subnet create -g <rg> --vnet-name <vnet> -n app --address-prefix 10.0.1.0/24",
  "",
  "  az find <keyword>                      (search commands)",
  "",
  "Non-az helpers: clear, pwd, whoami, date, echo, help",
];

const HELP = WELCOME;

/* ------------------------------- helpers ------------------------------- */

interface Ctx {
  state: State;
  api: Api;
}

const rgLocation = (s: State, rg?: string) => s.rgs.find((g) => g.name === rg)?.location ?? "eastus";

function ensureRg(ctx: Ctx, rg?: string): string | null {
  if (!rg) return "ERROR: --resource-group / -g is required. Example: az vm list -g rg-practice";
  if (!ctx.state.rgs.some((g) => g.name === rg))
    return `ERROR: Resource group '${rg}' could not be found. Create it with: az group create -n ${rg} -l eastus`;
  return null;
}

function findRes(s: State, name: string, svc?: string) {
  return s.resources.find((r) => r.name === name && (!svc || r.service === svc));
}

function summary(r: Resource) {
  const svc = serviceById(r.service)!;
  return {
    id: r.id,
    name: r.name,
    type: r.resourceType,
    resourceGroup: r.rg,
    location: r.location,
    provisioningState: r.status,
    tags: r.tags,
    properties: r.props,
    estimatedMonthlyCostUsd: monthlyCost(r),
    _service: svc.name,
  };
}

const RES_COLS = ["Name", "ResourceGroup", "Type", "Location", "Status"];
const resRow = (r: Resource) => [r.name, r.rg, r.service, r.location, r.status];

function create(ctx: Ctx, serviceId: string, name: string, rg: string, props: Record<string, any>, tags?: Record<string, string>): string[] | null {
  const err = ctx.api.createResource({ service: serviceId, name, rg, location: rgLocation(ctx.state, rg), props, tags });
  if (err) return [`ERROR: ${err}`];
  return null;
}

/* -------------------------------- runner ------------------------------- */

export function runCli(input: string, ctx: Ctx): string[] {
  const { state, api } = ctx;
  const raw = input.trim();
  if (!raw) return [];

  if (/^help$/i.test(raw)) return HELP;
  if (raw === "clear") return ["__CLEAR__"];
  if (raw === "pwd") return ["/home/azureuser"];
  if (raw === "whoami") return ["azureuser@azsim"];
  if (raw === "date") return [new Date().toString()];
  if (raw.startsWith("echo ")) return [raw.slice(5).replace(/^["']|["']$/g, "")];
  if (raw.startsWith("kubectl"))
    return [
      "To connect to a cluster, first run: az aks get-credentials -g <rg> -n <cluster>",
      "kubectl is not installed in this simulated shell.",
    ];
  if (!raw.startsWith("az "))
    return [`bash: ${raw.split(" ")[0]}: command not found`, "Type `help` for the list of supported commands."];

  const p = parse(raw.slice(3));
  const [group, cmd, ...rest] = p.pos;
  const rg = val(p, "-g", "--resource-group", "--group");
  const name = val(p, "-n", "--name") ?? rest[0];

  switch (`${group ?? ""} ${cmd ?? ""}`.trim()) {
    /* ---------------------------- account ---------------------------- */
    case "login":
      return [
        "[",
        '  {',
        '    "cloudName": "AzureCloud",',
        '    "id": "9f2c1a44-6d8e-4f30-9a1b-7c5e2f8a1100",',
        '    "name": "Azure SIM – Learning Subscription",',
        '    "state": "Enabled",',
        '    "user": { "name": "student@azsim.onmicrosoft.com", "type": "user" }',
        "  }",
        "]",
        "You are already signed in (offline simulation).",
      ];
    case "logout":
      return ["Logging out of Azure Cloud Shell (simulation).", "Run `az login` to sign back in."];
    case "version":
      return [
        "azure-cli                         2.63.0",
        "",
        "core                              2.63.0",
        "telemetry                          1.1.0",
        "",
        "Extensions:",
        "aks-preview                       0.5.171",
        "",
        "Python (Linux) 3.11.8",
        "",
        "Legal docs and information: aka.ms/AzureCliLegal",
        "(offline simulation — no network calls are made)",
      ];
    case "account show":
      return J({
        environmentName: "AzureCloud",
        id: state.currentSubscription,
        name: state.subscriptions[0]?.name,
        state: "Enabled",
        tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
        user: { name: "student@azsim.onmicrosoft.com", type: "user" },
      });
    case "account list":
      return out(p, ["Name", "CloudName", "State", "IsDefault"], [[state.subscriptions[0].name, "AzureCloud", "Enabled", "true"]], state.subscriptions);
    case "account set":
      return ["Subscription set to Azure SIM – Learning Subscription."];
    case "find": {
      const q = (rest[0] ?? "").toLowerCase();
      const hits = [
        "vm create", "vm list", "vm deallocate", "vm show",
        "group create", "group list", "group delete",
        "storage account create", "network vnet create", "webapp create",
        "aks create", "keyvault create", "cosmosdb create", "sql db create",
      ].filter((c) => c.includes(q));
      return hits.length ? [`Commands matching "${q}":`, ...hits.map((h) => `  az ${h}`)] : [`No commands found for "${q}".`];
    }

    /* ---------------------------- groups ----------------------------- */
    case "group create": {
      const n = name;
      const loc = val(p, "-l", "--location") ?? "eastus";
      if (!n) return ["ERROR: --name / -n is required"];
      const err = api.createRG(n, loc, {});
      if (err) return [`ERROR: ${err}`];
      return out(p, ["Name", "Location", "Status"], [[n, loc, "Succeeded"]], {
        id: `/subscriptions/${state.currentSubscription}/resourceGroups/${n}`,
        location: loc,
        name: n,
        properties: { provisioningState: "Succeeded" },
      });
    }
    case "group list":
      return out(
        p,
        ["Name", "Location", "Status"],
        state.rgs.map((g) => [g.name, g.location, "Succeeded"]),
        state.rgs.map((g) => ({ id: `/subscriptions/${state.currentSubscription}/resourceGroups/${g.name}`, location: g.location, name: g.name, tags: g.tags, properties: { provisioningState: "Succeeded" } }))
      );
    case "group show": {
      const e = ensureRg(ctx, rg ?? name);
      if (e) return [e];
      const g = state.rgs.find((x) => x.name === (rg ?? name))!;
      return J({
        id: `/subscriptions/${state.currentSubscription}/resourceGroups/${g.name}`,
        location: g.location,
        name: g.name,
        tags: g.tags,
        properties: { provisioningState: "Succeeded" },
      });
    }
    case "group delete": {
      const target = rg ?? name;
      const e = ensureRg(ctx, target);
      if (e) return [e];
      if (!isSet(p, "--yes", "-y"))
        return [`Are you sure you want to delete resource group '${target}'? Re-run the command with --yes to confirm.`];
      api.deleteRG(target);
      return [];
    }

    /* --------------------------- resources --------------------------- */
    case "resource list": {
      const list = rg ? state.resources.filter((r) => r.rg === rg) : state.resources;
      if (rg) {
        const e = ensureRg(ctx, rg);
        if (e) return [e];
      }
      return out(p, RES_COLS, list.map(resRow), list.map(summary));
    }
    case "resource show": {
      const r = state.resources.find((x) => x.id === val(p, "--ids") || x.name === name);
      return r ? J(summary(r)) : [`ERROR: Resource '${name ?? "?"}' was not found.`];
    }

    /* ------------------------------- vm ------------------------------ */
    case "vm create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      if (!name) return ["ERROR: --name / -n is required"];
      const props = {
        image: val(p, "--image") ?? "Ubuntu2204",
        size: val(p, "--size", "--vm-size") ?? "Standard_B2s",
        adminUsername: val(p, "--admin-username", "-u") ?? "azureuser",
        authType: isSet(p, "--generate-ssh-keys") || !val(p, "--admin-password") ? "ssh" : "password",
        password: val(p, "--admin-password") ?? "",
        diskType: val(p, "--os-disk-type") ?? "StandardSSD_LRS",
        vnet: val(p, "--vnet-name") ?? "__new__",
        publicIp: val(p, "--public-ip-address") === "" ? "none" : "ssh",
        acceleratedNetworking: false,
        bootDiagnostics: true,
        backup: false,
        autoShutdown: false,
      };
      const err = create(ctx, "vm", name, rg!, props);
      if (err) return err;
      const id = idOf(rg!, "Microsoft.Compute/virtualMachines", name);
      const fake = { id, name, service: "vm", resourceType: "Microsoft.Compute/virtualMachines", rg: rg!, location: rgLocation(state, rg), props, tags: {}, createdAt: Date.now(), status: "Running" as const };
      return out(p, ["Name", "ResourceGroup", "PublicIpAddress", "PrivateIpAddress"], [[name, rg!, publicIpFor(fake as any), "10.0.0.5"]], {
        fqdn: `${name}.${regionLabel(fake.location).replace(/[^a-z]/gi, "").toLowerCase()}.cloudapp.azure.com`,
        id,
        location: fake.location,
        name,
        powerState: "VM running",
        privateIpAddress: "10.0.0.5",
        publicIpAddress: publicIpFor(fake as any),
        resourceGroup: rg,
        zones: "",
      });
    }
    case "vm list": {
      if (rg) {
        const e = ensureRg(ctx, rg);
        if (e) return [e];
      }
      const vms = state.resources.filter((r) => r.service === "vm" && (!rg || r.rg === rg));
      return out(p, ["Name", "ResourceGroup", "Location", "Size", "PowerState"], vms.map((r) => [r.name, r.rg, r.location, r.props.size, r.status]), vms.map(summary));
    }
    case "vm show": {
      const r = findRes(state, name ?? "", "vm");
      if (!r) return [`ERROR: The VM '${name}' could not be found.`];
      return J(summary(r));
    }
    case "vm start":
    case "vm stop":
    case "vm restart":
    case "vm deallocate": {
      const r = findRes(state, name ?? "", "vm");
      if (!r) return [`ERROR: The VM '${name}' could not be found.`];
      api.act(r.id, cmd === "restart" ? "restart" : cmd === "vm start" ? "start" : cmd === "vm restart" ? "restart" : cmd!);
      return [`VM '${r.name}' → ${cmd === "start" ? "starting" : cmd === "restart" ? "restarting" : cmd === "stop" ? "stopping" : "deallocating"} (operation accepted)`];
    }
    case "vm delete": {
      const r = findRes(state, name ?? "", "vm");
      if (!r) return [`ERROR: The VM '${name}' could not be found.`];
      if (!isSet(p, "--yes", "-y")) return ["Re-run with --yes to confirm deletion."];
      api.deleteResource(r.id);
      return [];
    }

    /* ---------------------------- storage ---------------------------- */
    case "storage account create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      if (!name) return ["ERROR: --name / -n is required"];
      const props = {
        sku: val(p, "--sku", "-s") ?? "Standard_LRS",
        accessTier: val(p, "--access-tier") ?? "Hot",
        hns: isSet(p, "--enable-hierarchical-namespace"),
        publicAccess: false,
        secureTransfer: true,
        versioning: false,
      };
      const err = create(ctx, "storage", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "Sku", "Location"], [[name, props.sku, rgLocation(state, rg)]], { creationTime: new Date().toISOString(), id: idOf(rg!, "Microsoft.Storage/storageAccounts", name), location: rgLocation(state, rg), name, sku: props.sku, primaryEndpoints: { blob: `https://${name}.blob.core.windows.net/` } });
    }
    case "storage account list": {
      const list = state.resources.filter((r) => r.service === "storage");
      return out(p, ["Name", "ResourceGroup", "Sku", "Location"], list.map((r) => [r.name, r.rg, r.props.sku, r.location]), list.map(summary));
    }
    case "storage account show": {
      const r = findRes(state, name ?? "", "storage");
      if (!r) return [`ERROR: The storage account '${name}' could not be found.`];
      return J({ ...summary(r), primaryEndpoints: { blob: `https://${r.name}.blob.core.windows.net/`, file: `https://${r.name}.file.core.windows.net/`, queue: `https://${r.name}.queue.core.windows.net/`, table: `https://${r.name}.table.core.windows.net/` } });
    }
    case "storage account delete": {
      const r = findRes(state, name ?? "", "storage");
      if (!r) return [`ERROR: The storage account '${name}' could not be found.`];
      if (!isSet(p, "--yes", "-y")) return ["Re-run with --yes to confirm deletion."];
      api.deleteResource(r.id);
      return [];
    }

    /* --------------------------- networking -------------------------- */
    case "network vnet create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        cidr: val(p, "--address-prefix") ?? "10.0.0.0/16",
        subnetName: val(p, "--subnet-name") ?? "default",
        subnetCidr: val(p, "--subnet-prefix") ?? "10.0.0.0/24",
        ddos: false,
        firewall: false,
        bastion: false,
      };
      const err = create(ctx, "vnet", name ?? "vnet-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Prefix"], [[name, rg!, props.cidr]], { newVNet: { name, addressSpace: { addressPrefixes: [props.cidr] } }, subnet: { name: props.subnetName, addressPrefix: props.subnetCidr } });
    }
    case "network vnet list": {
      const list = state.resources.filter((r) => r.service === "vnet");
      return out(p, ["Name", "ResourceGroup", "Prefix", "Location"], list.map((r) => [r.name, r.rg, r.props.cidr, r.location]), list.map(summary));
    }
    case "network nsg create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = { rule: "ssh", port: "22", priority: 1000, source: "Any" };
      const err = create(ctx, "nsg", name ?? "nsg-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup"], [[name, rg!]], { name, resourceGroup: rg, rules: [{ name: "AllowSshInBound", access: "Allow", destinationPortRange: 22 }] });
    }
    case "network public-ip create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = { sku: val(p, "--sku") === "Basic" ? "Basic" : "Standard", assignment: isSet(p, "--allocation-method", "--static") ? "Static" : "Static", tier: "Microsoft network" };
      const err = create(ctx, "pip", name ?? "pip-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Sku"], [[name, rg!, props.sku]], { name, sku: props.sku, publicIpAllocationMethod: "Static" });
    }
    case "network nsg list":
    case "network public-ip list":
    case "network lb list": {
      const svc = cmd === "nsg list" ? "nsg" : cmd === "public-ip list" ? "pip" : "lb";
      const list = state.resources.filter((r) => r.service === svc);
      return out(p, RES_COLS, list.map(resRow), list.map(summary));
    }

    /* ------------------------------ web ----------------------------- */
    case "webapp create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const plan = val(p, "--plan") ?? "F1";
      const props = {
        runtime: (val(p, "--runtime") ?? "node:20-lts").replace("NODE:", "node:").replace(/"/g, ""),
        planTier: ["F1", "D1", "B1", "B2", "B3", "S1", "S2", "S3", "P1v3", "P1v2"].includes(plan) ? plan : "F1",
        instances: 1,
        zoneRedundant: false,
        ci: false,
        slots: 0,
      };
      const err = create(ctx, "webapp", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Plan", "Url"], [[name, rg!, props.planTier, `https://${name}.azurewebsites.net`]], { name, resourceGroup: rg, plan: props.planTier, defaultHostName: `${name}.azurewebsites.net` });
    }
    case "webapp list": {
      const list = state.resources.filter((r) => r.service === "webapp");
      return out(p, ["Name", "ResourceGroup", "Plan", "State"], list.map((r) => [r.name, r.rg, r.props.planTier, r.status]), list.map(summary));
    }
    case "functionapp create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const storage = val(p, "--storage-account");
      if (!storage || !state.resources.some((r) => r.service === "storage" && r.name === storage))
        return [`ERROR: --storage-account must point to an existing storage account. Create one first:`, "  az storage account create -g " + rg + " -n uniquename123 --sku Standard_LRS"];
      const props = { runtime: (val(p, "--runtime") ?? "node:20").replace(/"/g, ""), storage, planTier: val(p, "--plan") === "EP1" ? "Premium" : "Consumption", appInsights: true };
      const err = create(ctx, "func", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Plan", "Storage"], [[name, rg!, props.planTier, storage]], { name, resourceGroup: rg, plan: props.planTier, storageAccount: storage });
    }

    /* --------------------------- databases -------------------------- */
    case "sql db create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        serverName: val(p, "--server") ?? `sql-${rg}`,
        adminLogin: val(p, "--admin-user", "--admin-login") ?? "sqladmin",
        adminPassword: val(p, "--admin-password") ?? "ChangeMe123!",
        tier: val(p, "--service-objective") ?? "Basic",
        collation: "SQL_Latin1_General_CP1_CI_AS",
        backupRedundancy: "Local",
        aadOnly: false,
      };
      const err = create(ctx, "sql", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Server", "Tier"], [[name, rg!, props.serverName, props.tier]], { name, resourceGroup: rg, serverName: props.serverName, tier: props.tier });
    }
    case "sql server create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = { serverName: name, adminLogin: val(p, "--admin-user") ?? "sqladmin", adminPassword: val(p, "--admin-password") ?? "ChangeMe123!", tier: "Basic", collation: "SQL_Latin1_General_CP1_CI_AS", backupRedundancy: "Local", aadOnly: false };
      const err = create(ctx, "sql", `${name}-db`, rg!, props);
      if (err) return err;
      return out(p, ["Name", "FullyQualifiedDomainName"], [[name, `${name}.database.windows.net`]], { name, fullyQualifiedDomainName: `${name}.database.windows.net` });
    }
    case "sql db list":
    case "sql server list": {
      const list = state.resources.filter((r) => r.service === "sql");
      return out(p, ["Name", "ResourceGroup", "Server", "Tier"], list.map((r) => [r.name, r.rg, r.props.serverName, r.props.tier]), list.map(summary));
    }
    case "cosmosdb create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        api: val(p, "--kind", "--api") ?? "NoSQL",
        consistency: val(p, "--default-consistency-level") ?? "Session",
        freeTier: isSet(p, "--enable-free-tier"),
        throughput: 400,
        databaseName: "ToDoList",
        containerName: "Items",
        partitionKey: "/category",
      };
      const err = create(ctx, "cosmos", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Api", "Consistency"], [[name, rg!, props.api, props.consistency]], { name, resourceGroup: rg, api: props.api, documentEndpoint: `https://${name}.documents.azure.com:443/` });
    }
    case "postgres flexible-server create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        adminUser: val(p, "--admin-user") ?? "pgadmin",
        adminPassword: val(p, "--admin-password") ?? "ChangeMe123!",
        version: val(p, "--version") ?? "16",
        tier: "B_Standard_B1ms",
        storage: 32,
        ha: false,
      };
      const err = create(ctx, "pg", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Version"], [[name, rg!, props.version]], { name, resourceGroup: rg, fullyQualifiedDomainName: `${name}.postgres.database.azure.com` });
    }
    case "redis create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const redisSku = val(p, "--sku") ?? "Standard";
      const props = { sku: ["Basic", "Standard", "Premium"].includes(redisSku) ? redisSku : "Standard", nonSsl: false, persistence: false };
      const err = create(ctx, "redis", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Sku"], [[name, rg!, props.sku]], { name, resourceGroup: rg, sku: props.sku, hostName: `${name}.redis.cache.windows.net` });
    }

    /* --------------------------- containers ------------------------- */
    case "aks create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        k8sVersion: val(p, "--kubernetes-version") ?? "1.31.7",
        nodeSize: val(p, "--node-vm-size") ?? "Standard_D2s_v5",
        nodeCount: Number(val(p, "--node-count") ?? 2),
        autoscale: isSet(p, "--enable-cluster-autoscaler"),
        zones: isSet(p, "--zones"),
        networkPlugin: val(p, "--network-plugin") ?? "azure",
        privateCluster: isSet(p, "--enable-private-cluster"),
        aci: false,
      };
      const err = create(ctx, "aks", name, rg!, props);
      if (err) return err;
      return out(
        p,
        ["Name", "ResourceGroup", "KubernetesVersion", "NodeCount"],
        [[name, rg!, props.k8sVersion, props.nodeCount]],
        { name, resourceGroup: rg, kubernetesVersion: props.k8sVersion, nodeResourceGroup: `MC_${rg}_${name}_${rgLocation(state, rg)}` }
      );
    }
    case "aks get-credentials":
      return [`Merged "${name ?? "cluster"}" as current context in /home/azureuser/.kube/config`, "Now run kubectl get nodes — not available in this simulation."];
    case "acr create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = { sku: val(p, "--sku") ?? "Basic", adminUser: isSet(p, "--admin-enabled"), geoReplication: false };
      const err = create(ctx, "acr", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Sku", "LoginServer"], [[name, rg!, props.sku, `${name}.azurecr.io`]], { name, resourceGroup: rg, sku: props.sku, loginServer: `${name}.azurecr.io` });
    }

    /* --------------------------- security --------------------------- */
    case "keyvault create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = { sku: val(p, "--sku") === "premium" ? "premium" : "standard", rbac: isSet(p, "--enable-rbac-authorization", "--enable-rbac"), purgeProtection: false, softDeleteDays: 90 };
      const err = create(ctx, "kv", name, rg!, props);
      if (err) return err;
      return out(p, ["Name", "ResourceGroup", "Sku", "VaultUri"], [[name, rg!, props.sku, `https://${name}.vault.azure.net/`]], { name, resourceGroup: rg, sku: props.sku, vaultUri: `https://${name}.vault.azure.net/` });
    }

    /* ---------------------------- monitor --------------------------- */
    case "monitor metrics list":
    case "monitor metrics list-definitions": {
      const target = val(p, "--resource") ?? name ?? state.resources[0]?.name;
      const r = state.resources.find((x) => x.name === target);
      if (!r) return [`ERROR: Resource '${target}' was not found.`];
      const svc = serviceById(r.service)!;
      const rows = svc.metrics.map((m) => {
        const val0 = m.base + ((r.name.length * 7 + m.key.length * 3) % Math.max(1, Math.round(m.spread)));
        return [m.label, Math.round(val0 * 10) / 10, m.unit];
      });
      return out(p, ["Metric", "Value", "Unit"], rows, { resource: r.id, metrics: svc.metrics.map((m) => ({ name: m.label, unit: m.unit })) });
    }
    case "monitor activity-log list": {
      const list = state.activity.slice(0, 20);
      return out(p, ["Operation", "Resource", "Status", "Timestamp"], list.map((a) => [a.operation, a.resource ?? "", a.status, new Date(a.ts).toISOString()]), list);
    }

    /* ---------------------------- billing --------------------------- */
    case "consumption usage list":
    case "costmanagement show": {
      const rows = state.resources.map((r) => [r.name, r.rg, r.service, monthlyCost(r).toFixed(2)]);
      const total = state.resources.reduce((s, r) => s + monthlyCost(r), 0);
      return [...out(p, ["Resource", "ResourceGroup", "Service", "EstimatedMonthlyUsd"], rows, { total: Math.round(total * 100) / 100 }), "", `Estimated total: $${total.toFixed(2)} / month`];
    }

    /* ----------------------------- tags ----------------------------- */
    case "tag list": {
      const m = new Map<string, Set<string>>();
      for (const r of state.resources) for (const [k, v] of Object.entries(r.tags)) m.set(k, (m.get(k) ?? new Set()).add(v));
      return out(p, ["TagName", "Values"], [...m.entries()].map(([k, v]) => [k, [...v].join(",")]), [...m.entries()].map(([k, v]) => ({ tagName: k, values: [...v] })));
    }

    /* --------------------------- identity --------------------------- */
    case "ad user create": {
      const dn = val(p, "--display-name") ?? name;
      const upn = val(p, "--user-principal-name");
      if (!upn) return ["ERROR: --user-principal-name is required"];
      const err = api.createUser({ displayName: dn ?? upn.split("@")[0], userPrincipalName: upn, mail: upn, jobTitle: val(p, "--job-title") ?? "", department: val(p, "--department") ?? "", accountEnabled: true, type: "Member" });
      if (err) return [`ERROR: ${err}`];
      return out(p, ["DisplayName", "UserPrincipalName", "AccountEnabled"], [[dn ?? upn.split("@")[0], upn, "true"]], { displayName: dn, userPrincipalName: upn, accountEnabled: true });
    }
    case "ad user list":
      return out(p, ["DisplayName", "UserPrincipalName", "Enabled"], state.users.map((u) => [u.displayName, u.userPrincipalName, String(u.accountEnabled)]), state.users);
    case "ad group create": {
      const dn = name ?? val(p, "--display-name");
      if (!dn) return ["ERROR: --display-name / -n is required"];
      const err = api.createGroup({ displayName: dn, description: val(p, "--description") ?? "" });
      if (err) return [`ERROR: ${err}`];
      return [`Created group ${dn}.`];
    }
    case "ad group list":
      return out(p, ["DisplayName", "Members"], state.groups.map((g) => [g.displayName, g.members.length]), state.groups);

    /* ------------------------------ RBAC ----------------------------- */
    case "role assignment create": {
      const role = val(p, "--role") ?? "Contributor";
      const roleId = ["owner", "contributor", "reader"].includes(role.toLowerCase()) ? ROLE_IDS[role.toLowerCase()] : role;
      const scope = val(p, "--scope") ?? `subscriptions/${state.currentSubscription}`;
      const assignee = val(p, "--assignee");
      const principal = state.users.find((u) => u.userPrincipalName === assignee || u.displayName === assignee) ?? state.users.find((u) => u.id === assignee);
      if (!principal) return ["ERROR: --assignee must be a user principal name or id from `az ad user list`"];
      const scopeName = scope.includes("resourceGroups/") ? scope.split("resourceGroups/")[1].split("/")[0] : state.currentSubscription;
      const scopeType = scope.includes("resourceGroups/") ? "rg" : "subscription";
      const e = api.addRole({ scope: scopeType, scopeName, principalId: principal.id, principalName: principal.displayName, principalType: "User", roleId });
      if (e) return [`ERROR: ${e}`];
      return out(p, ["Principal", "Role", "Scope"], [[principal.displayName, role, scope]], { principal: principal.userPrincipalName, role, scope });
    }
    case "role assignment list":
      return out(
        p,
        ["Principal", "Role", "Scope"],
        state.roleAssignments.map((r) => [r.principalName, roleName(r.roleId), `${r.scope}:${r.scopeName}`]),
        state.roleAssignments
      );

    /* ----------------------------- policy ---------------------------- */
    case "policy assignment create": {
      const defName = val(p, "--policy") ?? val(p, "--policy-definition");
      const def = POLICY_DEFS.find((d) => d.id === defName || d.name.toLowerCase() === (defName ?? "").toLowerCase());
      if (!def) return ["ERROR: --policy must be a definition id or name from `az policy definition list`"];
      const scope = val(p, "--scope") ?? `subscriptions/${state.currentSubscription}`;
      const scopeName = scope.includes("resourceGroups/") ? scope.split("resourceGroups/")[1].split("/")[0] : state.currentSubscription;
      const e = api.assignPolicy({ name: name ?? `assign-${def.name.toLowerCase().slice(0, 20)}`, definitionId: def.id, scope: scope.includes("resourceGroups/") ? "rg" : "subscription", scopeName, enforcement: "Enabled" });
      if (e) return [`ERROR: ${e}`];
      return [`Policy "${def.name}" assigned to ${scope}.`];
    }
    case "policy definition list":
      return out(p, ["Name", "Category", "Effect"], POLICY_DEFS.map((d) => [d.name, d.category, d.effect]), POLICY_DEFS);

    /* ------------------------ data plane: storage -------------------- */
    case "storage container create": {
      const account = val(p, "--account-name");
      const stg = state.resources.find((r) => r.service === "storage" && r.name === account);
      if (!stg) return ["ERROR: --account-name must be an existing storage account"];
      const e = api.addContainer({ storageId: stg.id, name: name ?? "container1", accessLevel: "Private (no anonymous access)" });
      if (e) return [`ERROR: ${e}`];
      return [`{ "created": true, "name": "${name}" }`];
    }
    case "storage container list": {
      const account = val(p, "--account-name");
      const stg = state.resources.find((r) => r.service === "storage" && r.name === account);
      if (!stg) return ["ERROR: --account-name must be an existing storage account"];
      const list = state.containers.filter((c) => c.storageId === stg.id);
      return out(p, ["Name", "PublicAccess", "Blobs"], list.map((c) => [c.name, c.accessLevel.startsWith("Private") ? "None" : "Blob", c.blobs.length]), list);
    }
    case "storage share create": {
      const account = val(p, "--account-name");
      const stg = state.resources.find((r) => r.service === "storage" && r.name === account);
      if (!stg) return ["ERROR: --account-name must be an existing storage account"];
      const e = api.addShare({ storageId: stg.id, name: name ?? "share1", quotaGiB: Number(val(p, "--quota") ?? 10), tier: "TransactionOptimized" });
      if (e) return [`ERROR: ${e}`];
      return [`{ "created": true, "name": "${name}" }`];
    }

    /* ------------------------- new compute kinds --------------------- */
    case "vmss create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        image: val(p, "--image") ?? "Ubuntu2204",
        size: val(p, "--size") ?? "Standard_B2s",
        adminUsername: val(p, "--admin-username") ?? "azureuser",
        authType: "ssh",
        password: "",
        instanceCount: Number(val(p, "--instance-count") ?? 2),
        autoscale: isSet(p, "--enable-autoscale"),
        min: 1,
        max: 6,
        upgradePolicy: val(p, "--upgrade-policy-mode") ?? "Automatic",
      };
      const err = create(ctx, "vmss", name ?? "vmss-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "Instances", "UpgradePolicy"], [[name, props.instanceCount, props.upgradePolicy]], { name, instances: props.instanceCount });
    }
    case "container create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        image: val(p, "--image") ?? "mcr.microsoft.com/azuredocs/aci-helloworld",
        cpu: val(p, "--cpu") ?? "1",
        memory: val(p, "--memory") ?? "1.5",
        restartPolicy: val(p, "--restart-policy") ?? "Always",
        ports: val(p, "--ports") ?? "80",
        public: !isSet(p, "--no-public-ip"),
        dnsLabel: name ?? "azsim-app",
      };
      const err = create(ctx, "aci", name ?? "aci-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "Image", "FQDN"], [[name, props.image, props.public ? `${name}.${rgLocation(state, rg)}.azurecontainer.io` : "private"]], { name, image: props.image });
    }
    case "containerapp create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const props = {
        containerName: name ?? "web",
        image: val(p, "--image") ?? "nginx:latest",
        env: val(p, "--runtime") ?? "node",
        minReplicas: Number(val(p, "--min-replicas") ?? 0),
        maxReplicas: Number(val(p, "--max-replicas") ?? 10),
        ingress: !isSet(p, "--no-ingress"),
        targetPort: 80,
        external: true,
      };
      const err = create(ctx, "containerapp", name ?? "app-1", rg!, props);
      if (err) return err;
      return out(p, ["Name", "Url", "Replicas"], [[name, props.ingress ? `https://${name}.azurecontainerapps.io` : "internal", `${props.minReplicas}-${props.maxReplicas}`]], { name, url: `https://${name}.azurecontainerapps.io` });
    }
    case "vm availability-set create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const err = create(ctx, "avset", name ?? "avset-1", rg!, { fd: Number(val(p, "--platform-fault-domain-count") ?? 2), ud: Number(val(p, "--platform-update-domain-count") ?? 5), sku: "Aligned" });
      if (err) return err;
      return out(p, ["Name", "FaultDomains", "UpdateDomains"], [[name, val(p, "--platform-fault-domain-count") ?? 2, val(p, "--platform-update-domain-count") ?? 5]], { name });
    }
    case "network dns zone create": {
      const e = ensureRg(ctx, rg);
      if (e) return [e];
      const err = create(ctx, "dns", name ?? "contoso.com", rg!, { zoneName: name, recordType: "A", recordName: "@", recordValue: "10.0.0.4", ttl: 3600 });
      if (err) return err;
      return out(p, ["Name", "NameServers"], [[name, "ns1-09.azure-dns.com, ns2-09.azure-dns.net"]], { name, nameServers: ["ns1-09.azure-dns.com", "ns2-09.azure-dns.net"] });
    }
    case "network vnet subnet create": {
      const vnetName = val(p, "--vnet-name");
      const vnet = state.resources.find((r) => r.service === "vnet" && r.name === vnetName && (!rg || r.rg === rg));
      if (!vnet) return ["ERROR: --vnet-name must be an existing virtual network"];
      const e = api.addSubnet(vnet.id, { name: name ?? "subnet-1", cidr: val(p, "--address-prefix") ?? "10.0.1.0/24" });
      if (e) return [`ERROR: ${e}`];
      return [`Subnet ${name} added to ${vnetName}.`];
    }
    case "network vnet peering create": {
      const vnetName = val(p, "--vnet-name");
      const vnet = state.resources.find((r) => r.service === "vnet" && r.name === vnetName && (!rg || r.rg === rg));
      const remoteName = val(p, "--remote-vnet");
      const remote = state.resources.find((r) => r.service === "vnet" && r.name === remoteName);
      if (!vnet) return ["ERROR: --vnet-name must be an existing virtual network"];
      if (!remote) return ["ERROR: --remote-vnet must be an existing virtual network"];
      const e = api.addPeering(vnet.id, name ?? "peer-1", remote.id, !isSet(p, "--no-allow-forwarded-traffic"));
      if (e) return [`ERROR: ${e}`];
      return [`Peering ${name}: ${vnetName} <-> ${remoteName} (Connected).`];
    }

    default:
      return [
        `ERROR: '${[group, cmd].filter(Boolean).join(" ")}' is not an az command in this simulation.`,
        "",
        "Try one of these:",
        "  az group list -o table",
        "  az vm list -o table",
        "  az resource list -o table",
        "  az account show",
        "",
        "Type `help` for the full list.",
      ];
  }
}
