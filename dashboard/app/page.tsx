"use client";
import Link from "next/link";

export default function Home() {
  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"2rem"}}>
      <nav style={{display:"flex",gap:16,marginBottom:24}}>
        <strong>VPS Dashboard</strong>
        <Link href="/benchmark" style={{color:"#60a5fa"}}>Benchmark</Link>
        <a href="/api/health" style={{color:"#9ca3af"}}>API</a>
      </nav>
      <h1>VPS Dashboard</h1>
      <p style={{color:"#9ca3af"}}>Monitoring VPS + Benchmark agents (60 scénarios).</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginTop:24}}>
        {[
          {k:"CPU",v:"42%"},
          {k:"RAM",v:"6.2 / 16 GB"},
          {k:"Disk",v:"120 / 500 GB"},
        ].map(c=> <div key={c.k} style={{background:"#1f2937",padding:16,borderRadius:12}}><div style={{fontSize:12,color:"#9ca3af"}}>{c.k}</div><div style={{fontSize:22,fontWeight:700}}>{c.v}</div></div>)}
      </div>
      <Link href="/benchmark" style={{display:"inline-block",marginTop:24,background:"#6366f1",color:"#fff",padding:"10px 18px",borderRadius:8,textDecoration:"none"}}>Lancer un benchmark →</Link>
    </div>
  );
}
