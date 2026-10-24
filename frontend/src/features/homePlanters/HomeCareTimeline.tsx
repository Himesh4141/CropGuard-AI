import { useState } from "react";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { screenText as tr } from "@/i18n/screenText";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { CalendarCheck, Leaf, Trash2, CheckCircle2 } from "lucide-react";

type TaskType = "water" | "fertilize" | "spray" | "repot" | "rescan";
type Task = { id: string; plant: string; type: TaskType; createdAt: string; dueAt: string; completedAt: string | null };
const STORAGE = "cropguard:home-plant-care-journal:v1";
const TYPES: Record<TaskType,{label:string;days:number}> = {
  water:{label:"Watering check",days:3}, fertilize:{label:"Fertilizer review",days:14},
  spray:{label:"Treatment follow-up",days:7}, repot:{label:"Repotting check",days:60}, rescan:{label:"Recovery photo",days:5},
};
function load():Task[] {
  try { const obj: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
    if(!Array.isArray(obj))return [];
    return obj.filter((x):x is Task => Boolean(x) && typeof x === "object" && typeof x.id === "string" && typeof x.plant === "string" && typeof x.dueAt === "string" && x.type in TYPES).slice(0,60);
  } catch { return []; }
}
function persist(tasks:Task[]):boolean { try {localStorage.setItem(STORAGE,JSON.stringify(tasks.slice(0,60))); return true;} catch {return false;} }
function dueIn(days:number) { const d = new Date(); d.setDate(d.getDate()+days); return d; }
function notificationId(id:string):number { let h=307; for(const c of id)h=(h*31+c.charCodeAt(0))|0; return 900000000+(Math.abs(h)%90000000); }

export function HomeCareTimeline(){
  const lang = useCropGuardLanguage();
  const [tasks,setTasks]=useState<Task[]>(load);
  const [plant,setPlant]=useState("Rose");
  const [type,setType]=useState<TaskType>("rescan");
  const [notice,setNotice]=useState("");
  const [notifications,setNotifications]=useState(false);
  const update=(next:Task[])=>{setTasks(next);return persist(next);};
  const create=async()=>{
    const name=plant.trim().slice(0,70);
    if(!name){setNotice(tr("Enter the plant's name first.", lang));return;}
    const id=typeof crypto!=="undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const task:Task={id,plant:name,type,createdAt:new Date().toISOString(),dueAt:dueIn(TYPES[type].days).toISOString(),completedAt:null};
    const saved=update([task,...tasks].slice(0,60));
    if(!saved){setNotice(tr("Storage is unavailable. This reminder will disappear when you close the app.", lang));return;}
    setNotice(tr("Saved on this device. It is not synced to the cloud.", lang));
    if(notifications && Capacitor.isNativePlatform()){
      try {const permission=await LocalNotifications.requestPermissions();
        if(permission.display !== "granted"){setNotice(tr("Reminder saved; Android notification permission was not granted.", lang));return;}
        await LocalNotifications.schedule({notifications:[{id:notificationId(id),title:`CropGuard: ${name}`,body:`${tr(TYPES[type].label, lang)} ${tr("is due. Check the plant before taking action.", lang)}`,schedule:{at:new Date(task.dueAt)}}]});
        setNotice(tr("Reminder saved locally and Android notification scheduled.", lang));
      } catch {setNotice(tr("Reminder saved; Android notification scheduling was unavailable.", lang));}
    }
  };
  const finish=(id:string)=>update(tasks.map(x=>x.id===id?{...x,completedAt:x.completedAt?null:new Date().toISOString()}:x));
  const clear=()=>{if(!window.confirm(tr("Delete all Home Planters care reminders saved on this device?", lang)))return;update([]);setNotice(tr("Local journal deleted.", lang));};
  return <section className="hp-panel cg-care-journal" aria-labelledby="cg-care-title">
    <header className="cg-care-title"><Leaf size={20}/><h2 id="cg-care-title">{tr("My plant care timeline", lang)}</h2></header>
    <p>{tr("Track care and recovery, even offline. Reminders are general follow-ups, not instructions to spray chemicals automatically.", lang)}</p>
    <div className="cg-care-fields"><label>{tr("Plant name", lang)} <input value={plant} maxLength={70} onChange={e=>setPlant(e.target.value)} placeholder={tr("e.g. Rose, Tulsi, Money Plant", lang)}/></label>
      <label>{tr("Care task", lang)} <select value={type} onChange={e=>setType(e.target.value as TaskType)}>{(Object.entries(TYPES) as [TaskType,{label:string;days:number}][]).map(([id,v])=><option key={id} value={id}>{tr(v.label, lang)} · {v.days} {tr("days", lang)}</option>)}</select></label>
    </div>
    {Capacitor.isNativePlatform()?<label className="cg-care-permission"><input type="checkbox" checked={notifications} onChange={e=>setNotifications(e.target.checked)}/> {tr("Ask permission to schedule a local Android notification", lang)}</label>:<p className="cg-care-hint">{tr("Browser reminders remain in the journal; Android notifications are available in the installed APK with permission.", lang)}</p>}
    <button className="button primary" type="button" onClick={()=>void create()}><CalendarCheck size={17}/> {tr("Add care reminder", lang)}</button>
    {notice?<p role="status">{notice}</p>:null}
    {!tasks.length?<p>{tr("No care reminders yet. Create one to start a plant's recovery timeline.", lang)}</p>:<ul className="cg-care-tasks">{tasks.map(t=><li key={t.id}><div><strong>{t.plant}</strong> — {tr(TYPES[t.type].label, lang)}<small>{tr("Due", lang)} {new Date(t.dueAt).toLocaleDateString(lang === "en" ? "en-IN" : lang === "hi" ? "hi-IN" : "te-IN")} · {t.completedAt?tr("Completed", lang):tr("Pending", lang)}</small></div><button type="button" onClick={()=>finish(t.id)} aria-label={t.completedAt?`${tr("Reopen reminder for", lang)} ${t.plant}`:`${tr("Mark care done for", lang)} ${t.plant}`}><CheckCircle2 size={18}/> {t.completedAt?tr("Undo", lang):tr("Done", lang)}</button></li>)}</ul>}
    {tasks.length>0?<button className="button secondary" type="button" onClick={clear}><Trash2 size={16}/> {tr("Delete local journal", lang)}</button>:null}
    <small>{tr("All entries stay on this device. They contain no photos, farm linkage or server account data.", lang)}</small>
  </section>;
}
