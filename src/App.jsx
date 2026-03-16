import { useState, useMemo, useRef, useCallback } from "react";
import { CATEGORIES, TOTAL_CONTROLS, UI_TEXT } from "./data/categories.js";
import { PRODUCTS } from "./data/products.js";
import * as XLSX from "xlsx";

const t = (obj, lang) => (typeof obj === "string" ? obj : obj[lang] || obj.ca);
const STATUS = [
  { value: "Si", label: "Sí", c: "#166534", bg: "#dcfce7", b: "#86efac" },
  { value: "No", label: "No", c: "#991b1b", bg: "#fee2e2", b: "#fca5a5" },
  { value: "Parcial", label: "Parcial", c: "#92400e", bg: "#fef3c7", b: "#fcd34d" },
  { value: "No Aplica", label: "N/A", c: "#475569", bg: "#f1f5f9", b: "#cbd5e1" },
];

const LOGO_URL = "https://www.knowmadmood.com/en/media/Logo_Knowmad_mood_Regular_Black_Vector.svg";
const LOGO_WHITE = "https://www.knowmadmood.com/en/media/Logo_Knowmad_mood_Regular_White_Vector.svg";
const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/interwor-ciberseguretat";

function InfoModal({ item, lang, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:520, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.15)", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>×</button>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#eef2ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#4f46e5", fontWeight:700 }}>i</div>
          <h3 style={{ margin:0, fontSize:17, color:"#1e293b" }}>{item.component}</h3>
        </div>
        <p style={{ fontSize:13, color:"#64748b", margin:"0 0 14px", fontStyle:"italic" }}>{t(item.desc, lang)}</p>
        <p style={{ fontSize:14, color:"#334155", lineHeight:1.7, margin:0 }}>{t(item.info, lang)}</p>
      </div>
    </div>
  );
}

function Radar({ data }) {
  const cx=200, cy=195, R=150, n=data.length;
  const a = data.map((_,i) => (Math.PI*2*i)/n - Math.PI/2);
  const pts = r => data.map((_,i) => `${cx+r*Math.cos(a[i])},${cy+r*Math.sin(a[i])}`).join(" ");
  const dp = data.map((d,i)=>{const r=(d.p/100)*R;return`${cx+r*Math.cos(a[i])},${cy+r*Math.sin(a[i])}`}).join(" ");
  return (
    <svg viewBox="0 0 400 400" style={{ width:"100%", maxWidth:400 }}>
      {[.25,.5,.75,1].map(f=><polygon key={f} points={pts(R*f)} fill="none" stroke="#e2e8f0" strokeWidth=".5"/>)}
      {data.map((_,i)=><line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(a[i])} y2={cy+R*Math.sin(a[i])} stroke="#e2e8f0" strokeWidth=".5"/>)}
      <polygon points={dp} fill="rgba(79,70,229,.15)" stroke="#4f46e5" strokeWidth="2"/>
      {data.map((d,i)=>{const lx=cx+(R+30)*Math.cos(a[i]),ly=cy+(R+30)*Math.sin(a[i]),an=Math.abs(Math.cos(a[i]))<.15?"middle":Math.cos(a[i])>0?"start":"end";
        return(<g key={i}><circle cx={cx+(d.p/100)*R*Math.cos(a[i])} cy={cy+(d.p/100)*R*Math.sin(a[i])} r="4" fill="#4f46e5"/><text x={lx} y={ly} textAnchor={an} dominantBaseline="central" fontSize="9" fill="#64748b" fontFamily="system-ui">{d.s}</text><text x={lx} y={ly+12} textAnchor={an} dominantBaseline="central" fontSize="11" fill="#1e293b" fontWeight="600" fontFamily="system-ui">{Math.round(d.p)}%</text></g>)})}
    </svg>
  );
}

function Bars({ data }) {
  return (<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
    {data.map((d,i)=>(<div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:140, fontSize:11, color:"#475569", textAlign:"right", flexShrink:0, lineHeight:1.2 }}>{d.s}</div>
      <div style={{ flex:1, background:"#f1f5f9", borderRadius:4, height:22, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.max(d.p,1)}%`, background:d.p>=70?"#22c55e":d.p>=40?"#f59e0b":"#ef4444", borderRadius:4, transition:"width .5s" }}/></div>
      <div style={{ width:38, fontSize:12, fontWeight:600, color:"#1e293b" }}>{Math.round(d.p)}%</div>
    </div>))}
  </div>);
}

export default function App() {
  const [lang, setLang] = useState("ca");
  const [ans, setAns] = useState({});
  const [obs, setObs] = useState({});
  const [cat, setCat] = useState(0);
  const [view, setView] = useState("form");
  const [client, setClient] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [auditor, setAuditor] = useState("");
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState("");
  const fRef = useRef(null);
  const L = k => t(UI_TEXT[k], lang);
  const setA = (id, v) => setAns(p => ({ ...p, [id]: p[id] === v ? "" : v }));

  const stats = useMemo(() => {
    const g = { Si:0, No:0, Parcial:0, "No Aplica":0, empty:0 };
    const pc = CATEGORIES.map(c => {
      const s = { Si:0, No:0, Parcial:0, "No Aplica":0, empty:0 };
      c.items.forEach(it => { const a = ans[it.id]||""; if(a && s[a]!==undefined){s[a]++;g[a]++}else{s.empty++;g.empty++} });
      const ap = c.items.length - s["No Aplica"];
      return { ...s, ap, pct: ap>0?((s.Si+s.Parcial*.5)/ap)*100:0, tot: c.items.length };
    });
    const ga = TOTAL_CONTROLS - g["No Aplica"];
    return { g, pc, gPct: ga>0?((g.Si+g.Parcial*.5)/ga)*100:0, ga, done: TOTAL_CONTROLS-g.empty };
  }, [ans]);

  const chartData = CATEGORIES.map((c,i) => {
    const nm = t(c.name, lang);
    return { n: nm, s: nm.length > 16 ? nm.slice(0,14)+"…" : nm, p: stats.pc[i].pct };
  });

  const noIds = useMemo(() => {
    const ids = new Set();
    CATEGORIES.forEach(c => c.items.forEach(it => { if (ans[it.id] === "No") ids.add(it.id); }));
    return ids;
  }, [ans]);

  const recommendations = useMemo(() => {
    if (noIds.size === 0) return [];
    return PRODUCTS.map(prod => {
      const matched = prod.controls.filter(c => noIds.has(c));
      if (matched.length === 0) return null;
      const gaps = matched.map(cid => {
        for (const cat of CATEGORIES) {
          const item = cat.items.find(it => it.id === cid);
          if (item) return { component: item.component, desc: t(item.desc, lang) };
        }
        return null;
      }).filter(Boolean);
      return { ...prod, gaps, matchCount: matched.length };
    }).filter(Boolean).sort((a, b) => b.matchCount - a.matchCount);
  }, [noIds, lang]);

  const sColor = stats.gPct>=70?"#16a34a":stats.gPct>=40?"#d97706":"#dc2626";
  const sLabel = stats.gPct>=70?L("levelOk"):stats.gPct>=40?L("levelWarn"):L("levelCrit");
  const cProg = i => Math.round(CATEGORIES[i].items.filter(it=>ans[it.id]).length/CATEGORIES[i].items.length*100);
  const cs = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:24 };

  const doExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    CATEGORIES.forEach(c => {
      const rows = [["Componente","Descripción","Estado (SI/NO/Parcial)","Observaciones"]];
      c.items.forEach(it => rows.push([it.component, t(it.desc,"es"), ans[it.id]||"", obs[it.id]||""]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"]=[{wch:45},{wch:55},{wch:22},{wch:35}];
      XLSX.utils.book_append_sheet(wb, ws, c.sheetName);
    });
    const tr=[["Respuesta","Total","Porcentaje"],["Si",stats.g.Si,TOTAL_CONTROLS>0?stats.g.Si/TOTAL_CONTROLS:0],["No",stats.g.No,TOTAL_CONTROLS>0?stats.g.No/TOTAL_CONTROLS:0],["Parcial",stats.g.Parcial,TOTAL_CONTROLS>0?stats.g.Parcial/TOTAL_CONTROLS:0],["No Aplica",stats.g["No Aplica"],TOTAL_CONTROLS>0?stats.g["No Aplica"]/TOTAL_CONTROLS:0],["Total",TOTAL_CONTROLS,1]];
    const tw=XLSX.utils.aoa_to_sheet(tr); tw["!cols"]=[{wch:20},{wch:10},{wch:12}];
    XLSX.utils.book_append_sheet(wb,tw,"TOTALES");
    const now=new Date(), ts=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
    const safe=(client||"Client").replace(/[^a-zA-Z0-9\u00e0-\u00fc\u00c0-\u00dc ]/g,"").replace(/\s+/g,"_");
    XLSX.writeFile(wb,`${safe}_${ts}.xlsx`);
  }, [ans, obs, client, stats]);

  const doImport = useCallback(async(e) => {
    const f=e.target.files?.[0]; if(!f) return; setMsg("");
    try {
      const d=await f.arrayBuffer(), wb=XLSX.read(d), nA={}, nO={}; let m=0;
      CATEGORIES.forEach(c=>{const ws=wb.Sheets[c.sheetName];if(!ws)return;
        XLSX.utils.sheet_to_json(ws,{header:1}).slice(1).forEach(r=>{if(!r[0])return;
          const cn=String(r[0]).trim().toLowerCase();
          const it=c.items.find(i=>i.component.toLowerCase()===cn)||c.items.find(i=>cn.includes(i.component.toLowerCase().slice(0,20)));
          if(it){const st=String(r[2]||"").trim();if(["Si","No","Parcial","No Aplica"].includes(st)){nA[it.id]=st;m++}if(r[3])nO[it.id]=String(r[3]).trim()}
        });
      });
      setAns(nA); setObs(nO);
      const np=f.name.replace(/\.xlsx?$/i,"").replace(/_\d{8}_\d{4}$/,"").replace(/_/g," ");
      if(np&&!np.includes("Plantilla")) setClient(np);
      setMsg(`${m} ${L("imported")}`); setView("form"); setCat(0);
    } catch(err){ setMsg(`${L("errorReading")}: ${err.message}`); }
    e.target.value="";
  }, [lang]);

  const doPDF = () => {
    const w=window.open("","_blank"); if(!w) return;
    const recsHtml = recommendations.length > 0 ? `
      <div style="page-break-before:always;margin-top:24px">
        <h2 style="color:#4f46e5;margin:0 0 8px;font-size:18px">${L("recommendations")}</h2>
        <p style="color:#64748b;font-size:12px;margin:0 0 16px">${L("recsIntro")}</p>
        ${recommendations.map(p => `
          <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;page-break-inside:avoid">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style="width:28px;height:28px;border-radius:6px;background:${p.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${p.icon}</div>
              <div><strong style="font-size:13px">${p.name}</strong><span style="font-size:11px;color:#64748b;margin-left:6px">${p.vendor}</span></div>
            </div>
            <p style="font-size:11px;color:#475569;margin:0 0 6px">${t(p.note,lang)}</p>
            <div style="font-size:10px;color:#64748b">${L("addressesGaps")} ${p.gaps.map(g=>`<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:4px;margin:2px;display:inline-block">${g.component}</span>`).join(" ")}</div>
          </div>
        `).join("")}
      </div>` : "";
    const catHtml = CATEGORIES.map((c,ci) => {
      const s=stats.pc[ci];
      const rows=c.items.map(it=>{const a=ans[it.id]||"—",o=obs[it.id]||"",bg=a==="Si"?"#dcfce7":a==="No"?"#fee2e2":a==="Parcial"?"#fef3c7":"#fff";return`<tr><td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:11px">${it.component}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;background:${bg};font-size:11px;font-weight:600">${a}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;color:#475569">${o}</td></tr>`}).join("");
      return`<div style="page-break-inside:avoid;margin-bottom:14px"><h3 style="color:#1e293b;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin:10px 0 6px;font-size:13px">${c.icon} ${t(c.name,lang)}<span style="float:right;color:${s.pct>=70?"#16a34a":s.pct>=40?"#d97706":"#dc2626"}">${Math.round(s.pct)}%</span></h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:left;font-size:10px;width:40%">Componente</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-size:10px;width:15%">${lang==="ca"?"Estat":"Estado"}</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:left;font-size:10px;width:45%">${lang==="ca"?"Observacions":"Observaciones"}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join("");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${L("pdfTitle")} - ${client||"Client"}</title><style>@page{size:A4;margin:11mm}body{font-family:Segoe UI,system-ui,sans-serif;color:#1e293b;max-width:780px;margin:0 auto;padding:14px}@media print{.np{display:none}}</style></head><body>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px"><img src="${LOGO_URL}" style="height:36px" onerror="this.style.display='none'"/><div><h1 style="margin:0;color:#4f46e5;font-size:20px">${L("pdfTitle")}</h1><p style="color:#64748b;margin:2px 0 0;font-size:11px">${L("generatedOn")} ${new Date().toLocaleDateString(lang==="ca"?"ca-ES":"es-ES")}</p></div></div>
      <hr style="border:1px solid #e2e8f0;margin:10px 0"/>
      <table style="width:100%;margin-bottom:14px;font-size:12px"><tr><td><b>${L("client")}:</b> ${client||"—"}</td><td><b>${L("date")}:</b> ${date}</td><td><b>${L("auditor")}:</b> ${auditor||"—"}</td></tr></table>
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:12px;padding:16px;text-align:center;margin-bottom:14px"><div style="font-size:38px;font-weight:700">${Math.round(stats.gPct)}%</div><div style="font-size:13px;opacity:.9">${sLabel}</div><div style="font-size:10px;opacity:.7;margin-top:2px">${stats.done}/${TOTAL_CONTROLS} ${L("controlsEvaluated")}</div></div>
      <div style="display:flex;gap:8px;margin-bottom:14px">${[["Si","Sí","#dcfce7","#166534"],["No","No","#fee2e2","#991b1b"],["Parcial",L("partial"),"#fef3c7","#92400e"],["No Aplica","N/A","#f1f5f9","#475569"]].map(([k,l,bg,c])=>`<div style="flex:1;background:${bg};padding:10px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:${c}">${stats.g[k]}</div><div style="font-size:9px;color:${c}">${l}</div></div>`).join("")}</div>
      ${catHtml}${recsHtml}
      <div style="margin-top:16px;text-align:center;border-top:1px solid #e2e8f0;padding-top:8px">
        <img src="${LOGO_URL}" style="height:24px;margin-bottom:4px" onerror="this.style.display='none'"/><br/>
        <span style="font-size:10px;color:#64748b">tsic@interwor-tsic.com · +34 933 968 033 · Plaça Catalunya 21, Barcelona</span>
      </div>
      <button class="np" onclick="window.print()" style="position:fixed;bottom:16px;right:16px;background:#4f46e5;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer">${L("printPdf")}</button></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", maxWidth:960, margin:"0 auto", padding:"0 12px 40px" }}>
      {info && <InfoModal item={info} lang={lang} onClose={()=>setInfo(null)}/>}
      <input type="file" ref={fRef} accept=".xlsx,.xls" style={{display:"none"}} onChange={doImport}/>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)", borderRadius:16, padding:"20px 24px", marginBottom:14, color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={LOGO_WHITE} alt="Interwor" style={{ height:32 }} onError={e=>{e.target.style.display="none"}}/>
          <div>
            <h1 style={{ margin:"0 0 2px", fontSize:18, fontWeight:700 }}>{L("appTitle")}</h1>
            <p style={{ margin:0, opacity:.7, fontSize:11 }}>{TOTAL_CONTROLS} {L("controls")} · {CATEGORIES.length} {L("categories")}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <div style={{ display:"flex", borderRadius:6, overflow:"hidden", border:"1px solid rgba(255,255,255,.3)", marginRight:6 }}>
            {["ca","es"].map(l=><button key={l} onClick={()=>setLang(l)} style={{ padding:"4px 10px", border:"none", background:lang===l?"rgba(255,255,255,.9)":"transparent", color:lang===l?"#1a1a2e":"#fff", fontSize:11, fontWeight:600, cursor:"pointer" }}>{l.toUpperCase()}</button>)}
          </div>
          <button onClick={()=>fRef.current?.click()} style={{ padding:"6px 12px", borderRadius:6, border:"1px solid rgba(255,255,255,.3)", background:"transparent", color:"#fff", fontSize:11, cursor:"pointer" }}>{L("importExcel")}</button>
          <button onClick={doExportExcel} style={{ padding:"6px 12px", borderRadius:6, border:"none", background:"rgba(255,255,255,.9)", color:"#1a1a2e", fontSize:11, cursor:"pointer", fontWeight:600 }}>{L("exportExcel")}</button>
        </div>
      </div>

      {msg && <div style={{ padding:"7px 12px", borderRadius:8, background:msg.includes("Error")?"#fee2e2":"#dcfce7", color:msg.includes("Error")?"#991b1b":"#166534", fontSize:12, marginBottom:10, display:"flex", justifyContent:"space-between" }}><span>{msg}</span><button onClick={()=>setMsg("")} style={{ background:"none", border:"none", cursor:"pointer", color:"inherit" }}>×</button></div>}

      {/* TABS + PROGRESS */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {["form","results"].map(v=><button key={v} onClick={()=>setView(v)} style={{ padding:"7px 14px", borderRadius:8, border:`2px solid ${view===v?"#4f46e5":"#e2e8f0"}`, background:view===v?"#eef2ff":"#fff", color:view===v?"#4f46e5":"#64748b", fontWeight:600, fontSize:12, cursor:"pointer" }}>{v==="form"?L("form"):L("results")}</button>)}
        <div style={{ marginLeft:"auto", fontSize:11, color:"#64748b", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:80, height:5, background:"#e2e8f0", borderRadius:3, overflow:"hidden" }}><div style={{ width:`${(stats.done/TOTAL_CONTROLS)*100}%`, height:"100%", background:"#4f46e5", borderRadius:3, transition:"width .3s" }}/></div>
          {stats.done}/{TOTAL_CONTROLS}
        </div>
      </div>

      {/* FORM VIEW */}
      {view === "form" && (
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ width:195, flexShrink:0 }}>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:5, position:"sticky", top:10 }}>
              {CATEGORIES.map((c,i)=>{const p=cProg(i);return(
                <button key={i} onClick={()=>setCat(i)} style={{ display:"flex", alignItems:"center", gap:5, width:"100%", padding:"7px 8px", border:"none", borderRadius:7, background:cat===i?"#eef2ff":"transparent", cursor:"pointer", textAlign:"left", fontSize:11, color:cat===i?"#4f46e5":"#475569", fontWeight:cat===i?600:400 }}>
                  <span style={{ fontSize:13 }}>{c.icon}</span><span style={{ flex:1, lineHeight:1.25 }}>{t(c.name,lang)}</span>
                  <span style={{ fontSize:9, fontWeight:600, color:p===100?"#16a34a":p>0?"#d97706":"#94a3b8" }}>{p}%</span>
                </button>)})}
            </div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ ...cs, padding:"12px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <div style={{ flex:"2", minWidth:140 }}><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:2 }}>{L("client")}</label><input value={client} onChange={e=>setClient(e.target.value)} placeholder="Empresa S.L." style={{ width:"100%", padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, boxSizing:"border-box" }}/></div>
                <div style={{ flex:"1", minWidth:100 }}><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:2 }}>{L("date")}</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:"100%", padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, boxSizing:"border-box" }}/></div>
                <div style={{ flex:"1", minWidth:100 }}><label style={{ fontSize:10, color:"#64748b", display:"block", marginBottom:2 }}>{L("auditor")}</label><input value={auditor} onChange={e=>setAuditor(e.target.value)} style={{ width:"100%", padding:"6px 10px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:12, boxSizing:"border-box" }}/></div>
              </div>
            </div>
            <div style={cs}>
              <h2 style={{ margin:"0 0 2px", fontSize:15, color:"#1e293b" }}>{CATEGORIES[cat].icon} {t(CATEGORIES[cat].name,lang)}</h2>
              <p style={{ margin:"0 0 12px", fontSize:11, color:"#94a3b8" }}>{CATEGORIES[cat].items.length} {L("controls")}</p>
              {CATEGORIES[cat].items.map(item=>(
                <div key={item.id} style={{ padding:11, borderRadius:9, border:`1px solid ${ans[item.id]?"#e2e8f0":"#f1f5f9"}`, background:ans[item.id]?"#fafbff":"#fafafa", marginBottom:6 }}>
                  <div style={{ marginBottom:4, display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontWeight:600, fontSize:12, color:"#1e293b" }}>{item.component}</span>
                    <button onClick={()=>setInfo(item)} title={L("moreInfo")} style={{ width:17, height:17, borderRadius:"50%", border:"1.5px solid #c7d2fe", background:"#eef2ff", color:"#4f46e5", fontSize:9, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0 }}>i</button>
                    <span style={{ fontSize:10, color:"#94a3b8", flex:1 }}>{t(item.desc,lang)}</span>
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
                    {STATUS.map(o=><button key={o.value} onClick={()=>setA(item.id,o.value)} style={{ padding:"5px 12px", borderRadius:6, border:`1.5px solid ${ans[item.id]===o.value?o.b:"#e2e8f0"}`, background:ans[item.id]===o.value?o.bg:"transparent", color:ans[item.id]===o.value?o.c:"#94a3b8", fontWeight:ans[item.id]===o.value?600:400, fontSize:12, cursor:"pointer", minWidth:50 }}>{o.label}</button>)}
                    <input placeholder={L("observations")} value={obs[item.id]||""} onChange={e=>setObs(p=>({...p,[item.id]:e.target.value}))} style={{ marginLeft:"auto", flex:1, minWidth:100, padding:"5px 8px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:10, color:"#475569", boxSizing:"border-box" }}/>
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", gap:6, marginTop:12, justifyContent:"space-between" }}>
                <button onClick={()=>setCat(Math.max(0,cat-1))} disabled={cat===0} style={{ padding:"7px 14px", borderRadius:7, border:"1px solid #e2e8f0", background:"#fff", color:cat===0?"#d1d5db":"#475569", cursor:cat===0?"default":"pointer", fontSize:12 }}>← {L("prev")}</button>
                {cat < CATEGORIES.length-1
                  ? <button onClick={()=>setCat(cat+1)} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:"#4f46e5", color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>{L("next")} →</button>
                  : <button onClick={()=>setView("results")} style={{ padding:"7px 14px", borderRadius:7, border:"none", background:"#16a34a", color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>{L("viewResults")} →</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {view === "results" && (
        <div>
          {/* Score cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
            {[
              { l:L("score"), v:`${Math.round(stats.gPct)}%`, c:sColor, s:sLabel },
              { l:"Sí", v:stats.g.Si, c:"#16a34a", s:`${stats.ga>0?Math.round(stats.g.Si/stats.ga*100):0}%` },
              { l:"No", v:stats.g.No, c:"#dc2626", s:`${stats.ga>0?Math.round(stats.g.No/stats.ga*100):0}%` },
              { l:L("partial"), v:stats.g.Parcial, c:"#d97706", s:`${stats.ga>0?Math.round(stats.g.Parcial/stats.ga*100):0}%` },
            ].map((d,i)=><div key={i} style={{...cs, padding:14, textAlign:"center"}}><div style={{ fontSize:10, color:"#94a3b8", marginBottom:3 }}>{d.l}</div><div style={{ fontSize:26, fontWeight:700, color:d.c }}>{d.v}</div><div style={{ fontSize:9, color:"#94a3b8", marginTop:2 }}>{d.s}</div></div>)}
          </div>

          {/* Charts */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div style={cs}><h3 style={{ margin:"0 0 8px", fontSize:13, color:"#1e293b" }}>{L("radar")}</h3><Radar data={chartData}/></div>
            <div style={cs}><h3 style={{ margin:"0 0 8px", fontSize:13, color:"#1e293b" }}>{L("detail")}</h3><Bars data={chartData}/></div>
          </div>

          {/* Summary table */}
          <div style={{ ...cs, marginBottom:12 }}>
            <h3 style={{ margin:"0 0 8px", fontSize:13, color:"#1e293b" }}>{L("summary")}</h3>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead><tr style={{ borderBottom:"2px solid #e2e8f0" }}><th style={{ textAlign:"left", padding:"5px 8px", color:"#64748b", fontWeight:500 }}>{lang==="ca"?"Categoria":"Categoría"}</th>{["Sí","No","Parc.","N/A"].map(h=><th key={h} style={{ textAlign:"center", padding:"5px 3px", color:"#64748b", fontWeight:500 }}>{h}</th>)}<th style={{ textAlign:"center", padding:5, color:"#4f46e5", fontWeight:600 }}>%</th></tr></thead>
              <tbody>{CATEGORIES.map((c,i)=>{const s=stats.pc[i];return(
                <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                  <td style={{ padding:"6px 8px", fontWeight:500 }}>{c.icon} {t(c.name,lang)}</td>
                  <td style={{ textAlign:"center", color:"#16a34a", fontWeight:600 }}>{s.Si}</td>
                  <td style={{ textAlign:"center", color:"#dc2626", fontWeight:600 }}>{s.No}</td>
                  <td style={{ textAlign:"center", color:"#d97706", fontWeight:600 }}>{s.Parcial}</td>
                  <td style={{ textAlign:"center", color:"#64748b" }}>{s["No Aplica"]}</td>
                  <td style={{ textAlign:"center" }}><span style={{ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:s.pct>=70?"#dcfce7":s.pct>=40?"#fef3c7":"#fee2e2", color:s.pct>=70?"#166534":s.pct>=40?"#92400e":"#991b1b" }}>{Math.round(s.pct)}%</span></td>
                </tr>)})}</tbody>
            </table>
          </div>

          {/* RECOMMENDATIONS */}
          <div style={{ ...cs, marginBottom:12, borderLeft:"4px solid #4f46e5" }}>
            <h3 style={{ margin:"0 0 6px", fontSize:14, color:"#4f46e5" }}>{L("recommendations")}</h3>
            {recommendations.length === 0 ? (
              <p style={{ color:"#64748b", fontSize:13, margin:0 }}>{L("recsNone")}</p>
            ) : (
              <>
                <p style={{ color:"#64748b", fontSize:11, margin:"0 0 12px" }}>{L("recsIntro")}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {recommendations.map(p => (
                    <div key={p.id} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:12 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        <div style={{ width:28, height:28, borderRadius:6, background:p.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>{p.icon}</div>
                        <div style={{ flex:1 }}>
                          <strong style={{ fontSize:13 }}>{p.name}</strong>
                          <span style={{ fontSize:10, color:"#64748b", marginLeft:6 }}>{p.vendor}</span>
                        </div>
                      </div>
                      <p style={{ fontSize:11, color:"#475569", margin:"0 0 6px", lineHeight:1.5 }}>{t(p.note,lang)}</p>
                      <div style={{ fontSize:10, color:"#64748b" }}>
                        {L("addressesGaps")}{" "}
                        {p.gaps.map((g,i)=><span key={i} style={{ background:"#fee2e2", color:"#991b1b", padding:"1px 6px", borderRadius:4, margin:"2px 2px", display:"inline-block", fontSize:9 }}>{g.component}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export buttons */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            <button onClick={doPDF} style={{ flex:1, padding:11, borderRadius:10, border:"none", background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>{L("exportPDF")}</button>
            <button onClick={doExportExcel} style={{ flex:1, padding:11, borderRadius:10, border:"2px solid #4f46e5", background:"#fff", color:"#4f46e5", fontSize:13, fontWeight:700, cursor:"pointer" }}>{L("exportExcel")}</button>
          </div>

          {/* FOOTER - Interwor */}
          <div style={{ background:"#1a1a2e", borderRadius:12, padding:"20px 24px", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <img src={LOGO_WHITE} alt="Interwor" style={{ height:28 }} onError={e=>{e.target.style.display="none"}}/>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:600 }}>{L("contactUs")}</p>
                <p style={{ margin:"2px 0 0", fontSize:11, opacity:.7 }}>tsic@interwor-tsic.com · +34 933 968 033</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <a href="mailto:tsic@interwor-tsic.com" style={{ padding:"7px 14px", borderRadius:7, border:"1px solid rgba(255,255,255,.3)", color:"#fff", fontSize:11, textDecoration:"none" }}>Email</a>
              <a href="https://interwor-tsic.com/contacto/" target="_blank" rel="noopener" style={{ padding:"7px 14px", borderRadius:7, border:"none", background:"#4f46e5", color:"#fff", fontSize:11, textDecoration:"none", fontWeight:600 }}>Web</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
