"use client";
import { useState, useEffect, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function BenchmarkPage() {
  const [model, setModel] = useState("qwen3-8b-flash-mock");
  const [runId, setRunId] = useState<string|null>(null);
  const [progress, setProgress] = useState<{done:number,total:number,pct:number,etaSec:number}|null>(null);
  const [log, setLog] = useState<any[]>([]);
  const [report, setReport] = useState<any|null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);

  useEffect(()=>{ if(runId && !report){ timerRef.current=setInterval(()=>setElapsed(s=>s+1),1000); return ()=>clearInterval(timerRef.current);} else clearInterval(timerRef.current); },[runId,report]);
  useEffect(()=>{ if(report) clearInterval(timerRef.current); },[report]);

  async function start(mock:boolean) {
    setReport(null); setLog([]); setProgress(null); setElapsed(0);
    const r = await fetch(`${API}/api/benchmark/run`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model,mock})}).then(x=>x.json());
    setRunId(r.runId);
    const es = new EventSource(`${API}/api/benchmark/runs/${r.runId}/stream`);
    es.onmessage = (e)=>{ const d=JSON.parse(e.data); if(d.type==="progress"){ setProgress({done:d.done,total:d.total,pct:d.pct,etaSec:d.etaSec}); setLog(l=>[...l,d.result]); } if(d.type==="done"){ setReport(d.report); es.close(); } };
  }

  const fmt = (s:number)=> `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem"}}>
      <a href="/" style={{color:"#9ca3af"}}>← Dashboard</a>
      <h1 style={{margin:"0.5rem 0"}}>Benchmark Agents — 60 scénarios</h1>
      <p style={{color:"#9ca3af"}}>Batterie inspirée de la vidéo Qwen 3.8 Flash (t=427) — sécurité, pièges, biais, logique, code, UI.</p>

      <div style={{display:"flex",gap:12,margin:"1rem 0",flexWrap:"wrap",alignItems:"center"}}>
        <input value={model} onChange={e=>setModel(e.target.value)} placeholder="model" style={{padding:8,borderRadius:8,border:"1px solid #374151",background:"#111827",color:"#fff",minWidth:260}}/>
        <button onClick={()=>start(true)} style={btn("#10b981")}>▶ Mock (démo, sans API)</button>
        <button onClick={()=>start(false)} style={btn("#6366f1")}>▶ Lancer bench réel</button>
        {runId && <span style={{color:"#9ca3af",fontSize:12}}>{runId} • ⏱ {fmt(elapsed)} {progress && `• ${progress.pct}% • ETA ${progress.etaSec}s`}</span>}
      </div>

      {progress && (
        <div style={{background:"#1f2937",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}><span>{progress.done}/{progress.total}</span><span>{progress.pct}%</span></div>
          <div style={{height:10,background:"#111827",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${progress.pct}%`,background:"linear-gradient(90deg,#6366f1,#06b6d4)",transition:"width 0.3s"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:6,marginTop:12,maxHeight:220,overflow:"auto"}}>
            {log.map((r:any)=><div key={r.scenarioId} style={{fontSize:11,padding:"4px 8px",borderRadius:6,background:r.passed?"#052e16":"#450a0a",border:`1px solid ${r.passed?"#16a34a":"#dc2626"}`}}>{r.passed?"✅":"❌"} {r.scenarioId} {r.score}</div>)}
          </div>
        </div>
      )}

      {report && <ReportView report={report} /> }
    </div>
  );
}

function ReportView({report}:{report:any}) {
  return (
    <div style={{background:"#111827",borderRadius:12,padding:16,border:"1px solid #374151"}}>
      <h2 style={{marginTop:0}}>Rapport — {report.agent.model} <span style={{fontWeight:400,color:"#9ca3af"}}>{report.runId}</span></h2>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>
        <KPI label="Score global" value={`${report.globalScore}/100`} />
        <KPI label="Pass" value={`${report.passed}/${report.totalTests} (${report.passRate}%)`} />
        <KPI label="Durée" value={`${Math.round(report.durationMs/1000)}s`} />
        <KPI label="Latence moy." value={`${report.avgLatencyMs}ms`} />
      </div>
      <h3>Par catégorie</h3>
      <table style={tbl}><thead><tr><th>Catégorie</th><th>Pass</th><th>Score</th><th>Taux</th></tr></thead><tbody>
        {report.categories.map((c:any)=><tr key={c.category}><td>{c.category}</td><td>{c.passed}/{c.total}</td><td><Bar v={c.avgScore}/></td><td>{c.passRate}%</td></tr>)}
      </tbody></table>
      {report.ranking && (<><h3>Classement vs baselines</h3><table style={tbl}><thead><tr><th>#</th><th>Modèle</th><th>Score</th><th>Δ</th></tr></thead><tbody>{report.ranking.map((r:any)=><tr key={r.model} style={r.isCurrent?{background:"#1e3a5f"}:{}}><td>{r.rank}</td><td>{r.model}{r.isCurrent?" ← courant":""}</td><td>{r.globalScore}</td><td style={{color:r.deltaVsCurrent>0?"#4ade80":r.deltaVsCurrent<0?"#f87171":"#9ca3af"}}>{r.deltaVsCurrent>0?`+${r.deltaVsCurrent}`:r.deltaVsCurrent}</td></tr>)}</tbody></table></>)}
      <h3>Détail 60 tests</h3>
      <div style={{maxHeight:400,overflow:"auto"}}>
      <table style={tbl}><thead><tr><th>ID</th><th>Titre</th><th>✓</th><th>Score</th><th>Détail</th></tr></thead><tbody>
        {report.results.map((r:any)=><tr key={r.scenarioId}><td style={{fontSize:11}}>{r.scenarioId}</td><td style={{fontSize:12}}>{r.title}</td><td>{r.passed?"✅":"❌"}</td><td>{r.score}</td><td style={{fontSize:11,color:"#9ca3af"}}>{r.evaluatorDetails.slice(0,120)}</td></tr>)}
      </tbody></table>
      </div>
      <a href={`${API}/api/benchmark/runs/${report.runId}`} target="_blank" style={{display:"inline-block",marginTop:12,color:"#60a5fa"}}>JSON brut</a>
    </div>
  );
}
function KPI({label,value}:{label:string,value:string}){ return <div style={{background:"#1f2937",padding:"10px 14px",borderRadius:8}}><div style={{fontSize:11,color:"#9ca3af"}}>{label}</div><div style={{fontWeight:700}}>{value}</div></div>; }
function Bar({v}:{v:number}){ return <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:80,height:8,background:"#1f2937",borderRadius:99}}><div style={{width:`${v}%`,height:"100%",background:v>=80?"#22c55e":v>=60?"#eab308":"#ef4444",borderRadius:99}}/></div><span style={{fontSize:12}}>{v}</span></div>; }
const tbl: any = {width:"100%",borderCollapse:"collapse",fontSize:13};
const btn = (bg:string):any=>({background:bg,color:"#fff",border:"none",padding:"8px 14px",borderRadius:8,cursor:"pointer",fontWeight:600});
