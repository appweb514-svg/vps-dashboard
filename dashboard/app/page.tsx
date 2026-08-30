"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SysStats { cpuPct: number; ramUsedGb: number; ramTotalGb: number; diskUsedGb: number; diskTotalGb: number; }
interface AppEntry { id: string; name: string; description?: string; icon?: string; category?: string; url: string; health: { status: string; code?: number; latency?: number }; }

const DOT: Record<string, string> = { online: "#22c55e", degraded: "#eab308", offline: "#ef4444" };

export default function Home() {
  const [sys, setSys] = useState<SysStats | null>(null);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const [s, a] = await Promise.all([
          fetch("/api/system").then(r => r.json()),
          fetch("/vps/api/status").then(r => r.json()),
        ]);
        if (!stop) { setSys(s); setApps(a); setErr(""); }
      } catch { if (!stop) setErr("API injoignable"); }
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb" }}>
      <nav style={{ display: "flex", gap: 24, padding: "16px 32px", borderBottom: "1px solid #1f2937", alignItems: "center" }}>
        <strong style={{ marginRight: "auto" }}>VPS Dashboard</strong>
        <Link href="/" style={{ color: "#93c5fd", textDecoration: "none" }}>Vue d'ensemble</Link>
        <Link href="/benchmark" style={{ color: "#93c5fd", textDecoration: "none" }}>Benchmark</Link>
      </nav>
      <main style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Vue d'ensemble</h1>
        <p style={{ color: "#6b7280", marginTop: 0, fontSize: 13 }}>Actualisation auto toutes les 10 s{err ? ` — ${err}` : ""}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, margin: "24px 0" }}>
          {[
            { label: "CPU", value: sys ? `${sys.cpuPct} %` : "…", sub: sys ? "charge instantanée" : "" },
            { label: "RAM", value: sys ? `${sys.ramUsedGb} / ${sys.ramTotalGb} Go` : "…", sub: sys ? `${Math.round((sys.ramUsedGb / sys.ramTotalGb) * 100)} % utilisée` : "" },
            { label: "Disque", value: sys ? `${sys.diskUsedGb} / ${sys.diskTotalGb} Go` : "…", sub: sys ? `${Math.round((sys.diskUsedGb / sys.diskTotalGb) * 100)} % utilisé` : "" },
          ].map(c => (
            <div key={c.label} style={{ background: "#111a2c", border: "1px solid #1f2937", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 16, margin: "24px 0 12px" }}>Services ({apps.length})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {apps.map(a => (
            <div key={a.id} style={{ background: "#111a2c", border: "1px solid #1f2937", borderRadius: 12, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{a.icon || "📦"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: DOT[a.health.status] || "#6b7280", flexShrink: 0 }} />
                  <strong style={{ fontSize: 14 }}>{a.name}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description || a.id}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{a.health.status}{a.health.latency != null ? ` · ${a.health.latency} ms` : ""}</div>
              </div>
            </div>
          ))}
          {!apps.length && !err && <div style={{ color: "#6b7280", fontSize: 13 }}>Chargement…</div>}
        </div>

        <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
          <Link href="/benchmark" style={{ background: "#2563eb", color: "white", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>Lancer un benchmark →</Link>
          <a href="/api/health" style={{ color: "#6b7280", fontSize: 12, alignSelf: "center" }}>API</a>
        </div>
      </main>
    </div>
  );
}
