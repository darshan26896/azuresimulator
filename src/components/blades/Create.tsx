import { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { REGIONS, regionLabel, serviceById, type FieldDef } from "../../lib/catalog";
import { idOf, useAzure, validateCidr, validateResourceName } from "../../lib/store";
import { Btn, CopyBox, Field, LearnBox, SelectInput, TagsEditor, TextInput, Toggle, money } from "../ui";

export function CreateBlade({ service, rg: initialRg }: { service: string; rg?: string }) {
  const { state, api } = useAzure();
  const svc = serviceById(service);
  const [tab, setTab] = useState("basics");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [rgMode, setRgMode] = useState<"existing" | "new">(initialRg || state.rgs.length ? "existing" : "new");
  const [rg, setRg] = useState(initialRg ?? state.rgs[0]?.name ?? "");
  const [newRg, setNewRg] = useState("");
  const [loc, setLoc] = useState("eastus");

  const [props, setProps] = useState<Record<string, any>>(() => {
    const o: Record<string, any> = {};
    svc?.steps.forEach((s) =>
      s.fields.forEach((f) => {
        if (f.dynamic === "vnet") o[f.key] = "__new__";
        else if (f.dynamic === "storage") o[f.key] = state.resources.find((r) => r.service === "storage")?.name ?? "";
        else o[f.key] = f.default ?? (f.type === "toggle" ? false : f.type === "number" ? (f.min ?? 0) : "");
      })
    );
    return o;
  });
  const [tags, setTags] = useState<Record<string, string>>({});

  const tabs = useMemo(
    () => [
      { id: "basics", label: "Basics" },
      ...svc!.steps.map((s, i) => ({ id: `s${i}`, label: s.title })),
      { id: "tags", label: "Tags" },
      { id: "review", label: "Review + create" },
    ],
    [svc]
  );

  const finalRg = rgMode === "new" ? newRg.trim() : rg;
  const nameErr = name ? validateResourceName(service, name, state.resources.filter((r) => r.rg === finalRg).map((r) => r.name)) : null;
  const rgErr = rgMode === "new" ? (!newRg.trim() ? "Enter a resource group name." : null) : !rg ? "Select a resource group." : null;

  const fieldErrors: Record<string, string | null> = {};
  svc!.steps.forEach((s) =>
    s.fields.forEach((f) => {
      if (f.when && !f.when(props)) return;
      const v = props[f.key];
      if (f.required && (v === "" || v === undefined || v === null)) fieldErrors[f.key] = "This field is required.";
      if (f.type === "number" && v !== "" && Number.isNaN(Number(v))) fieldErrors[f.key] = "Enter a number.";
      if (f.key === "cidr" || f.key === "subnetCidr") fieldErrors[f.key] = validateCidr(String(v));
      if (f.dynamic === "storage" && !state.resources.some((r) => r.service === "storage" && r.name === v))
        fieldErrors[f.key] = "Select an existing storage account (create one first).";
      if (f.key === "password" && props.authType === "password") {
        const pw = String(v ?? "");
        if (pw.length < 12) fieldErrors[f.key] = "At least 12 characters.";
        else if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9]/.test(pw)) fieldErrors[f.key] = "Mix upper case, lower case and digits.";
      }
    })
  );
  const valid = !nameErr && !rgErr && name.length > 0 && Object.values(fieldErrors).every((e) => !e);
  const cost = svc!.monthly(props, loc) ?? 0;

  const go = (id: string) => {
    setTab(id);
    setSubmitted(false);
  };
  const idxOf = tabs.findIndex((t) => t.id === tab);

  const create = () => {
    setSubmitted(true);
    if (!valid) {
      api.toast({ title: "Validation failed", body: "Fix the highlighted fields and try again.", kind: "error" });
      setTab("basics");
      return;
    }
    let targetRg = finalRg;
    if (rgMode === "new") {
      const e = api.createRG(finalRg, loc, {});
      if (e) {
        api.toast({ title: "Could not create resource group", body: e, kind: "error" });
        return;
      }
    }
    const extra: string[] = [];
    if (service === "vm" && props.vnet === "__new__") {
      const vnetName = `${name}-vnet`;
      const base = 10 + (name.length % 80);
      const err = api.createResource({
        service: "vnet",
        name: vnetName,
        rg: targetRg,
        location: loc,
        props: { cidr: `${base}.0.0.0/16`, subnetName: "default", subnetCidr: `${base}.0.0.0/24`, ddos: false, firewall: false, bastion: false },
        tags,
      });
      if (!err) extra.push(vnetName);
      props.vnet = vnetName;
    }
    const err = api.createResource({ service, name, rg: targetRg, location: loc, props: { ...props }, tags });
    if (err) {
      api.toast({ title: "Validation failed", body: err, kind: "error" });
      return;
    }
    if (extra.length) api.toast({ title: "Dependency created", body: `Azure also created: ${extra.join(", ")}.`, kind: "info" });
    const id = idOf(targetRg, svc!.resourceType, name);
    api.open("resource", { id }, `resource-${id}`);
  };

  const set = (k: string, v: any) => setProps((p) => ({ ...p, [k]: v }));

  const renderField = (f: FieldDef) => {
    if (f.when && !f.when(props)) return null;
    const err = submitted ? fieldErrors[f.key] : null;
    if (f.type === "toggle")
      return (
        <div key={f.key} className="mb-4">
          <Field label={f.label} help={f.help}>
            <Toggle value={!!props[f.key]} onChange={(v) => set(f.key, v)} />
          </Field>
        </div>
      );
    if (f.type === "select") {
      let options = f.options ?? [];
      if (f.dynamic === "vnet")
        options = [
          { value: "__new__", label: "Create new virtual network" },
          ...state.resources.filter((r) => r.service === "vnet").map((r) => ({ value: r.name, label: `${r.name} (${r.props.cidr})` })),
        ];
      if (f.dynamic === "storage")
        options = state.resources.filter((r) => r.service === "storage").map((r) => ({ value: r.name, label: r.name }));
      if (f.dynamic === "avset")
        options = [
          { value: "", label: "No infrastructure redundancy required" },
          ...state.resources.filter((r) => r.service === "avset").map((r) => ({ value: r.name, label: `${r.name} (${r.props.fd} FD · ${r.props.ud} UD)` })),
        ];
      return (
        <Field key={f.key} label={f.label} required={f.required} error={err} help={f.help} hint={f.price ? `Adds ${money(f.price)} / month` : undefined}>
          <SelectInput value={String(props[f.key] ?? "")} onChange={(v) => set(f.key, v)} options={options} />
        </Field>
      );
    }
    return (
      <Field key={f.key} label={f.label} required={f.required} error={err} help={f.help}>
        <TextInput
          value={String(props[f.key] ?? "")}
          onChange={(v) => set(f.key, f.type === "number" ? (v === "" ? "" : Number(v)) : v)}
          placeholder={f.placeholder}
          mono={f.mono}
          type={f.type === "password" ? "password" : "text"}
          invalid={!!err}
        />
      </Field>
    );
  };

  if (!svc) return <div className="p-4">Unknown service.</div>;

  return (
    <div className="flex min-h-full">
      <aside className="w-[170px] shrink-0 border-r border-[var(--border)] bg-[var(--panel-2)] py-2">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`w-full text-left px-3 py-2 text-[12.5px] cursor-pointer border-l-[3px] ${
              tab === t.id ? "border-l-[var(--accent)] bg-[var(--selected)] font-semibold" : "border-l-transparent hover:bg-[var(--hover)]"
            }`}
          >
            <span className="opacity-50 mr-1">{i + 1}</span> {t.label}
          </button>
        ))}
        <div className="mt-4 px-3 text-[11px] text-[var(--text-2)]">Estimated cost</div>
        <div className="px-3 text-[17px] font-light">{money(cost)}<span className="text-[11px] text-[var(--text-2)]"> /mo</span></div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--panel-2)]">
          <span className="text-[11.5px] text-[var(--text-2)]">
            Step {idxOf + 1} of {tabs.length}
          </span>
          <span className="text-[13px] font-semibold">{tabs[idxOf]?.label}</span>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`ml-1 h-1.5 w-6 rounded-full cursor-pointer ${t.id === tab ? "bg-[var(--accent)]" : "bg-[var(--border-2)]"}`}
              title={t.label}
            />
          ))}
        </div>
        <div className="p-4 flex-1">
          {tab === "basics" ? (
            <>
              <h3 className="text-[16px] font-semibold mb-1">{svc.name}</h3>
              <p className="text-[12.5px] text-[var(--text-2)] mb-4">{svc.blurb}</p>
              <div className="max-w-xl">
                <Field label="Subscription" help="This simulator has a single free learning subscription.">
                  <SelectInput value={state.currentSubscription} onChange={() => {}} options={state.subscriptions.map((s) => ({ value: s.id, label: s.name }))} />
                </Field>
                <Field label="Resource group" required error={rgErr}>
                  <SelectInput
                    value={rgMode}
                    onChange={(v) => setRgMode(v as "existing" | "new")}
                    options={[
                      { value: "existing", label: "Use existing" },
                      { value: "new", label: "Create new resource group" },
                    ]}
                  />
                  <div className="mt-2">
                    {rgMode === "existing" ? (
                      <SelectInput
                        value={rg}
                        onChange={setRg}
                        options={[
                          { value: "", label: "— select a resource group —", disabled: true },
                          ...state.rgs.map((g) => ({ value: g.name, label: `${g.name} (${regionLabel(g.location)})` })),
                        ]}
                      />
                    ) : (
                      <TextInput value={newRg} onChange={setNewRg} placeholder="rg-my-new-group" />
                    )}
                  </div>
                </Field>
                <Field
                  label={`${svc.name} name`}
                  required
                  error={submitted ? nameErr : name ? nameErr : null}
                  help={svc.nameRule ? svc.nameRule.hint : undefined}
                >
                  <TextInput value={name} onChange={setName} placeholder={`my-${svc.id}`} invalid={!!(submitted && nameErr)} />
                </Field>
                <Field label="Region" help="Prices differ per region — this simulator mirrors that with a region price index.">
                  <SelectInput value={loc} onChange={setLoc} options={REGIONS.map((r) => ({ value: r.value, label: `${r.label} (${r.value})` }))} />
                </Field>
              </div>
            </>
          ) : null}

          {tab.startsWith("s") ? (
            <div className="max-w-xl">
              {(() => {
                const i = Number(tab.slice(1));
                const step = svc.steps[i];
                return (
                  <>
                    <h3 className="text-[16px] font-semibold mb-1">{step.title}</h3>
                    {step.description ? <p className="text-[12.5px] text-[var(--text-2)] mb-4">{step.description}</p> : null}
                    {step.fields.map(renderField)}
                  </>
                );
              })()}
            </div>
          ) : null}

          {tab === "tags" ? (
            <div className="max-w-xl">
              <h3 className="text-[16px] font-semibold mb-1">Tags</h3>
              <p className="text-[12.5px] text-[var(--text-2)] mb-4">
                Tags are name/value pairs used for billing reports, policies and automation. Common examples: <span className="mono">env</span>, <span className="mono">owner</span>,{" "}
                <span className="mono">cost-center</span>.
              </p>
              <TagsEditor tags={tags} onChange={setTags} />
            </div>
          ) : null}

          {tab === "review" ? (
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 text-[13px]">
                {valid ? (
                  <span className="inline-flex items-center gap-1.5 text-[var(--ok)] font-semibold">
                    <Check size={16} /> Validation passed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[var(--err)] font-semibold">
                    <AlertTriangle size={16} /> Validation failed — open the Basics tab to fix the highlighted fields.
                  </span>
                )}
              </div>
              <div className="border border-[var(--border)] rounded-[2px]">
                <div className="grid grid-cols-2 gap-x-6 p-3 text-[13px]">
                  {[
                    ["Resource group", finalRg || "—"],
                    ["Name", name || "—"],
                    ["Region", regionLabel(loc)],
                    ["Type", svc.resourceType],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2 border-b border-[var(--border)] py-1.5">
                      <span className="w-40 text-[var(--text-2)]">{k}</span>
                      <span className="mono font-normal">{v}</span>
                    </div>
                  ))}
                  {svc.steps.flatMap((s) =>
                    s.fields
                      .filter((f) => (!f.when || f.when(props)) && props[f.key] !== "" && props[f.key] !== undefined)
                      .map((f) => {
                        const opt = f.options?.find((o) => o.value === props[f.key]);
                        const display =
                          f.type === "toggle"
                            ? props[f.key]
                              ? "Enabled"
                              : "Disabled"
                            : f.dynamic === "vnet"
                            ? props[f.key] === "__new__"
                              ? "Create new virtual network"
                              : props[f.key]
                            : opt
                            ? opt.label
                            : String(props[f.key]);
                        return (
                          <div key={f.key} className="flex gap-2 border-b border-[var(--border)] py-1.5">
                            <span className="w-40 text-[var(--text-2)]">{f.label}</span>
                            <span>{display}</span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] text-[var(--text-2)]">Estimated cost</span>
                <span className="text-[20px] font-light">{money(cost)}</span>
                <span className="text-[12px] text-[var(--text-2)]">/ month</span>
              </div>
              {Object.keys(tags).length ? (
                <CopyBox value={Object.entries(tags).map(([k, v]) => `${k}=${v}`).join("; ")} />
              ) : null}
              <LearnBox items={svc.learn} title={`About ${svc.name}`} />
              <Btn variant="primary" icon={<Rocket size={15} />} onClick={create} disabled={!valid}>
                Create
              </Btn>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--border)] p-3 flex items-center gap-2 bg-[var(--panel-2)]">
          <Btn icon={<ChevronLeft size={14} />} disabled={idxOf <= 0} onClick={() => go(tabs[Math.max(0, idxOf - 1)].id)}>
            Back
          </Btn>
          <Btn variant="primary" icon={<ChevronRight size={14} />} disabled={idxOf >= tabs.length - 1} onClick={() => go(tabs[Math.min(tabs.length - 1, idxOf + 1)].id)}>
            Next
          </Btn>
          <Btn onClick={() => go("review")}>Review + create</Btn>
          <Btn variant="primary" className="ml-auto" onClick={create} disabled={!valid && submitted}>
            {submitted && !valid ? "Fix errors" : "Create"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
