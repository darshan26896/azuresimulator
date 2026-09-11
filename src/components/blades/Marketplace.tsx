import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, SERVICES } from "../../lib/catalog";
import { useAzure } from "../../lib/store";
import { Btn, ServiceIcon } from "../ui";

export function MarketplaceBlade({ rg }: { rg?: string }) {
  const { state, api } = useAzure();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SERVICES.filter((s) => (cat === "all" || s.category === cat) && (!t || (s.name + s.blurb + s.category + s.resourceType).toLowerCase().includes(t)));
  }, [q, cat]);

  const target = rg ?? state.rgs[0]?.name;

  return (
    <div className="flex min-h-full">
      <aside className="w-[190px] shrink-0 border-r border-[var(--border)] bg-[var(--panel-2)] p-2">
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-2)] px-1 mb-1">Categories</div>
        {[
          { id: "all", label: "All services" },
          ...CATEGORIES.map((c) => ({ id: c, label: c })),
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`w-full text-left px-2 py-1.5 rounded-[2px] text-[12.5px] cursor-pointer ${
              cat === c.id ? "bg-[var(--selected)] font-semibold" : "hover:bg-[var(--hover)]"
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="mt-4 p-2 border border-[var(--border)] text-[11.5px] text-[var(--text-2)]">
          {target ? (
            <>
              New resources will be created in <b className="text-[var(--text)]">{target}</b>. You can change this in the wizard.
            </>
          ) : (
            <>You have no resource groups yet — the wizard will create one for you.</>
          )}
        </div>
      </aside>

      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <div>
            <h2 className="text-[18px] font-semibold">Marketplace</h2>
            <p className="text-[12px] text-[var(--text-2)]">All simulated Azure services — {SERVICES.length} available, no subscription or internet needed.</p>
          </div>
          <div className="ml-auto w-[260px]">
            <div className="flex items-center gap-1.5 h-8 px-2 border border-[var(--border-2)] bg-[var(--panel)] rounded-[2px]">
              <Search size={14} className="text-[var(--text-2)]" />
              <input className="bg-transparent outline-none w-full text-[13px]" placeholder="Search the Marketplace" value={q} onChange={(e) => setQ(e.target.value)} />
              {q ? <button onClick={() => setQ("")} className="cursor-pointer"><X size={13} /></button> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => api.open("create", { service: s.id, rg }, `create-${s.id}`)}
              className="text-left border border-[var(--border)] bg-[var(--panel)] p-3 rounded-[2px] hover:border-[var(--accent)] hover:shadow-[var(--shadow)] transition cursor-pointer flex gap-3"
            >
              <ServiceIcon service={s.id} size={36} />
              <span className="min-w-0">
                <span className="block font-semibold text-[13.5px] truncate">{s.name}</span>
                <span className="block text-[11.5px] text-[var(--text-2)] mb-1">{s.category}</span>
                <span className="block text-[11.5px] text-[var(--text-2)] leading-snug line-clamp-3">{s.blurb}</span>
              </span>
            </button>
          ))}
        </div>

        {!list.length ? (
          <div className="py-10 text-center text-[var(--text-2)]">
            Nothing matched “{q}”.
            <div className="mt-3">
              <Btn onClick={() => setQ("")}>Clear search</Btn>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
