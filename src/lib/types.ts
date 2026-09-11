export type Status =
  | "Running"
  | "Succeeded"
  | "Stopped"
  | "Deallocated"
  | "Updating"
  | "Creating"
  | "Failed"
  | "Paused";

export interface ResourceGroup {
  name: string;
  location: string;
  tags: Record<string, string>;
  createdAt: number;
  locked?: boolean;
}

export interface Resource {
  id: string;
  name: string;
  service: string; // catalog id
  resourceType: string;
  rg: string;
  location: string;
  subscription: string;
  props: Record<string, any>;
  tags: Record<string, string>;
  createdAt: number;
  status: Status;
}

export interface Activity {
  id: string;
  ts: number;
  operation: string;
  resource?: string;
  rg?: string;
  status: "Succeeded" | "Started" | "Failed";
  caller: string;
  level: "Information" | "Warning" | "Error";
}

export interface AlertRule {
  id: string;
  name: string;
  resourceId: string;
  metricKey: string;
  metricLabel: string;
  op: ">" | "<";
  threshold: number;
  severity: 0 | 1 | 2 | 3;
  enabled: boolean;
  firedAt?: number;
  firedCount: number;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  kind: "success" | "error" | "info" | "warn";
  ts: number;
}

export interface Deployment {
  id: string;
  name: string;
  rg: string;
  steps: { name: string; status: "pending" | "running" | "succeeded" }[];
  ts: number;
  resourceIds: string[];
  correlationId: string;
}

export interface Blob {
  name: string;
  sizeKB: number;
  tier: "Hot" | "Cool" | "Archive";
  lastModified: number;
}

export interface BlobContainer {
  id: string;
  storageId: string;
  name: string;
  accessLevel: "Private (no anonymous access)" | "Blob (anonymous read access for blobs)" | "Container (anonymous read access for containers and blobs)";
  blobs: Blob[];
}

export interface FileShare {
  id: string;
  storageId: string;
  name: string;
  quotaGiB: number;
  tier: "TransactionOptimized" | "Hot" | "Cool";
}

export interface VnetPeering {
  id: string;
  vnetId: string;
  name: string;
  peerVnetId: string;
  allowForwarded: boolean;
  status: "Connected" | "Initiated";
}

export type BladeKind =
  | "home"
  | "rgs"
  | "rg"
  | "resources"
  | "resource"
  | "marketplace"
  | "create"
  | "monitor"
  | "cost"
  | "labs"
  | "help"
  | "alerts"
  | "activity"
  | "settings"
  | "cheatsheet"
  | "entra"
  | "policy"
  | "subs";

export interface BladeSpec {
  id: string;
  kind: BladeKind;
  params?: Record<string, any>;
}

export interface State {
  version: number;
  subscriptions: { id: string; name: string; isDefault: boolean }[];
  currentSubscription: string;
  rgs: ResourceGroup[];
  resources: Resource[];
  activity: Activity[];
  alertRules: AlertRule[];
  deployments: Deployment[];
  toasts: Toast[];
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  favorites: string[];
  recent: string[];
  cliHistory: string[];
  cliUsed: boolean;
  labProgress: Record<string, number>;
  clock: number;
  blades: BladeSpec[];
  visitedBlades: string[];
  users: import("./governance").EntraUser[];
  groups: import("./governance").EntraGroup[];
  roleAssignments: import("./governance").RoleAssignment[];
  policyAssignments: import("./governance").PolicyAssignment[];
  containers: BlobContainer[];
  shares: FileShare[];
  peerings: VnetPeering[];
}
