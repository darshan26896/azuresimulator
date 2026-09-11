import type { State } from "./types";

export interface LabStep {
  text: string;
  hint: string;
  /** auto-verification — when omitted the step is completed manually with the "Mark complete" button */
  check?: (s: State) => boolean;
}

export interface Lab {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
  goal: string;
  steps: LabStep[];
}

const visited = (s: State, id: string) => s.visitedBlades.some((b) => b.startsWith(id)) || s.blades.some((b) => b.id.startsWith(id));
const resVisited = (s: State, providerPath: string) => s.visitedBlades.some((b) => b.includes(providerPath));
const READER = "acdd72a7-3385-48ef-bd42-f606fba81ae7";
const CONTRIBUTOR = "b24988ac-6180-42a0-ab88-20f7382dd24c";
const ALLOWED_LOCATIONS = "e56962a6-4747-49cd-b67b-bf8b01975c4c";
const STORAGE_PUBLIC = "6c112d4e-5bc7-47ae-a041-ea2d9dccd749";
const TAG_ENV = "9e2575e9-3a90-4d64-9f8c-0b0a0b0b0b0b";

export const LABS: Lab[] = [
  /* ------------------------------ Identity ------------------------------ */
  {
    id: "lab01",
    title: "Lab 01 — Manage Microsoft Entra ID identities",
    level: "Beginner",
    minutes: 12,
    goal: "Create users, groups and directory roles in Microsoft Entra ID (formerly Azure AD).",
    steps: [
      { text: "Open the Microsoft Entra ID blade from the sidebar.", hint: "Sidebar → Microsoft Entra ID.", check: (s) => visited(s, "entra") },
      { text: "Create a new user with a @azsim.onmicrosoft.com sign-in name.", hint: "Users tab → New user → fill display name + UPN → Create.", check: (s) => s.users.length > 3 },
      { text: "Create a security group (e.g. data-platform).", hint: "Groups tab → New group.", check: (s) => s.groups.length > 2 },
      { text: "Add a second member to one of the groups.", hint: "Groups → Add member → pick a user.", check: (s) => s.groups.reduce((n, g) => n + g.members.length, 0) >= 3 },
      { text: "Assign an Entra role or an Azure role to one of the new users (any scope).", hint: "Open any resource → Access control (IAM) → Add role assignment.", check: (s) => s.roleAssignments.length > 2 },
      { text: "Block sign-in for one user (disable the account).", hint: "Users table → toggle Account enabled off.", check: (s) => s.users.some((u) => !u.accountEnabled) },
    ],
  },
  {
    id: "lab02a",
    title: "Lab 02a — Manage subscriptions and RBAC",
    level: "Intermediate",
    minutes: 12,
    goal: "Understand the subscription boundary and assign roles with least privilege.",
    steps: [
      { text: "Open the Subscriptions blade and read the subscription overview.", hint: "Sidebar → Subscriptions.", check: (s) => visited(s, "subs") },
      { text: "Assign the Reader role to a user at subscription scope.", hint: "Subscriptions → Access control (IAM) → Add role assignment.", check: (s) => s.roleAssignments.some((r) => r.scope === "subscription" && r.roleId === READER) },
      { text: "Assign the Contributor role to a group at a resource-group scope.", hint: "Resource group blade → Access control (IAM) → scope = this RG → role Contributor → principal = a group.", check: (s) => s.roleAssignments.some((r) => r.scope === "rg" && r.roleId === CONTRIBUTOR) },
      { text: "Open a resource inside that RG and confirm you can see the inherited assignment.", hint: "Resource blade → Access control (IAM) lists inherited roles from the RG.", check: (s) => resVisited(s, "/providers/Microsoft.") },
      { text: "Remove the Reader assignment you created in step 2.", hint: "Subscriptions → IAM → Remove on the row.", check: (s) => !s.roleAssignments.some((r) => r.scope === "subscription" && r.roleId === READER) },
    ],
  },
  {
    id: "lab02b",
    title: "Lab 02b — Manage governance via Azure Policy",
    level: "Intermediate",
    minutes: 12,
    goal: "Enforce organisational rules with policy definitions, assignments and compliance.",
    steps: [
      { text: "Open the Policy blade and read the built-in definitions.", hint: "Sidebar → Policy → Definitions tab.", check: (s) => visited(s, "policy") },
      { text: "Assign “Allowed locations” (East US, West Europe) at subscription scope.", hint: "Assignments tab → pick the definition → scope = subscription → Assign.", check: (s) => s.policyAssignments.some((p) => p.definitionId === ALLOWED_LOCATIONS) },
      { text: "Assign “Storage accounts should disable public blob access”.", hint: "Same flow — watch the impact preview before assigning.", check: (s) => s.policyAssignments.some((p) => p.definitionId === STORAGE_PUBLIC) },
      { text: "Assign “Tag 'env' should be specified on resources”.", hint: "This one audits every resource missing the env tag.", check: (s) => s.policyAssignments.some((p) => p.definitionId === TAG_ENV) },
      { text: "Open the Compliance tab and note which resources are non-compliant, and why.", hint: "Each non-compliant resource shows the exact reason.", check: (s) => visited(s, "policy") },
      { text: "Make one non-compliant resource compliant by adding the env tag, then re-check compliance.", hint: "Resource blade → Tags → env = dev. Compliance re-evaluates live.", check: (s) => s.resources.every((r) => !!r.tags?.env) },
    ],
  },
  /* ------------------------------ Resources ----------------------------- */
  {
    id: "lab03",
    title: "Lab 03 — Manage resources via Portal, CLI, PowerShell and Bicep",
    level: "Beginner",
    minutes: 15,
    goal: "Do the same work four different ways — this is a core AZ-104 skill.",
    steps: [
      { text: "Create a resource group through the portal (any name, any region).", hint: "Resource groups → Create.", check: (s) => s.rgs.length > 2 },
      { text: "Open Cloud Shell and create a resource group with the CLI.", hint: "Type: az group create -n rg-cli-lab -l eastus", check: (s) => s.cliHistory.some((c) => c.includes("az group create")) },
      { text: "Create a storage account with the CLI.", hint: "az storage account create -g rg-cli-lab -n cliname12345 --sku Standard_LRS", check: (s) => s.cliHistory.some((c) => c.includes("az storage account create")) },
      { text: "Open any resource blade and view its Bicep definition (Bicep + CLI tab).", hint: "Resource blade → Bicep + CLI → Bicep button.", check: (s) => resVisited(s, "/providers/Microsoft.") },
      { text: "Read the equivalent Azure PowerShell command for the same resource.", hint: "Same tab → PowerShell button.", check: (s) => s.resources.length > 0 },
      { text: "Delete the CLI-created resource group with one command.", hint: "az group delete -n rg-cli-lab --yes", check: (s) => s.cliHistory.some((c) => c.includes("az group delete")) },
    ],
  },
  /* ------------------------------- Storage ------------------------------ */
  {
    id: "lab04",
    title: "Lab 04 — Configure storage accounts & redundancy",
    level: "Beginner",
    minutes: 12,
    goal: "Compare LRS, GRS and RA-GRS and understand replication choices.",
    steps: [
      { text: "Create a storage account with Locally-redundant storage (LRS).", hint: "Marketplace → Storage account → Redundancy: LRS.", check: (s) => s.resources.filter((r) => r.service === "storage" && r.props.sku === "Standard_LRS").length >= 1 },
      { text: "Create a second account with Geo-redundant storage (GRS).", hint: "Redundancy: Geo-redundant storage.", check: (s) => s.resources.some((r) => r.service === "storage" && r.props.sku === "Standard_GRS") },
      { text: "Create a third account with Read-access geo-redundant storage (RA-GRS) or GZRS.", hint: "Redundancy: RA-GRS or Geo-zone-redundant.", check: (s) => s.resources.some((r) => r.service === "storage" && (r.props.sku === "Standard_RAGRS" || r.props.sku === "Standard_GZRS")) },
      { text: "Open a storage account blade and find the Access keys tab.", hint: "Resource blade → Data storage? No — the dedicated keys view is inside the storage tabs.", check: (s) => resVisited(s, "storageAccounts") },
      { text: "Regenerate key 1 and note that the connection string changes.", hint: "Access keys → Regenerate key. Update your apps afterwards!", check: (s) => s.resources.filter((r) => r.service === "storage").length >= 3 },
    ],
  },
  {
    id: "lab05",
    title: "Lab 05 — Manage Azure Files, Blob tiers & access",
    level: "Intermediate",
    minutes: 15,
    goal: "Work with blob containers, access tiers, anonymous access and file shares.",
    steps: [
      { text: "Create a private blob container in one of your storage accounts.", hint: "Storage blade → Data storage → Containers → Create → access level Private.", check: (s) => s.containers.length >= 1 },
      { text: "Upload a blob and set its tier to Cool.", hint: "Open the container → Upload blob → tier Cool.", check: (s) => s.containers.some((c) => c.blobs.some((b) => b.tier === "Cool")) },
      { text: "Upload 3 blobs into the container (any names, any tiers).", hint: "Repeat the upload — blobs are simulated.", check: (s) => s.containers.reduce((n, c) => n + c.blobs.length, 0) >= 3 },
      { text: "Make the container public, then private again.", hint: "Use the “Make public / Make private” button on the container row.", check: (s) => s.containers.length >= 1 },
      { text: "Create an Azure Files share with a 10 GiB quota.", hint: "File shares → Create → name + quota.", check: (s) => s.shares.length >= 2 },
      { text: "Generate a SAS URL for the storage account.", hint: "Access keys → SAS URL — it grants time-limited scoped access.", check: (s) => s.shares.length >= 1 },
    ],
  },
  /* --------------------------------- VM --------------------------------- */
  {
    id: "lab06",
    title: "Lab 06 — Deploy & configure virtual machines",
    level: "Beginner",
    minutes: 15,
    goal: "Create a VM with the right size, disk and network settings.",
    steps: [
      { text: "Create a Linux VM (Ubuntu) with Standard_B1s.", hint: "Marketplace → Virtual machine.", check: (s) => s.resources.filter((r) => r.service === "vm").length >= 2 },
      { text: "Open the VM blade and read the connect command (SSH).", hint: "Click “Connect with SSH” in the command bar.", check: (s) => resVisited(s, "virtualMachines") },
      { text: "Create a network security group that allows SSH (22).", hint: "Marketplace → Network security group.", check: (s) => s.resources.some((r) => r.service === "nsg") },
      { text: "Create a Standard SKU public IP address.", hint: "Marketplace → Public IP address → Standard.", check: (s) => s.resources.some((r) => r.service === "pip") },
      { text: "Enable auto-shutdown on the VM (Management step of the wizard).", hint: "Stops the VM daily — big cost saver in real subscriptions.", check: (s) => s.resources.some((r) => r.service === "vm" && r.props.autoShutdown) },
      { text: "Add a data disk to the VM (Management step: Data disks = 1).", hint: "Data disks are separate from the OS disk.", check: (s) => s.resources.some((r) => r.service === "vm" && Number(r.props.dataDisks) >= 1) },
    ],
  },
  {
    id: "lab07",
    title: "Lab 07 — Configure VM availability & scale sets",
    level: "Advanced",
    minutes: 15,
    goal: "Protect workloads from datacenter failures and scale automatically.",
    steps: [
      { text: "Create an availability set with 2 fault domains and 5 update domains.", hint: "Marketplace → Availability set.", check: (s) => s.resources.some((r) => r.service === "avset") },
      { text: "Create 2 VMs and place BOTH in the availability set.", hint: "VM wizard → Instance details → Availability set field.", check: (s) => s.resources.filter((r) => r.service === "vm" && r.props.availabilitySet).length >= 2 },
      { text: "Create a virtual machine scale set with 2 instances.", hint: "Marketplace → Virtual machine scale set.", check: (s) => s.resources.some((r) => r.service === "vmss") },
      { text: "Enable autoscale on the scale set (min 1, max 6).", hint: "Scaling step of the wizard.", check: (s) => s.resources.some((r) => r.service === "vmss" && r.props.autoscale) },
      { text: "Change the upgrade policy to Rolling on the scale set.", hint: "Resource blade → Configuration → upgrade policy → Save.", check: (s) => s.resources.some((r) => r.service === "vmss" && r.props.upgradePolicy === "Rolling") },
    ],
  },
  /* ------------------------------ PaaS / K8s ---------------------------- */
  {
    id: "lab08",
    title: "Lab 08 — Implement App Service, containers & AKS",
    level: "Intermediate",
    minutes: 15,
    goal: "Move from IaaS to managed platforms.",
    steps: [
      { text: "Create a Web App on the Free F1 plan.", hint: "Marketplace → Web App (App Service).", check: (s) => s.resources.filter((r) => r.service === "webapp").length >= 2 },
      { text: "Create a Container Registry (Basic SKU).", hint: "Marketplace → Container registry — your private Docker registry.", check: (s) => s.resources.some((r) => r.service === "acr") },
      { text: "Create an AKS cluster with 2 nodes.", hint: "Marketplace → Azure Kubernetes Service.", check: (s) => s.resources.some((r) => r.service === "aks" && Number(r.props.nodeCount) >= 2) },
      { text: "Enable the cluster autoscaler on the AKS cluster.", hint: "Networking/Management step → autoscale.", check: (s) => s.resources.some((r) => r.service === "aks" && r.props.autoscale) },
      { text: "Open the AKS blade and copy the az aks get-credentials command.", hint: "Resource blade → Connect / JSON + CLI tab.", check: (s) => s.resources.some((r) => r.service === "aks") },
    ],
  },
  {
    id: "lab09a",
    title: "Lab 09a — Implement Web Apps",
    level: "Intermediate",
    minutes: 12,
    goal: "Deep-dive App Service: plans, slots and scaling.",
    steps: [
      { text: "Create a Web App on the Basic (B1) plan.", hint: "Pricing plan: Basic (B1).", check: (s) => s.resources.some((r) => r.service === "webapp" && r.props.planTier === "B1") },
      { text: "Scale the app up to Standard (S1) from the Configuration tab.", hint: "Resource blade → Configuration → planTier → S1 → Save.", check: (s) => s.resources.some((r) => r.service === "webapp" && r.props.planTier === "S1") },
      { text: "Add a deployment slot to the S1 app.", hint: "Wizard → Deployment → Deployment slots = 1 (or Configuration tab).", check: (s) => s.resources.some((r) => r.service === "webapp" && Number(r.props.slots) >= 1) },
      { text: "Open the app URL from Essentials.", hint: "Essentials → URL field (https://<name>.azurewebsites.net).", check: (s) => s.resources.some((r) => r.service === "webapp") },
      { text: "Stop and restart the web app from the command bar.", hint: "Stop and Restart buttons at the top of the blade.", check: (s) => s.activity.some((a) => a.operation.toLowerCase().includes("stop")) },
    ],
  },
  {
    id: "lab09b",
    title: "Lab 09b — Implement Azure Container Instances",
    level: "Intermediate",
    minutes: 10,
    goal: "Run a single container with per-second billing and no orchestrator.",
    steps: [
      { text: "Create a container instance with a public IP and port 80.", hint: "Marketplace → Container instance → Networking: public IP on.", check: (s) => s.resources.some((r) => r.service === "aci") },
      { text: "Create a second container instance with 2 vCPU / 3 GiB.", hint: "CPU cores: 2, Memory: 3 GiB.", check: (s) => s.resources.filter((r) => r.service === "aci").length >= 2 },
      { text: "Set the restart policy to Never on one of the instances (run-once job).", hint: "Configuration tab → restart policy → Save.", check: (s) => s.resources.some((r) => r.service === "aci" && r.props.restartPolicy === "Never") },
      { text: "Read the FQDN of the public instance from Essentials.", hint: "<label>.<region>.azurecontainer.io", check: (s) => s.resources.some((r) => r.service === "aci") },
      { text: "Stop the run-once instance and note the billing difference.", hint: "Per-second billing stops the moment the container exits.", check: (s) => s.activity.some((a) => a.operation.toLowerCase().includes("stop")) },
    ],
  },
  {
    id: "lab09c",
    title: "Lab 09c — Implement Azure Container Apps",
    level: "Advanced",
    minutes: 12,
    goal: "Serverless containers with scale-to-zero and HTTPS ingress.",
    steps: [
      { text: "Create a Container App with ingress enabled.", hint: "Marketplace → Container App.", check: (s) => s.resources.some((r) => r.service === "containerapp") },
      { text: "Set minimum replicas to 0 (scale-to-zero).", hint: "Scaling + ingress step → Minimum replicas = 0.", check: (s) => s.resources.some((r) => r.service === "containerapp" && Number(r.props.minReplicas) === 0) },
      { text: "Set maximum replicas to 10.", hint: "Maximum replicas = 10.", check: (s) => s.resources.some((r) => r.service === "containerapp" && Number(r.props.maxReplicas) === 10) },
      { text: "Open the application URL from Essentials.", hint: "https://<name>.azurecontainerapps.io", check: (s) => s.resources.some((r) => r.service === "containerapp") },
      { text: "Read about revisions and traffic splitting in the Learn tab.", hint: "Resource blade → Learn.", check: (s) => s.resources.length > 0 },
    ],
  },
  /* ------------------------------ Networking ---------------------------- */
  {
    id: "lab10",
    title: "Lab 10 — Implement virtual networks, subnets & NSGs",
    level: "Intermediate",
    minutes: 15,
    goal: "Build and lock down a network.",
    steps: [
      { text: "Create a VNet with address space 10.0.0.0/16.", hint: "Marketplace → Virtual network.", check: (s) => s.resources.some((r) => r.service === "vnet" && r.props.cidr === "10.0.0.0/16") },
      { text: "Add a second subnet to the VNet (e.g. 10.0.1.0/24).", hint: "VNet blade → Subnets + peerings → Add subnet.", check: (s) => s.resources.some((r) => r.service === "vnet" && ((r.props.subnets as unknown[] | undefined)?.length ?? 1) >= 2) },
      { text: "Create an NSG with an HTTP (80) inbound rule.", hint: "Inbound rule template: Allow HTTP (80).", check: (s) => s.resources.some((r) => r.service === "nsg" && (r.props.rule === "http" || r.props.port === "80")) },
      { text: "Create an NSG with a custom rule on port 443, priority 1000.", hint: "Rule template: Custom → port 443 → priority 1000.", check: (s) => s.resources.filter((r) => r.service === "nsg").length >= 2 },
      { text: "Create a public IP with the Standard SKU.", hint: "Standard is secure by default — traffic must be allowed by an NSG.", check: (s) => s.resources.some((r) => r.service === "pip" && r.props.sku === "Standard") },
    ],
  },
  {
    id: "lab11",
    title: "Lab 11 — Configure load balancing, DNS & peering",
    level: "Advanced",
    minutes: 15,
    goal: "Distribute traffic, host a DNS zone and connect VNets.",
    steps: [
      { text: "Create a Standard load balancer.", hint: "Marketplace → Load balancer.", check: (s) => s.resources.some((r) => r.service === "lb") },
      { text: "Create a DNS zone for a domain you control (e.g. contoso.com).", hint: "Marketplace → DNS zone.", check: (s) => s.resources.some((r) => r.service === "dns") },
      { text: "Add a CNAME record (www → app.azurewebsites.net).", hint: "Wizard: record type CNAME, name www, value = a hostname.", check: (s) => s.resources.some((r) => r.service === "dns" && r.props.recordType === "CNAME") },
      { text: "Create a second VNet so you have something to peer with.", hint: "Any VNet with a DIFFERENT address space, e.g. 10.20.0.0/16.", check: (s) => s.resources.filter((r) => r.service === "vnet").length >= 2 },
      { text: "Peer the two VNets.", hint: "VNet blade → Subnets + peerings → Add peering → pick the other VNet.", check: (s) => s.peerings.length >= 1 },
      { text: "Read the four Azure name servers from the DNS zone Essentials.", hint: "ns1-09.azure-dns.com … — delegate your registrar to these.", check: (s) => s.resources.some((r) => r.service === "dns") },
    ],
  },
  /* ------------------------------ Storage 2 ----------------------------- */
  {
    id: "lab12",
    title: "Lab 12 — Manage Azure storage",
    level: "Intermediate",
    minutes: 12,
    goal: "Lifecycle management, soft delete and keys.",
    steps: [
      { text: "Enable the default lifecycle rule (Cool after 30 days) on a storage account.", hint: "Storage blade → Lifecycle management → toggle.", check: (s) => s.resources.some((r) => r.service === "storage" && Object.keys(r.props.lifecycle ?? {}).length > 0) },
      { text: "Enable blob versioning / soft delete on a storage account.", hint: "Configuration tab → Blob soft delete + versioning → Save.", check: (s) => s.resources.some((r) => r.service === "storage" && r.props.versioning) },
      { text: "Disable “Allow blob public access” on a storage account.", hint: "Configuration → Allow blob public access off.", check: (s) => s.resources.some((r) => r.service === "storage" && r.props.publicAccess === false) },
      { text: "View the access keys and connection string.", hint: "Data is never sent anywhere in this simulation.", check: (s) => resVisited(s, "storageAccounts") },
      { text: "Regenerate a key and generate a SAS URL.", hint: "Keys rotate with no downtime when you alternate key1 → key2.", check: (s) => s.resources.some((r) => r.service === "storage") },
    ],
  },
  /* ------------------------------ Compute ------------------------------- */
  {
    id: "lab13",
    title: "Lab 13 — Manage VMs",
    level: "Intermediate",
    minutes: 12,
    goal: "Day-2 VM operations: resize, disks, power states and backup.",
    steps: [
      { text: "Resize a VM to Standard_D2s_v5 from the Configuration tab.", hint: "Resource blade → Configuration → size → Save.", check: (s) => s.resources.some((r) => r.service === "vm" && r.props.size === "Standard_D2s_v5") },
      { text: "Add a data disk to a VM.", hint: "Configuration → Data disks → 1 → Save.", check: (s) => s.resources.some((r) => r.service === "vm" && Number(r.props.dataDisks) >= 1) },
      { text: "Deallocate the VM (stops compute billing).", hint: "Command bar → Deallocate.", check: (s) => s.resources.some((r) => r.service === "vm" && r.status === "Deallocated") },
      { text: "Start the VM again and confirm the public IP is reachable (simulated).", hint: "Command bar → Start → Essentials shows the IP.", check: (s) => s.resources.some((r) => r.service === "vm" && r.status === "Running") },
      { text: "Enable Azure Backup on the VM.", hint: "Overview → Backup card → pick a vault → Enable backup. Create a vault first if needed (Lab 17).", check: (s) => s.resources.some((r) => r.service === "backup" && ((r.props.protectedItems as unknown[] | undefined)?.length ?? 0) > 0) },
    ],
  },
  {
    id: "lab14",
    title: "Lab 14 — Implement Web Apps (deeper)",
    level: "Intermediate",
    minutes: 12,
    goal: "Runtime, slots and configuration.",
    steps: [
      { text: "Create a Web App with the Python 3.12 runtime.", hint: "Runtime stack: Python 3.12.", check: (s) => s.resources.some((r) => r.service === "webapp" && r.props.runtime === "python:3.12") },
      { text: "Add a deployment slot to the app.", hint: "slots = 1 in the wizard, or Configuration tab.", check: (s) => s.resources.some((r) => r.service === "webapp" && Number(r.props.slots) >= 1) },
      { text: "Stop the web app and observe the state change.", hint: "Command bar → Stop.", check: (s) => s.resources.some((r) => r.service === "webapp" && r.status === "Stopped") },
      { text: "Restart the app and look at the response-time metric.", hint: "Metrics tab → Response time.", check: (s) => s.resources.some((r) => r.service === "webapp" && r.status === "Running") },
      { text: "Create a Function App that reuses an existing storage account.", hint: "Marketplace → Function App → select the storage account.", check: (s) => s.resources.some((r) => r.service === "func") },
    ],
  },
  {
    id: "lab15",
    title: "Lab 15 — Implement Azure Container Instances (deeper)",
    level: "Advanced",
    minutes: 10,
    goal: "Resource sizing, restart policies and private containers.",
    steps: [
      { text: "Create a container instance with 1 vCPU and 1.5 GiB (nginx).", hint: "Image: nginx:latest.", check: (s) => s.resources.some((r) => r.service === "aci") },
      { text: "Create a private container instance (no public IP).", hint: "Networking → Public IP: off.", check: (s) => s.resources.some((r) => r.service === "aci" && r.props.public === false) },
      { text: "Set the private instance’s restart policy to OnFailure.", hint: "Configuration tab → restart policy.", check: (s) => s.resources.some((r) => r.service === "aci" && r.props.restartPolicy === "OnFailure") },
      { text: "Compare the estimated monthly cost of the two instances.", hint: "Cost Management + Billing → By resource.", check: (s) => s.resources.some((r) => r.service === "aci") },
    ],
  },
  {
    id: "lab16",
    title: "Lab 16 — Implement Azure Container Apps (deeper)",
    level: "Advanced",
    minutes: 12,
    goal: "Scale rules, revisions and environments.",
    steps: [
      { text: "Create a Container App on the .NET runtime with min 1 / max 10 replicas.", hint: "Runtime: .NET.", check: (s) => s.resources.some((r) => r.service === "containerapp" && r.props.env === "dotnet") },
      { text: "Enable external ingress on port 80.", hint: "Ingress: on, External: on, Target port: 80.", check: (s) => s.resources.some((r) => r.service === "containerapp" && r.props.ingress && r.props.external) },
      { text: "Read about scale rules (KEDA) in the Learn tab.", hint: "HTTP, CPU, memory or custom metrics can drive scaling.", check: (s) => s.resources.some((r) => r.service === "containerapp") },
      { text: "Stop and restart the container app.", hint: "Command bar buttons.", check: (s) => s.activity.some((a) => a.operation.toLowerCase().includes("stop")) },
    ],
  },
  /* --------------------------- Data protection -------------------------- */
  {
    id: "lab17",
    title: "Lab 17 — Implement data protection",
    level: "Intermediate",
    minutes: 12,
    goal: "Back up VMs with a Recovery Services vault and restore points.",
    steps: [
      { text: "Create a Recovery Services vault with Geo-redundant storage.", hint: "Marketplace → Recovery Services vault → GRS.", check: (s) => s.resources.some((r) => r.service === "backup" && r.props.redundancy === "GeoRedundant") },
      { text: "Enable backup for a virtual machine into the vault.", hint: "Vault → Protected items → Enable backup, or VM blade → Backup card.", check: (s) => s.resources.some((r) => r.service === "backup" && ((r.props.protectedItems as unknown[] | undefined)?.length ?? 0) > 0) },
      { text: "Create a restore point for the protected VM.", hint: "Vault → Protected items → Create restore point.", check: (s) => s.resources.some((r) => r.service === "backup" && ((r.props.protectedItems as unknown[] | undefined)?.length ?? 0) > 0) },
      { text: "Enable soft delete on the vault.", hint: "Security step of the wizard, or vault essentials.", check: (s) => s.resources.some((r) => r.service === "backup" && r.props.softDelete) },
      { text: "Note the daily policy: backup at 02:00 UTC, 30-day retention.", hint: "Policies define WHEN and HOW LONG recovery points are kept.", check: (s) => s.resources.some((r) => r.service === "backup") },
    ],
  },
  /* ------------------------------ Monitoring ---------------------------- */
  {
    id: "lab18",
    title: "Lab 18 — Implement monitoring",
    level: "Advanced",
    minutes: 15,
    goal: "Diagnostic settings, Log Analytics, alerts and metrics.",
    steps: [
      { text: "Create a Log Analytics workspace.", hint: "Marketplace → Log Analytics workspace.", check: (s) => s.resources.filter((r) => r.service === "log").length >= 2 },
      { text: "Enable diagnostic settings on a resource (send allLogs + allMetrics to the workspace).", hint: "Resource blade → Diagnostic settings → pick workspace → Enable.", check: (s) => s.resources.some((r) => (r.props.diagnosticSettings as { enabled?: boolean } | undefined)?.enabled) },
      { text: "Create an alert rule on a VM metric (e.g. CPU > 60%).", hint: "Resource blade → Alerts → New alert rule.", check: (s) => s.alertRules.length >= 2 },
      { text: "Open Monitor and view the platform metrics overview.", hint: "Sidebar → Monitor.", check: (s) => visited(s, "monitor") },
      { text: "Open the Activity log and find a Create operation you performed.", hint: "Monitor → Activity log.", check: (s) => visited(s, "activity") },
      { text: "Query the activity log with KQL in the workspace (simulated).", hint: "Try: AzureActivity | where OperationNameValue contains 'CREATE'", check: (s) => s.resources.some((r) => r.service === "log") },
    ],
  },
];

export const labById = (id: string) => LABS.find((l) => l.id === id);
