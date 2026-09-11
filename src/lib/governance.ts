import type { Resource, ResourceGroup, State } from "./types";

/* ------------------------------------------------------------------ */
/* Microsoft Entra ID                                                  */
/* ------------------------------------------------------------------ */

export interface EntraUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string;
  jobTitle: string;
  department: string;
  accountEnabled: boolean;
  createdAt: number;
  type: "Member" | "Guest";
}

export interface EntraGroup {
  id: string;
  displayName: string;
  description: string;
  members: string[];
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Azure RBAC roles                                                    */
/* ------------------------------------------------------------------ */

export interface RoleDef {
  id: string;
  name: string;
  description: string;
}

export const ROLES: RoleDef[] = [
  { id: "8e3af657-a8ff-443c-a75c-2fe8c4bcb635", name: "Owner", description: "Full access to all resources, including the right to delegate access to others." },
  { id: "b24988ac-6180-42a0-ab88-20f7382dd24c", name: "Contributor", description: "Create and manage all types of Azure resources, but cannot grant access to others." },
  { id: "acdd72a7-3385-48ef-bd42-f606fba81ae7", name: "Reader", description: "View everything, but cannot change anything. The safest role for auditors." },
  { id: "18d7d88d-d35e-4fb5-a5c3-7773c20a72d9", name: "User Access Administrator", description: "Manage user access to Azure resources (assign roles), but not resources themselves." },
  { id: "9980e02c-c2be-4d73-94e8-173b1dc7cf3c", name: "Virtual Machine Contributor", description: "Manage virtual machines, but not the virtual network or storage account they are attached to." },
  { id: "ba92f5b4-2d11-453d-a403-e96b0029c9fe", name: "Storage Blob Data Contributor", description: "Read, write and delete blobs in storage accounts." },
  { id: "b86a8fe4-44ce-4948-aee5-eccb2c155cd7", name: "Key Vault Secrets User", description: "Read secret contents from a key vault." },
  { id: "43d0d8ad-25c7-4439-8815-4f07317589b3", name: "Monitoring Reader", description: "View monitoring data (metrics, logs, alerts) without changing resources." },
];

export const roleName = (id: string) => ROLES.find((r) => r.id === id)?.name ?? id;

export interface RoleAssignment {
  id: string;
  scope: "subscription" | "rg" | "resource";
  scopeName: string;
  principalId: string;
  principalName: string;
  principalType: "User" | "Group";
  roleId: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Azure Policy                                                        */
/* ------------------------------------------------------------------ */

export type PolicyEffect = "Audit" | "Deny" | "Disabled";

export interface PolicyDef {
  id: string;
  name: string;
  category: string;
  description: string;
  effect: PolicyEffect;
  /** returns true when the resource is COMPLIANT with this definition */
  check: (r: Resource, rg?: ResourceGroup) => boolean;
  appliesTo?: (r: Resource) => boolean;
  parameters?: string[];
}

export const POLICY_DEFS: PolicyDef[] = [
  {
    id: "e56962a6-4747-49cd-b67b-bf8b01975c4c",
    name: "Allowed locations",
    category: "Compute",
    description: "Resources can only be deployed in the approved list of Azure regions.",
    effect: "Deny",
    check: (r) => ["eastus", "eastus2", "westeurope", "northeurope"].includes(r.location),
    parameters: ["eastus", "eastus2", "westeurope", "northeurope"],
  },
  {
    id: "6c112d4e-5bc7-47ae-a041-ea2d9dccd749",
    name: "Storage accounts should disable public blob access",
    category: "Storage",
    description: "Anonymous public read access to blob containers is a common data-leak path.",
    effect: "Audit",
    appliesTo: (r) => r.service === "storage",
    check: (r) => r.props.publicAccess === false || r.props.allowBlobPublicAccess === false,
  },
  {
    id: "4f0dc9ea-7902-45bd-922c-0cde53f32527",
    name: "Storage accounts should use geo-redundant storage",
    category: "Storage",
    description: "Data should survive a complete regional outage.",
    effect: "Audit",
    appliesTo: (r) => r.service === "storage",
    check: (r) => String(r.props.sku ?? "").startsWith("Standard_G"),
  },
  {
    id: "9e2575e9-3a90-4d64-9f8c-0b0a0b0b0b0b",
    name: "Tag 'env' should be specified on resources",
    category: "Tags",
    description: "Every resource should carry an env tag (dev / test / prod) for cost allocation.",
    effect: "Audit",
    check: (r) => !!r.tags?.env,
  },
  {
    id: "a2bde228-9f5f-4b1d-8b8b-1a2b3c4d5e6f",
    name: "Key vaults should have soft delete enabled",
    category: "Security",
    description: "Soft delete protects secrets and keys from accidental deletion.",
    effect: "Audit",
    appliesTo: (r) => r.service === "kv",
    check: (r) => r.props.softDeleteDays >= 7,
  },
  {
    id: "c3cdef45-9f5f-4b1d-8b8b-1a2b3c4d5e70",
    name: "Public IP addresses on Standard SKU",
    category: "Network",
    description: "Basic SKU public IPs are retiring; Standard is secure by default.",
    effect: "Audit",
    appliesTo: (r) => r.service === "pip",
    check: (r) => r.props.sku === "Standard",
  },
];

export const policyDefById = (id: string) => POLICY_DEFS.find((p) => p.id === id);

export interface PolicyAssignment {
  id: string;
  name: string;
  definitionId: string;
  scope: "subscription" | "rg";
  scopeName: string;
  enforcement: "Enabled" | "Disabled";
  assignedAt: number;
  assignedBy: string;
}

export interface ComplianceRow {
  assignment: PolicyAssignment;
  def: PolicyDef | undefined;
  total: number;
  compliant: number;
  pct: number;
  offenders: { name: string; reason: string }[];
}

export function computeCompliance(state: State): { rows: ComplianceRow[]; total: number; compliant: number; pct: number } {
  const rows: ComplianceRow[] = state.policyAssignments.map((a) => {
    const def = policyDefById(a.definitionId);
    const inScope = state.resources.filter((r) => (a.scope === "subscription" ? true : r.rg === a.scopeName) && (!def?.appliesTo || def.appliesTo(r)));
    const offenders: { name: string; reason: string }[] = [];
    let compliant = 0;
    for (const r of inScope) {
      if (!def || def.check(r, state.rgs.find((g) => g.name === r.rg))) compliant++;
      else offenders.push({ name: r.name, reason: violationReason(def, r) });
    }
    return { assignment: a, def, total: inScope.length, compliant, pct: inScope.length ? Math.round((compliant / inScope.length) * 100) : 100, offenders };
  });
  const total = rows.reduce((s, r) => s + r.total, 0);
  const compliant = rows.reduce((s, r) => s + r.compliant, 0);
  return { rows, total, compliant, pct: total ? Math.round((compliant / total) * 100) : 100 };
}

export function violationReason(def: PolicyDef, r: Resource): string {
  if (def.name === "Allowed locations") return `Deployed in ${r.location}, outside the allowed list.`;
  if (def.name.startsWith("Storage accounts should disable")) return "Public blob access is enabled.";
  if (def.name.includes("geo-redundant")) return `Uses ${r.props.sku ?? "LRS"} instead of GRS/RA-GRS/GZRS.`;
  if (def.name === "Tag 'env' should be specified on resources") return "Missing the env tag.";
  if (def.name.includes("soft delete")) return "Soft delete retention is below 7 days.";
  if (def.name.includes("Standard SKU")) return "Uses the Basic SKU.";
  return "Does not match the policy rule.";
}

export function previewCompliance(state: State, defId: string, scope: "subscription" | "rg", scopeName: string) {
  const def = policyDefById(defId);
  if (!def) return null;
  const inScope = state.resources.filter((r) => (scope === "subscription" ? true : r.rg === scopeName) && (!def.appliesTo || def.appliesTo(r)));
  const offenders = inScope.filter((r) => !def.check(r));
  return { total: inScope.length, nonCompliant: offenders.length, names: offenders.map((o) => o.name) };
}
