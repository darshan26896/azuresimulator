import { useEffect, useRef, useState } from "react";
import { RotateCw, X } from "lucide-react";
import { runCli } from "../lib/cli";
import { useAzure } from "../lib/store";

interface Line {
  text: string;
  kind: "in" | "out" | "err" | "sys";
}

export function CloudShell({ onClose }: { onClose: () => void }) {
  const { state, api } = useAzure();
  const [lines, setLines] = useState<Line[]>([
    { text: "Installing Azure CLI...", kind: "sys" },
    { text: "Welcome to the simulated Azure Cloud Shell.", kind: "sys" },
    { text: "Type `help` to list the commands this offline shell understands.", kind: "sys" },
    { text: "", kind: "out" },
  ]);
  const [value, setValue] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const [h, setH] = useState(300);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const exec = (cmd: string) => {
    api.cli(cmd);
    setHist((hs) => [...hs, cmd]);
    setHi(-1);
    const out = runCli(cmd, { state, api });
    if (out[0] === "__CLEAR__") {
      setLines([]);
      return;
    }
    const next: Line[] = [{ text: `~ $ ${cmd}`, kind: "in" }, ...out.map((t) => ({ text: t, kind: (t.startsWith("ERROR") || t.includes("command not found") ? "err" : "out") as Line["kind"] }))];
    setLines((l) => [...l, ...next, { text: "", kind: "out" }]);
  };

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = h;
    const move = (ev: MouseEvent) => setH(Math.min(640, Math.max(160, h0 - (ev.clientY - y0))));
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="border-t border-[var(--border-2)] bg-[#0c0c0c] text-[#e8e8e8] flex flex-col" style={{ height: h }}>
      <div className="h-1.5 cursor-row-resize bg-[var(--border-2)] hover:bg-[var(--accent)]" onMouseDown={startDrag} title="Drag to resize" />
      <div className="flex items-center gap-3 px-3 h-9 bg-[#1f1f1f] text-[12px] shrink-0">
        <span className="font-semibold">Cloud Shell</span>
        <span className="opacity-70">bash · az 2.63.0 (simulated)</span>
        <span className="ml-auto opacity-70">student@azsim: ~/clouddrive</span>
        <button className="hover:text-white opacity-80 cursor-pointer" title="Restart shell" onClick={() => setLines([{ text: "Shell restarted.", kind: "sys" }, { text: "", kind: "out" }])}>
          <RotateCw size={14} />
        </button>
        <button className="hover:text-white opacity-80 cursor-pointer" title="Close" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div ref={bodyRef} className="flex-1 overflow-y-auto az-scroll px-3 py-2 mono text-[12.5px] leading-[1.5]" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div
            key={i}
            className="whitespace-pre-wrap break-words"
            style={{ color: l.kind === "in" ? "#7ee787" : l.kind === "err" ? "#ff8b8b" : l.kind === "sys" ? "#9cb3ff" : "#e8e8e8" }}
          >
            {l.text || "\u00A0"}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-[#7ee787] shrink-0">~ $</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const c = value;
                setValue("");
                exec(c);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const n = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1);
                if (hist[n] !== undefined) {
                  setHi(n);
                  setValue(hist[n]);
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (hi >= 0 && hi < hist.length - 1) {
                  setHi(hi + 1);
                  setValue(hist[hi + 1]);
                } else {
                  setHi(-1);
                  setValue("");
                }
              } else if (e.key === "l" && e.ctrlKey) {
                e.preventDefault();
                setLines([]);
              }
            }}
            className="flex-1 bg-transparent outline-none mono text-[12.5px] caret-[#7ee787]"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
