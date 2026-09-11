import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { Activity, AlertRule, BladeKind, BladeSpec, Blob, BlobContainer, Deployment, FileShare, Resource, ResourceGroup, State, Status, Toast, VnetPeering } from "./types";
import type { EntraGroup, EntraUser, PolicyAssignment, RoleAssignment } from "./governance";
import { monthlyCost, serviceById } from "./catalog";

const STORAGE_KEY = "az-sim-portal-v1";
const SUB_ID = "9f2c1a44-6d8e-4f30-9a1b-7c5e2f8a1100";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const idOf = (rg: string, type: string, name: string) =>
  `/subscriptions/${SUB_ID}/resourceGroups/${rg}/providers/${type}/${name}`;

/* ------------------------------------------------------------------ */
/* seed                                                                */
/* ------------------------------------------------------------------ */

const mk = (o: Partial<Resource> & { service: string; name: string; rg: string }): Resource => {
  const svc = serviceById(o.service)!;
  return {
    id: idOf(o.rg, svc.resourceType, o.name!),
    name: o.name!,
    service: svc.id,
    resourceType: svc.resourceType,
    rg: o.rg,
    location: o.location ?? "eastus",
    subscription: SUB_ID,
    props: o.props ?? {},
    tags: o.tags ?? {},
    createdAt: o.createdAt ?? Date.now() - 1000 * 60 * 60 * 26,
    status: (o.status as Status) ?? svc.status,
  };
};

function seed(): State {
  const now = Date.now();
  const rgs: ResourceGroup[] = [
    { name: "rg-learning-demo", location: "eastus", tags: { env: "dev", owner: "student" }, createdAt: now - 86400000 * 3 },
    { name: "rg-web-prod", location: "westeurope", tags: { env: "prod", team: "web" }, createdAt: now - 86400000 * 12 },
  ];

  const resources: Resource[] = [
    mk({ service: "vnet", name: "vnet-hub", rg: "rg-learning-demo", props: { cidr: "10.10.0.0/16", subnetName: "default", subnetCidr: "10.10.1.0/24", ddos: false, firewall: false, bastion: false } }),
    mk({ service: "vm", name: "vm-linux-lab01", rg: "rg-learning-demo", props: { image: "Ubuntu2204", size: "Standard_B1s", adminUsername: "azureuser", authType: "ssh", diskType: "StandardSSD_LRS", vnet: "vnet-hub", publicIp: "ssh", acceleratedNetworking: false, bootDiagnostics: true, backup: false, autoShutdown: true }, tags: { env: "dev" } }),
    mk({ service: "storage", name: "azsimlabstore01", rg: "rg-learning-demo", props: { sku: "Standard_LRS", accessTier: "Hot", hns: false, publicAccess: false, secureTransfer: true, versioning: false } }),
    mk({ service: "kv", name: "azsim-lab-kv", rg: "rg-learning-demo", props: { sku: "standard", rbac: true, purgeProtection: false, softDeleteDays: 90 } }),
    mk({ service: "webapp", name: "azsim-demo-web", rg: "rg-web-prod", location: "westeurope", props: { runtime: "node:20-lts", planTier: "F1", instances: 1, zoneRedundant: false, ci: false, slots: 0 }, tags: { env: "prod" } }),
    mk({ service: "sql", name: "orders-db", rg: "rg-web-prod", location: "westeurope", props: { serverName: "azsim-sql-srv", adminLogin: "sqladmin", adminPassword: "••••••••", tier: "Basic", collation: "SQL_Latin1_General_CP1_CI_AS", backupRedundancy: "Local", aadOnly: false }, status: "Running" as Status }),
    mk({ service: "log", name: "log-azsim-workspace", rg: "rg-web-prod", location: "westeurope", props: { pricing: "PerGB2018", retention: 30, dailyCap: 10 } }),
  ];

  const activity: Activity[] = [
    { id: uid(), ts: now - 3600_000 * 5, operation: "Create or Update Virtual Machine", resource: "vm-linux-lab01", rg: "rg-learning-demo", status: "Succeeded", caller: "student@azsim.onmicrosoft.com", level: "Information" },
    { id: uid(), ts: now - 3600_000 * 6, operation: "Create or Update Storage Account", resource: "azsimlabstore01", rg: "rg-learning-demo", status: "Succeeded", caller: "student@azsim.onmicrosoft.com", level: "Information" },
    { id: uid(), ts: now - 3600_000 * 26, operation: "Stop Virtual Machine", resource: "vm-linux-lab01", rg: "rg-learning-demo", status: "Succeeded", caller: "student@azsim.onmicrosoft.com", level: "Information" },
  ];

  const alertRules: AlertRule[] = [
    {
      id: uid(),
      name: "High CPU on vm-linux-lab01",
      resourceId: resources[1].id,
      metricKey: "cpu",
      metricLabel: "Percentage CPU",
      op: ">",
      threshold: 60,
      severity: 2,
      enabled: true,
      firedCount: 0,
    },
  ];

  const users: EntraUser[] = [
    { id: uid(), displayName: "Avery Stone", userPrincipalName: "avery.stone@azsim.onmicrosoft.com", mail: "avery.stone@azsim.onmicrosoft.com", jobTitle: "Cloud Administrator", department: "IT Infrastructure", accountEnabled: true, createdAt: now - 86400000 * 40, type: "Member" },
    { id: uid(), displayName: "Maya Chen", userPrincipalName: "maya.chen@azsim.onmicrosoft.com", mail: "maya.chen@azsim.onmicrosoft.com", jobTitle: "Application Developer", department: "Engineering", accountEnabled: true, createdAt: now - 86400000 * 22, type: "Member" },
    { id: uid(), displayName: "Jonas Weber", userPrincipalName: "jonas.weber@azsim.onmicrosoft.com", mail: "jonas.weber@azsim.onmicrosoft.com", jobTitle: "Security Analyst", department: "Security", accountEnabled: true, createdAt: now - 86400000 * 11, type: "Member" },
  ];

  const groups: EntraGroup[] = [
    { id: uid(), displayName: "cloud-admins", description: "Full administrative access to the subscription", members: [users[0].id], createdAt: now - 86400000 * 40 },
    { id: uid(), displayName: "app-developers", description: "Build and deploy web apps and functions", members: [users[1].id], createdAt: now - 86400000 * 22 },
  ];

  const roleAssignments: RoleAssignment[] = [
    { id: uid(), scope: "subscription", scopeName: SUB_ID, principalId: users[0].id, principalName: "Avery Stone", principalType: "User", roleId: "8e3af657-a8ff-443c-a75c-2fe8c4bcb635", createdAt: now - 86400000 * 40 },
    { id: uid(), scope: "rg", scopeName: "rg-web-prod", principalId: groups[1].id, principalName: "app-developers", principalType: "Group", roleId: "b24988ac-6180-42a0-ab88-20f7382dd24c", createdAt: now - 86400000 * 15 },
  ];

  const containers: BlobContainer[] = [
    { id: uid(), storageId: resources[2].id, name: "lab-data", accessLevel: "Private (no anonymous access)", blobs: [
      { name: "reports/q3-sales.csv", sizeKB: 214, tier: "Hot", lastModified: now - 3600_000 * 30 },
      { name: "backups/export-2024-09-12.zip", sizeKB: 4820, tier: "Cool", lastModified: now - 3600_000 * 120 },
    ] },
  ];

  const shares: FileShare[] = [
    { id: uid(), storageId: resources[2].id, name: "lab-share", quotaGiB: 10, tier: "TransactionOptimized" },
  ];

  return {
    version: 1,
    subscriptions: [{ id: SUB_ID, name: "Azure SIM – Learning Subscription", isDefault: true }],
    currentSubscription: SUB_ID,
    rgs,
    resources,
    activity,
    alertRules,
    deployments: [],
    toasts: [],
    theme: "light",
    sidebarCollapsed: false,
    favorites: ["rgs", "resources", "cost", "labs", "monitor"],
    recent: [],
    cliHistory: [],
    cliUsed: false,
    labProgress: {},
    clock: now,
    blades: [{ id: "home", kind: "home" }],
    visitedBlades: ["home"],
    users,
    groups,
    roleAssignments,
    policyAssignments: [],
    containers,
    shares,
    peerings: [],
  };
}

/* ------------------------------------------------------------------ */
/* reducer                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { t: "hydrate"; state: State }
  | { t: "tick" }
  | { t: "open"; kind: BladeKind; params?: Record<string, any>; id?: string }
  | { t: "close"; id: string }
  | { t: "closeAll" }
  | { t: "toast"; toast: Toast }
  | { t: "dismiss"; id: string }
  | { t: "theme"; theme: "light" | "dark" }
  | { t: "collapse" }
  | { t: "fav"; id: string }
  | { t: "createRG"; name: string; location: string; tags?: Record<string, string> }
  | { t: "deleteRG"; name: string }
  | { t: "createResources"; resources: Resource[]; deployment: Deployment }
  | { t: "deleteResource"; id: string }
  | { t: "patch"; id: string; patch: Partial<Resource> }
  | { t: "patchRg"; name: string; patch: Partial<ResourceGroup> }
  | { t: "action"; id: string; verb: string }
  | { t: "activity"; entry: Activity }
  | { t: "addAlert"; rule: AlertRule }
  | { t: "delAlert"; id: string }
  | { t: "alertFired"; id: string }
  | { t: "cli"; cmd: string }
  | { t: "labStep"; labId: string; step: number }
  | { t: "reset" }
  | { t: "createUser"; user: EntraUser }
  | { t: "deleteUser"; id: string }
  | { t: "toggleUser"; id: string }
  | { t: "createGroup"; group: EntraGroup }
  | { t: "deleteGroup"; id: string }
  | { t: "addGroupMember"; groupId: string; userId: string }
  | { t: "addRole"; ra: RoleAssignment }
  | { t: "delRole"; id: string }
  | { t: "assignPolicy"; pa: PolicyAssignment }
  | { t: "unassignPolicy"; id: string }
  | { t: "addContainer"; c: BlobContainer }
  | { t: "delContainer"; id: string }
  | { t: "setContainerAccess"; id: string; level: BlobContainer["accessLevel"] }
  | { t: "addBlob"; containerId: string; blob: Blob }
  | { t: "addShare"; s: FileShare }
  | { t: "delShare"; id: string }
  | { t: "addPeering"; p: VnetPeering }
  | { t: "delPeering"; id: string }
  | { t: "enableBackup"; vaultId: string; vmId: string }
  | { t: "addSubnet"; vnetId: string; subnet: { name: string; cidr: string } };

function log(s: State, entry: Omit<Activity, "id" | "ts" | "caller" | "level">): Activity[] {
  const fresh: Activity = { id: uid(), ts: Date.now(), caller: "student@azsim.onmicrosoft.com", level: "Information", ...entry };
  return [fresh, ...s.activity].slice(0, 300);
}

function advanceDeployments(s: State): State {
  if (!s.deployments.length) return s;
  let activity = s.activity;
  const toasts: Toast[] = [];
  const finished: string[] = [];
  const deployments = s.deployments.map((d) => {
    const idx = d.steps.findIndex((st) => st.status !== "succeeded");
    if (idx === -1) return d;
    const steps = d.steps.map((st, i) => (i <= idx ? { ...st, status: "succeeded" as const } : st));
    const nxt = steps.findIndex((st) => st.status === "pending");
    if (nxt >= 0) steps[nxt] = { ...steps[nxt], status: "running" };
    if (steps.every((st) => st.status === "succeeded")) finished.push(...d.resourceIds);
    return { ...d, steps };
  });

  let resources = s.resources;
  if (finished.length) {
    resources = s.resources.map((r) =>
      finished.includes(r.id) ? { ...r, status: serviceById(r.service)?.status ?? "Succeeded" } : r
    );
    for (const id of finished) {
      const r = resources.find((x) => x.id === id);
      if (!r) continue;
      const entry: Activity = {
        id: uid(),
        ts: Date.now(),
        operation: `Create or update ${serviceById(r.service)?.name ?? r.resourceType}`,
        resource: r.name,
        rg: r.rg,
        status: "Succeeded",
        caller: "student@azsim.onmicrosoft.com",
        level: "Information",
      };
      activity = [entry, ...activity].slice(0, 300);
    }
    toasts.push({
      id: uid(),
      title: "Deployment succeeded",
      body: `${finished.length} resource${finished.length > 1 ? "s" : ""} deployed successfully.`,
      kind: "success",
      ts: Date.now(),
    });
  }

  return {
    ...s,
    resources,
    activity,
    toasts: [...s.toasts, ...toasts],
    deployments: deployments.filter((d) => d.steps.some((st) => st.status !== "succeeded")),
  };
}

function reducer(s: State, a: Action): State {
  switch (a.t) {
    case "hydrate":
      return a.state;
    case "tick":
      return advanceDeployments({ ...s, clock: Date.now() });
    case "open": {
      const id = a.id ?? `${a.kind}-${a.params?.id ?? a.params?.service ?? uid()}`;
      const existing = s.blades.findIndex((b) => b.id === id);
      let blades: BladeSpec[];
      if (existing >= 0) {
        blades = [...s.blades.slice(0, existing + 1)];
        blades[existing] = { ...blades[existing], params: { ...blades[existing].params, ...a.params } };
      } else {
        blades = [...s.blades, { id, kind: a.kind, params: a.params }];
      }
      if (blades.length > 4) blades = blades.slice(blades.length - 4);
      const visited = Array.from(new Set([id, ...s.visitedBlades])).slice(0, 8);
      return { ...s, blades, visitedBlades: visited };
    }
    case "close": {
      const idx = s.blades.findIndex((b) => b.id === a.id);
      if (idx < 0) return s;
      const blades = s.blades.filter((b) => b.id !== a.id);
      return { ...s, blades: blades.length ? blades : [{ id: "home", kind: "home" }] };
    }
    case "closeAll":
      return { ...s, blades: [{ id: "home", kind: "home" }] };
    case "toast":
      return { ...s, toasts: [...s.toasts, a.toast].slice(-4) };
    case "dismiss":
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case "theme":
      return { ...s, theme: a.theme };
    case "collapse":
      return { ...s, sidebarCollapsed: !s.sidebarCollapsed };
    case "fav":
      return { ...s, favorites: s.favorites.includes(a.id) ? s.favorites.filter((f) => f !== a.id) : [...s.favorites, a.id] };
    case "createRG":
      return {
        ...s,
        rgs: [...s.rgs, { name: a.name, location: a.location, tags: a.tags ?? {}, createdAt: Date.now() }],
        activity: log(s, { operation: "Create or update resource group", resource: a.name, rg: a.name, status: "Succeeded" }),
        toasts: [...s.toasts, { id: uid(), title: "Resource group created", body: `${a.name} · ${a.location}`, kind: "success", ts: Date.now() }],
      };
    case "deleteRG": {
      const removed = s.resources.filter((r) => r.rg === a.name).map((r) => r.name);
      return {
        ...s,
        rgs: s.rgs.filter((g) => g.name !== a.name),
        resources: s.resources.filter((r) => r.rg !== a.name),
        alertRules: s.alertRules.filter((al) => !s.resources.find((r) => r.id === al.resourceId && r.rg === a.name)),
        activity: log(s, { operation: "Delete resource group", resource: a.name, rg: a.name, status: "Succeeded" }),
        toasts: [
          ...s.toasts,
          { id: uid(), title: "Resource group deleted", body: `${a.name} and ${removed.length} resource(s) removed.`, kind: "success", ts: Date.now() },
        ],
      };
    }
    case "createResources": {
      const created = a.resources.map((r) => ({ ...r, status: "Creating" as Status }));
      return advanceDeployments({
        ...s,
        resources: [...s.resources, ...created],
        deployments: [...s.deployments, a.deployment],
        activity: log(s, {
          operation: `Deploy ${a.resources[0]?.name ?? "resources"}`,
          resource: a.resources[0]?.name,
          rg: a.deployment.rg,
          status: "Started",
        }),
      });
    }
    case "deleteResource": {
      const r = s.resources.find((x) => x.id === a.id);
      if (!r) return s;
      return {
        ...s,
        resources: s.resources.filter((x) => x.id !== a.id),
        alertRules: s.alertRules.filter((al) => al.resourceId !== a.id),
        activity: log(s, { operation: `Delete ${serviceById(r.service)?.name ?? r.resourceType}`, resource: r.name, rg: r.rg, status: "Succeeded" }),
        toasts: [...s.toasts, { id: uid(), title: "Resource deleted", body: `${r.name} has been removed.`, kind: "success", ts: Date.now() }],
      };
    }
    case "patch":
      return { ...s, resources: s.resources.map((r) => (r.id === a.id ? { ...r, ...a.patch } : r)) };
    case "patchRg":
      return { ...s, rgs: s.rgs.map((g) => (g.name === a.name ? { ...g, ...a.patch } : g)) };
    case "action": {
      const r = s.resources.find((x) => x.id === a.id);
      if (!r) return s;
      const map: Record<string, Status> = {
        start: "Running",
        stop: r.service === "vm" ? "Stopped" : "Stopped",
        restart: "Running",
        deallocate: "Deallocated",
        reboot: "Running",
      };
      const status = map[a.verb] ?? "Running";
      return {
        ...s,
        resources: s.resources.map((x) => (x.id === a.id ? { ...x, status } : x)),
        activity: log(s, { operation: `${a.verb[0].toUpperCase()}${a.verb.slice(1)} ${serviceById(r.service)?.name ?? ""}`.trim(), resource: r.name, rg: r.rg, status: "Succeeded" }),
        toasts: [
          ...s.toasts,
          { id: uid(), title: `${r.name}: ${a.verb} completed`, body: `Status is now ${status}.`, kind: "success", ts: Date.now() },
        ],
      };
    }
    case "activity":
      return { ...s, activity: [a.entry, ...s.activity].slice(0, 300) };
    case "addAlert":
      return {
        ...s,
        alertRules: [...s.alertRules, a.rule],
        toasts: [...s.toasts, { id: uid(), title: "Alert rule created", body: a.rule.name, kind: "success", ts: Date.now() }],
      };
    case "delAlert":
      return { ...s, alertRules: s.alertRules.filter((r) => r.id !== a.id) };
    case "alertFired":
      return {
        ...s,
        alertRules: s.alertRules.map((r) => (r.id === a.id ? { ...r, firedAt: Date.now(), firedCount: r.firedCount + 1 } : r)),
      };
    case "cli":
      return { ...s, cliHistory: [...s.cliHistory, a.cmd].slice(-80), cliUsed: true };
    case "labStep":
      return { ...s, labProgress: { ...s.labProgress, [a.labId]: Math.max(s.labProgress[a.labId] ?? 0, a.step + 1) } };
    case "createUser":
      return { ...s, users: [...s.users, a.user] };
    case "deleteUser":
      return {
        ...s,
        users: s.users.filter((u) => u.id !== a.id),
        groups: s.groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== a.id) })),
        roleAssignments: s.roleAssignments.filter((ra) => ra.principalId !== a.id),
      };
    case "toggleUser":
      return { ...s, users: s.users.map((u) => (u.id === a.id ? { ...u, accountEnabled: !u.accountEnabled } : u)) };
    case "createGroup":
      return { ...s, groups: [...s.groups, a.group] };
    case "deleteGroup":
      return { ...s, groups: s.groups.filter((g) => g.id !== a.id), roleAssignments: s.roleAssignments.filter((ra) => ra.principalId !== a.id) };
    case "addGroupMember":
      return {
        ...s,
        groups: s.groups.map((g) => (g.id === a.groupId && !g.members.includes(a.userId) ? { ...g, members: [...g.members, a.userId] } : g)),
      };
    case "addRole":
      return {
        ...s,
        roleAssignments: s.roleAssignments.some(
          (r) => r.scope === a.ra.scope && r.scopeName === a.ra.scopeName && r.principalId === a.ra.principalId && r.roleId === a.ra.roleId
        )
          ? s.roleAssignments
          : [...s.roleAssignments, a.ra],
      };
    case "delRole":
      return { ...s, roleAssignments: s.roleAssignments.filter((r) => r.id !== a.id) };
    case "assignPolicy":
      return {
        ...s,
        policyAssignments: s.policyAssignments.some((p) => p.definitionId === a.pa.definitionId && p.scope === a.pa.scope && p.scopeName === a.pa.scopeName)
          ? s.policyAssignments
          : [...s.policyAssignments, a.pa],
      };
    case "unassignPolicy":
      return { ...s, policyAssignments: s.policyAssignments.filter((p) => p.id !== a.id) };
    case "addContainer":
      return { ...s, containers: [...s.containers, a.c] };
    case "delContainer":
      return { ...s, containers: s.containers.filter((c) => c.id !== a.id) };
    case "setContainerAccess":
      return { ...s, containers: s.containers.map((c) => (c.id === a.id ? { ...c, accessLevel: a.level } : c)) };
    case "addBlob":
      return {
        ...s,
        containers: s.containers.map((c) => (c.id === a.containerId ? { ...c, blobs: [...c.blobs, a.blob] } : c)),
      };
    case "addShare":
      return { ...s, shares: [...s.shares, a.s] };
    case "delShare":
      return { ...s, shares: s.shares.filter((x) => x.id !== a.id) };
    case "addPeering":
      return {
        ...s,
        peerings: s.peerings.some((p) => p.peerVnetId === a.p.peerVnetId && p.vnetId === a.p.vnetId)
          ? s.peerings
          : [...s.peerings, a.p, { ...a.p, id: uid(), vnetId: a.p.peerVnetId, peerVnetId: a.p.vnetId, status: "Connected" as const }],
      };
    case "delPeering":
      return { ...s, peerings: s.peerings.filter((p) => p.id !== a.id && p.peerVnetId !== s.peerings.find((x) => x.id === a.id)?.vnetId) };
    case "enableBackup": {
      const vault = s.resources.find((r) => r.id === a.vaultId);
      const vm = s.resources.find((r) => r.id === a.vmId);
      if (!vault || !vm) return s;
      const items = (vault.props.protectedItems as { vmName: string; policy: string; lastBackup: number }[] | undefined) ?? [];
      if (items.some((i) => i.vmName === vm.name)) return s;
      const patched = { ...vault, props: { ...vault.props, protectedItems: [...items, { vmName: vm.name, policy: "DailyPolicy", lastBackup: Date.now() }] } };
      return {
        ...s,
        resources: s.resources.map((r) => (r.id === a.vaultId ? patched : r)),
        activity: log(s, { operation: "Configure backup", resource: vm.name, rg: vm.rg, status: "Succeeded" }),
        toasts: [...s.toasts, { id: uid(), title: "Backup enabled", body: `${vm.name} is now protected by ${vault.name}.`, kind: "success", ts: Date.now() }],
      };
    }
    case "addSubnet": {
      return {
        ...s,
        resources: s.resources.map((r) => {
          if (r.id !== a.vnetId) return r;
          const subnets = (r.props.subnets as { name: string; cidr: string }[] | undefined) ?? [{ name: r.props.subnetName ?? "default", cidr: r.props.subnetCidr ?? "" }];
          if (subnets.some((x) => x.name === a.subnet.name)) return r;
          return { ...r, props: { ...r.props, subnets: [...subnets, a.subnet] } };
        }),
      };
    }
    case "reset":
      return seed();
    default:
      return s;
  }
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

export function validateResourceName(svcId: string, name: string, existing: string[]): string | null {
  const svc = serviceById(svcId);
  if (!svc) return "Unknown service.";
  const rule = svc.nameRule ?? { min: 1, max: 64, regex: /^[a-zA-Z0-9-]+$/, hint: "Invalid name." };
  if (!name) return "Resource name is required.";
  if (name.length < rule.min || name.length > rule.max) return `Name must be ${rule.min}–${rule.max} characters long.`;
  if (!rule.regex.test(name)) return rule.hint;
  if (existing.some((e) => e.toLowerCase() === name.toLowerCase()))
    return svcId === "storage" || svcId === "acr" || svcId === "kv"
      ? "The storage account / vault / registry name is already taken in Azure. Try another."
      : `A resource with the name "${name}" already exists in this resource group.`;
  return null;
}

const CIDR = /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/;
export function validateCidr(v: string): string | null {
  if (!CIDR.test(v)) return "Use CIDR notation, for example 10.0.0.0/16.";
  const [ip, bitsRaw] = v.split("/");
  const bits = Number(bitsRaw);
  const parts = ip.split(".").map(Number);
  if (parts.some((p) => p > 255)) return "Each octet must be 0–255.";
  if (bits > 28) return "Prefix must be /8 to /28.";
  const first = parts[0];
  const priv = first === 10 || (first === 172 && parts[1] >= 16 && parts[1] <= 31) || (first === 192 && parts[1] === 168);
  if (!priv) return "Use a private range: 10.0.0.0/8, 172.16.0.0/12 or 192.168.0.0/16.";
  return null;
}

export function validateRgName(name: string, existing: string[]): string | null {
  if (!name) return "Resource group name is required.";
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return "Letters, numbers, '.', '_', '-' and ')' are allowed.";
  if (name.length > 90) return "Maximum 90 characters.";
  if (existing.includes(name)) return "A resource group with this name already exists.";
  return null;
}

/* ------------------------------------------------------------------ */
/* context                                                             */
/* ------------------------------------------------------------------ */

export interface Api {
  open: (kind: BladeKind, params?: Record<string, any>, id?: string) => void;
  close: (id: string) => void;
  closeAll: () => void;
  createRG: (name: string, location: string, tags?: Record<string, string>) => string | null;
  deleteRG: (name: string) => void;
  createResource: (input: { service: string; name: string; rg: string; location: string; props: Record<string, any>; tags?: Record<string, string> }) => string | null;
  deleteResource: (id: string) => void;
  patch: (id: string, patch: Partial<Resource>) => void;
  patchRg: (name: string, patch: Partial<ResourceGroup>) => void;
  act: (id: string, verb: string) => void;
  toast: (t: Omit<Toast, "id" | "ts">) => void;
  dismiss: (id: string) => void;
  addAlert: (r: Omit<AlertRule, "id" | "firedCount">) => void;
  delAlert: (id: string) => void;
  fire: (id: string) => void;
  cli: (cmd: string) => void;
  createUser: (u: Omit<EntraUser, "id" | "createdAt">) => string | null;
  deleteUser: (id: string) => void;
  toggleUser: (id: string) => void;
  createGroup: (g: { displayName: string; description: string }) => string | null;
  deleteGroup: (id: string) => void;
  addGroupMember: (groupId: string, userId: string) => void;
  addRole: (ra: Omit<RoleAssignment, "id" | "createdAt">) => string | null;
  delRole: (id: string) => void;
  assignPolicy: (pa: Omit<PolicyAssignment, "id" | "assignedAt" | "assignedBy">) => string | null;
  unassignPolicy: (id: string) => void;
  addContainer: (c: { storageId: string; name: string; accessLevel: BlobContainer["accessLevel"] }) => string | null;
  delContainer: (id: string) => void;
  setContainerAccess: (id: string, level: BlobContainer["accessLevel"]) => void;
  addBlob: (containerId: string, blob: Omit<Blob, "lastModified">) => void;
  addShare: (s: { storageId: string; name: string; quotaGiB: number; tier: FileShare["tier"] }) => string | null;
  delShare: (id: string) => void;
  addPeering: (vnetId: string, name: string, peerVnetId: string, allowForwarded: boolean) => string | null;
  delPeering: (id: string) => void;
  enableBackup: (vaultId: string, vmId: string) => void;
  addSubnet: (vnetId: string, subnet: { name: string; cidr: string }) => string | null;
  setTheme: (t: "light" | "dark") => void;
  toggleSidebar: () => void;
  toggleFav: (id: string) => void;
  completeLabStep: (labId: string, step: number) => void;
  reset: () => void;
}

const Ctx = createContext<{ state: State; api: Api } | null>(null);

export function AzureProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as State, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.version === 1) return { ...seed(), ...parsed, toasts: [], deployments: [], clock: Date.now() };
      }
    } catch {
      /* ignore */
    }
    return seed();
  });

  const saveRef = useRef<number | null>(null);
  useEffect(() => {
    if (saveRef.current) window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(() => {
      try {
        const { toasts, deployments, blades, clock, ...rest } = state;
        void toasts;
        void deployments;
        void blades;
        void clock;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, blades: [{ id: "home", kind: "home" }], clock: 0, toasts: [], deployments: [] }));
      } catch {
        /* ignore */
      }
    }, 400);
  }, [state]);

  useEffect(() => {
    const i = window.setInterval(() => dispatch({ t: "tick" }), 1400);
    return () => window.clearInterval(i);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const api = useMemo<Api>(
    () => ({
      open: (kind, params, id) => dispatch({ t: "open", kind, params, id }),
      close: (id) => dispatch({ t: "close", id }),
      closeAll: () => dispatch({ t: "closeAll" }),
      createRG: (name, location, tags) => {
        const err = validateRgName(name, state.rgs.map((r) => r.name));
        if (err) return err;
        dispatch({ t: "createRG", name, location, tags });
        return null;
      },
      deleteRG: (name) => dispatch({ t: "deleteRG", name }),
      createResource: (input) => {
        const svc = serviceById(input.service);
        if (!svc) return "Unknown service.";
        const siblings = state.resources.filter((r) => r.rg === input.rg).map((r) => r.name);
        const err = validateResourceName(input.service, input.name, siblings);
        if (err) return err;
        if (svc.id === "vnet") {
          const c = validateCidr(input.props.cidr);
          if (c) return c;
          const s = validateCidr(input.props.subnetCidr);
          if (s) return s;
        }
        if (svc.id === "func" && (!input.props.storage || input.props.storage === "__new__"))
          return "Function Apps require an existing storage account. Create one first.";
        if (svc.id === "vnet" && !input.props.subnets) {
          input.props = { ...input.props, subnets: [{ name: input.props.subnetName ?? "default", cidr: input.props.subnetCidr ?? "10.0.0.0/24" }] };
        }
        const resources: Resource[] = [
          {
            id: idOf(input.rg, svc.resourceType, input.name),
            name: input.name,
            service: svc.id,
            resourceType: svc.resourceType,
            rg: input.rg,
            location: input.location,
            subscription: state.currentSubscription,
            props: input.props,
            tags: input.tags ?? {},
            createdAt: Date.now(),
            status: svc.status,
          },
        ];
        const deployment: Deployment = {
          id: uid(),
          name: input.name,
          rg: input.rg,
          steps: [
            { name: "Validating deployment template", status: "running" },
            { name: `Creating ${svc.name} "${input.name}"`, status: "pending" },
            { name: "Configuring networking & security", status: "pending" },
            { name: "Applying tags and finalising", status: "pending" },
          ],
          ts: Date.now(),
          resourceIds: resources.map((r) => r.id),
          correlationId: uid() + uid(),
        };
        dispatch({ t: "createResources", resources, deployment });
        return null;
      },
      deleteResource: (id) => dispatch({ t: "deleteResource", id }),
      patch: (id, patch) => dispatch({ t: "patch", id, patch }),
      patchRg: (name, patch) => dispatch({ t: "patchRg", name, patch }),
      act: (id, verb) => dispatch({ t: "action", id, verb }),
      toast: (t) => dispatch({ t: "toast", toast: { ...t, id: uid(), ts: Date.now() } }),
      dismiss: (id) => dispatch({ t: "dismiss", id }),
      addAlert: (r) => dispatch({ t: "addAlert", rule: { ...r, id: uid(), firedCount: 0 } }),
      delAlert: (id) => dispatch({ t: "delAlert", id }),
      fire: (id) => dispatch({ t: "alertFired", id }),
      cli: (cmd) => dispatch({ t: "cli", cmd }),
      createUser: (u) => {
        const upn = u.userPrincipalName.trim().toLowerCase();
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(upn)) return "Enter a valid user principal name, e.g. first.last@azsim.onmicrosoft.com";
        if (state.users.some((x) => x.userPrincipalName === upn)) return "A user with this sign-in name already exists.";
        dispatch({ t: "createUser", user: { ...u, id: uid(), createdAt: Date.now() } });
        return null;
      },
      deleteUser: (id) => dispatch({ t: "deleteUser", id }),
      toggleUser: (id) => dispatch({ t: "toggleUser", id }),
      createGroup: (g) => {
        if (!g.displayName.trim()) return "Group name is required.";
        if (state.groups.some((x) => x.displayName === g.displayName)) return "A group with this name already exists.";
        dispatch({ t: "createGroup", group: { ...g, id: uid(), members: [], createdAt: Date.now() } });
        return null;
      },
      deleteGroup: (id) => dispatch({ t: "deleteGroup", id }),
      addGroupMember: (groupId, userId) => dispatch({ t: "addGroupMember", groupId, userId }),
      addRole: (ra) => {
        dispatch({ t: "addRole", ra: { ...ra, id: uid(), createdAt: Date.now() } });
        return null;
      },
      delRole: (id) => dispatch({ t: "delRole", id }),
      assignPolicy: (pa) => {
        dispatch({ t: "assignPolicy", pa: { ...pa, id: uid(), assignedAt: Date.now(), assignedBy: "student@azsim.onmicrosoft.com" } });
        return null;
      },
      unassignPolicy: (id) => dispatch({ t: "unassignPolicy", id }),
      addContainer: (c) => {
        if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(c.name)) return "3–63 lowercase letters, numbers and hyphens; start with a letter or number.";
        if (state.containers.some((x) => x.storageId === c.storageId && x.name === c.name)) return "A container with this name already exists.";
        dispatch({ t: "addContainer", c: { ...c, id: uid(), blobs: [] } });
        return null;
      },
      delContainer: (id) => dispatch({ t: "delContainer", id }),
      setContainerAccess: (id, level) => dispatch({ t: "setContainerAccess", id, level }),
      addBlob: (containerId, blob) => dispatch({ t: "addBlob", containerId, blob: { ...blob, lastModified: Date.now() } }),
      addShare: (s) => {
        if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(s.name)) return "3–63 lowercase letters, numbers and hyphens; start with a letter or number.";
        if (state.shares.some((x) => x.storageId === s.storageId && x.name === s.name)) return "A file share with this name already exists.";
        dispatch({ t: "addShare", s: { ...s, id: uid() } });
        return null;
      },
      delShare: (id) => dispatch({ t: "delShare", id }),
      addPeering: (vnetId, name, peerVnetId, allowForwarded) => {
        if (vnetId === peerVnetId) return "A VNet cannot peer with itself — choose a different virtual network.";
        dispatch({ t: "addPeering", p: { id: uid(), vnetId, name, peerVnetId, allowForwarded, status: "Connected" } });
        return null;
      },
      delPeering: (id) => dispatch({ t: "delPeering", id }),
      enableBackup: (vaultId, vmId) => dispatch({ t: "enableBackup", vaultId, vmId }),
      addSubnet: (vnetId, subnet) => {
        const cidrErr = validateCidr(subnet.cidr);
        if (cidrErr) return cidrErr;
        if (!subnet.name.trim()) return "Subnet name is required.";
        dispatch({ t: "addSubnet", vnetId, subnet });
        return null;
      },
      setTheme: (theme) => dispatch({ t: "theme", theme }),
      toggleSidebar: () => dispatch({ t: "collapse" }),
      toggleFav: (id) => dispatch({ t: "fav", id }),
      completeLabStep: (labId, step) => dispatch({ t: "labStep", labId, step }),
      reset: () => dispatch({ t: "reset" }),
    }),
    [state.rgs, state.resources, state.currentSubscription]
  );

  return React.createElement(Ctx.Provider, { value: { state, api } }, children);
}

export function useAzure() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAzure must be used inside AzureProvider");
  return v;
}

/* ------------------------------------------------------------------ */
/* selectors / helpers                                                 */
/* ------------------------------------------------------------------ */

export const SUBSCRIPTION = SUB_ID;

export function totalMonthly(s: State) {
  return Math.round(s.resources.reduce((sum, r) => sum + monthlyCost(r), 0) * 100) / 100;
}

export function costByService(s: State) {
  const m = new Map<string, { label: string; cost: number; count: number }>();
  for (const r of s.resources) {
    const svc = serviceById(r.service);
    const label = svc?.name ?? r.resourceType;
    const cur = m.get(r.service) ?? { label, cost: 0, count: 0 };
    cur.cost += monthlyCost(r);
    cur.count += 1;
    m.set(r.service, cur);
  }
  return [...m.values()].sort((a, b) => b.cost - a.cost);
}

export function costByRg(s: State) {
  return s.rgs
    .map((g) => ({
      name: g.name,
      cost: Math.round(s.resources.filter((r) => r.rg === g.name).reduce((x, r) => x + monthlyCost(r), 0) * 100) / 100,
      count: s.resources.filter((r) => r.rg === g.name).length,
    }))
    .sort((a, b) => b.cost - a.cost);
}

export function armTemplate(r: Resource) {
  const svc = serviceById(r.service);
  const typeParts = svc?.resourceType.split("/") ?? ["Microsoft.Unknown", "resources"];
  const apiVersion = "2024-04-01-preview";
  return JSON.stringify(
    {
      $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
      contentVersion: "1.0.0.0",
      parameters: {},
      variables: {},
      resources: [
        {
          type: svc?.resourceType,
          apiVersion,
          name: typeParts.length > 2 ? [typeParts[1], r.name].join("/") : r.name,
          location: r.location,
          tags: r.tags,
          properties: r.props,
        },
      ],
      outputs: {},
    },
    null,
    2
  );
}

export function cliScript(r: Resource) {
  const svc = serviceById(r.service);
  const n = r.name;
  const g = r.rg;
  switch (svc?.id) {
    case "vm":
      return `az vm create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --image ${r.props.image} \\\n  --size ${r.props.size} \\\n  --admin-username ${r.props.adminUsername} \\\n  --generate-ssh-keys`;
    case "storage":
      return `az storage account create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --sku ${r.props.sku} \\\n  --location ${r.location}`;
    case "webapp":
      return `az webapp create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --plan ${n}-plan \\\n  --runtime ${r.props.runtime}`;
    case "vnet":
      return `az network vnet create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --address-prefix ${r.props.cidr} \\\n  --subnet-name ${r.props.subnetName} \\\n  --subnet-prefix ${r.props.subnetCidr}`;
    case "vmss":
      return `az vmss create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --image ${r.props.image} \\\n  --instance-count ${r.props.instanceCount} \\\n  --upgrade-policy-mode ${r.props.upgradePolicy}`;
    case "aci":
      return `az container create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --image ${r.props.image} \\\n  --cpu ${r.props.cpu} \\\n  --memory ${r.props.memory} \\\n  --restart-policy ${r.props.restartPolicy} \\\n  --ports ${r.props.ports}`;
    case "containerapp":
      return `az containerapp create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --image ${r.props.image} \\\n  --min-replicas ${r.props.minReplicas} \\\n  --max-replicas ${r.props.maxReplicas} \\\n  --ingress external \\\n  --target-port ${r.props.targetPort ?? 80}`;
    case "avset":
      return `az vm availability-set create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --platform-fault-domain-count ${r.props.fd} \\\n  --platform-update-domain-count ${r.props.ud}`;
    case "dns":
      return `az network dns zone create \\\n  --resource-group ${g} \\\n  --name ${n}`;
    case "backup":
      return `az backup vault create \\\n  --resource-group ${g} \\\n  --name ${n} \\\n  --location ${r.location} \\\n  --storage-redundancy ${r.props.redundancy === "GeoRedundant" ? "GeoRedundant" : "LocallyRedundant"}`;
    default:
      return `az resource show --ids ${r.id}`;
  }
}

/* ------------------------------------------------------------------ */
/* Bicep + PowerShell equivalents                                      */
/* ------------------------------------------------------------------ */

export function bicepScript(r: Resource): string {
  const svc = serviceById(r.service);
  if (!svc) return "";
  const parts = svc.resourceType.split("/");
  const type = parts.slice(0, 2).join("/");
  const typeName = parts.length > 2 ? `${parts.slice(2).join("/")}/${r.name}` : r.name;
  const api = "2024-04-01";
  const lines = [
    `// ${svc.name} — deploy with: az deployment group create -g ${r.rg} --template-file main.bicep`,
    `@description('Location for the resource')`,
    `param location string = '${r.location}'`,
    ``,
    `resource ${r.name.replace(/[^a-zA-Z0-9]/g, "")} '${type}@${api}' = {`,
    `  name: '${typeName}'`,
    `  location: location`,
  ];
  if (Object.keys(r.tags).length) {
    lines.push(`  tags: {`);
    Object.entries(r.tags).forEach(([k, v]) => lines.push(`    ${k}: '${v}'`));
    lines.push(`  }`);
  }
  lines.push(`  properties: {`);
  const props = JSON.stringify(r.props, null, 4)
    .split("\n")
    .slice(1, -1)
    .map((l) => `  ${l}`);
  lines.push(...props);
  lines.push(`  }`);
  lines.push(`}`);
  return lines.join("\n");
}

export function psScript(r: Resource): string {
  const svc = serviceById(r.service);
  if (!svc) return "";
  const g = r.rg;
  const n = r.name;
  switch (svc.id) {
    case "vm":
      return `New-AzVm -ResourceGroupName "${g}" -Name "${n}" -ImageName "${r.props.image}" -Size "${r.props.size}" -Credential (Get-Credential) -Location "${r.location}"`;
    case "storage":
      return `New-AzStorageAccount -ResourceGroupName "${g}" -Name "${n}" -SkuName "${r.props.sku}" -Location "${r.location}" -AllowBlobPublicAccess:$${r.props.publicAccess ? "true" : "false"}`;
    case "webapp":
      return `New-AzWebApp -ResourceGroupName "${g}" -Name "${n}" -AppServicePlan "${n}-plan" -Location "${r.location}"`;
    case "vnet":
      return `New-AzVirtualNetwork -ResourceGroupName "${g}" -Name "${n}" -AddressPrefix "${r.props.cidr}" -Location "${r.location}"`;
    case "nsg":
      return `New-AzNetworkSecurityGroup -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}"`;
    case "pip":
      return `New-AzPublicIpAddress -ResourceGroupName "${g}" -Name "${n}" -AllocationMethod Static -Sku Standard -Location "${r.location}"`;
    case "sql":
      return `New-AzSqlDatabase -ResourceGroupName "${g}" -ServerName "${r.props.serverName}" -DatabaseName "${n}" -RequestedServiceObjectiveName "${r.props.tier}"`;
    case "cosmos":
      return `New-AzCosmosDBAccount -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -ApiKind "${r.props.api}"`;
    case "aks":
      return `New-AzAksCluster -ResourceGroupName "${g}" -Name "${n}" -NodeCount ${r.props.nodeCount} -NodeVmSize "${r.props.nodeSize}"`;
    case "kv":
      return `New-AzKeyVault -ResourceGroupName "${g}" -VaultName "${n}" -Location "${r.location}" -EnableRbacAuthorization:$${r.props.rbac ? "true" : "false"}`;
    case "aci":
      return `New-AzContainerGroup -ResourceGroupName "${g}" -Name "${n}" -Image "${r.props.image}" -Cpu ${r.props.cpu} -MemoryInGB ${r.props.memory} -Location "${r.location}"`;
    case "containerapp":
      return `New-AzContainerApp -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -TemplateContainerName "${r.props.containerName}" -TemplateContainerImage "${r.props.image}"`;
    case "backup":
      return `New-AzRecoveryServicesVault -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}"`;
    case "dns":
      return `New-AzDnsZone -ResourceGroupName "${g}" -Name "${r.name}"`;
    case "avset":
      return `New-AzAvailabilitySet -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -PlatformFaultDomainCount ${r.props.fd} -PlatformUpdateDomainCount ${r.props.ud} -Sku Aligned`;
    case "vmss":
      return `New-AzVmss -ResourceGroupName "${g}" -VMScaleSetName "${n}" -ImageName "${r.props.image}" -VmSize "${r.props.size}" -InstanceCount ${r.props.instanceCount} -Location "${r.location}"`;
    case "acr":
      return `New-AzContainerRegistry -ResourceGroupName "${g}" -Name "${n}" -Sku "${r.props.sku}" -Location "${r.location}"`;
    case "func":
      return `New-AzFunctionApp -ResourceGroupName "${g}" -Name "${n}" -StorageAccountName "${r.props.storage}" -Runtime "${r.props.runtime.split(":")[0]}" -Location "${r.location}"`;
    case "redis":
      return `New-AzRedisCache -ResourceGroupName "${g}" -Name "${n}" -Sku "${r.props.sku}" -Location "${r.location}"`;
    case "pg":
      return `New-AzPostgreSqlFlexibleServer -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -AdministratorLogin "${r.props.adminUser}" -Sku "${r.props.tier}"`;
    case "swa":
      return `New-AzStaticWebApp -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}"`;
    case "log":
      return `New-AzOperationalInsightsWorkspace -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -Sku PerGB2018`;
    case "sb":
      return `New-AzServiceBusNamespace -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -Sku "${r.props.sku}"`;
    case "ai":
      return `New-AzCognitiveServicesAccount -ResourceGroupName "${g}" -Name "${n}" -Location "${r.location}" -Type "${r.props.kind}" -SkuName "${r.props.tier}"`;
    case "lb":
      return `New-AzLoadBalancer -ResourceGroupName "${g}" -Name "${n}" -Sku "${r.props.sku}" -Location "${r.location}"`;
    default:
      return `Get-AzResource -ResourceId "${r.id}"`;
  }
}

export function storageKeys(name: string) {
  const base = hashStrLocal(name);
  const mkKey = (seed: number) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    let h = base + seed * 9973;
    for (let i = 0; i < 86; i++) {
      h = (h * 1103515245 + 12345) % 2147483648;
      out += chars[h % chars.length];
    }
    return out;
  };
  return { key1: mkKey(1), key2: mkKey(2), conn1: `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${mkKey(1).slice(0, 40)}==;EndpointSuffix=core.windows.net` };
}

function hashStrLocal(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function sasToken(name: string) {
  const h = hashStrLocal(name + "sas");
  const sig = h.toString(36) + "aZ9kLmQ2";
  return `https://${name}.blob.core.windows.net/?sv=2024-01-03&ss=b&srt=sco&sp=rwdlac&se=${new Date(Date.now() + 3600_000).toISOString().slice(0, 19)}Z&spr=https&sig=${sig}%3D`;
}
