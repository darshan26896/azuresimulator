import { useState } from "react";
import { KeyRound, Plus, Trash2, Users } from "lucide-react";
import { ROLES, roleName } from "../../lib/governance";
import { useAzure } from "../../lib/store";
import { Btn, Card, DataTable, EmptyState, Field, SelectInput, Tabs, TextInput, Toggle } from "../ui";

export function EntraBlade() {
  const { state, api } = useAzure();
  const [tab, setTab] = useState("users");

  const [u, setU] = useState({ displayName: "", userPrincipalName: "", jobTitle: "", department: "" });
  const [uErr, setUErr] = useState<string | null>(null);

  const [g, setG] = useState({ displayName: "", description: "" });
  const [gErr, setGErr] = useState<string | null>(null);
  const [memberGroup, setMemberGroup] = useState<string | null>(null);
  const [memberPick, setMemberPick] = useState("");

  const createUser = () => {
    const err = api.createUser({ ...u, mail: u.userPrincipalName, accountEnabled: true, type: "Member" });
    if (err) return setUErr(err);
    setUErr(null);
    setU({ displayName: "", userPrincipalName: "", jobTitle: "", department: "" });
  };

  const createGroup = () => {
    const err = api.createGroup(g);
    if (err) return setGErr(err);
    setGErr(null);
    setG({ displayName: "", description: "" });
  };

  return (
    <div>
      <div className="p-3">
        <h2 className="text-[18px] font-semibold mb-0.5">Microsoft Entra ID</h2>
        <p className="text-[12.5px] text-[var(--text-2)]">
          Your simulated directory: {state.users.length} users · {state.groups.length} groups · {state.roleAssignments.length} role assignments
        </p>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "users", label: "Users", count: state.users.length },
          { id: "groups", label: "Groups", count: state.groups.length },
          { id: "roles", label: "Roles and administrators" },
        ]}
      />
      <div className="p-3 space-y-3">
        {tab === "users" ? (
          <>
            <Card title="New user">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Display name" required>
                  <TextInput value={u.displayName} onChange={(v) => setU({ ...u, displayName: v })} placeholder="Priya Raman" />
                </Field>
                <Field label="User principal name" required error={uErr} help="This is the sign-in name. Use the @azsim.onmicrosoft.com suffix.">
                  <TextInput value={u.userPrincipalName} onChange={(v) => { setU({ ...u, userPrincipalName: v }); setUErr(null); }} placeholder="priya.raman@azsim.onmicrosoft.com" mono />
                </Field>
                <Field label="Job title">
                  <TextInput value={u.jobTitle} onChange={(v) => setU({ ...u, jobTitle: v })} placeholder="Data Engineer" />
                </Field>
                <Field label="Department">
                  <TextInput value={u.department} onChange={(v) => setU({ ...u, department: v })} placeholder="Data & AI" />
                </Field>
              </div>
              <Btn variant="primary" icon={<Plus size={14} />} onClick={createUser} disabled={!u.displayName || !u.userPrincipalName}>
                Create
              </Btn>
            </Card>
            <Card title="Users">
              <DataTable
                cols={[
                  {
                    label: "Name",
                    render: (x: any) => (
                      <div>
                        <div className="font-semibold">{x.displayName}</div>
                        <div className="text-[11.5px] text-[var(--text-2)] mono">{x.userPrincipalName}</div>
                      </div>
                    ),
                  },
                  { label: "Job title", render: (x: any) => x.jobTitle || "—" },
                  { label: "Department", render: (x: any) => x.department || "—" },
                  {
                    label: "Account enabled",
                    render: (x: any) => (
                      <div className="flex items-center gap-2">
                        <Toggle value={x.accountEnabled} onChange={() => api.toggleUser(x.id)} />
                        <span className="text-[12px]">{x.accountEnabled ? "Enabled" : "Blocked"}</span>
                      </div>
                    ),
                  },
                  {
                    label: "",
                    render: (x: any) => (
                      <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.deleteUser(x.id)}>
                        Delete
                      </Btn>
                    ),
                  },
                ]}
                rows={state.users}
                empty={<EmptyState title="No users" body="Create your first directory user." icon={<Users size={20} />} />}
              />
            </Card>
          </>
        ) : null}

        {tab === "groups" ? (
          <>
            <Card title="New group">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Group name" required error={gErr}>
                  <TextInput value={g.displayName} onChange={(v) => { setG({ ...g, displayName: v }); setGErr(null); }} placeholder="data-platform" />
                </Field>
                <Field label="Description">
                  <TextInput value={g.description} onChange={(v) => setG({ ...g, description: v })} placeholder="Owns the analytics platform" />
                </Field>
              </div>
              <Btn variant="primary" icon={<Plus size={14} />} onClick={createGroup} disabled={!g.displayName}>
                Create
              </Btn>
            </Card>
            <Card title="Groups">
              <div className="space-y-2">
                {state.groups.map((gr) => (
                  <div key={gr.id} className="border border-[var(--border)] p-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{gr.displayName}</span>
                      <span className="text-[11.5px] text-[var(--text-2)]">{gr.description}</span>
                      <span className="ml-auto text-[12px]">{gr.members.length} member(s)</span>
                      <Btn variant="toolbar" icon={<Plus size={13} />} onClick={() => { setMemberGroup(memberGroup === gr.id ? null : gr.id); setMemberPick(""); }}>
                        Add member
                      </Btn>
                      <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.deleteGroup(gr.id)}>
                        Delete
                      </Btn>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {gr.members.map((mid) => {
                        const u = state.users.find((x) => x.id === mid);
                        return u ? (
                          <span key={mid} className="text-[11.5px] bg-[var(--panel-3)] border border-[var(--border-2)] px-1.5 py-0.5">
                            {u.displayName}
                          </span>
                        ) : null;
                      })}
                      {!gr.members.length ? <span className="text-[12px] text-[var(--text-2)]">No members yet.</span> : null}
                    </div>
                    {memberGroup === gr.id ? (
                      <div className="flex gap-2 mt-2">
                        <div className="w-[260px]">
                          <SelectInput
                            value={memberPick}
                            onChange={setMemberPick}
                            options={[
                              { value: "", label: "— select a user —", disabled: true },
                              ...state.users.filter((u) => !gr.members.includes(u.id)).map((u) => ({ value: u.id, label: u.displayName })),
                            ]}
                          />
                        </div>
                        <Btn
                          variant="primary"
                          disabled={!memberPick}
                          onClick={() => {
                            api.addGroupMember(gr.id, memberPick);
                            setMemberGroup(null);
                          }}
                        >
                          Assign
                        </Btn>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : null}

        {tab === "roles" ? (
          <Card title="Built-in roles used in this directory">
            <DataTable
              cols={[
                { label: "Role", render: (x: any) => <span className="font-semibold">{x.name}</span> },
                { label: "Description", render: (x: any) => x.description },
                { label: "Assignments", align: "right", render: (x: any) => state.roleAssignments.filter((r) => r.roleId === x.id).length },
              ]}
              rows={ROLES}
            />
            <p className="text-[12px] text-[var(--text-2)] mt-3">
              Role assignments live on a scope (subscription → resource group → resource). Manage them from any resource blade's <b>Access control (IAM)</b> tab.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------- IAM (reusable) --------------------------- */

export function IamPanel({ scope, scopeName, title }: { scope: "subscription" | "rg" | "resource"; scopeName: string; title?: string }) {
  const { state, api } = useAzure();
  const [principal, setPrincipal] = useState("");
  const [roleId, setRoleId] = useState(ROLES[1].id);
  const [err, setErr] = useState<string | null>(null);

  const direct = state.roleAssignments.filter((r) => r.scope === scope && r.scopeName === scopeName);
  const inherited = state.roleAssignments.filter(
    (r) => (scope === "resource" && (r.scope === "rg" || r.scope === "subscription")) || (scope === "rg" && r.scope === "subscription")
  );

  const principals = [
    ...state.users.map((u) => ({ id: u.id, label: `${u.displayName} (${u.userPrincipalName})`, type: "User" as const })),
    ...state.groups.map((g) => ({ id: g.id, label: `${g.displayName} (group)`, type: "Group" as const })),
  ];

  return (
    <Card title={title ?? "Access control (IAM)"}>
      <div className="text-[12.5px] text-[var(--text-2)] mb-3">
        Grant users or groups access to this {scope === "subscription" ? "subscription" : scope === "rg" ? "resource group" : "resource"}. Assignments inherit downwards.
      </div>
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <div className="w-[280px]">
          <Field label="Principal">
            <SelectInput
              value={principal}
              onChange={setPrincipal}
              options={[
                { value: "", label: "— select a user or group —", disabled: true },
                ...principals.map((p) => ({ value: p.id, label: p.label })),
              ]}
            />
          </Field>
        </div>
        <div className="w-[240px]">
          <Field label="Role">
            <SelectInput value={roleId} onChange={setRoleId} options={ROLES.map((r) => ({ value: r.id, label: r.name }))} />
          </Field>
        </div>
        <Btn
          variant="primary"
          icon={<Plus size={14} />}
          disabled={!principal}
          onClick={() => {
            const p = principals.find((x) => x.id === principal);
            if (!p) return;
            const e = api.addRole({ scope, scopeName, principalId: p.id, principalName: p.label, principalType: p.type, roleId });
            if (e) return setErr(e);
            setErr(null);
            setPrincipal("");
          }}
        >
          Add role assignment
        </Btn>
      </div>
      {err ? <div className="text-[12.5px] text-[var(--err)] mb-2">{err}</div> : null}

      <DataTable
        cols={[
          { label: "Scope", render: (r: any) => (r.direct ? <span className="text-[var(--ok)]">This {scope === "subscription" ? "subscription" : scope === "rg" ? "resource group" : "resource"}</span> : <span className="text-[var(--text-2)]">Inherited from {r.scopeName}</span>) },
          { label: "Principal", render: (r: any) => <span className="font-semibold">{r.principalName}</span> },
          { label: "Type", render: (r: any) => r.principalType },
          { label: "Role", render: (r: any) => roleName(r.roleId) },
          {
            label: "",
            render: (r: any) =>
              r.direct ? (
                <Btn variant="toolbar" icon={<Trash2 size={13} />} onClick={() => api.delRole(r.id)}>
                  Remove
                </Btn>
              ) : null,
          },
        ]}
        rows={[
          ...direct.map((r) => ({ ...r, direct: true })),
          ...inherited.map((r) => ({ ...r, direct: false })),
        ]}
        empty={<EmptyState title="No role assignments" body="Add one above to practise least-privilege access." icon={<KeyRound size={20} />} />}
      />
    </Card>
  );
}
