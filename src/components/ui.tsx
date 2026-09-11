import React, { useMemo, useRef, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { cn } from "../utils/cn";
import type { Status } from "../lib/types";
import { serviceById } from "../lib/catalog";

/* ------------------------------- buttons ------------------------------- */

export function Btn({
  children,
  variant = "secondary",
  icon,
  onClick,
  disabled,
  className,
  title,
  type,
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "toolbar" | "link" | "danger";
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center gap-1.5 text-[13px] rounded-[2px] transition-colors select-none disabled:opacity-40 disabled:cursor-default cursor-pointer";
  const styles = {
    primary: "px-3 h-8 text-white border border-transparent",
    secondary: "px-3 h-8 border",
    toolbar: "px-2 h-7 text-[12px] border",
    link: "text-[var(--accent)] hover:underline",
    danger: "px-3 h-8 border text-[var(--err)]",
  }[variant];
  const bg = {
    primary: "bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
    secondary: "bg-[var(--panel)] border-[var(--border-2)] hover:bg-[var(--hover)]",
    toolbar: "bg-[var(--panel)] border-[var(--border-2)] hover:bg-[var(--hover)]",
    link: "",
    danger: "bg-[var(--panel)] border-[var(--border-2)] hover:bg-[var(--hover)]",
  }[variant];
  return (
    <button type={type ?? "button"} title={title} disabled={disabled} onClick={onClick} className={cn(base, styles, bg, className)}>
      {icon}
      {children}
    </button>
  );
}

export function IconBtn({
  icon,
  title,
  onClick,
  active,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "h-8 w-8 grid place-items-center rounded-[2px] cursor-pointer transition-colors",
        active ? "bg-[rgba(255,255,255,0.18)]" : "hover:bg-[rgba(255,255,255,0.12)]",
        className
      )}
    >
      {icon}
    </button>
  );
}

/* -------------------------------- status ------------------------------- */

const STATUS_COLOR: Record<string, string> = {
  Running: "var(--ok)",
  Succeeded: "var(--ok)",
  Online: "var(--ok)",
  Active: "var(--ok)",
  Creating: "#eaa300",
  Updating: "#eaa300",
  Stopped: "var(--text-2)",
  Deallocated: "var(--text-2)",
  Paused: "var(--text-2)",
  Failed: "var(--err)",
};

export function StatusDot({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? "var(--warn)";
  const busy = status === "Creating" || status === "Updating";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {busy ? (
        <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 spin" style={{ borderColor: "var(--border-2)", borderTopColor: c }} />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c }} />
      )}
      {status}
    </span>
  );
}

export function ServiceIcon({ service, size = 26 }: { service: string; size?: number }) {
  const svc = serviceById(service);
  const [a, b] = svc?.colors ?? ["#5a5a5a", "#333"];
  return (
    <span
      className="grid place-items-center rounded-[3px] shrink-0 text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.52, lineHeight: 1 }}
    >
      {svc?.glyph ?? "▣"}
    </span>
  );
}

/* --------------------------------- tabs -------------------------------- */

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-end gap-0.5 border-b border-[var(--border)] px-2 overflow-x-auto no-scroll">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative px-3 py-2 text-[13px] whitespace-nowrap cursor-pointer transition-colors",
              on ? "text-[var(--accent)] font-semibold" : "text-[var(--text-2)] hover:text-[var(--text)]"
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="ml-1.5 opacity-70">{t.count}</span> : null}
            {on ? <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--accent)]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- inputs ------------------------------- */

export function Field({
  label,
  help,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  help?: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block mb-1 font-semibold text-[13px]">
        {label} {required ? <span className="text-[var(--err)]">*</span> : null}
      </label>
      {children}
      {hint ? <div className="mt-1 text-[12px] text-[var(--text-2)]">{hint}</div> : null}
      {help ? <div className="mt-1 text-[12px] text-[var(--text-2)]">{help}</div> : null}
      {error ? <div className="mt-1 text-[12px] text-[var(--err)]">{error}</div> : null}
    </div>
  );
}

const inputCls =
  "w-full h-8 px-2 bg-[var(--panel)] border border-[var(--border-2)] rounded-[2px] focus:border-[var(--accent)] outline-none";

export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputCls, mono && "mono", invalid && "border-[var(--err)]")}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; note?: string; price?: number; disabled?: boolean }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "cursor-pointer")}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
          {o.note ? ` — ${o.note}` : ""}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button onClick={() => onChange(!value)} className="flex items-start gap-2 text-left cursor-pointer">
      <span
        className="mt-0.5 h-5 w-10 rounded-full relative transition-colors shrink-0"
        style={{ background: value ? "var(--accent)" : "var(--border-2)" }}
      >
        <span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all"
          style={{ left: value ? 22 : 3 }}
        />
      </span>
      {label ? <span className="text-[13px] leading-5">{label}</span> : null}
    </button>
  );
}

/* -------------------------------- tables ------------------------------- */

export function DataTable({
  cols,
  rows,
  empty,
}: {
  cols: { label: string; render: (row: any) => React.ReactNode; w?: string; align?: "right" }[];
  rows: any[];
  empty?: React.ReactNode;
}) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto az-scroll">
      <table className="w-full text-[13px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border-2)] text-left">
            {cols.map((c, i) => (
              <th key={i} className={cn("py-2 px-2 font-semibold text-[var(--text-2)] whitespace-nowrap", c.align === "right" && "text-right")} style={{ width: c.w }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--hover)]">
              {cols.map((c, j) => (
                <td key={j} className={cn("py-2 px-2 align-middle", c.align === "right" && "text-right")}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-3 h-12 w-12 grid place-items-center rounded-full bg-[var(--panel-3)] text-[var(--text-2)]">{icon ?? <Info size={20} />}</div>
      <div className="font-semibold">{title}</div>
      {body ? <div className="mt-1 text-[var(--text-2)] max-w-md mx-auto">{body}</div> : null}
      {action ? <div className="mt-4 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ essentials ----------------------------- */

export function Essentials({ items }: { items: { label: string; value: React.ReactNode; mono?: boolean }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 py-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2 text-[13px] border-b border-[var(--border)] py-1.5">
          <div className="w-44 shrink-0 text-[var(--text-2)]">{it.label}</div>
          <div className={cn("font-semibold break-all", it.mono && "mono font-normal")}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

export function CopyBox({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-stretch border border-[var(--border-2)] rounded-[2px] overflow-hidden">
      <div className="mono text-[12px] px-2 py-1.5 flex-1 break-all bg-[var(--panel-2)]">{value}</div>
      <button
        className="px-2 grid place-items-center border-l border-[var(--border-2)] hover:bg-[var(--hover)] cursor-pointer"
        title="Copy"
        onClick={() => {
          try {
            navigator.clipboard?.writeText(value);
          } catch {
            /* ignore */
          }
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        }}
      >
        {done ? <Check size={14} className="text-[var(--ok)]" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function LearnBox({ items, title = "What you should know" }: { items: string[]; title?: string }) {
  return (
    <div className="border border-[var(--border)] border-l-[3px] border-l-[var(--accent)] bg-[var(--panel-2)] p-3 rounded-[2px]">
      <div className="font-semibold mb-1.5">{title}</div>
      <ul className="space-y-1.5 text-[12.5px] text-[var(--text-2)]">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-[var(--accent)]">▸</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Card({ title, children, actions, className }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("border border-[var(--border)] bg-[var(--panel)] rounded-[2px]", className)}>
      {title ? (
        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[13px]">{title}</h3>
          {actions}
        </header>
      ) : null}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function TagsEditor({ tags, onChange }: { tags: Record<string, string>; onChange: (t: Record<string, string>) => void }) {
  const [k, setK] = useState("");
  const [v, setV] = useState("");
  const pairs = Object.entries(tags);
  return (
    <div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mb-2">
        <Field label="Name">
          <TextInput value={k} onChange={setK} placeholder="env" />
        </Field>
        <Field label="Value">
          <TextInput value={v} onChange={setV} placeholder="dev" />
        </Field>
        <Btn
          variant="primary"
          className="mb-4"
          onClick={() => {
            if (!k.trim()) return;
            onChange({ ...tags, [k.trim()]: v.trim() });
            setK("");
            setV("");
          }}
        >
          Apply
        </Btn>
      </div>
      <div className="flex flex-wrap gap-2">
        {pairs.length === 0 ? <span className="text-[var(--text-2)]">No tags yet. Tags help you group and filter resources.</span> : null}
        {pairs.map(([key, val]) => (
          <span key={key} className="inline-flex items-center gap-1 border border-[var(--border-2)] bg-[var(--panel-3)] px-2 py-1 text-[12px] rounded-[2px]">
            <b className="font-semibold">{key}</b> : {val}
            <button className="ml-1 text-[var(--text-2)] hover:text-[var(--err)] cursor-pointer" onClick={() => { const n = { ...tags }; delete n[key]; onChange(n); }}>
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- charts ------------------------------- */

export function AreaChart({
  points,
  unit,
  color = "#0078d4",
  height = 160,
}: {
  points: { t: number; v: number }[];
  unit?: string;
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const w = 100;
  const { path, area, max, min, xs } = useMemo(() => {
    const vs = points.map((p) => p.v);
    const mx = Math.max(...vs, 0.0001);
    const mn = Math.min(...vs, 0);
    const span = mx - mn || 1;
    const pad = span * 0.12;
    const top = mx + pad;
    const bot = Math.max(0, mn - pad);
    const sx = (i: number) => (i / Math.max(1, points.length - 1)) * w;
    const sy = (v: number) => 100 - ((v - bot) / (top - bot)) * 100;
    let d = "";
    points.forEach((p, i) => {
      d += `${i === 0 ? "M" : "L"}${sx(i).toFixed(2)},${sy(p.v).toFixed(2)} `;
    });
    const a = `${d}L${w},100 L0,100 Z`;
    return { path: d, area: a, max: top, min: bot, xs: sx };
  }, [points]);

  const idx = hover ?? points.length - 1;
  const cur = points[idx];

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[20px] font-light leading-none">
          {cur ? cur.v.toLocaleString() : "—"}
          {unit ? <span className="text-[12px] text-[var(--text-2)] ml-1">{unit}</span> : null}
        </div>
        <div className="text-[11px] text-[var(--text-2)]">{cur ? new Date(cur.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}</div>
      </div>
      <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${w} 100`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`g-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="0.4" />
          ))}
          <path d={area} fill={`url(#g-${color.slice(1)})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          {hover !== null ? <line x1={xs(hover)} y1="0" x2={xs(hover)} y2="100" stroke="var(--text-2)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" /> : null}
          <circle cx={xs(idx)} cy={100 - ((cur?.v ?? 0) - min) / (max - min || 1) * 100} r="1.4" fill={color} vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          className="absolute inset-0"
          onMouseMove={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const pct = (e.clientX - r.left) / r.width;
            setHover(Math.max(0, Math.min(points.length - 1, Math.round(pct * (points.length - 1)))));
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[var(--text-2)] mt-1">
        <span>{points[0] ? new Date(points[0].t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
        <span>
          max {max.toFixed(max < 10 ? 2 : 0)} {unit}
        </span>
        <span>now</span>
      </div>
    </div>
  );
}

export function BarList({ items, unit = "$" }: { items: { label: string; value: number; sub?: string }[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <div className="space-y-2">
      {items.map((i, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-[12.5px] mb-0.5">
            <span>
              {i.label} {i.sub ? <span className="text-[var(--text-2)]">· {i.sub}</span> : null}
            </span>
            <span className="mono">
              {unit}
              {i.value.toFixed(2)}
            </span>
          </div>
          <div className="h-2 bg-[var(--panel-3)] rounded-[1px] overflow-hidden">
            <div className="h-full rounded-[1px]" style={{ width: `${(i.value / max) * 100}%`, background: "linear-gradient(90deg,#3b8cf0,#1250a3)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export const money = (n: number) => `$${n.toFixed(2)}`;

export type { Status };
