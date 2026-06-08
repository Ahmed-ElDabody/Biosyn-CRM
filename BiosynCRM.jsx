import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Users, MapPin, Clock, TrendingUp, Calendar, FileText, ChevronRight, ChevronDown,
  CheckCircle2, AlertTriangle, XCircle, Tablet, BarChart3, Search, Shield, Plus,
  Target, Activity, Award, Sun, Moon, Navigation, Layers, ArrowRight, Star, Lock,
  ShieldAlert, Route, Timer, Sparkles, Bell, ClipboardCheck, Send, Smartphone,
  WifiOff, Crosshair, Eye, ListChecks, UserPlus, FilePlus2, Unlock
} from "lucide-react";

/* =========================================================================
   BIOSYN CRM — INTERACTIVE PROTOTYPE  |  "A Commitment Towards Better Health"
   Built on Dr. Ahmed El-Sayed's business rules. Mock data for demo only.
   English UI; only doctor names + detailed addresses are in Arabic.
   ========================================================================= */

const LOGO_WHITE = "data:image/png;base64,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";

const BRAND = {
  navy: "#16284B", deep: "#1E3A66", teal: "#0E7C7B", mint: "#1FB6A6",
  gold: "#C9A14A", goldSoft: "#E6B450", coral: "#E2574C", amber: "#E8923A",
  paper: "#F5F3EC", line: "#E2DCCD",
};

// =====================  MOCK DATA  =====================
const IMS_BRICKS = [
  { en: "Shobra El Khima", ar: "شبرا الخيمه", gov: "Qalyubia" },
  { en: "Giza I", ar: "الجيزه  1", gov: "Giza" },
  { en: "Giza II", ar: "الجيزه  2", gov: "Giza" },
  { en: "Giza III", ar: "الجيزه  3", gov: "Giza" },
  { en: "Giza IV", ar: "الجيزه  4", gov: "Giza" },
  { en: "Giza V", ar: "الجيزه  5", gov: "Giza" },
  { en: "Imbaba I", ar: "إمبابه 1", gov: "Giza" },
  { en: "Imbaba II", ar: "إمبابه 2", gov: "Giza" },
  { en: "Faisal", ar: "فيصل", gov: "Giza" },
  { en: "Kalubeia I", ar: "القليوبيه 1", gov: "Qalyubia" },
  { en: "Kalubeia II", ar: "القليوبيه 2", gov: "Qalyubia" },
  { en: "Menofeya I", ar: "المنوفيه 1", gov: "Menoufia" },
  { en: "Menofeya III", ar: "المنوفيه 3", gov: "Menoufia" },
  { en: "Gharbeia I", ar: "الغربيه 1", gov: "Gharbia" },
  { en: "Gharbeia II", ar: "الغربيه 2", gov: "Gharbia" },
  { en: "Gharbeia III", ar: "الغربيه 3", gov: "Gharbia" },
  { en: "DakahleiaI", ar: "الدقهليه 1", gov: "Dakahlia" },
  { en: "DakahleiaII", ar: "الدقهليه 2", gov: "Dakahlia" },
  { en: "DakahleiaIII", ar: "الدقهليه 3", gov: "Dakahlia" },
  { en: "DakahleiaIV", ar: "الدقهليه 4", gov: "Dakahlia" },
  { en: "Domiat", ar: "دمياط", gov: "Damietta" },
  { en: "Kafr El Sheikh I", ar: "كفر الشيخ 1", gov: "Kafr El Sheikh" },
  { en: "Kafr El Sheikh II", ar: "كفر الشيخ 2", gov: "Kafr El Sheikh" },
  { en: "Sharkia I", ar: "الشرقيه 1", gov: "Sharqia" },
  { en: "Sharkia II", ar: "الشرقيه 2", gov: "Sharqia" },
  { en: "Sharkia III", ar: "الشرقيه 3", gov: "Sharqia" },
  { en: "East Alex I", ar: "شرق الإسكندريه 1", gov: "Alexandria" },
  { en: "East Alex II", ar: "شرق الإسكندريه 2", gov: "Alexandria" },
  { en: "East Alex III", ar: "شرق الإسكندريه 3", gov: "Alexandria" },
  { en: "Alex Center I", ar: "وسط الإسكندريه 1", gov: "Alexandria" }
]; // sample of 148 — full list imported from IMS Excel by Claude Code

const GOVERNORATES = ["Cairo","Giza","Qalyubia","Alexandria","Dakahlia","Gharbia",
  "Menoufia","Sharqia","Kafr El Sheikh","Damietta","Beheira","Port Said","Ismailia",
  "Suez","Fayoum","Beni Suef","Minya","Asyut","Sohag","Qena","Aswan"];

const SPECIALTIES = ["Cardiology","Internal Medicine","Pediatrics","Endocrinology",
  "Dermatology","Pulmonology","Neurology","Orthopedics","Gastroenterology","ENT"];

const AM_TYPES = ["General Hospital","University Hospital","Teaching Hospital",
  "Health Insurance","Fever Hospital","Chest Hospital","Contracts","Medical Center"];
const PM_TYPES = ["Private Clinic","Poly Clinic","Private Hospital"];

const SAMPLE_DOCTORS = [
  { id:1, name:"د. منى عبد الله", spec:"Cardiology", cls:"A", type:"PM", brick:"Giza I", gov:"Giza", addr:"عيادة 12، شارع 9، المعادي، القاهرة", visitsM:3, target:3 },
  { id:2, name:"د. خالد فهمي إبراهيم", spec:"Internal Medicine", cls:"A", type:"AM", brick:"Heliopolis I", gov:"Cairo", addr:"مستشفى قصر العيني الجامعي، الدور 4، القاهرة", visitsM:2, target:3 },
  { id:3, name:"د. سارة منصور", spec:"Pediatrics", cls:"B", type:"PM", brick:"Nasr City", gov:"Cairo", addr:"بولي كلينك النصر، عباس العقاد، مدينة نصر", visitsM:2, target:2 },
  { id:4, name:"د. أحمد رشاد سليم", spec:"Endocrinology", cls:"B", type:"AM", brick:"East Cairo I", gov:"Cairo", addr:"مركز التأمين الصحي، ميدان الجامع، مصر الجديدة", visitsM:1, target:2 },
  { id:5, name:"د. ليلى حسن", spec:"Dermatology", cls:"A", type:"PM", brick:"Giza II", gov:"Giza", addr:"عيادة 3، برج الأطباء، شارع التحرير، الدقي", visitsM:0, target:3 },
  { id:6, name:"د. عمر زكي محمود", spec:"Pulmonology", cls:"B", type:"AM", brick:"El Abbasia", gov:"Cairo", addr:"مستشفى الصدر، شارع رمسيس، العباسية", visitsM:2, target:2 },
  { id:7, name:"د. هدى السيد", spec:"Cardiology", cls:"B", type:"PM", brick:"Nasr City", gov:"Cairo", addr:"عيادة 7، شارع مكرم عبيد، مدينة نصر", visitsM:1, target:2 },
  { id:8, name:"د. طارق المصري", spec:"Neurology", cls:"A", type:"AM", brick:"Giza III", gov:"Giza", addr:"المستشفى التعليمي، شارع الهرم، الجيزة", visitsM:3, target:3 },
];

const MASTER_LIST = [
  { id:101, name:"د. ياسر الديب", spec:"Cardiology", cls:"B", type:"PM", brick:"Giza I", gov:"Giza", addr:"عيادة 5، شارع البطل أحمد عبد العزيز، المهندسين" },
  { id:102, name:"د. فاطمة الزهراء محمد", spec:"Pediatrics", cls:"A", type:"AM", brick:"Heliopolis II", gov:"Cairo", addr:"مستشفى الأطفال الجامعي، شارع الخليفة المأمون" },
  { id:103, name:"د. شريف عبد الحميد", spec:"Orthopedics", cls:"C", type:"PM", brick:"Nasr City", gov:"Cairo", addr:"عيادة 9، مكرم عبيد، مدينة نصر" },
  { id:104, name:"د. نهى سمير", spec:"Dermatology", cls:"B", type:"PM", brick:"Giza II", gov:"Giza", addr:"برج النيل، الدقي، الجيزة" },
];

const PRODUCTS = [
  { id:"p1", name:"Cardiolex 50mg", slides:12, color:BRAND.teal },
  { id:"p2", name:"Neurobalance", slides:9, color:BRAND.deep },
  { id:"p3", name:"Pediacare Syrup", slides:7, color:BRAND.goldSoft },
];

// =====================  KPI LOGIC  =====================
function computeKPIs() {
  const totalDrs=90, classA=20, classB=70, classC=0;
  const covered=81, monthlyVisitsTarget=180, monthlyVisitsActual=168;
  const freqTarget=classA*3+classB*2+classC*1, freqActual=188;
  const coverageAch=Math.min((covered/totalDrs)*100,100);
  const callRateAch=(monthlyVisitsActual/monthlyVisitsTarget)*100;
  const freqAch=(freqActual/freqTarget)*100;
  const crmScore=(coverageAch+callRateAch+freqAch)/3;
  return { totalDrs,classA,classB,covered,coverageAch,callRateAch,freqAch,
    crmScore,monthlyVisitsActual,monthlyVisitsTarget,freqActual,freqTarget };
}
const pct=(n)=>`${n.toFixed(0)}%`;
const achColor=(v)=>(v>=100?BRAND.mint:v>=90?BRAND.gold:BRAND.coral);
const achLabel=(v)=>(v>=90?"Achieved":"Not achieved");
function freqBarColor(done,target){ if(done===0)return BRAND.line; const r=done/target;
  if(r>=1)return BRAND.mint; if(r>=0.66)return BRAND.goldSoft; return BRAND.amber; }
function freqText(done,target){ const rem=target-done;
  if(rem>0)return `${rem} left`; if(rem===0)return "Done"; return `+${Math.abs(rem)}`; }

// List-lock window: open only days 15–30 of Mar/Jun/Sep/Dec (quarter-end)
function listLockState(){
  const m=new Date().getMonth()+1, d=new Date().getDate();
  const isQ=[3,6,9,12].includes(m);
  const open=isQ && d>=15 && d<=30;
  return { open, window:"15–30 of Mar / Jun / Sep / Dec" };
}

// =====================  ROOT  =====================
export default function BiosynCRM() {
  const [view, setView] = useState("rep");
  return (
    <div dir="ltr" style={{ fontFamily:"'Cairo','Tajawal',system-ui,sans-serif", background:BRAND.paper, minHeight:"100vh", color:BRAND.navy }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        *{box-sizing:border-box}
        .card{background:#fff;border:1px solid ${BRAND.line};border-radius:18px}
        .pill{border-radius:999px;font-weight:700}
        .fade{animation:fade .45s ease both}
        @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .barTrack{background:${BRAND.line};border-radius:999px;overflow:hidden;height:9px}
        .tab{cursor:pointer;transition:.2s;border:none}
        .ar{font-family:'Cairo','Tajawal',sans-serif;direction:rtl;unicode-bidi:isolate}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;color:#7A7768;font-weight:700;font-size:12px}
        input,select{font-family:inherit}
      `}</style>

      <div style={{ background:BRAND.navy, color:"#fff", padding:"12px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 2px 12px rgba(0,0,0,.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <img src={LOGO_WHITE} alt="Biosyn" style={{ height:36 }} />
          <div style={{ borderLeft:"1px solid rgba(255,255,255,.2)", paddingLeft:14 }}>
            <div style={{ fontWeight:900, fontSize:15, letterSpacing:.5 }}>BIOSYN CRM</div>
            <div style={{ fontSize:10, opacity:.65, fontStyle:"italic", marginTop:2 }}>A Commitment Towards Better Health</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, background:"rgba(255,255,255,.08)", padding:4, borderRadius:12 }}>
          <NavTab active={view==="rep"} onClick={()=>setView("rep")} icon={<Tablet size={14}/>} label="Rep"/>
          <NavTab active={view==="manager"} onClick={()=>setView("manager")} icon={<ClipboardCheck size={14}/>} label="Manager"/>
          <NavTab active={view==="admin"} onClick={()=>setView("admin")} icon={<Shield size={14}/>} label="Admin"/>
        </div>
      </div>

      {view==="rep" && <RepApp/>}
      {view==="manager" && <ManagerApp/>}
      {view==="admin" && <AdminApp/>}

      <div style={{ textAlign:"center", padding:"20px 16px 40px", fontSize:11, color:"#A09B8C" }}>
        Biosyn Pharmaceuticals · Prototype with mock data · A Commitment Towards Better Health
      </div>
    </div>
  );
}
function NavTab({active,onClick,icon,label}){
  return <button onClick={onClick} className="tab pill" style={{ padding:"8px 16px", fontSize:13, display:"flex", alignItems:"center", gap:6, background:active?BRAND.mint:"transparent", color:active?BRAND.navy:"#fff" }}>{icon}{label}</button>;
}

// =====================  REP APP  =====================
function RepApp(){
  const [tab,setTab]=useState("list"); // list | plan | manage
  const [session,setSession]=useState(null); // {doctor} | "submitted"
  const [activeDr,setActiveDr]=useState(null);

  if(session==="run") return <div style={wrap}><DetailAidSession doctor={activeDr} onBack={()=>setSession(null)} onSubmit={()=>setSession("done")}/></div>;
  if(session==="done") return <div style={wrap}><SessionSubmitted doctor={activeDr} onDone={()=>setSession(null)}/></div>;

  return (
    <div style={wrap}>
      <SubTabs tabs={[["list","Doctor List",<Users size={14}/>],["plan","Weekly Plan",<Calendar size={14}/>],["manage","Manage List",<ListChecks size={14}/>]]} tab={tab} setTab={setTab}/>
      {tab==="list" && <RepList onStart={(dr)=>{setActiveDr(dr);setSession("run");}}/>}
      {tab==="plan" && <WeeklyPlan/>}
      {tab==="manage" && <ManageList/>}
    </div>
  );
}
const wrap={ maxWidth:1100, margin:"0 auto", padding:"18px 16px 40px" };

function SubTabs({tabs,tab,setTab}){
  return (
    <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
      {tabs.map(([k,label,icon])=>(
        <button key={k} onClick={()=>setTab(k)} className="tab pill" style={{ padding:"9px 16px", fontSize:13, display:"flex", alignItems:"center", gap:6, background:tab===k?BRAND.navy:"#fff", color:tab===k?"#fff":BRAND.navy, border:`1px solid ${tab===k?BRAND.navy:BRAND.line}` }}>{icon}{label}</button>
      ))}
    </div>
  );
}

// ---------- Doctor List + Smart suggestions + Frequency bar ----------
function RepList({onStart}){
  const k=computeKPIs();
  const [q,setQ]=useState("");
  const suggestions=[
    { name:"د. ليلى حسن", cls:"A", why:"Behind on Frequency — 0 of 3 visits", urgent:true },
    { name:"د. أحمد رشاد سليم", cls:"B", why:"Only 1 visit — due before week end", urgent:false },
  ];
  const list=SAMPLE_DOCTORS.filter(d=>d.name.includes(q)||d.spec.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fade">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
        <MiniKPI icon={<Target size={16}/>} label="Coverage" value={pct(k.coverageAch)} sub={`${k.covered}/${k.totalDrs} doctors`} color={achColor(k.coverageAch)}/>
        <MiniKPI icon={<Activity size={16}/>} label="Call Rate" value={pct(k.callRateAch)} sub={`${k.monthlyVisitsActual}/${k.monthlyVisitsTarget} visits`} color={achColor(k.callRateAch)}/>
        <MiniKPI icon={<Award size={16}/>} label="CRM Score" value={pct(k.crmScore)} sub={achLabel(k.crmScore)} color={achColor(k.crmScore)}/>
      </div>
      <div className="card" style={{ padding:16, marginBottom:16, borderLeft:`4px solid ${BRAND.gold}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, fontWeight:800 }}><Star size={18} color={BRAND.gold}/> Today's Suggestions <span style={{fontSize:11,fontWeight:600,color:"#999"}}>(Smart Planning)</span></div>
        {suggestions.map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderRadius:12, marginBottom:8, background:s.urgent?"rgba(226,87,76,.07)":BRAND.paper }}>
            <div><div style={{fontWeight:700,fontSize:14}}><span className="ar">{s.name}</span> <span style={{color:"#999",fontWeight:600}}>· Class {s.cls}</span></div><div style={{fontSize:12,color:"#666"}}>{s.why}</div></div>
            {s.urgent && <span className="pill" style={{background:BRAND.coral,color:"#fff",fontSize:11,padding:"4px 10px"}}>Urgent</span>}
          </div>
        ))}
      </div>
      <div style={{ position:"relative", marginBottom:12 }}>
        <Search size={16} style={{ position:"absolute", left:12, top:13, color:"#999" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search doctor or specialty…" style={{ width:"100%", padding:"11px 12px 11px 36px", borderRadius:12, border:`1px solid ${BRAND.line}`, fontSize:14 }}/>
      </div>
      <div style={{ display:"grid", gap:10 }}>
        {list.map(dr=><DoctorCard key={dr.id} dr={dr} onStart={()=>onStart(dr)}/>)}
      </div>
    </div>
  );
}

function DoctorCard({dr,onStart}){
  const clsColor=dr.cls==="A"?BRAND.coral:dr.cls==="B"?BRAND.gold:BRAND.teal;
  return (
    <div className="card" style={{ padding:14, display:"flex", alignItems:"center", gap:12 }}>
      <div className="pill" style={{ width:34, height:34, background:clsColor, color:"#fff", display:"grid", placeItems:"center", fontWeight:900, flexShrink:0 }}>{dr.cls}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span className="ar" style={{ fontWeight:800, fontSize:15 }}>{dr.name}</span>
          <span className="pill" style={{ fontSize:10, padding:"2px 8px", background:dr.type==="AM"?"rgba(230,180,80,.2)":"rgba(14,124,123,.15)", color:dr.type==="AM"?"#8a6d1f":BRAND.teal }}>{dr.type==="AM"?<Sun size={10} style={{verticalAlign:-1,marginRight:3}}/>:<Moon size={10} style={{verticalAlign:-1,marginRight:3}}/>}{dr.type}</span>
        </div>
        <div style={{ fontSize:12, color:"#666", marginTop:2 }}>{dr.spec} · {dr.brick} · <span className="ar">{dr.addr}</span></div>
        <div style={{ marginTop:7, display:"flex", alignItems:"center", gap:8 }}>
          <div className="barTrack" style={{ flex:1, maxWidth:150 }}><div style={{ width:`${Math.min((dr.visitsM/dr.target)*100,100)}%`, height:"100%", background:freqBarColor(dr.visitsM,dr.target) }}/></div>
          <span style={{ fontSize:11, fontWeight:700, color:freqBarColor(dr.visitsM,dr.target)==BRAND.line?"#999":freqBarColor(dr.visitsM,dr.target) }}>{dr.visitsM}/{dr.target} · {freqText(dr.visitsM,dr.target)}</span>
        </div>
      </div>
      <button onClick={onStart} style={{ border:"none", background:BRAND.deep, color:"#fff", borderRadius:12, padding:"10px 16px", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>Start <ChevronRight size={15}/></button>
    </div>
  );
}

// ---------- Weekly Plan (dropdown search + approval cycle + deadline) ----------
function WeeklyPlan(){
  const [planned,setPlanned]=useState([SAMPLE_DOCTORS[0],SAMPLE_DOCTORS[2]]);
  const [q,setQ]=useState(""); const [open,setOpen]=useState(false);
  // demo deadline state
  const beforeDeadline=true; // Thu 23:00
  const matches=SAMPLE_DOCTORS.filter(d=>!planned.find(p=>p.id===d.id) && (d.name.includes(q)||d.spec.toLowerCase().includes(q.toLowerCase())));
  const add=(d)=>{ setPlanned([...planned,d]); setQ(""); setOpen(false); };
  return (
    <div className="fade">
      <div className="card" style={{ padding:16, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, borderLeft:`4px solid ${beforeDeadline?BRAND.mint:BRAND.coral}` }}>
        <div>
          <div style={{ fontWeight:800, fontSize:16 }}>Week 22 Plan · 26 May – 1 Jun</div>
          <div style={{ fontSize:12, color:"#666", marginTop:3 }}>Submission deadline: <b>Thursday 11:00 PM</b> · Manager approval by <b>Saturday 10:00 AM</b></div>
        </div>
        <span className="pill" style={{ background:beforeDeadline?"rgba(31,182,166,.15)":"rgba(226,87,76,.15)", color:beforeDeadline?BRAND.teal:BRAND.coral, padding:"6px 14px", fontSize:12, fontWeight:800 }}>{beforeDeadline?"Open for editing":"Locked — work actual/CLM only"}</span>
      </div>

      {beforeDeadline ? (
        <div className="card" style={{ padding:16, marginBottom:14, position:"relative" }}>
          <div style={{ fontWeight:800, marginBottom:10 }}>Add doctors to plan</div>
          <div style={{ position:"relative" }}>
            <Search size={16} style={{ position:"absolute", left:12, top:13, color:"#999" }}/>
            <input value={q} onChange={e=>{setQ(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Type to search doctors…" style={{ width:"100%", padding:"11px 12px 11px 36px", borderRadius:12, border:`1px solid ${BRAND.line}`, fontSize:14 }}/>
            {open && q && (
              <div className="card" style={{ position:"absolute", top:48, left:0, right:0, zIndex:20, maxHeight:220, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.12)" }}>
                {matches.length? matches.map(d=>(
                  <div key={d.id} onClick={()=>add(d)} style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${BRAND.paper}`, display:"flex", justifyContent:"space-between" }}>
                    <span className="ar" style={{fontWeight:700}}>{d.name}</span><span style={{fontSize:12,color:"#999"}}>{d.spec} · {d.cls}</span>
                  </div>
                )) : <div style={{padding:14,color:"#999",fontSize:13}}>No matches</div>}
              </div>
            )}
          </div>
        </div>
      ):null}

      <div style={{ fontWeight:800, marginBottom:10 }}>Planned visits ({planned.length})</div>
      <div style={{ display:"grid", gap:8, marginBottom:16 }}>
        {planned.map(d=>(
          <div key={d.id} className="card" style={{ padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div><span className="ar" style={{fontWeight:700}}>{d.name}</span><span style={{fontSize:12,color:"#666"}}> · {d.spec} · {d.type} · {d.brick}</span></div>
            <span className="pill" style={{ background:d.cls==="A"?BRAND.coral:d.cls==="B"?BRAND.gold:BRAND.teal, color:"#fff", width:24, height:24, display:"grid", placeItems:"center", fontSize:12 }}>{d.cls}</span>
          </div>
        ))}
      </div>
      <button style={{ width:"100%", border:"none", borderRadius:14, padding:14, fontWeight:800, fontSize:15, cursor:"pointer", background:BRAND.mint, color:BRAND.navy, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Send size={17}/> Submit plan to manager</button>
      <div style={{ fontSize:11, color:"#999", textAlign:"center", marginTop:8 }}>You can always add same-day unplanned visits for any reason.</div>
    </div>
  );
}

// ---------- Manage List (lock + add from master + create account + dual approval) ----------
function ManageList(){
  const lock=listLockState();
  const [mode,setMode]=useState(null); // master | create
  return (
    <div className="fade">
      <div className="card" style={{ padding:16, marginBottom:14, borderLeft:`4px solid ${lock.open?BRAND.mint:BRAND.coral}`, display:"flex", gap:12, alignItems:"flex-start" }}>
        {lock.open? <Unlock size={22} color={BRAND.teal}/> : <Lock size={22} color={BRAND.coral}/>}
        <div>
          <div style={{ fontWeight:800, fontSize:15 }}>{lock.open?"List editing is OPEN":"List editing is LOCKED"}</div>
          <div style={{ fontSize:12.5, color:"#666", marginTop:3, lineHeight:1.6 }}>
            Add/Delete is allowed only during <b>{lock.window}</b>. Outside this window the list is locked for all reps. The Admin may grant an <b>exceptional per-rep unlock</b> upon a manager's request (e.g., new hire). Every change follows a <b>dual approval</b>: Manager (acknowledges) → Admin (applies).
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        <ActionCard disabled={!lock.open} icon={<UserPlus size={20}/>} title="Add from Master List" desc="Search the central CRM list and request to add an existing doctor." onClick={()=>lock.open&&setMode("master")}/>
        <ActionCard disabled={!lock.open} icon={<FilePlus2 size={20}/>} title="Create New Account" desc="Create a brand-new AM/PM account (full details) — needs approval." onClick={()=>lock.open&&setMode("create")}/>
      </div>

      {mode==="master" && <AddFromMaster onClose={()=>setMode(null)}/>}
      {mode==="create" && <CreateAccount onClose={()=>setMode(null)}/>}

      <PendingRequests/>
    </div>
  );
}

function ActionCard({icon,title,desc,onClick,disabled}){
  return (
    <div onClick={onClick} className="card" style={{ padding:16, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.55:1, transition:".2s" }}>
      <div style={{ width:40, height:40, borderRadius:12, background:BRAND.paper, display:"grid", placeItems:"center", color:BRAND.deep, marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:14 }}>{title}</div>
      <div style={{ fontSize:12, color:"#666", marginTop:3 }}>{desc}</div>
      {disabled && <div style={{ fontSize:11, color:BRAND.coral, marginTop:8, fontWeight:700 }}><Lock size={11} style={{verticalAlign:-1}}/> Locked now</div>}
    </div>
  );
}

function AddFromMaster({onClose}){
  const [q,setQ]=useState("");
  const matches=MASTER_LIST.filter(d=>d.name.includes(q)||d.spec.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card fade" style={{ padding:16, marginBottom:16, border:`2px solid ${BRAND.deep}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontWeight:800 }}>Add from Master List</div>
        <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"#999" }}><XCircle size={20}/></button>
      </div>
      <div style={{ position:"relative", marginBottom:12 }}>
        <Search size={16} style={{ position:"absolute", left:12, top:13, color:"#999" }}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search central master list…" style={{ width:"100%", padding:"11px 12px 11px 36px", borderRadius:12, border:`1px solid ${BRAND.line}`, fontSize:14 }}/>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {matches.map(d=>(
          <div key={d.id} className="card" style={{ padding:"11px 13px", display:"flex", justifyContent:"space-between", alignItems:"center", background:BRAND.paper }}>
            <div><span className="ar" style={{fontWeight:700}}>{d.name}</span><div style={{fontSize:12,color:"#666"}}>{d.spec} · {d.type} · {d.brick} · <span className="ar">{d.addr}</span></div></div>
            <button style={{ border:"none", background:BRAND.deep, color:"#fff", borderRadius:10, padding:"7px 14px", fontWeight:700, fontSize:12, cursor:"pointer", flexShrink:0 }}>Request add</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateAccount({onClose}){
  const [type,setType]=useState("PM");
  const [gov,setGov]=useState(""); 
  const bricksForGov=IMS_BRICKS.filter(b=>!gov||b.gov===gov);
  return (
    <div className="card fade" style={{ padding:16, marginBottom:16, border:`2px solid ${BRAND.deep}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontWeight:800 }}>Create New Account</div>
        <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"#999" }}><XCircle size={20}/></button>
      </div>
      <div style={{ display:"grid", gap:12 }}>
        <Field label="Doctor Name (Arabic, min. two parts)"><input className="ar" placeholder="د. الاسم الأول الاسم الثاني" style={inp}/></Field>
        <Field label="Detailed Address (Arabic)"><input className="ar" placeholder="رقم العيادة، الشارع، الحي، المحافظة" style={inp}/></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Account Type">
            <div style={{ display:"flex", gap:6 }}>
              {["AM","PM"].map(t=>(
                <button key={t} onClick={()=>setType(t)} className="pill" style={{ flex:1, padding:"10px", border:`1px solid ${type===t?BRAND.deep:BRAND.line}`, background:type===t?BRAND.deep:"#fff", color:type===t?"#fff":BRAND.navy, cursor:"pointer", fontSize:13 }}>{t==="AM"?<Sun size={13} style={{verticalAlign:-2,marginRight:4}}/>:<Moon size={13} style={{verticalAlign:-2,marginRight:4}}/>}{t}</button>
              ))}
            </div>
          </Field>
          <Field label="Class"><select style={inp}><option>A</option><option>B</option><option>C</option></select></Field>
        </div>
        <Field label="Account Sub-type">
          <select style={inp}>{(type==="AM"?AM_TYPES:PM_TYPES).map(t=><option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Specialty"><select style={inp}>{SPECIALTIES.map(s=><option key={s}>{s}</option>)}</select></Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <Field label="Governorate"><select value={gov} onChange={e=>setGov(e.target.value)} style={inp}><option value="">Select…</option>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</select></Field>
          <Field label="IMS Brick"><select style={inp}><option value="">Select…</option>{bricksForGov.map(b=><option key={b.en}>{b.en} — {b.ar}</option>)}</select></Field>
        </div>
        <button style={{ border:"none", borderRadius:12, padding:13, fontWeight:800, fontSize:14, cursor:"pointer", background:BRAND.mint, color:BRAND.navy, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:4 }}><Send size={16}/> Submit for approval</button>
        <div style={{ fontSize:11, color:"#999", textAlign:"center" }}>New account → Manager acknowledges → Admin applies. Status stays "Pending" until both approve.</div>
      </div>
    </div>
  );
}
const inp={ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${BRAND.line}`, fontSize:13.5, background:"#fff" };
function Field({label,children}){ return <div><div style={{fontSize:12,fontWeight:700,color:"#555",marginBottom:5}}>{label}</div>{children}</div>; }

function PendingRequests(){
  const reqs=[
    { dr:"د. ياسر الديب", action:"Add from master", stage:"Manager", color:BRAND.amber },
    { dr:"د. سمر عادل", action:"New PM account", stage:"Admin", color:BRAND.teal },
    { dr:"د. حسام الدين فؤاد", action:"Delete", stage:"Applied", color:BRAND.mint },
  ];
  const stages=["Manager","Admin","Applied"];
  return (
    <div className="card" style={{ padding:16, marginTop:16 }}>
      <div style={{ fontWeight:800, marginBottom:12 }}>My List Requests</div>
      {reqs.map((r,i)=>(
        <div key={i} style={{ padding:"11px 0", borderBottom:i<reqs.length-1?`1px solid ${BRAND.paper}`:"none" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div><span className="ar" style={{fontWeight:700}}>{r.dr}</span><span style={{fontSize:12,color:"#666"}}> · {r.action}</span></div>
            <span className="pill" style={{ background:`${r.color}22`, color:r.color, padding:"3px 10px", fontSize:11, fontWeight:800 }}>{r.stage}</span>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            {stages.map((st,j)=>{ const done=stages.indexOf(r.stage)>=j; return (
              <React.Fragment key={st}>
                <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:10.5, color:done?r.color:"#bbb", fontWeight:700 }}>
                  {done?<CheckCircle2 size={13}/>:<div style={{width:13,height:13,borderRadius:"50%",border:`2px solid #ccc`}}/>}{st}
                </div>
                {j<stages.length-1 && <div style={{ flex:1, height:2, background:stages.indexOf(r.stage)>j?r.color:BRAND.line }}/>}
              </React.Fragment>
            );})}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Detail Aid Session (30s rule + anti-gaming + offline) ----------
function DetailAidSession({doctor,onBack,onSubmit}){
  const [product,setProduct]=useState(PRODUCTS[0]);
  const [slide,setSlide]=useState(1);
  const [elapsed,setElapsed]=useState(0);
  const [maxSlide,setMaxSlide]=useState(1);
  const [geoOk]=useState(true);
  const [mockGps]=useState(false); // Idea #1: fake GPS flag (demo: clean)
  const startRef=useRef(Date.now());
  useEffect(()=>{ const t=setInterval(()=>setElapsed(Math.floor((Date.now()-startRef.current)/1000)),1000); return ()=>clearInterval(t); },[]);
  const radius=doctor.type==="AM"?150:100;
  const slidesSeen=maxSlide;
  const valid=slidesSeen>=5 && elapsed>=30 && geoOk && !mockGps;
  const mm=String(Math.floor(elapsed/60)).padStart(2,"0"), ss=String(elapsed%60).padStart(2,"0");
  const next=()=>{ const n=Math.min(slide+1,product.slides); setSlide(n); setMaxSlide(m=>Math.max(m,n)); };
  const prev=()=>setSlide(s=>Math.max(s-1,1));
  return (
    <div className="fade">
      <button onClick={onBack} style={{ border:"none", background:"none", color:BRAND.deep, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4, marginBottom:14, fontSize:14 }}><ArrowRight size={16} style={{transform:"rotate(180deg)"}}/> Back</button>

      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <StatusChip ok icon={<WifiOff size={13}/>} text="Offline — data queued, syncs on reconnect"/>
        <StatusChip ok={!mockGps} icon={<ShieldAlert size={13}/>} text={mockGps?"Fake GPS detected — visit flagged":"GPS integrity OK"}/>
      </div>

      <div className="card" style={{ padding:16, marginBottom:14, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div><div style={{fontSize:12,color:"#666"}}>Active visit with</div><div className="ar" style={{fontWeight:900,fontSize:18}}>{doctor.name}</div><div className="ar" style={{fontSize:12,color:"#666",marginTop:2}}>{doctor.addr}</div></div>
        <div style={{ display:"flex", gap:16 }}>
          <SessionStat icon={<Clock size={16}/>} label="Duration" value={`${mm}:${ss}`} ok={elapsed>=30}/>
          <SessionStat icon={<Layers size={16}/>} label="Slides" value={`${slidesSeen}`} ok={slidesSeen>=5}/>
          <SessionStat icon={<Navigation size={16}/>} label={`${radius}m`} value={geoOk?"In":"Out"} ok={geoOk}/>
        </div>
      </div>

      <div style={{ background:geoOk?"rgba(31,182,166,.1)":"rgba(226,87,76,.1)", border:`1px solid ${geoOk?BRAND.mint:BRAND.coral}`, borderRadius:12, padding:"10px 14px", marginBottom:14, fontSize:13, display:"flex", alignItems:"center", gap:8, fontWeight:600 }}>
        <MapPin size={16} color={geoOk?BRAND.teal:BRAND.coral}/>{geoOk?`Inside the ${radius}m geofence — geographically valid. (1m over = rejected)`:"Out of range — even 1 meter over is rejected."}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        {PRODUCTS.map(p=><button key={p.id} onClick={()=>{setProduct(p);setSlide(1);}} className="pill tab" style={{ border:`1px solid ${product.id===p.id?p.color:BRAND.line}`, background:product.id===p.id?p.color:"#fff", color:product.id===p.id?"#fff":BRAND.navy, padding:"8px 14px", fontSize:13 }}>{p.name}</button>)}
      </div>

      <div className="card" style={{ overflow:"hidden", marginBottom:14 }}>
        <div style={{ height:300, background:`linear-gradient(135deg, ${product.color}, ${BRAND.navy})`, color:"#fff", display:"grid", placeItems:"center", position:"relative" }}>
          <div style={{ textAlign:"center" }}><div style={{fontSize:13,opacity:.8}}>{product.name}</div><div style={{fontSize:60,fontWeight:900}}>Slide {slide}</div><div style={{fontSize:13,opacity:.8}}>of {product.slides}</div></div>
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:4, background:"rgba(255,255,255,.2)" }}><div style={{ width:`${(slide/product.slides)*100}%`, height:"100%", background:"#fff" }}/></div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", padding:12 }}>
          <button onClick={prev} disabled={slide===1} style={navBtn(slide===1)}>Previous</button>
          <span style={{ fontSize:13, color:"#666", alignSelf:"center" }}>Tap Next to browse slides</span>
          <button onClick={next} disabled={slide===product.slides} style={navBtn(slide===product.slides,true)}>Next</button>
        </div>
      </div>

      <div className="card" style={{ padding:16 }}>
        <div style={{ fontWeight:800, marginBottom:10 }}>Valid Visit Conditions</div>
        <RuleRow ok={slidesSeen>=5} text="Browse at least 5 slides" detail={`${slidesSeen}/5`}/>
        <RuleRow ok={elapsed>=30} text="Session duration ≥ 30 seconds" detail={`${mm}:${ss}`}/>
        <RuleRow ok={geoOk} text={`Inside geofence (${radius}m)`} detail={geoOk?"✓":"✗"}/>
        <RuleRow ok={!mockGps} text="No GPS spoofing detected" detail={mockGps?"FAKE":"✓"}/>
        <button onClick={onSubmit} disabled={!valid} style={{ width:"100%", marginTop:14, border:"none", borderRadius:14, padding:14, fontWeight:800, fontSize:15, cursor:valid?"pointer":"not-allowed", background:valid?BRAND.mint:BRAND.line, color:valid?BRAND.navy:"#999" }}>{valid?"End & link visit to doctor":"Complete conditions to end visit"}</button>
      </div>
    </div>
  );
}

function SessionSubmitted({doctor,onDone}){
  return (
    <div className="fade card" style={{ padding:40, textAlign:"center", maxWidth:520, margin:"40px auto" }}>
      <div style={{ width:70, height:70, borderRadius:"50%", background:"rgba(31,182,166,.15)", display:"grid", placeItems:"center", margin:"0 auto 16px" }}><CheckCircle2 size={40} color={BRAND.mint}/></div>
      <div style={{ fontWeight:900, fontSize:20 }}>Visit logged successfully</div>
      <div style={{ color:"#666", margin:"8px 0 4px" }}>Linked to <span className="ar" style={{fontWeight:700}}>{doctor.name}</span></div>
      <div style={{ fontSize:13, color:"#999" }}>Captured offline · syncs automatically when online</div>
      <button onClick={onDone} style={{ marginTop:22, border:"none", background:BRAND.deep, color:"#fff", borderRadius:12, padding:"12px 28px", fontWeight:700, cursor:"pointer" }}>Back to list</button>
    </div>
  );
}
function StatusChip({ok,icon,text}){ return <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, fontWeight:700, padding:"6px 12px", borderRadius:999, background:ok?"rgba(31,182,166,.12)":"rgba(226,87,76,.12)", color:ok?BRAND.teal:BRAND.coral }}>{icon}{text}</div>; }

// =====================  MANAGER APP  =====================
function ManagerApp(){
  const [tab,setTab]=useState("team");
  const reps=[
    { name:"Mohamed Samir", cov:100, call:93, freq:94, area:"Cairo - Maadi" },
    { name:"Heba Ali", cov:96, call:102, freq:110, area:"Giza - Dokki" },
    { name:"Karim Wahid", cov:88, call:85, freq:80, area:"Alexandria" },
    { name:"Nora Fouad", cov:100, call:118, freq:121, area:"Cairo - Nasr City" },
  ];
  const plans=[
    { rep:"Mohamed Samir", week:"W22", visits:48, status:"Submitted", at:"Thu 9:12 PM" },
    { rep:"Heba Ali", week:"W22", visits:50, status:"Submitted", at:"Thu 10:40 PM" },
    { rep:"Karim Wahid", week:"W22", visits:0, status:"Missed deadline", at:"—" },
    { rep:"Nora Fouad", week:"W22", visits:52, status:"Approved", at:"Fri 8:00 AM" },
  ];
  const sColor=(s)=>s==="Approved"?BRAND.mint:s==="Submitted"?BRAND.amber:BRAND.coral;
  return (
    <div style={wrap} className="fade">
      <SubTabs tabs={[["team","Team KPIs",<Users size={14}/>],["plans","Plan Approvals",<ClipboardCheck size={14}/>],["reqs","List Requests",<ListChecks size={14}/>],["reports","Reports",<FileText size={14}/>]]} tab={tab} setTab={setTab}/>

      {tab==="team" && (<>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:16 }}>
          <BigKPI icon={<Target/>} label="Team Coverage" value="95%" note="Cap 100%" color={BRAND.gold}/>
          <BigKPI icon={<Activity/>} label="Team Call Rate" value="99%" note="180 target" color={BRAND.gold}/>
          <BigKPI icon={<TrendingUp/>} label="Team Frequency" value="101%" note="over-ach. allowed" color={BRAND.mint}/>
          <BigKPI icon={<Award/>} label="Team CRM Score" value="98%" note="cutoff 90%" color={BRAND.gold} highlight/>
        </div>
        <div className="card" style={{ padding:18 }}>
          <div style={{ fontWeight:800, marginBottom:12 }}>Reps in my team</div>
          <div style={{ overflowX:"auto" }}><table style={{ minWidth:560, fontSize:13 }}>
            <thead><tr style={{borderBottom:`2px solid ${BRAND.line}`}}><th style={th}>Rep</th><th style={th}>Territory</th><th style={th}>Cov</th><th style={th}>Call</th><th style={th}>Freq</th><th style={th}>CRM</th></tr></thead>
            <tbody>{reps.map((r,i)=>{ const sc=(Math.min(r.cov,100)+r.call+r.freq)/3; return (
              <tr key={i} style={{borderBottom:`1px solid ${BRAND.line}`}}><td style={{padding:10,fontWeight:700}}>{r.name}</td><td style={{padding:10,color:"#666"}}>{r.area}</td><td style={{padding:10}}><Chip v={r.cov}/></td><td style={{padding:10}}><Chip v={r.call}/></td><td style={{padding:10}}><Chip v={r.freq}/></td><td style={{padding:10}}><Chip v={sc} bold/></td></tr>
            );})}</tbody>
          </table></div>
        </div>
      </>)}

      {tab==="plans" && (
        <div className="card" style={{ padding:18 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontWeight:800 }}>Weekly Plan Approvals</div>
            <span style={{ fontSize:12, color:BRAND.coral, fontWeight:700 }}><AlertTriangle size={13} style={{verticalAlign:-2}}/> Approve before Saturday 10:00 AM</span>
          </div>
          <div style={{ fontSize:12, color:"#666", marginBottom:14 }}>If you miss the approval deadline, the CRM Admin is notified that the rep's plan was submitted but not approved (protects the rep).</div>
          {plans.map((p,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:i<plans.length-1?`1px solid ${BRAND.paper}`:"none", flexWrap:"wrap", gap:8 }}>
              <div><div style={{fontWeight:700}}>{p.rep}</div><div style={{fontSize:12,color:"#666"}}>{p.week} · {p.visits} planned visits · submitted {p.at}</div></div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span className="pill" style={{ background:`${sColor(p.status)}22`, color:sColor(p.status), padding:"4px 12px", fontSize:11.5, fontWeight:800 }}>{p.status}</span>
                {p.status==="Submitted" && <><button style={{border:"none",background:BRAND.mint,color:BRAND.navy,borderRadius:9,padding:"7px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Approve</button><button style={{border:`1px solid ${BRAND.coral}`,background:"#fff",color:BRAND.coral,borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Reject</button></>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="reqs" && <ManagerListRequests/>}
      {tab==="reports" && <ReportsTab/>}
    </div>
  );
}
const th={ padding:10 };

function ManagerListRequests(){
  const reqs=[
    { rep:"Mohamed Samir", dr:"د. ياسر الديب", action:"Add from master" },
    { rep:"Heba Ali", dr:"د. سمر عادل", action:"New PM account" },
  ];
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800, marginBottom:6 }}>List Change Requests (Step 1 of 2)</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:14 }}>Your approval acknowledges the change and forwards it to the Admin, who applies it. Approval here is your formal acknowledgement — it does not apply the change yet.</div>
      {reqs.map((r,i)=>(
        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:i<reqs.length-1?`1px solid ${BRAND.paper}`:"none", flexWrap:"wrap", gap:8 }}>
          <div><span className="ar" style={{fontWeight:700}}>{r.dr}</span><div style={{fontSize:12,color:"#666"}}>{r.rep} · {r.action}</div></div>
          <div style={{ display:"flex", gap:8 }}><button style={{border:"none",background:BRAND.mint,color:BRAND.navy,borderRadius:9,padding:"7px 14px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Acknowledge → Admin</button><button style={{border:`1px solid ${BRAND.coral}`,background:"#fff",color:BRAND.coral,borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Reject</button></div>
        </div>
      ))}
    </div>
  );
}

// =====================  REPORTS TAB (shared by Manager & Admin)  =====================
function ReportsTab(){
  const [r,setR]=useState("kpi");
  const reports=[["kpi","KPIs",<BarChart3 size={13}/>],["pm","PM Working Hours",<Timer size={13}/>],["am","AM Accounts",<Sun size={13}/>],["interval","Visit Intervals",<Clock size={13}/>],["fraud","Integrity / Anti-Gaming",<ShieldAlert size={13}/>]];
  return (
    <div className="fade">
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {reports.map(([k,l,ic])=><button key={k} onClick={()=>setR(k)} className="pill tab" style={{ padding:"8px 14px", fontSize:12.5, display:"flex", alignItems:"center", gap:5, background:r===k?BRAND.deep:"#fff", color:r===k?"#fff":BRAND.navy, border:`1px solid ${r===k?BRAND.deep:BRAND.line}` }}>{ic}{l}</button>)}
      </div>
      {r==="kpi" && <KPIReport/>}
      {r==="pm" && <PMHoursReport/>}
      {r==="am" && <AMReport/>}
      {r==="interval" && <IntervalReport/>}
      {r==="fraud" && <FraudReport/>}
    </div>
  );
}

function KPIReport(){
  const months=["Jan","Feb","Mar","Apr","May"];
  const cov=[88,91,94,96,95], call=[82,90,93,99,99], freq=[85,95,98,101,101];
  const Bars=({data,color,label})=>(
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>{label}</div>
      <div style={{ display:"flex", gap:10, alignItems:"flex-end", height:120 }}>
        {data.map((v,i)=>(<div key={i} style={{ flex:1, textAlign:"center" }}>
          <div style={{ height:`${v}px`, background:color, borderRadius:"6px 6px 0 0", display:"flex", alignItems:"flex-start", justifyContent:"center", color:"#fff", fontSize:10, fontWeight:700, paddingTop:3 }}>{v}%</div>
          <div style={{ fontSize:11, color:"#999", marginTop:4 }}>{months[i]}</div>
        </div>))}
      </div>
    </div>
  );
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800, marginBottom:16 }}>KPI Trends — Monthly Achievement</div>
      <Bars data={cov} color={BRAND.gold} label="Coverage (cap 100%)"/>
      <Bars data={call} color={BRAND.teal} label="Call Rate"/>
      <Bars data={freq} color={BRAND.mint} label="Frequency"/>
    </div>
  );
}

function ReportTable({title,note,cols,rows}){
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800 }}>{title}</div>
      {note && <div style={{ fontSize:12, color:"#666", margin:"4px 0 14px" }}>{note}</div>}
      <div style={{ overflowX:"auto" }}><table style={{ minWidth:520, fontSize:13 }}>
        <thead><tr style={{borderBottom:`2px solid ${BRAND.line}`}}>{cols.map(c=><th key={c} style={{padding:10}}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=>(<tr key={i} style={{borderBottom:`1px solid ${BRAND.paper}`}}>{row.map((cell,j)=><td key={j} style={{padding:10}}>{cell}</td>)}</tr>))}</tbody>
      </table></div>
    </div>
  );
}
const flag=(text,color)=><span className="pill" style={{background:`${color}22`,color,padding:"3px 10px",fontSize:11.5,fontWeight:800}}>{text}</span>;

function PMHoursReport(){
  return <ReportTable title="Total PM Working Hours" note="Red when the span between the first and last PM visit is under 2h 30m (150 min). AM visit times are not counted."
    cols={["Rep","First PM","Last PM","Span","Status"]}
    rows={[
      ["Mohamed Samir","12:40 PM","4:10 PM","210 min",flag("OK",BRAND.mint)],
      ["Heba Ali","1:00 PM","3:05 PM","125 min",flag("Under 150 min",BRAND.coral)],
      ["Karim Wahid","12:30 PM","3:20 PM","170 min",flag("OK",BRAND.mint)],
    ]}/>;
}
function AMReport(){
  return <ReportTable title="AM Accounts per Day" note="Daily target is 2 AM accounts. Flagged red when a rep logged only 1 AM account. AM visits should also be before 11:00 AM."
    cols={["Rep","AM count","First AM time","Status"]}
    rows={[
      ["Mohamed Samir","2","9:15 AM",flag("OK",BRAND.mint)],
      ["Heba Ali","1","10:05 AM",flag("Only 1 AM",BRAND.coral)],
      ["Karim Wahid","2","11:40 AM",flag("Late (after 11)",BRAND.amber)],
    ]}/>;
}
function IntervalReport(){
  return <ReportTable title="Visit Intervals" note="Flagged when the gap between two consecutive visits is under 10 minutes. A new session cannot start before the previous one is ended and linked to a doctor."
    cols={["Rep","Visit A → B","Gap","Status"]}
    rows={[
      ["Mohamed Samir","2:10 → 2:35 PM","25 min",flag("OK",BRAND.mint)],
      ["Heba Ali","1:20 → 1:26 PM","6 min",flag("Under 10 min",BRAND.coral)],
      ["Nora Fouad","3:00 → 3:14 PM","14 min",flag("OK",BRAND.mint)],
    ]}/>;
}
function FraudReport(){
  return (
    <div style={{ display:"grid", gap:14 }}>
      <ReportTable title="Integrity & Anti-Gaming" note="Detects fake-GPS apps, device clock tampering, identical-location submissions, and offline-capture integrity."
        cols={["Rep","Signal","Detail","Status"]}
        rows={[
          ["Karim Wahid","Fake GPS app","Mock location active during 3 visits",flag("FAKE",BRAND.coral)],
          ["Heba Ali","Same location","8 visits from identical coordinates",flag("Review",BRAND.amber)],
          ["Mohamed Samir","Clock tamper","Device time vs server drift +42 min",flag("Review",BRAND.amber)],
          ["Nora Fouad","Offline integrity","All sessions captured & synced cleanly",flag("Clean",BRAND.mint)],
        ]}/>
      <div className="card" style={{ padding:18 }}>
        <div style={{ fontWeight:800, marginBottom:6, display:"flex", alignItems:"center", gap:8 }}><Route size={18} color={BRAND.deep}/> Route Replay & Dwell Time</div>
        <div style={{ fontSize:12.5, color:"#666", marginBottom:14 }}>Each rep's daily route is replayable on a map with timestamps and dwell time per stop. A visit logged with near-zero dwell, or 10 visits with no movement between them, is flagged.</div>
        <div style={{ height:140, borderRadius:12, background:`linear-gradient(135deg, ${BRAND.paper}, #fff)`, border:`1px dashed ${BRAND.line}`, display:"grid", placeItems:"center", color:"#999", fontSize:13 }}><div style={{textAlign:"center"}}><Route size={28} style={{opacity:.4}}/><div style={{marginTop:6}}>Map route trail with timestamps + dwell time</div></div></div>
      </div>
    </div>
  );
}

// =====================  ADMIN APP  =====================
function AdminApp(){
  const [tab,setTab]=useState("overview");
  const k=computeKPIs();
  return (
    <div style={wrap} className="fade">
      <SubTabs tabs={[["overview","Overview",<BarChart3 size={14}/>],["approvals","List Approvals",<ClipboardCheck size={14}/>],["locks","List Locks",<Lock size={14}/>],["alerts","Alerts",<Bell size={14}/>],["reports","Reports",<FileText size={14}/>]]} tab={tab} setTab={setTab}/>

      {tab==="overview" && (<>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:18 }}>
          <BigKPI icon={<Target/>} label="Coverage" value={pct(k.coverageAch)} note="Cap 100% — no over-ach." color={achColor(k.coverageAch)}/>
          <BigKPI icon={<Activity/>} label="Call Rate" value={pct(k.callRateAch)} note={`${k.monthlyVisitsActual}/${k.monthlyVisitsTarget}`} color={achColor(k.callRateAch)}/>
          <BigKPI icon={<TrendingUp/>} label="Frequency" value={pct(k.freqAch)} note={`${k.freqActual}/${k.freqTarget}`} color={achColor(k.freqAch)}/>
          <BigKPI icon={<Award/>} label="CRM Score" value={pct(k.crmScore)} note="avg · cutoff 90%" color={achColor(k.crmScore)} highlight/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontWeight:800, marginBottom:14 }}>Doctors by Class</div>
            <ClassBar label="Class A" count={k.classA} total={k.totalDrs} color={BRAND.coral} freq="3 visits/mo"/>
            <ClassBar label="Class B" count={k.classB} total={k.totalDrs} color={BRAND.gold} freq="2 visits/mo"/>
            <ClassBar label="Class C" count={0} total={k.totalDrs} color={BRAND.teal} freq="1 visit/mo · not used yet"/>
          </div>
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontWeight:800, marginBottom:10, display:"flex", alignItems:"center", gap:8 }}><Sparkles size={18} color={BRAND.gold}/> AI Insights</div>
            <Insight text="East Cairo region down 8% this week vs last." c={BRAND.coral}/>
            <Insight text="Class A frequency improved +6% after plan reminders." c={BRAND.mint}/>
            <Insight text="3 reps consistently miss the 2-AM-accounts rule." c={BRAND.amber}/>
          </div>
        </div>
      </>)}

      {tab==="approvals" && <AdminApprovals/>}
      {tab==="locks" && <AdminLocks/>}
      {tab==="alerts" && <AdminAlerts/>}
      {tab==="reports" && <ReportsTab/>}
    </div>
  );
}
function Insight({text,c}){ return <div style={{ display:"flex", gap:8, padding:"9px 0", borderBottom:`1px solid ${BRAND.paper}`, fontSize:13 }}><div style={{width:8,height:8,borderRadius:"50%",background:c,marginTop:5,flexShrink:0}}/><span>{text}</span></div>; }

function AdminApprovals(){
  const reqs=[
    { rep:"Mohamed Samir", dr:"د. ياسر الديب", action:"Add from master", mgr:"Acknowledged" },
    { rep:"Heba Ali", dr:"د. سمر عادل", action:"New PM account", mgr:"Acknowledged" },
  ];
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800, marginBottom:6 }}>List Approvals (Step 2 of 2 — Apply)</div>
      <div style={{ fontSize:12, color:"#666", marginBottom:14 }}>Manager has acknowledged. Your approval is the real apply step that changes the list.</div>
      {reqs.map((r,i)=>(
        <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:i<reqs.length-1?`1px solid ${BRAND.paper}`:"none", flexWrap:"wrap", gap:8 }}>
          <div><span className="ar" style={{fontWeight:700}}>{r.dr}</span><div style={{fontSize:12,color:"#666"}}>{r.rep} · {r.action} · Manager: {r.mgr}</div></div>
          <div style={{ display:"flex", gap:8 }}><button style={{border:"none",background:BRAND.mint,color:BRAND.navy,borderRadius:9,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Apply change</button><button style={{border:`1px solid ${BRAND.coral}`,background:"#fff",color:BRAND.coral,borderRadius:9,padding:"7px 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>Reject</button></div>
        </div>
      ))}
    </div>
  );
}
function AdminLocks(){
  const lock=listLockState();
  return (
    <div style={{ display:"grid", gap:14 }}>
      <div className="card" style={{ padding:18, borderLeft:`4px solid ${lock.open?BRAND.mint:BRAND.coral}` }}>
        <div style={{ fontWeight:800, marginBottom:6 }}>Global List Lock</div>
        <div style={{ fontSize:13, color:"#666" }}>List editing opens automatically only during <b>{lock.window}</b>. Currently: <b style={{color:lock.open?BRAND.teal:BRAND.coral}}>{lock.open?"OPEN":"LOCKED"}</b>.</div>
      </div>
      <div className="card" style={{ padding:18 }}>
        <div style={{ fontWeight:800, marginBottom:6 }}>Exceptional Per-Rep Unlock</div>
        <div style={{ fontSize:12, color:"#666", marginBottom:14 }}>Grant a temporary unlock to a single rep upon a manager's request (new hire / special case). Other reps stay locked.</div>
        {[["Karim Wahid","New hire — needs to build list","Requested by: Manager Ahmed"],["Sara Adel","Territory change","Requested by: Manager Mona"]].map((u,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${BRAND.paper}`, flexWrap:"wrap", gap:8 }}>
            <div><div style={{fontWeight:700}}>{u[0]}</div><div style={{fontSize:12,color:"#666"}}>{u[1]} · {u[2]}</div></div>
            <button style={{border:"none",background:BRAND.deep,color:"#fff",borderRadius:9,padding:"7px 16px",fontWeight:700,fontSize:12,cursor:"pointer"}}><Unlock size={12} style={{verticalAlign:-2,marginRight:4}}/>Grant unlock</button>
          </div>
        ))}
      </div>
    </div>
  );
}
function AdminAlerts(){
  return (
    <div className="card" style={{ padding:18 }}>
      <div style={{ fontWeight:800, marginBottom:14 }}>System Alerts</div>
      <AlertRow icon={<Bell size={16}/>} color={BRAND.coral} text="Manager Karim did not approve rep Mohamed's W22 plan before Sat 10 AM" sub="Plan was submitted on time — rep protected"/>
      <AlertRow icon={<ShieldAlert size={16}/>} color={BRAND.coral} text="Fake GPS detected for rep Karim Wahid (3 visits)" sub="Visits flagged FAKE in integrity report"/>
      <AlertRow icon={<Clock size={16}/>} color={BRAND.amber} text="Device clock drift +42 min for rep Mohamed Samir" sub="Server time used as source of truth"/>
      <AlertRow icon={<MapPin size={16}/>} color={BRAND.amber} text="8 visits from identical coordinates — Heba Ali" sub="Flagged for route-replay review"/>
    </div>
  );
}

// =====================  SHARED UI  =====================
function MiniKPI({icon,label,value,sub,color}){ return <div className="card" style={{padding:14}}><div style={{display:"flex",alignItems:"center",gap:6,color:"#666",fontSize:12,marginBottom:6}}>{icon}{label}</div><div style={{fontWeight:900,fontSize:24,color}}>{value}</div><div style={{fontSize:11,color:"#999"}}>{sub}</div></div>; }
function BigKPI({icon,label,value,note,color,highlight}){ return <div className="card" style={{padding:18,...(highlight?{borderColor:color,borderWidth:2}:{})}}><div style={{display:"flex",alignItems:"center",gap:8,color:"#666",fontSize:13,marginBottom:8}}><span style={{color}}>{icon}</span>{label}</div><div style={{fontWeight:900,fontSize:30,color}}>{value}</div><div style={{fontSize:11,color:"#999",marginTop:4}}>{note}</div></div>; }
function SessionStat({icon,label,value,ok}){ return <div style={{textAlign:"center"}}><div style={{display:"flex",alignItems:"center",gap:4,color:"#666",fontSize:11,justifyContent:"center"}}>{icon}{label}</div><div style={{fontWeight:900,fontSize:18,color:ok?BRAND.mint:BRAND.coral}}>{value}</div></div>; }
function RuleRow({ok,text,detail}){ return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BRAND.paper}`}}><div style={{display:"flex",alignItems:"center",gap:8}}>{ok?<CheckCircle2 size={18} color={BRAND.mint}/>:<XCircle size={18} color={BRAND.coral}/>}<span style={{fontSize:14,fontWeight:600}}>{text}</span></div><span style={{fontSize:13,color:ok?BRAND.mint:BRAND.coral,fontWeight:700}}>{detail}</span></div>; }
function ClassBar({label,count,total,color,freq}){ return <div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span style={{fontWeight:700}}>{label} <span style={{color:"#999",fontWeight:400}}>· {freq}</span></span><span style={{fontWeight:700}}>{count}</span></div><div className="barTrack"><div style={{width:`${(count/total)*100}%`,height:"100%",background:color}}/></div></div>; }
function AlertRow({icon,color,text,sub}){ return <div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${BRAND.paper}`}}><span style={{color,marginTop:2}}>{icon}</span><div><div style={{fontSize:13,fontWeight:700}}>{text}</div><div style={{fontSize:11.5,color:"#999"}}>{sub}</div></div></div>; }
function Chip({v,bold}){ const c=achColor(v); return <span className="pill" style={{background:`${c}22`,color:c,padding:"4px 10px",fontSize:12,fontWeight:bold?900:700}}>{v.toFixed(0)}%</span>; }
function navBtn(disabled,primary){ return { border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:14,cursor:disabled?"not-allowed":"pointer",background:disabled?BRAND.line:primary?BRAND.deep:"#fff",color:disabled?"#999":primary?"#fff":BRAND.navy,boxShadow:primary&&!disabled?"none":`inset 0 0 0 1px ${BRAND.line}` }; }
