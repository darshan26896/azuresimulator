import type { Resource, Status } from "./types";

/* ------------------------------------------------------------------ */
/* Regions                                                             */
/* ------------------------------------------------------------------ */

export interface Region {
  value: string;
  label: string;
  geography: string;
  priceIndex: number;
}

export const REGIONS: Region[] = [
  { value: "eastus", label: "East US (Virginia)", geography: "North America", priceIndex: 1 },
  { value: "eastus2", label: "East US 2 (Virginia)", geography: "North America", priceIndex: 1 },
  { value: "westus", label: "West US (California)", geography: "North America", priceIndex: 1.06 },
  { value: "westus2", label: "West US 2 (Washington)", geography: "North America", priceIndex: 1.02 },
  { value: "westus3", label: "West US 3 (Arizona)", geography: "North America", priceIndex: 0.98 },
  { value: "centralus", label: "Central US (Iowa)", geography: "North America", priceIndex: 1 },
  { value: "southcentralus", label: "South Central US (Texas)", geography: "North America", priceIndex: 1.04 },
  { value: "northcentralus", label: "North Central US (Illinois)", geography: "North America", priceIndex: 1 },
  { value: "canadacentral", label: "Canada Central (Toronto)", geography: "North America", priceIndex: 1.12 },
  { value: "brazilsouth", label: "Brazil South (São Paulo)", geography: "South America", priceIndex: 1.24 },
  { value: "northeurope", label: "North Europe (Ireland)", geography: "Europe", priceIndex: 1.12 },
  { value: "westeurope", label: "West Europe (Netherlands)", geography: "Europe", priceIndex: 1.16 },
  { value: "uksouth", label: "UK South (London)", geography: "Europe", priceIndex: 1.2 },
  { value: "ukwest", label: "UK West (Cardiff)", geography: "Europe", priceIndex: 1.16 },
  { value: "francecentral", label: "France Central (Paris)", geography: "Europe", priceIndex: 1.16 },
  { value: "germanynorth", label: "Germany North (Berlin)", geography: "Europe", priceIndex: 1.18 },
  { value: "switzerlandnorth", label: "Switzerland North (Zurich)", geography: "Europe", priceIndex: 1.34 },
  { value: "southeastasia", label: "Southeast Asia (Singapore)", geography: "Asia Pacific", priceIndex: 1.18 },
  { value: "eastasia", label: "East Asia (Hong Kong)", geography: "Asia Pacific", priceIndex: 1.26 },
  { value: "japaneast", label: "Japan East (Tokyo)", geography: "Asia Pacific", priceIndex: 1.24 },
  { value: "centralindia", label: "Central India (Pune)", geography: "Asia Pacific", priceIndex: 0.94 },
  { value: "southindia", label: "South India (Chennai)", geography: "Asia Pacific", priceIndex: 0.94 },
  { value: "australiaeast", label: "Australia East (Sydney)", geography: "Asia Pacific", priceIndex: 1.22 },
  { value: "uaenorth", label: "UAE North (Dubai)", geography: "Middle East", priceIndex: 1.28 },
  { value: "southafricanorth", label: "South Africa North (Johannesburg)", geography: "Africa", priceIndex: 1.3 },
];

export const regionLabel = (v: string) => REGIONS.find((r) => r.value === v)?.label ?? v;
export const regionIndex = (v: string) => REGIONS.find((r) => r.value === v)?.priceIndex ?? 1;

/* ------------------------------------------------------------------ */
/* Field / step definitions                                            */
/* ------------------------------------------------------------------ */

export interface Opt {
  value: string;
  label: string;
  note?: string;
  price?: number;
}

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "toggle" | "password";
  options?: Opt[];
  default?: any;
  required?: boolean;
  placeholder?: string;
  help?: string;
  unit?: string;
  min?: number;
  max?: number;
  price?: number;
  when?: (p: Record<string, any>) => boolean;
  mono?: boolean;
  dynamic?: "vnet" | "storage" | "resource" | "avset" | "workspace";
}

export interface StepDef {
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface MetricDef {
  key: string;
  label: string;
  unit: string;
  base: number;
  spread: number;
  powerBased?: boolean;
}

export interface ServiceDef {
  id: string;
  name: string;
  resourceType: string;
  category: string;
  blurb: string;
  glyph: string;
  colors: [string, string];
  steps: StepDef[];
  metrics: MetricDef[];
  learn: string[];
  status: Status;
  monthly: (p: Record<string, any>, region: string) => number;
  essentials?: (r: Resource) => { label: string; value: string; mono?: boolean }[];
  actions?: string[];
  nameRule?: { min: number; max: number; regex: RegExp; hint: string };
}

export const CATEGORIES = [
  "Compute",
  "Containers",
  "Databases",
  "Networking",
  "Storage",
  "Web",
  "Security",
  "Analytics",
  "AI + machine learning",
  "Integration",
];

const VMSIZES: Opt[] = [
  { value: "Standard_B1s", label: "Standard_B1s", note: "1 vCPU · 1 GiB RAM · burstable", price: 7.32 },
  { value: "Standard_B2s", label: "Standard_B2s", note: "2 vCPU · 4 GiB RAM · burstable", price: 29.32 },
  { value: "Standard_B2ms", label: "Standard_B2ms", note: "2 vCPU · 8 GiB RAM", price: 57.6 },
  { value: "Standard_D2s_v5", label: "Standard_D2s_v5", note: "2 vCPU · 8 GiB RAM · general purpose", price: 70.08 },
  { value: "Standard_D4s_v5", label: "Standard_D4s_v5", note: "4 vCPU · 16 GiB RAM · general purpose", price: 140.16 },
  { value: "Standard_D8s_v5", label: "Standard_D8s_v5", note: "8 vCPU · 32 GiB RAM · general purpose", price: 280.32 },
  { value: "Standard_E2s_v5", label: "Standard_E2s_v5", note: "2 vCPU · 16 GiB RAM · memory optimized", price: 112.4 },
  { value: "Standard_F2s_v2", label: "Standard_F2s_v2", note: "2 vCPU · 4 GiB RAM · compute optimized", price: 71.2 },
];

const sizePrice = (v: string) => VMSIZES.find((s) => s.value === v)?.price ?? 0;

const num = (v: any, d = 0) => (typeof v === "number" ? v : Number(v) || d);

export const SERVICES: ServiceDef[] = [
  /* ---------------------------- Virtual machine --------------------------- */
  {
    id: "vm",
    name: "Virtual machine",
    resourceType: "Microsoft.Compute/virtualMachines",
    category: "Compute",
    blurb: "Windows or Linux virtual machines with your choice of size, image and network settings.",
    glyph: "🖥️",
    colors: ["#3b8cf0", "#1250a3"],
    status: "Running",
    actions: ["start", "stop", "restart", "deallocate"],
    nameRule: { min: 1, max: 64, regex: /^[a-zA-Z][a-zA-Z0-9-]*$/, hint: "Letters, numbers and hyphens. Must start with a letter." },
    steps: [
      {
        title: "Instance details",
        description: "Choose an image and a size for the virtual machine.",
        fields: [
          {
            key: "image",
            label: "Image",
            type: "select",
            required: true,
            options: [
              { value: "Ubuntu2204", label: "Ubuntu Server 22.04 LTS - x64 Gen2", note: "Linux · free" },
              { value: "Ubuntu2404", label: "Ubuntu Server 24.04 LTS - x64 Gen2", note: "Linux · free" },
              { value: "Debian12", label: 'Debian 12 "Bookworm" - x64 Gen2', note: "Linux · free" },
              { value: "RHEL94", label: "Red Hat Enterprise Linux 9.4 - x64 Gen2", note: "Linux · +$12/mo" },
              { value: "Win2022Datacenter", label: "Windows Server 2022 Datacenter - x64 Gen2", note: "Windows · +$96/mo licence" },
            ],
            default: "Ubuntu2204",
          },
          { key: "size", label: "Size", type: "select", required: true, options: VMSIZES, default: "Standard_B2s" },
          { key: "adminUsername", label: "Username", type: "text", default: "azureuser", required: true, help: "Sign-in name used with SSH / RDP." },
          {
            key: "authType",
            label: "Authentication type",
            type: "select",
            options: [
              { value: "ssh", label: "SSH public key" },
              { value: "password", label: "Password" },
            ],
            default: "ssh",
          },
          {
            key: "password",
            label: "Password",
            type: "password",
            when: (p) => p.authType === "password",
            required: true,
            help: "12–72 chars, 3 of: upper, lower, digit, special.",
          },
          {
            key: "diskType",
            label: "OS disk type",
            type: "select",
            options: [
              { value: "StandardSSD_LRS", label: "Standard SSD", note: "E10 · 128 GiB", price: 5.9 },
              { value: "Premium_LRS", label: "Premium SSD", note: "P10 · 128 GiB", price: 19.7 },
              { value: "Standard_LRS", label: "Standard HDD", note: "S10 · 32 GiB", price: 4.5 },
            ],
            default: "StandardSSD_LRS",
          },
          {
            key: "availabilitySet",
            label: "Availability set",
            type: "select",
            dynamic: "avset",
            options: [{ value: "", label: "No infrastructure redundancy required" }],
            default: "",
            help: "Place VMs in an availability set to protect against datacenter-wide failures (2+ VMs required for an SLA).",
          },
        ],
      },
      {
        title: "Networking",
        description: "VMs need a virtual network, a subnet and usually a public IP.",
        fields: [
          { key: "vnet", label: "Virtual network", type: "select", dynamic: "vnet", default: "__new__", help: "Create new or place the VM in an existing VNet." },
          { key: "publicIp", label: "Public inbound port", type: "select", options: [
            { value: "ssh", label: "Allow SSH (22)", note: "Linux recommended" },
            { value: "rdp", label: "Allow RDP (3389)" },
            { value: "http", label: "Allow HTTP (80) + HTTPS (443)", price: 3.6 },
            { value: "none", label: "No public inbound ports", note: "Most secure" },
          ], default: "ssh" },
          { key: "acceleratedNetworking", label: "Accelerated networking", type: "toggle", default: false },
        ],
      },
      {
        title: "Management",
        description: "Backups, diagnostics and automatic shutdown.",
        fields: [
          { key: "bootDiagnostics", label: "Boot diagnostics", type: "toggle", default: true },
          { key: "backup", label: "Enable Azure Backup", type: "toggle", default: false, price: 9.8, help: "Protects the VM with a Recovery Services vault." },
          { key: "autoShutdown", label: "Enable auto-shutdown", type: "toggle", default: false, help: "Stops the VM daily to save cost." },
          { key: "dataDisks", label: "Data disks (each 128 GiB Standard SSD)", type: "number", min: 0, max: 8, default: 0, help: "Additional disks mounted on the VM. Each ≈ $5.90 / month." },
        ],
      },
    ],
    metrics: [
      { key: "cpu", label: "Percentage CPU", unit: "%", base: 32, spread: 26, powerBased: true },
      { key: "mem", label: "Available memory", unit: "GiB", base: 2.1, spread: 1.1, powerBased: true },
      { key: "netin", label: "Network in total", unit: "MB", base: 140, spread: 120, powerBased: true },
      { key: "diskio", label: "OS disk IOPS", unit: "count", base: 90, spread: 70, powerBased: true },
    ],
    learn: [
      "A VM is billed per second while it is *running*, and only for disks + public IP when *deallocated*.",
      "Stopped (allocated) still pays for memory; Deallocated does not. Use auto-shutdown to control cost.",
      "The VM needs a NIC, a disk, a VNet/subnet and (optionally) a public IP — Azure creates these for you.",
    ],
    monthly: (p, region) => {
      let m = sizePrice(p.size) + (p.publicIp === "http" ? 3.6 : p.publicIp && p.publicIp !== "none" ? 3.6 : 0);
      m += p.diskType === "Premium_LRS" ? 19.7 : p.diskType === "Standard_LRS" ? 4.5 : 5.9;
      if (p.image === "Win2022Datacenter") m += 96;
      if (p.image === "RHEL94") m += 12;
      if (p.backup) m += 9.8;
      m += num(p.dataDisks, 0) * 5.9;
      if (p.autoShutdown) m *= 0.65;
      return m * regionIndex(region);
    },
    essentials: (r) => {
      const ip = r.props.publicIp && r.props.publicIp !== "none" ? publicIpFor(r) : "—";
      return [
        { label: "Public IP address", value: ip, mono: true },
        { label: "Virtual network / subnet", value: `${r.props.vnet} / default`, mono: true },
        { label: "Size", value: r.props.size, mono: true },
        { label: "Image", value: imageLabel(r.props.image) },
        { label: "Computer name", value: r.name, mono: true },
      ];
    },
  },

  /* --------------------------- Storage account --------------------------- */
  {
    id: "storage",
    name: "Storage account",
    resourceType: "Microsoft.Storage/storageAccounts",
    category: "Storage",
    blurb: "Durable, highly available object store for blobs, files, queues and tables.",
    glyph: "📦",
    colors: ["#37b6a9", "#0f6f7a"],
    status: "Succeeded",
    nameRule: { min: 3, max: 24, regex: /^[a-z0-9]+$/, hint: "3–24 characters, lowercase letters and numbers only (no spaces or hyphens)." },
    steps: [
      {
        title: "Data storage",
        description: "Redundancy decides how many copies of your data exist.",
        fields: [
          {
            key: "sku",
            label: "Redundancy",
            type: "select",
            options: [
              { value: "Standard_LRS", label: "Locally-redundant storage (LRS)", note: "3 copies in one datacenter", price: 4.2 },
              { value: "Standard_GRS", label: "Geo-redundant storage (GRS)", note: "6 copies across 2 regions", price: 8.6 },
              { value: "Standard_RAGRS", label: "Read-access geo-redundant (RA-GRS)", note: "GRS + read from secondary", price: 10.4 },
              { value: "Standard_GZRS", label: "Geo-zone-redundant (GZRS)", note: "Zones + geo", price: 11.2 },
              { value: "Premium_LRS", label: "Premium block blob (LRS)", note: "SSD backed, low latency", price: 22.5 },
            ],
            default: "Standard_LRS",
          },
          {
            key: "accessTier",
            label: "Access tier",
            type: "select",
            when: (p) => p.sku !== "Premium_LRS",
            options: [
              { value: "Hot", label: "Hot", note: "Frequent access, higher storage price" },
              { value: "Cool", label: "Cool", note: "Cheaper storage, 30-day early-delete" },
            ],
            default: "Hot",
          },
          { key: "hns", label: "Enable hierarchical namespace", type: "toggle", default: false, help: "Required for Azure Data Lake Storage Gen2." },
        ],
      },
      {
        title: "Advanced",
        fields: [
          { key: "publicAccess", label: "Allow blob public access", type: "toggle", default: true, help: "Disable for better security." },
          { key: "secureTransfer", label: "Require secure transfer (HTTPS)", type: "toggle", default: true },
          { key: "versioning", label: "Blob soft delete + versioning", type: "toggle", default: false, price: 1.4 },
        ],
      },
    ],
    metrics: [
      { key: "egress", label: "Egress", unit: "GB", base: 1.4, spread: 1.1 },
      { key: "transactions", label: "Transactions", unit: "count", base: 42000, spread: 30000 },
      { key: "latency", label: "Server latency", unit: "ms", base: 12, spread: 9 },
      { key: "capacity", label: "Used capacity", unit: "GB", base: 18, spread: 6 },
    ],
    learn: [
      "Storage account names are globally unique — that is why the name becomes part of your endpoint URL.",
      "LRS is cheapest and protects against disk/server failure; GRS protects against a whole region outage.",
      "Every storage account exposes blob, file, queue and table endpoints under one namespace.",
    ],
    monthly: (p, region) => {
      const base = ({ Standard_LRS: 4.2, Standard_GRS: 8.6, Standard_RAGRS: 10.4, Standard_GZRS: 11.2, Premium_LRS: 22.5 } as Record<string, number>)[p.sku] ?? 4.2;
      return (base + (p.versioning ? 1.4 : 0) + (p.accessTier === "Cool" ? -0.6 : 0)) * regionIndex(region);
    },
    essentials: (r) => [
      { label: "Primary blob endpoint", value: `https://${r.name}.blob.core.windows.net`, mono: true },
      { label: "Performance", value: r.props.sku === "Premium_LRS" ? "Premium" : "Standard" },
      { label: "Replication", value: r.props.sku },
      { label: "Access tier", value: r.props.accessTier ?? "Hot" },
    ],
  },

  /* ----------------------------- Web App -------------------------------- */
  {
    id: "webapp",
    name: "Web App (App Service)",
    resourceType: "Microsoft.Web/sites",
    category: "Web",
    blurb: "Fully managed hosting for web apps and APIs — no infrastructure to patch.",
    glyph: "🌐",
    colors: ["#4f9cf0", "#1f5fbf"],
    status: "Running",
    actions: ["restart", "stop", "start"],
    nameRule: { min: 2, max: 60, regex: /^[a-zA-Z0-9][a-zA-Z0-9-]*$/, hint: "The name must be globally unique: it becomes <name>.azurewebsites.net" },
    steps: [
      {
        title: "Instance details",
        fields: [
          {
            key: "runtime",
            label: "Runtime stack",
            type: "select",
            options: [
              { value: "node:20-lts", label: "Node.js 20 LTS" },
              { value: "dotnet:8", label: ".NET 8 (LTS)" },
              { value: "python:3.12", label: "Python 3.12" },
              { value: "java:17", label: "Java 17" },
              { value: "php:8.3", label: "PHP 8.3" },
              { value: "docker", label: "Docker Container" },
            ],
            default: "node:20-lts",
          },
          { key: "planTier", label: "Pricing plan", type: "select", required: true, options: [
            { value: "F1", label: "Free (F1)", note: "1 GB memory · 60 CPU min/day", price: 0 },
            { value: "D1", label: "Shared (D1)", note: "Shared infrastructure", price: 9.5 },
            { value: "B1", label: "Basic (B1)", note: "1 instance · 1.75 GB RAM", price: 13.14 },
            { value: "S1", label: "Standard (S1)", note: "Auto-scale, slots, 50 GB", price: 71.9 },
            { value: "P1v3", label: "Premium (P1v3)", note: "2 cores · 8 GB · zones", price: 145 },
          ], default: "F1" },
          { key: "instances", label: "Instances", type: "number", min: 1, max: 20, default: 1, help: "Instance count multiplies the plan price." },
          { key: "zoneRedundant", label: "Zone redundancy", type: "toggle", default: false, price: 0, when: (p) => p.planTier === "P1v3" },
        ],
      },
      {
        title: "Deployment",
        fields: [
          { key: "ci", label: "Enable continuous deployment (GitHub Actions)", type: "toggle", default: false },
          { key: "slots", label: "Deployment slots", type: "number", min: 0, max: 5, default: 0, help: "Slots are only available on Standard and above." },
        ],
      },
    ],
    metrics: [
      { key: "cpu", label: "CPU time", unit: "seconds", base: 42, spread: 30 },
      { key: "requests", label: "HTTP requests", unit: "count", base: 18500, spread: 14000 },
      { key: "resp", label: "Response time", unit: "ms", base: 190, spread: 140 },
      { key: "mem", label: "Memory working set", unit: "MiB", base: 220, spread: 130 },
    ],
    learn: [
      "App Service = plan + site. The plan defines the hardware; every app shares the plan's instances.",
      "Free/Shared tiers share CPU with other tenants and cannot scale out or use deployment slots.",
      "You can deploy with Git, GitHub Actions, ZIP deploy or a container image.",
    ],
    monthly: (p, region) => {
      const per = ({ F1: 0, D1: 9.5, B1: 13.14, S1: 71.9, P1v3: 145 } as Record<string, number>)[p.planTier] ?? 0;
      return per * num(p.instances, 1) * (p.zoneRedundant ? 1.3 : 1) * regionIndex(region);
    },
    essentials: (r) => [
      { label: "URL", value: `https://${r.name}.azurewebsites.net`, mono: true },
      { label: "App service plan", value: `${r.name}-plan (${r.props.planTier})` },
      { label: "Runtime", value: r.props.runtime },
      { label: "State", value: r.status },
    ],
  },

  /* --------------------------- SQL Database ------------------------------ */
  {
    id: "sql",
    name: "Azure SQL Database",
    resourceType: "Microsoft.Sql/servers/databases",
    category: "Databases",
    blurb: "Managed relational database with automatic tuning, backups and patching.",
    glyph: "🗄️",
    colors: ["#3fa9f5", "#0a4d8c"],
    status: "Online" as any,
    nameRule: { min: 2, max: 90, regex: /^[a-zA-Z][a-zA-Z0-9-_]*$/, hint: "Database name must start with a letter." },
    steps: [
      {
        title: "Database details",
        fields: [
          { key: "serverName", label: "Server name (must be globally unique)", type: "text", required: true, placeholder: "sql-server-01", help: "Lowercase letters, numbers and hyphens." },
          { key: "adminLogin", label: "Server admin login", type: "text", default: "sqladmin", required: true },
          { key: "adminPassword", label: "Password", type: "password", required: true },
          {
            key: "tier",
            label: "Compute + storage (DTU)",
            type: "select",
            options: [
              { value: "Basic", label: "Basic (5 DTU, 2 GB)", note: "Dev / test", price: 4.99 },
              { value: "S0", label: "Standard S0 (10 DTU, 250 GB)", price: 15 },
              { value: "S1", label: "Standard S1 (20 DTU, 250 GB)", price: 30 },
              { value: "S2", label: "Standard S2 (50 DTU, 250 GB)", price: 75 },
              { value: "S3", label: "Standard S3 (100 DTU, 250 GB)", price: 147 },
              { value: "P1", label: "Premium P1 (125 DTU, 500 GB)", price: 465 },
            ],
            default: "Basic",
          },
          { key: "collation", label: "Collation", type: "text", default: "SQL_Latin1_General_CP1_CI_AS", mono: true },
        ],
      },
      {
        title: "Backup & security",
        fields: [
          { key: "backupRedundancy", label: "Backup storage redundancy", type: "select", options: [
            { value: "Local", label: "Locally-redundant" },
            { value: "Zone", label: "Zone-redundant", price: 6 },
            { value: "Geo", label: "Geo-redundant", price: 11 },
          ], default: "Local" },
          { key: "aadOnly", label: "Microsoft Entra-only authentication", type: "toggle", default: false },
        ],
      },
    ],
    metrics: [
      { key: "dtu", label: "DTU used", unit: "%", base: 24, spread: 22 },
      { key: "cpu", label: "CPU percentage", unit: "%", base: 28, spread: 25 },
      { key: "conn", label: "Active connections", unit: "count", base: 18, spread: 14 },
      { key: "deadlocks", label: "Deadlocks", unit: "count", base: 0.4, spread: 0.8 },
    ],
    learn: [
      "A logical SQL server hosts many databases; the server name is part of the connection string.",
      "DTU = bundled measure of CPU + memory + I/O. vCore lets you pick hardware instead.",
      "Connections use port 1433 and you must allow your client IP in the server firewall.",
    ],
    monthly: (p, region) => {
      const base = ({ Basic: 4.99, S0: 15, S1: 30, S2: 75, S3: 147, P1: 465 } as Record<string, number>)[p.tier] ?? 5;
      return (base + (p.backupRedundancy === "Zone" ? 6 : p.backupRedundancy === "Geo" ? 11 : 0)) * regionIndex(region);
    },
    essentials: (r) => [
      { label: "Server name", value: `${r.props.serverName}.database.windows.net`, mono: true },
      { label: "Server admin", value: r.props.adminLogin, mono: true },
      { label: "Edition / tier", value: r.props.tier },
      { label: "Connection string", value: `Server=tcp:${r.props.serverName}.database.windows.net,1433;Database=${r.name};User ID=${r.props.adminLogin}`, mono: true },
    ],
  },

  /* ------------------------------ Cosmos DB ------------------------------ */
  {
    id: "cosmos",
    name: "Azure Cosmos DB",
    resourceType: "Microsoft.DocumentDB/databaseAccounts",
    category: "Databases",
    blurb: "Globally distributed, multi-model NoSQL database with single-digit-ms latency.",
    glyph: "🪐",
    colors: ["#4fd1c5", "#2b6cb0"],
    status: "Succeeded",
    nameRule: { min: 3, max: 44, regex: /^[a-z0-9-]+$/, hint: "3–44 characters, lowercase letters, numbers and hyphens." },
    steps: [
      {
        title: "Database details",
        fields: [
          {
            key: "api",
            label: "API",
            type: "select",
            options: [
              { value: "NoSQL", label: "NoSQL (recommended)" },
              { value: "MongoDB", label: "MongoDB (vCore)" },
              { value: "Cassandra", label: "Cassandra" },
              { value: "Gremlin", label: "Gremlin (graph)" },
              { value: "Table", label: "Table" },
            ],
            default: "NoSQL",
          },
          {
            key: "consistency",
            label: "Consistency level",
            type: "select",
            options: [
              { value: "Session", label: "Session (default)" },
              { value: "Eventual", label: "Eventual" },
              { value: "ConsistentPrefix", label: "Consistent prefix" },
              { value: "BoundedStaleness", label: "Bounded staleness" },
              { value: "Strong", label: "Strong" },
            ],
            default: "Session",
            help: "Strong consistency costs more RU/s.",
          },
          { key: "freeTier", label: "Apply free tier (1000 RU/s + 25 GB)", type: "toggle", default: false },
          { key: "throughput", label: "Provisioned throughput (RU/s)", type: "number", min: 400, max: 100000, default: 400 },
        ],
      },
      {
        title: "Containers",
        fields: [
          { key: "databaseName", label: "Database id", type: "text", default: "ToDoList", required: true },
          { key: "containerName", label: "Container id", type: "text", default: "Items", required: true },
          { key: "partitionKey", label: "Partition key", type: "text", default: "/category", mono: true, required: true },
        ],
      },
    ],
    metrics: [
      { key: "ru", label: "Total request units", unit: "RU/s", base: 380, spread: 260 },
      { key: "reqs", label: "Requests", unit: "count", base: 24000, spread: 18000 },
      { key: "latency", label: "Server-side latency", unit: "ms", base: 6, spread: 5 },
    ],
    learn: [
      "Cosmos DB bills on RU/s (request units per second) plus storage, not on VM size.",
      "The partition key decides how data is spread across physical partitions — pick a high-cardinality one.",
      "Change feed, TTL and multi-region writes are built in.",
    ],
    monthly: (p) => {
      const rus = Math.max(0, num(p.throughput, 400) - (p.freeTier ? 1000 : 0));
      return (rus * 0.008 * 730) / 100 + 1.2 + num(p.throughput, 400) * 0.0004;
    },
    essentials: (r) => [
      { label: "URI", value: `https://${r.name}.documents.azure.com:443/`, mono: true },
      { label: "API", value: r.props.api },
      { label: "Consistency", value: r.props.consistency },
      { label: "Default consistency RU/s", value: String(r.props.throughput) },
    ],
  },

  /* -------------------------------- VNet -------------------------------- */
  {
    id: "vnet",
    name: "Virtual network",
    resourceType: "Microsoft.Network/virtualNetworks",
    category: "Networking",
    blurb: "Private, isolated network in Azure with subnets, peering and security groups.",
    glyph: "🕸️",
    colors: ["#5b7cfa", "#2b3f9e"],
    status: "Succeeded",
    nameRule: { min: 2, max: 64, regex: /^[a-zA-Z][a-zA-Z0-9-_]*$/, hint: "Must start with a letter." },
    steps: [
      {
        title: "Address space",
        description: "Use a private CIDR range from RFC1918.",
        fields: [
          {
            key: "cidr",
            label: "IPv4 address space",
            type: "text",
            default: "10.0.0.0/16",
            required: true,
            mono: true,
            help: "Valid private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
          },
          { key: "subnetName", label: "Subnet name", type: "text", default: "default" },
          { key: "subnetCidr", label: "Subnet address range", type: "text", default: "10.0.0.0/24", required: true, mono: true },
        ],
      },
      {
        title: "Security",
        fields: [
          { key: "ddos", label: "Enable DDoS Network Protection", type: "toggle", default: false, price: 295, help: "Expensive! Only for production workloads." },
          { key: "firewall", label: "Enable Azure Firewall", type: "toggle", default: false, price: 175 },
          { key: "bastion", label: "Deploy Azure Bastion", type: "toggle", default: false, price: 140, help: "Secure browser-based SSH/RDP without public IPs." },
        ],
      },
    ],
    metrics: [
      { key: "packets", label: "Packets in", unit: "count", base: 86000, spread: 60000 },
      { key: "bytes", label: "Bytes dropped by NSG", unit: "count", base: 1200, spread: 900 },
    ],
    learn: [
      "A VNet is regional — it lives in one Azure region and one subscription.",
      "Subnets carve the address space; Azure reserves 5 IPs in every subnet.",
      "NSGs are attached to subnets or NICs and are stateful firewalls.",
    ],
    monthly: (p) => (p.ddos ? 295 : 0) + (p.firewall ? 175 : 0) + (p.bastion ? 140 : 0),
    essentials: (r) => [
      { label: "Address space", value: r.props.cidr, mono: true },
      { label: "Subnets", value: `${r.props.subnetName} (${r.props.subnetCidr})`, mono: true },
      { label: "DDoS protection", value: p2s(r.props.ddos) },
    ],
  },

  /* --------------------------------- NSG -------------------------------- */
  {
    id: "nsg",
    name: "Network security group",
    resourceType: "Microsoft.Network/networkSecurityGroups",
    category: "Networking",
    blurb: "Filter traffic to subnets and NICs with priority-ordered rules.",
    glyph: "🛡️",
    colors: ["#4c8bf5", "#123a7a"],
    status: "Succeeded",
    nameRule: { min: 1, max: 80, regex: /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, hint: "Letters, numbers, '_', '.', '-'." },
    steps: [
      {
        title: "Inbound security rules",
        fields: [
          {
            key: "rule",
            label: "Inbound rule template",
            type: "select",
            options: [
              { value: "ssh", label: "Allow SSH (22) from anywhere", note: "Priority 1000" },
              { value: "rdp", label: "Allow RDP (3389) from anywhere", note: "Priority 1010" },
              { value: "http", label: "Allow HTTP (80) from anywhere", note: "Priority 1020" },
              { value: "https", label: "Allow HTTPS (443) from anywhere", note: "Priority 1030" },
              { value: "custom", label: "Custom rule" },
              { value: "none", label: "No extra rules (default deny)" },
            ],
            default: "ssh",
          },
          { key: "port", label: "Destination port ranges", type: "text", default: "22", mono: true, when: (p) => p.rule === "custom" },
          { key: "priority", label: "Priority (100–4096)", type: "number", min: 100, max: 4096, default: 1000, when: (p) => p.rule === "custom" },
          { key: "source", label: "Source", type: "select", options: [
            { value: "Any", label: "Any" },
            { value: "10.0.0.0/16", label: "10.0.0.0/16 (my VNet)" },
            { value: "Internet", label: "Internet" },
          ], default: "Any" },
        ],
      },
    ],
    metrics: [
      { key: "hit", label: "Rules hit", unit: "count", base: 4200, spread: 3000 },
      { key: "denied", label: "Denied flows", unit: "count", base: 340, spread: 300 },
    ],
    learn: [
      "Rules are evaluated from the LOWEST priority number first; the first match wins.",
      "Every NSG has default rules (allow VNet traffic, allow outbound Internet, deny inbound).",
      "Attach an NSG to a subnet to protect every NIC inside it.",
    ],
    monthly: () => 0,
    essentials: (r) => [
      { label: "Inbound rule", value: ruleLabel(r.props) },
      { label: "Priority", value: String(r.props.priority ?? 1000) },
      { label: "Source", value: r.props.source ?? "Any" },
    ],
  },

  /* ------------------------------ Public IP ----------------------------- */
  {
    id: "pip",
    name: "Public IP address",
    resourceType: "Microsoft.Network/publicIPAddresses",
    category: "Networking",
    blurb: "A routable IP address you can attach to a VM, load balancer or gateway.",
    glyph: "📍",
    colors: ["#5aa9f5", "#154a8a"],
    status: "Succeeded",
    nameRule: { min: 1, max: 80, regex: /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, hint: "Letters, numbers, '_', '.', '-'." },
    steps: [
      {
        title: "IP details",
        fields: [
          { key: "sku", label: "SKU", type: "select", options: [
            { value: "Standard", label: "Standard", note: "Static, zone aware, secure by default", price: 3.6 },
            { value: "Basic", label: "Basic", note: "Retiring soon", price: 3.6 },
          ], default: "Standard" },
          { key: "assignment", label: "IP address assignment", type: "select", options: [
            { value: "Static", label: "Static" },
            { value: "Dynamic", label: "Dynamic" },
          ], default: "Static" },
          { key: "tier", label: "Routing preference", type: "select", options: [
            { value: "Microsoft network", label: "Microsoft network" },
            { value: "Internet", label: "Internet (through ISP)" },
          ], default: "Microsoft network" },
        ],
      },
    ],
    metrics: [
      { key: "in", label: "Bytes in", unit: "GB", base: 0.9, spread: 0.7 },
      { key: "out", label: "Bytes out", unit: "GB", base: 2.4, spread: 1.8 },
    ],
    learn: [
      "Static IPs keep the same address even after the resource is restarted.",
      "Standard SKU public IPs are secure by default — traffic must be allowed by an NSG.",
      "A public IP is billed hourly whether it is attached or not.",
    ],
    monthly: (_p, region) => 3.6 * regionIndex(region),
    essentials: (r) => [{ label: "IP address", value: publicIpFor(r), mono: true }, { label: "SKU", value: r.props.sku }],
  },

  /* ---------------------------- Load balancer --------------------------- */
  {
    id: "lb",
    name: "Load balancer",
    resourceType: "Microsoft.Network/loadBalancers",
    category: "Networking",
    blurb: "Layer-4 (TCP/UDP) traffic distribution with health probes.",
    glyph: "⚖️",
    colors: ["#4d9cf5", "#123f80"],
    status: "Succeeded",
    nameRule: { min: 1, max: 80, regex: /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/, hint: "Letters, numbers, '_', '.', '-'." },
    steps: [
      {
        title: "Configuration",
        fields: [
          { key: "sku", label: "SKU", type: "select", options: [
            { value: "Standard", label: "Standard", note: "Zone redundant", price: 18 },
            { value: "Basic", label: "Basic", price: 18 },
            { value: "Gateway", label: "Gateway", note: "For NVAs", price: 240 },
          ], default: "Standard" },
          { key: "type", label: "Type", type: "select", options: [
            { value: "Public", label: "Public" },
            { value: "Internal", label: "Internal" },
          ], default: "Public" },
          { key: "rules", label: "Backend pool rule port", type: "number", min: 1, max: 65535, default: 80 },
        ],
      },
    ],
    metrics: [
      { key: " SYN", label: "SYN count", unit: "count", base: 12000, spread: 8000 },
      { key: "snat", label: "SNAT port usage", unit: "%", base: 12, spread: 10 },
    ],
    learn: [
      "Health probes remove unhealthy backends from rotation automatically.",
      "Standard load balancer is zone redundant and required for availability zones.",
      "Use Application Gateway (layer 7) when you need SSL termination or URL routing.",
    ],
    monthly: (p, region) => (p.sku === "Gateway" ? 240 : 18) * regionIndex(region),
    essentials: (r) => [{ label: "Frontend IP", value: publicIpFor(r), mono: true }, { label: "Backend port", value: String(r.props.rules ?? 80) }],
  },

  /* -------------------------------- AKS --------------------------------- */
  {
    id: "aks",
    name: "Azure Kubernetes Service",
    resourceType: "Microsoft.ContainerService/managedClusters",
    category: "Containers",
    blurb: "Managed Kubernetes control plane with node pools you configure.",
    glyph: "☸️",
    colors: ["#4f8ef7", "#0f3d84"],
    status: "Succeeded",
    actions: ["stop", "start"],
    nameRule: { min: 1, max: 63, regex: /^[a-z0-9][a-zA-Z0-9-]*$/, hint: "1–63 chars, start with a letter or number." },
    steps: [
      {
        title: "Cluster basics",
        fields: [
          { key: "k8sVersion", label: "Kubernetes version", type: "select", options: [
            { value: "1.31.7", label: "1.31.7 (default)" },
            { value: "1.30.11", label: "1.30.11" },
            { value: "1.29.9", label: "1.29.9" },
          ], default: "1.31.7" },
          { key: "nodeSize", label: "Node size", type: "select", options: VMSIZES.slice(1, 5), default: "Standard_D2s_v5" },
          { key: "nodeCount", label: "Node count", type: "number", min: 1, max: 100, default: 2 },
          { key: "autoscale", label: "Enable cluster autoscaler", type: "toggle", default: true },
          { key: "zones", label: "Availability zones", type: "toggle", default: false, help: "Spreads nodes across physical datacenters." },
        ],
      },
      {
        title: "Networking",
        fields: [
          { key: "networkPlugin", label: "Network plugin", type: "select", options: [
            { value: "azure", label: "Azure CNI (overlay)" },
            { value: "kubenet", label: "kubenet" },
          ], default: "azure" },
          { key: "privateCluster", label: "Private cluster (no public API server)", type: "toggle", default: false, price: 22 },
          { key: "aci", label: "Virtual nodes (ACI)", type: "toggle", default: false },
        ],
      },
    ],
    metrics: [
      { key: "nodes", label: "Node count", unit: "count", base: 2, spread: 1 },
      { key: "pods", label: "Running pods", unit: "count", base: 14, spread: 8 },
      { key: "cpu", label: "Node CPU usage", unit: "%", base: 38, spread: 24 },
    ],
    learn: [
      "AKS gives you the Kubernetes API server for free; you only pay for the worker nodes.",
      "Use `kubectl get nodes` after `az aks get-credentials` to connect.",
      "Node pools can mix sizes — add a GPU pool for AI workloads.",
    ],
    monthly: (p, region) => (sizePrice(p.nodeSize) * num(p.nodeCount, 1) + (p.privateCluster ? 22 : 0)) * regionIndex(region),
    essentials: (r) => [
      { label: "Kubernetes version", value: r.props.k8sVersion },
      { label: "API server", value: r.props.privateCluster ? "private" : `${r.name}.hcp.${r.location}.azmk8s.io`, mono: true },
      { label: "Node pool", value: `nodepool1 · ${r.props.nodeSize} × ${r.props.nodeCount}` },
    ],
  },

  /* ------------------------------- ACR ---------------------------------- */
  {
    id: "acr",
    name: "Container registry",
    resourceType: "Microsoft.ContainerRegistry/registries",
    category: "Containers",
    blurb: "Private Docker registry with geo-replication and image scanning.",
    glyph: "🧱",
    colors: ["#4b90f4", "#0e3a75"],
    status: "Succeeded",
    nameRule: { min: 5, max: 50, regex: /^[a-zA-Z0-9]+$/, hint: "5–50 alphanumeric characters, globally unique." },
    steps: [
      {
        title: "Registry details",
        fields: [
          { key: "sku", label: "SKU", type: "select", options: [
            { value: "Basic", label: "Basic", note: "10 GiB included", price: 5 },
            { value: "Standard", label: "Standard", note: "100 GiB, more throughput", price: 20 },
            { value: "Premium", label: "Premium", note: "500 GiB, geo-replication", price: 100 },
          ], default: "Basic" },
          { key: "adminUser", label: "Enable admin user", type: "toggle", default: false, help: "Needed for older Docker logins, less secure." },
          { key: "geoReplication", label: "Geo-replication", type: "toggle", default: false, when: (p) => p.sku === "Premium", price: 100 },
        ],
      },
    ],
    metrics: [
      { key: "pushes", label: "Push operations", unit: "count", base: 42, spread: 30 },
      { key: "storage", label: "Storage used", unit: "GiB", base: 3.2, spread: 1.4 },
    ],
    learn: [
      "Build images in the cloud with `az acr build` — no Docker daemon required locally.",
      "ACR integrates with AKS using a service principal or managed identity.",
      "Registry names are global: myregistry.azurecr.io.",
    ],
    monthly: (p) => (({ Basic: 5, Standard: 20, Premium: 100 } as Record<string, number>)[p.sku] ?? 5) * (p.geoReplication ? 2 : 1),
    essentials: (r) => [{ label: "Login server", value: `${r.name}.azurecr.io`, mono: true }, { label: "SKU", value: r.props.sku }],
  },

  /* ------------------------------ Functions ----------------------------- */
  {
    id: "func",
    name: "Function App",
    resourceType: "Microsoft.Web/sites (functionApp)",
    category: "Compute",
    blurb: "Serverless event-driven code that scales on demand.",
    glyph: "⚡",
    colors: ["#4fa3f5", "#0b4a91"],
    status: "Running",
    actions: ["restart", "stop", "start"],
    nameRule: { min: 2, max: 60, regex: /^[a-zA-Z0-9][a-zA-Z0-9-]*$/, hint: "Globally unique app name." },
    steps: [
      {
        title: "Hosting",
        fields: [
          { key: "runtime", label: "Runtime stack", type: "select", options: [
            { value: "node:20", label: "Node.js 20" },
            { value: "dotnet-isolated:8", label: ".NET 8 isolated" },
            { value: "python:3.12", label: "Python 3.12" },
            { value: "java:17", label: "Java 17" },
            { value: "powershell:7.4", label: "PowerShell 7.4" },
          ], default: "node:20" },
          { key: "storage", label: "Storage account (required)", type: "select", dynamic: "storage", required: true, help: "Functions use a storage account for triggers and state." },
          { key: "planTier", label: "Plan", type: "select", options: [
            { value: "Consumption", label: "Consumption (Serverless)", note: "Pay per execution", price: 0 },
            { value: "Flex", label: "Flex Consumption", price: 12 },
            { value: "Premium", label: "Premium (EP1)", note: "Always warm, VNet", price: 146 },
          ], default: "Consumption" },
          { key: "appInsights", label: "Enable Application Insights", type: "toggle", default: true },
        ],
      },
    ],
    metrics: [
      { key: "exec", label: "Function execution count", unit: "count", base: 42000, spread: 30000 },
      { key: "dur", label: "Function execution units", unit: "MB·ms", base: 9000, spread: 6000 },
      { key: "errors", label: "Errors", unit: "count", base: 3, spread: 5 },
    ],
    learn: [
      "Triggers start a function (HTTP, timer, queue, event hub). Bindings read/write data.",
      "On the Consumption plan you pay per execution time and memory — cold starts apply.",
      "The storage account requirement exists because of the durable/durable-functions runtime.",
    ],
    monthly: (p, region) => (({ Consumption: 0, Flex: 12, Premium: 146 } as any)[p.planTier] ?? 0) * regionIndex(region),
    essentials: (r) => [
      { label: "URL", value: `https://${r.name}.azurewebsites.net/api`, mono: true },
      { label: "Runtime", value: r.props.runtime },
      { label: "Plan", value: r.props.planTier },
    ],
  },

  /* ------------------------------- Redis -------------------------------- */
  {
    id: "redis",
    name: "Azure Cache for Redis",
    resourceType: "Microsoft.Cache/redis",
    category: "Databases",
    blurb: "In-memory data store for caching, sessions and queues.",
    glyph: "🚀",
    colors: ["#4b8ef7", "#0a3d7d"],
    status: "Succeeded",
    actions: ["reboot", "stop"],
    nameRule: { min: 1, max: 63, regex: /^[a-zA-Z0-9][a-zA-Z0-9-]*$/, hint: "DNS name must be globally unique." },
    steps: [
      {
        title: "Cache details",
        fields: [
          { key: "sku", label: "Pricing tier", type: "select", options: [
            { value: "Basic", label: "Basic C0 (250 MB)", note: "No SLA, single node", price: 16 },
            { value: "Standard", label: "Standard C1 (1 GB)", note: "Replica + SLA", price: 62 },
            { value: "Premium", label: "Premium P1 (6 GB)", note: "VNet, cluster, persistence", price: 400 },
          ], default: "Standard" },
          { key: "nonSsl", label: "Allow non-TLS access (port 6379)", type: "toggle", default: false },
          { key: "persistence", label: "Persistence (AOF)", type: "toggle", default: false, price: 30, when: (p) => p.sku === "Premium" },
        ],
      },
    ],
    metrics: [
      { key: "hits", label: "Cache hits", unit: "count", base: 120000, spread: 70000 },
      { key: "miss", label: "Cache misses", unit: "count", base: 9000, spread: 7000 },
      { key: "mem", label: "Used memory", unit: "%", base: 44, spread: 25 },
      { key: "lat", label: "Server load", unit: "%", base: 22, spread: 18 },
    ],
    learn: [
      "Basic has no SLA — use Standard or Premium in production.",
      "Cache-aside pattern: read Redis first, fall back to the database, then populate the cache.",
      "Premium can be injected into a VNet for private access.",
    ],
    monthly: (p, region) => (({ Basic: 16, Standard: 62, Premium: 400 })[p.sku as string] ?? 62) * regionIndex(region) + (p.persistence ? 30 : 0),
    essentials: (r) => [{ label: "Host name", value: `${r.name}.redis.cache.windows.net:6380`, mono: true }, { label: "Tier", value: r.props.sku }],
  },

  /* ---------------------------- PostgreSQL ------------------------------ */
  {
    id: "pg",
    name: "Azure Database for PostgreSQL",
    resourceType: "Microsoft.DBforPostgreSQL/flexibleServers",
    category: "Databases",
    blurb: "Flexible-server managed PostgreSQL with zone-redundant HA.",
    glyph: "🐘",
    colors: ["#4b8ef7", "#1b3f8f"],
    status: "Running",
    actions: ["stop", "restart", "start"],
    nameRule: { min: 3, max: 63, regex: /^[a-z0-9][a-z0-9-]*$/, hint: "3–63 lowercase chars, globally unique server name." },
    steps: [
      {
        title: "Server details",
        fields: [
          { key: "adminUser", label: "Admin username", type: "text", default: "pgadmin", required: true },
          { key: "adminPassword", label: "Password", type: "password", required: true },
          { key: "version", label: "PostgreSQL version", type: "select", options: [
            { value: "16", label: "PostgreSQL 16" },
            { value: "15", label: "PostgreSQL 15" },
            { value: "14", label: "PostgreSQL 14" },
          ], default: "16" },
          { key: "tier", label: "Compute tier", type: "select", options: [
            { value: "B_Standard_B1ms", label: "Burstable B1ms (1 vCPU / 2 GB)", price: 24 },
            { value: "GP_Standard_D2ds_v4", label: "General Purpose D2ds_v4 (2/8)", price: 105 },
            { value: "MO_Standard_E2ds_v4", label: "Memory Optimized E2ds_v4 (2/16)", price: 158 },
          ], default: "B_Standard_B1ms" },
          { key: "storage", label: "Storage size (GiB)", type: "number", min: 32, max: 16384, default: 32, help: "Each 32 GiB ≈ $5.4 / month." },
          { key: "ha", label: "Zone-redundant high availability", type: "toggle", default: false, price: 100, help: "Doubles the compute cost." },
        ],
      },
    ],
    metrics: [
      { key: "cpu", label: "CPU percent", unit: "%", base: 21, spread: 20 },
      { key: "conn", label: "Active connections", unit: "count", base: 12, spread: 9 },
      { key: "iops", label: "IOPS", unit: "count", base: 180, spread: 120 },
      { key: "storage", label: "Storage used", unit: "%", base: 14, spread: 8 },
    ],
    learn: [
      "Flexible Server lets you stop the database and pay only for storage — great for labs.",
      "Connection strings use port 5432 and require SSL.",
      "HA creates a standby replica in another availability zone.",
    ],
    monthly: (p, region) => {
      const base = ({ B_Standard_B1ms: 24, GP_Standard_D2ds_v4: 105, MO_Standard_E2ds_v4: 158 } as Record<string, number>)[p.tier] ?? 24;
      return (base * (p.ha ? 2 : 1) + num(p.storage, 32) * 0.17) * regionIndex(region);
    },
    essentials: (r) => [
      { label: "Server name", value: `${r.name}.postgres.database.azure.com`, mono: true },
      { label: "Version", value: `PostgreSQL ${r.props.version}` },
      { label: "Compute", value: r.props.tier },
    ],
  },

  /* ----------------------------- Key Vault ------------------------------ */
  {
    id: "kv",
    name: "Key Vault",
    resourceType: "Microsoft.KeyVault/vaults",
    category: "Security",
    blurb: "Central store for secrets, keys and certificates with audit logging.",
    glyph: "🔑",
    colors: ["#4f8ef7", "#153f7d"],
    status: "Succeeded",
    nameRule: { min: 3, max: 24, regex: /^[a-zA-Z][a-zA-Z0-9-]*$/, hint: "3–24 chars, start with a letter, letters/digits/hyphens." },
    steps: [
      {
        title: "Vault details",
        fields: [
          { key: "sku", label: "SKU", type: "select", options: [
            { value: "standard", label: "Standard", note: "Software-protected keys", price: 0.03 },
            { value: "premium", label: "Premium", note: "HSM-backed keys", price: 1.2 },
          ], default: "standard" },
          { key: "rbac", label: "Azure role-based access control (RBAC)", type: "toggle", default: true, help: "Recommended over access policies." },
          { key: "purgeProtection", label: "Enable purge protection", type: "toggle", default: false },
          { key: "softDeleteDays", label: "Soft delete retention (days)", type: "number", min: 7, max: 90, default: 90 },
        ],
      },
    ],
    metrics: [
      { key: "hits", label: "Vault API hits", unit: "count", base: 3200, spread: 2200 },
      { key: "lat", label: "Service API latency", unit: "ms", base: 42, spread: 30 },
    ],
    learn: [
      "Never store secrets in code or environment files — reference them with a Key Vault URI.",
      "Access is granted with RBAC roles such as 'Key Vault Secrets User'.",
      "Soft delete keeps deleted objects recoverable for the retention period.",
    ],
    monthly: (p) => (p.sku === "premium" ? 1.2 : 0.03) * 30,
    essentials: (r) => [
      { label: "Vault URI", value: `https://${r.name}.vault.azure.net/`, mono: true },
      { label: "Access model", value: r.props.rbac ? "Azure RBAC" : "Access policies" },
    ],
  },

  /* --------------------------- Static Web App --------------------------- */
  {
    id: "swa",
    name: "Static Web App",
    resourceType: "Microsoft.Web/staticSites",
    category: "Web",
    blurb: "Free TLS, global distribution and GitHub CI for static front-ends.",
    glyph: "📄",
    colors: ["#4f9bf5", "#12467f"],
    status: "Running",
    actions: ["restart"],
    nameRule: { min: 1, max: 60, regex: /^[a-zA-Z0-9][a-zA-Z0-9-]*$/, hint: "Globally unique app name." },
    steps: [
      {
        title: "App details",
        fields: [
          { key: "sku", label: "Pricing tier", type: "select", options: [
            { value: "Free", label: "Free", note: "Custom domains, 100 GB", price: 0 },
            { value: "Standard", label: "Standard", note: "Custom domains, 500 GB, auth", price: 9 },
          ], default: "Free" },
          { key: "runtime", label: "Build presets", type: "select", options: [
            { value: "react", label: "React" },
            { value: "angular", label: "Angular" },
            { value: "vue", label: "Vue" },
            { value: "svelte", label: "Svelte" },
            { value: "static", label: "No framework" },
          ], default: "react" },
          { key: "source", label: "Source", type: "select", options: [
            { value: "github", label: "GitHub" },
            { value: "none", label: "Deploy manually" },
          ], default: "github" },
        ],
      },
    ],
    metrics: [
      { key: "req", label: "Requests", unit: "count", base: 92000, spread: 60000 },
      { key: "bytes", label: "Bytes served", unit: "GB", base: 2.1, spread: 1.6 },
    ],
    learn: [
      "Static Web Apps are served from Azure Front Door edge locations.",
      "Free tier includes custom domains and free TLS certificates.",
      "CI is generated for you when you connect a GitHub repository.",
    ],
    monthly: (p) => (p.sku === "Standard" ? 9 : 0),
    essentials: (r) => [{ label: "URL", value: `https://${r.name}.azurestaticapps.net`, mono: true }, { label: "Source", value: r.props.source }],
  },

  /* ------------------------- Log Analytics ------------------------------ */
  {
    id: "log",
    name: "Log Analytics workspace",
    resourceType: "Microsoft.OperationalInsights/workspaces",
    category: "Analytics",
    blurb: "Collect logs and metrics from Azure resources and query them with KQL.",
    glyph: "📊",
    colors: ["#4f8ef7", "#14406f"],
    status: "Succeeded",
    nameRule: { min: 4, max: 63, regex: /^[a-zA-Z0-9][a-zA-Z0-9-_.]*$/, hint: "4–63 characters." },
    steps: [
      {
        title: "Workspace details",
        fields: [
          { key: "pricing", label: "Pricing model", type: "select", options: [
            { value: "PerGB2018", label: "Pay-as-you-go (per GB)", price: 8 },
            { value: "CapacityReservation", label: "Capacity reservation (100 GB/day)", price: 165 },
          ], default: "PerGB2018" },
          { key: "retention", label: "Data retention (days)", type: "number", min: 30, max: 730, default: 30, help: "Retention beyond 31 days costs extra." },
          { key: "dailyCap", label: "Daily cap (GB)", type: "number", min: 1, max: 1000, default: 10 },
        ],
      },
    ],
    metrics: [
      { key: "ingest", label: "Data ingested", unit: "GB", base: 0.8, spread: 0.6 },
      { key: "queries", label: "KQL queries", unit: "count", base: 260, spread: 180 },
    ],
    learn: [
      "Send diagnostics with a *diagnostic setting* — pick the workspace as destination.",
      "Query with KQL: `AzureActivity | where TimeGenerated > ago(1h)`.",
      "Application Insights resources can be attached to a workspace.",
    ],
    monthly: (p) => (p.pricing === "CapacityReservation" ? 165 : 8 + Math.max(0, num(p.retention, 30) - 31) * 0.12),
    essentials: (r) => [
      { label: "Workspace ID", value: wsId(r.name), mono: true },
      { label: "Pricing", value: r.props.pricing },
      { label: "Retention", value: `${r.props.retention} days` },
    ],
  },

  /* ---------------------------- Service Bus ----------------------------- */
  {
    id: "sb",
    name: "Service Bus namespace",
    resourceType: "Microsoft.ServiceBus/namespaces",
    category: "Integration",
    blurb: "Reliable enterprise message broker with queues and topics.",
    glyph: "📨",
    colors: ["#4f8ef7", "#17427f"],
    status: "Active" as any,
    nameRule: { min: 6, max: 50, regex: /^[a-zA-Z][a-zA-Z0-9-]*$/, hint: "6–50 characters, must start with a letter, globally unique." },
    steps: [
      {
        title: "Namespace details",
        fields: [
          { key: "sku", label: "Pricing tier", type: "select", options: [
            { value: "Basic", label: "Basic", note: "Queues only, 256 KB", price: 5 },
            { value: "Standard", label: "Standard", note: "Topics, sessions, 256 KB", price: 10 },
            { value: "Premium", label: "Premium", note: "Dedicated, 100 MB", price: 660 },
          ], default: "Standard" },
          { key: "entity", label: "Queue / topic name", type: "text", default: "orders" },
          { key: "partitioning", label: "Enable partitioning", type: "toggle", default: true, when: (p) => p.sku === "Standard" },
        ],
      },
    ],
    metrics: [
      { key: "msgs", label: "Incoming messages", unit: "count", base: 48000, spread: 32000 },
      { key: "size", label: "Queue size", unit: "MB", base: 24, spread: 18 },
    ],
    learn: [
      "Queues = point to point. Topics = publish/subscribe with subscriptions.",
      "Messages can be delivered At-Least-Once or duplicated detection can be enabled.",
      "Premium tier runs on dedicated resources for predictable latency.",
    ],
    monthly: (p) => (({ Basic: 5, Standard: 10, Premium: 660 })[p.sku as string] ?? 10),
    essentials: (r) => [{ label: "Endpoint", value: `https://${r.name}.servicebus.windows.net:443/`, mono: true }, { label: "Entity", value: r.props.entity }],
  },

  /* ------------------------------ AI services --------------------------- */
  {
    id: "ai",
    name: "Azure AI services",
    resourceType: "Microsoft.CognitiveServices/accounts",
    category: "AI + machine learning",
    blurb: "Managed APIs for language, speech, vision and generative models.",
    glyph: "🧠",
    colors: ["#6a8ef7", "#2a3f9e"],
    status: "Succeeded",
    nameRule: { min: 2, max: 64, regex: /^[a-zA-Z0-9][a-zA-Z0-9-]*$/, hint: "2–64 characters." },
    steps: [
      {
        title: "Resource details",
        fields: [
          { key: "kind", label: "Service type", type: "select", options: [
            { value: "OpenAI", label: "Azure OpenAI", note: "GPT-class models" },
            { value: "ComputerVision", label: "Computer Vision" },
            { value: "SpeechServices", label: "Speech" },
            { value: "TextAnalytics", label: "Language" },
          ], default: "OpenAI" },
          { key: "tier", label: "Pricing tier", type: "select", options: [
            { value: "S0", label: "Standard (S0)", note: "Pay as you go", price: 12 },
            { value: "F0", label: "Free (F0)", note: "20 calls / min", price: 0 },
          ], default: "S0" },
          { key: "quota", label: "Tokens per minute (thousands)", type: "number", min: 1, max: 1000, default: 10, when: (p) => p.kind === "OpenAI" },
        ],
      },
    ],
    metrics: [
      { key: "calls", label: "API calls", unit: "count", base: 26000, spread: 18000 },
      { key: "tokens", label: "Tokens processed", unit: "k", base: 1400, spread: 900 },
      { key: "lat", label: "Latency", unit: "ms", base: 720, spread: 420 },
    ],
    learn: [
      "AI resources expose a key + endpoint; rotate keys regularly.",
      "Quotas (tokens per minute) protect you from runaway spend.",
      "Content filters are on by default for generative models.",
    ],
    monthly: (p, region) => (p.tier === "F0" ? 0 : 12 + num(p.quota, 10) * 0.35) * regionIndex(region),
    essentials: (r) => [
      { label: "Endpoint", value: `https://${r.name}.openai.azure.com/`, mono: true },
      { label: "Key 1", value: aiKey(r.name, 1), mono: true },
      { label: "Key 2", value: aiKey(r.name, 2), mono: true },
    ],
  },

  /* ------------------------- Recovery Services -------------------------- */
  {
    id: "backup",
    name: "Recovery Services vault",
    resourceType: "Microsoft.RecoveryServices/vaults",
    category: "Storage",
    blurb: "Backup and disaster-recovery vault that protects VMs, files and workloads.",
    glyph: "🗃️",
    colors: ["#4b8ef7", "#0e3a75"],
    status: "Succeeded",
    nameRule: { min: 2, max: 50, regex: /^[a-zA-Z][a-zA-Z0-9-]*$/, hint: "Start with a letter, letters/numbers/hyphens." },
    steps: [
      {
        title: "Vault basics",
        fields: [
          { key: "sku", label: "Pricing tier", type: "select", options: [
            { value: "RS0", label: "Standard", note: "Azure Backup" },
          ], default: "RS0" },
          { key: "redundancy", label: "Storage replication type", type: "select", options: [
            { value: "LocallyRedundant", label: "Locally-redundant (LRS)", price: 10 },
            { value: "GeoRedundant", label: "Geo-redundant (GRS)", note: "3 copies in 2 regions", price: 15 },
            { value: "ZoneRedundant", label: "Zone-redundant (ZRS)", price: 12 },
          ], default: "GeoRedundant" },
        ],
      },
      {
        title: "Security",
        fields: [
          { key: "softDelete", label: "Soft delete", type: "toggle", default: true, help: "Retains deleted backup data for 14 days." },
          { key: "immutability", label: "Immutable vault", type: "toggle", default: false, help: "Backup data cannot be deleted before expiry." },
        ],
      },
    ],
    metrics: [
      { key: "jobs", label: "Backup jobs", unit: "count", base: 12, spread: 9 },
      { key: "storage", label: "Backup storage used", unit: "GB", base: 44, spread: 18 },
      { key: "items", label: "Protected items", unit: "count", base: 2, spread: 1 },
    ],
    learn: [
      "A vault is a management boundary for backups — it holds recovery points and backup policies.",
      "Backups are independent of the source resource: deleting a VM does not delete its backup.",
      "GRS replicates backup data to a second region, which is what most compliance rules require.",
    ],
    monthly: (p) => (p.redundancy === "GeoRedundant" ? 15 : p.redundancy === "ZoneRedundant" ? 12 : 10) + num(p.protectedItemsCount ?? 0) * 5,
    essentials: (r) => [
      { label: "Storage replication", value: r.props.redundancy === "GeoRedundant" ? "Geo-redundant (GRS)" : r.props.redundancy === "ZoneRedundant" ? "Zone-redundant (ZRS)" : "Locally-redundant (LRS)" },
      { label: "Soft delete", value: r.props.softDelete ? "Enabled (14 days)" : "Disabled" },
      { label: "Protected items", value: String((r.props.protectedItems as unknown[] | undefined)?.length ?? 0) },
      { label: "Backup policy", value: "DailyPolicy (02:00 UTC, 30-day retention)" },
    ],
  },

  /* --------------------------- Availability set ------------------------- */
  {
    id: "avset",
    name: "Availability set",
    resourceType: "Microsoft.Compute/availabilitySets",
    category: "Compute",
    blurb: "Spreads VMs across isolated hardware and power domains inside one datacenter.",
    glyph: "🔲",
    colors: ["#4b8ef7", "#17427f"],
    status: "Succeeded",
    nameRule: { min: 1, max: 80, regex: /^[a-zA-Z][a-zA-Z0-9-_]*$/, hint: "Start with a letter." },
    steps: [
      {
        title: "Configuration",
        fields: [
          { key: "fd", label: "Fault domains", type: "number", min: 1, max: 3, default: 2, help: "Physical separation: power, cooling, network." },
          { key: "ud", label: "Update domains", type: "number", min: 1, max: 20, default: 5, help: "Logical groups that reboot together during maintenance." },
          { key: "sku", label: "Proximity", type: "select", options: [
            { value: "Aligned", label: "Aligned (managed disks)" },
            { value: "Classic", label: "Classic (unmanaged disks)" },
          ], default: "Aligned" },
        ],
      },
    ],
    metrics: [],
    learn: [
      "Two or more VMs in an availability set qualify for the 99.95% SLA.",
      "Fault domains protect against hardware failure; update domains control planned-maintenance reboots.",
      "Availability sets protect inside one datacenter. For protection across datacenters, use availability zones or a scale set.",
    ],
    monthly: () => 0,
    essentials: (r) => [
      { label: "Fault domains", value: String(r.props.fd ?? 2) },
      { label: "Update domains", value: String(r.props.ud ?? 5) },
      { label: "Managed disks", value: r.props.sku === "Aligned" ? "Yes (Aligned)" : "No (Classic)" },
    ],
  },

  /* ------------------------- Virtual machine scale set ------------------- */
  {
    id: "vmss",
    name: "Virtual machine scale set",
    resourceType: "Microsoft.Compute/virtualMachineScaleSets",
    category: "Compute",
    blurb: "Identical VMs that scale out and in automatically based on load.",
    glyph: "📐",
    colors: ["#3b8cf0", "#0f3f84"],
    status: "Running",
    nameRule: { min: 1, max: 64, regex: /^[a-zA-Z][a-zA-Z0-9-]*$/, hint: "Start with a letter." },
    steps: [
      {
        title: "Instance details",
        fields: [
          {
            key: "image",
            label: "Image",
            type: "select",
            required: true,
            options: [
              { value: "Ubuntu2204", label: "Ubuntu Server 22.04 LTS", note: "Linux" },
              { value: "Win2022Datacenter", label: "Windows Server 2022", note: "+ licence" },
            ],
            default: "Ubuntu2204",
          },
          { key: "size", label: "Instance size", type: "select", required: true, options: VMSIZES.slice(0, 5), default: "Standard_B2s" },
          { key: "adminUsername", label: "Username", type: "text", default: "azureuser", required: true },
          { key: "authType", label: "Authentication type", type: "select", options: [
            { value: "ssh", label: "SSH public key" },
            { value: "password", label: "Password" },
          ], default: "ssh" },
          { key: "password", label: "Password", type: "password", when: (p) => p.authType === "password", required: true },
        ],
      },
      {
        title: "Scaling",
        description: "The core value of a scale set: it grows and shrinks with demand.",
        fields: [
          { key: "instanceCount", label: "Instance count", type: "number", min: 1, max: 100, default: 2 },
          { key: "autoscale", label: "Enable autoscale", type: "toggle", default: true, help: "Scale out on CPU > 70%, scale in on CPU < 30%." },
          { key: "min", label: "Minimum instances", type: "number", min: 1, max: 10, default: 1, when: (p) => p.autoscale },
          { key: "max", label: "Maximum instances", type: "number", min: 2, max: 20, default: 6, when: (p) => p.autoscale },
          { key: "upgradePolicy", label: "Upgrade policy", type: "select", options: [
            { value: "Automatic", label: "Automatic — updates all instances" },
            { value: "Rolling", label: "Rolling — batches of 20%" },
            { value: "Manual", label: "Manual — you update each instance" },
          ], default: "Automatic" },
        ],
      },
    ],
    metrics: [
      { key: "cpu", label: "Percentage CPU", unit: "%", base: 38, spread: 26, powerBased: true },
      { key: "out", label: "Network out", unit: "MB", base: 220, spread: 150, powerBased: true },
      { key: "instances", label: "Instance count", unit: "count", base: 2, spread: 1.6, powerBased: true },
    ],
    learn: [
      "Every VM in the set comes from the same model — change the model once, upgrade policy rolls it out.",
      "Autoscale rules watch metrics (CPU, memory) and add/remove instances in minutes.",
      "Scale sets work best behind a load balancer; instances get a public IP only if you ask for one.",
    ],
    monthly: (p, region) => (sizePrice(p.size) * num(p.instanceCount, 1) + (p.image === "Win2022Datacenter" ? 96 : 0) + 5.9) * regionIndex(region),
    essentials: (r) => [
      { label: "Instance count", value: String(r.props.instanceCount) },
      { label: "Upgrade policy", value: r.props.upgradePolicy },
      { label: "Autoscale", value: r.props.autoscale ? `On (${r.props.min}–${r.props.max})` : "Off" },
      { label: "Size", value: r.props.size, mono: true },
    ],
  },

  /* ----------------------- Container Instances (ACI) -------------------- */
  {
    id: "aci",
    name: "Container instance",
    resourceType: "Microsoft.ContainerInstance/containerGroups",
    category: "Containers",
    blurb: "Run a single container in seconds — no VMs, no orchestrator, per-second billing.",
    glyph: "📦",
    colors: ["#4b8ef7", "#12467f"],
    status: "Running",
    actions: ["restart", "stop", "start"],
    nameRule: { min: 1, max: 63, regex: /^[a-z0-9][a-z0-9-]*$/, hint: "Lowercase letters, numbers and hyphens." },
    steps: [
      {
        title: "Container details",
        fields: [
          { key: "image", label: "Image", type: "select", options: [
            { value: "mcr.microsoft.com/azuredocs/aci-helloworld", label: "aci-helloworld (demo web app)" },
            { value: "mcr.microsoft.com/cbl-mariner/base/core:2.0", label: "CBL-Mariner (base shell)" },
            { value: "nginx:latest", label: "nginx:latest" },
            { value: "redis:latest", label: "redis:latest" },
          ], default: "mcr.microsoft.com/azuredocs/aci-helloworld" },
          { key: "cpu", label: "CPU cores", type: "select", options: [
            { value: "1", label: "1 vCPU", price: 5.33 },
            { value: "2", label: "2 vCPU", price: 10.66 },
            { value: "4", label: "4 vCPU", price: 21.32 },
          ], default: "1" },
          { key: "memory", label: "Memory (GiB)", type: "select", options: [
            { value: "1.5", label: "1.5 GiB", price: 2.85 },
            { value: "3", label: "3 GiB", price: 5.7 },
            { value: "8", label: "8 GiB", price: 15.2 },
          ], default: "1.5" },
          { key: "restartPolicy", label: "Restart policy", type: "select", options: [
            { value: "Always", label: "Always" },
            { value: "OnFailure", label: "On failure" },
            { value: "Never", label: "Never (run-once job)" },
          ], default: "Always" },
        ],
      },
      {
        title: "Networking",
        fields: [
          { key: "ports", label: "Ports", type: "text", default: "80", mono: true, help: "Comma-separated, e.g. 80,443" },
          { key: "public", label: "Public IP address", type: "toggle", default: true },
          { key: "dnsLabel", label: "DNS name label", type: "text", default: "azsim-app", help: "Becomes <label>.<region>.azurecontainer.io" },
        ],
      },
    ],
    metrics: [
      { key: "cpu", label: "CPU usage", unit: "%", base: 12, spread: 10, powerBased: true },
      { key: "mem", label: "Memory usage", unit: "%", base: 22, spread: 14, powerBased: true },
    ],
    learn: [
      "ACI bills per second for the CPU and memory you reserve — it is the cheapest way to run a container burst.",
      "Use restart policy Never for one-off jobs (batch, CI) — the container runs and exits.",
      "ACI has no orchestrator: for auto-redeploy on crash or scale-out, use Container Apps or AKS.",
    ],
    monthly: (p, region) => (Number(p.cpu) * 5.33 + Number(p.memory) * 2.85) * regionIndex(region),
    essentials: (r) => [
      { label: "Image", value: r.props.image, mono: true },
      { label: "FQDN", value: r.props.public ? `${r.props.dnsLabel}.${r.location}.azurecontainer.io` : "private", mono: true },
      { label: "CPU / memory", value: `${r.props.cpu} vCPU · ${r.props.memory} GiB` },
      { label: "Restart policy", value: r.props.restartPolicy },
    ],
  },

  /* --------------------------- Container Apps --------------------------- */
  {
    id: "containerapp",
    name: "Container App",
    resourceType: "Microsoft.App/containerApps",
    category: "Containers",
    blurb: "Serverless containers with auto-scale, ingress, revisions and Dapr — no orchestrator to manage.",
    glyph: "🚢",
    colors: ["#4d7cf0", "#1a2f7a"],
    status: "Running",
    actions: ["restart", "stop", "start"],
    nameRule: { min: 2, max: 32, regex: /^[a-z][a-z0-9-]*$/, hint: "2–32 lowercase chars, start with a letter." },
    steps: [
      {
        title: "Container details",
        fields: [
          { key: "containerName", label: "Container name", type: "text", default: "web", required: true },
          { key: "image", label: "Image", type: "select", options: [
            { value: "nginx:latest", label: "nginx:latest" },
            { value: "mcr.microsoft.com/k8se/quickstart:latest", label: "quickstart (demo)" },
            { value: "ghcr.io/open-webui/open-webui:main", label: "Open WebUI" },
          ], default: "nginx:latest" },
          { key: "env", label: "Runtime", type: "select", options: [
            { value: "dotnet", label: ".NET" },
            { value: "node", label: "Node.js" },
            { value: "python", label: "Python" },
            { value: "go", label: "Go" },
          ], default: "node" },
        ],
      },
      {
        title: "Scaling + ingress",
        fields: [
          { key: "minReplicas", label: "Minimum replicas", type: "number", min: 0, max: 25, default: 0, help: "0 means scale-to-zero: you pay nothing when idle." },
          { key: "maxReplicas", label: "Maximum replicas", type: "number", min: 1, max: 30, default: 10 },
          { key: "ingress", label: "Ingress", type: "toggle", default: true, help: "Give the app an HTTPS endpoint." },
          { key: "targetPort", label: "Target port", type: "number", min: 1, max: 65535, default: 80, when: (p) => p.ingress },
          { key: "external", label: "External visibility", type: "toggle", default: true, when: (p) => p.ingress },
        ],
      },
    ],
    metrics: [
      { key: "requests", label: "Requests", unit: "count", base: 4200, spread: 3200, powerBased: true },
      { key: "replicas", label: "Replica count", unit: "count", base: 1, spread: 1.4, powerBased: true },
      { key: "cpu", label: "CPU usage", unit: "%", base: 18, spread: 14, powerBased: true },
    ],
    learn: [
      "Every deploy creates a revision — you can split traffic between revisions and roll back instantly.",
      "Scale rules can be based on HTTP traffic, CPU, memory or custom metrics from Event Hubs/Kafka.",
      "Scale-to-zero (min replicas = 0) is the big cost lever: no requests means no running containers.",
    ],
    monthly: (p) => 8 + num(p.minReplicas, 0) * 12 + num(p.maxReplicas, 10) * 1.2,
    essentials: (r) => [
      { label: "Application URL", value: r.props.ingress ? `https://${r.name}.azurecontainerapps.io` : "internal only", mono: true },
      { label: "Replicas", value: `${r.props.minReplicas}–${r.props.maxReplicas}` },
      { label: "Revision", value: `${r.name}--v1`, mono: true },
      { label: "Environment", value: "azsim-containerapps-env", mono: true },
    ],
  },

  /* ------------------------------ DNS zone ----------------------------- */
  {
    id: "dns",
    name: "DNS zone",
    resourceType: "Microsoft.Network/dnsZones",
    category: "Networking",
    blurb: "Host your domain in Azure with Microsoft's global anycast name servers.",
    glyph: "🌐",
    colors: ["#4d9cf5", "#123f80"],
    status: "Succeeded",
    nameRule: { min: 2, max: 34, regex: /^[a-z0-9.-]+\.[a-z]{2,}$/, hint: "Enter a domain name you own, e.g. contoso.com (lowercase)." },
    steps: [
      {
        title: "Zone + first record",
        fields: [
          { key: "zoneName", label: "Zone name", type: "text", default: "contoso.com", required: true, mono: true, help: "Use a domain you own — Azure will show you the 4 name servers to delegate." },
          { key: "recordType", label: "Record type", type: "select", options: [
            { value: "A", label: "A — IPv4 address" },
            { value: "CNAME", label: "CNAME — alias to another name" },
            { value: "TXT", label: "TXT — text (verification)" },
            { value: "MX", label: "MX — mail exchanger" },
            { value: "NS", label: "NS — name server (built-in)" },
          ], default: "A" },
          { key: "recordName", label: "Record name", type: "text", default: "www", help: "Use @ for the zone apex." },
          { key: "recordValue", label: "Value", type: "text", default: "10.10.1.4", mono: true, required: true },
          { key: "ttl", label: "TTL (seconds)", type: "number", min: 60, max: 86400, default: 3600 },
        ],
      },
    ],
    metrics: [
      { key: "queries", label: "Query volume", unit: "count", base: 120000, spread: 60000 },
    ],
    learn: [
      "A DNS zone costs ~$0.50/month; queries are billed per million (first 1 billion free).",
      "The zone apex is the domain itself — use record name @ for it.",
      "Delegation: at your registrar, replace the name servers with the 4 Azure name servers shown in Essentials.",
    ],
    monthly: () => 0.5,
    essentials: () => [
      { label: "Name server 1", value: `ns1-09.azure-dns.com`, mono: true },
      { label: "Name server 2", value: `ns2-09.azure-dns.net`, mono: true },
      { label: "Name server 3", value: `ns3-09.azure-dns.org`, mono: true },
      { label: "Name server 4", value: `ns4-09.azure-dns.info`, mono: true },
    ],
  },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

/* ------------------------------------------------------------------ */
/* deterministic pseudo-random helpers                                  */
/* ------------------------------------------------------------------ */

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function seedRand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function publicIpFor(r: Resource) {
  const h = hashStr(r.id);
  return `${20 + (h % 100)}.${(h >> 3) % 255}.${(h >> 7) % 255}.${(h >> 11) % 250}`;
}

export function wsId(name: string) {
  const h = hashStr(name);
  const hex = h.toString(16).padStart(8, "0") + ((h >> 5).toString(16).padStart(8, "0"));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function aiKey(name: string, n: number) {
  const h = hashStr(name + n);
  let out = "";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) out += chars[(h >> (i % 24)) % chars.length] === undefined ? "a" : chars[seedRand(h + i * 7) * chars.length | 0];
  return out.slice(0, 32);
}

export function imageLabel(img: string) {
  const f: Record<string, string> = {
    Ubuntu2204: "Ubuntu Server 22.04 LTS",
    Ubuntu2404: "Ubuntu Server 24.04 LTS",
    Debian12: 'Debian 12 "Bookworm"',
    RHEL94: "Red Hat Enterprise Linux 9.4",
    Win2022Datacenter: "Windows Server 2022 Datacenter",
  };
  return f[img] ?? img;
}

export function p2s(v: any) {
  if (typeof v === "string") return v;
  return v ? "Enabled" : "Disabled";
}

export function ruleLabel(p: Record<string, any>) {
  const m: Record<string, string> = {
    ssh: "Allow 22 (SSH) from Any",
    rdp: "Allow 3389 (RDP) from Any",
    http: "Allow 80 (HTTP) from Any",
    https: "Allow 443 (HTTPS) from Any",
    none: "Default rules only",
    custom: `Allow ${p.port ?? "80"} from ${p.source ?? "Any"}`,
  };
  return m[p.rule] ?? "Default rules only";
}

export function monthlyCost(r: Resource) {
  const svc = serviceById(r.service);
  if (!svc) return 0;
  const raw = svc.monthly(r.props, r.location) ?? 0;
  const stopped = r.status === "Deallocated" || r.status === "Stopped";
  const factor = stopped && svc.id === "vm" ? 0.18 : 1;
  return Math.round(raw * factor * 100) / 100;
}

export function metricSeries(r: Resource, m: MetricDef, points = 24, bucketMs = 3600_000) {
  const base = hashStr(r.id + m.key);
  const now = Date.now();
  const powered = m.powerBased ? r.status === "Running" : true;
  const out: { t: number; v: number }[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const bucket = Math.floor((now - i * bucketMs) / bucketMs);
    const a = seedRand(base + bucket);
    const b = seedRand(base + bucket + 1);
    const noise = (a * 0.7 + b * 0.3) * m.spread;
    let v = m.base - m.spread / 2 + noise;
    if (m.powerBased) v = powered ? v : 0;
    if (v < 0) v = 0;
    out.push({ t: now - i * bucketMs, v: Math.round(v * 100) / 100 });
  }
  return out;
}
