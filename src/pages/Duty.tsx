import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { Calendar, Loader2, Plus, Trash2, Pencil, Download, Printer, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

type UserProfile = { uid: string; fullName: string; role: string; };
type Duty = {
  id: string;
  day: string;
  users: { uid: string; name: string }[];
  task: string;
};

const DAYS = [
  { id: "mon", label: "Душанбе", jsDay: 1 },
  { id: "tue", label: "Сешанбе", jsDay: 2 },
  { id: "wed", label: "Чоршанбе", jsDay: 3 },
  { id: "thu", label: "Панҷшанбе", jsDay: 4 },
  { id: "fri", label: "Ҷумъа", jsDay: 5 },
  { id: "sat", label: "Шанбе", jsDay: 6 },
  { id: "sun", label: "Якшанбе", jsDay: 0 },
];

const MONTHS = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];

export default function Duty() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loadErr, setLoadErr] = useState("");

  // Моҳ ва сол
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

  // Форма
  const [editingId, setEditingId] = useState<string | null>(null);
  const [day, setDay] = useState("mon");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const scheduleRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }))
        .filter((u) => u.role === "educator" || u.role === "director");
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setUsers(list);
    }, () => setLoadErr("Рӯйхати корбаронро хондан имкон нест."));

    const unsubDuties = onSnapshot(collection(db, "duties"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Duty, "id">) }));
      setDuties(list);
    }, () => setLoadErr("Ҷадвалро хондан имкон нест."));

    return () => { unsubUsers(); unsubDuties(); };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setDay("mon");
    setSelectedUsers([]);
    setTask("");
    setErr(""); setOk("");
  };

  const startEdit = (d: Duty) => {
    setEditingId(d.id);
    setDay(d.day);
    setSelectedUsers(d.users.map((u) => u.uid));
    setTask(d.task);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");
    if (!task.trim()) return setErr("Вазифаро нависед.");
    if (selectedUsers.length === 0) return setErr("Ақалан як мураббиро интихоб кунед.");

    const selectedUserData = selectedUsers.map((uid) => {
      const u = users.find((x) => x.uid === uid);
      return { uid, name: u?.fullName || "" };
    });

    setBusy(true);
    try {
      const data = { day, users: selectedUserData, task: task.trim() };
      
      if (editingId) {
        await updateDoc(doc(db, "duties", editingId), data);
        setOk("Ҷадвал таҳрир шуд.");
      } else {
        const existing = duties.find((d) => d.day === day);
        if (existing) await deleteDoc(doc(db, "duties", existing.id));
        await addDoc(collection(db, "duties"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: profile?.uid ?? "",
        });
        setOk(`Ҷадвали рӯзи ${DAYS.find(d => d.id === day)?.label} сабт шуд.`);
      }
      resetForm();
    } catch (x) {
      console.error(x);
      setErr("Хато рух дод. Қоидаҳоро санҷед.");
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Ин ҷадвалро нест кунед?")) return;
    try {
      await deleteDoc(doc(db, "duties", id));
    } catch {
      setErr("Нест кардан имкон надод.");
    }
  };

  // Функсияҳои моҳ
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Сохтани рӯзҳои моҳ
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month - 1, i);
    const jsDay = date.getDay();
    const dayConfig = DAYS.find((d) => d.jsDay === jsDay);
    const duty = dayConfig ? duties.find((d) => d.day === dayConfig.id) : null;
    monthDays.push({ date: i, dayName: dayConfig?.label, duty });
  }

  // Сабти расм
  const downloadImage = async () => {
    if (!scheduleRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(scheduleRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
      });
      const link = document.createElement("a");
      link.download = `jadval_${MONTHS[month - 1]}_${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
      alert("Хато ҳангоми сохтани расм.");
    }
    setDownloading(false);
  };

  // Сабти PDF
  const downloadPDF = async () => {
    if (!scheduleRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(scheduleRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff'
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`jadval_${MONTHS[month - 1]}_${year}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Хато ҳангоми сохтани PDF.");
    }
    setDownloading(false);
  };

  // Чоп
  const printSchedule = () => {
    if (!scheduleRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Ҷадвали моҳона</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: white; color: black; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .card { border: 1px solid #ccc; padding: 10px; border-radius: 8px; }
            .date { font-weight: bold; font-size: 1.2em; display: flex; justify-content: space-between; }
            .task { color: #0369a1; font-weight: 500; margin-top: 5px; }
            .users { color: #059669; font-size: 0.9em; margin-top: 2px; }
            h1 { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>Ҷадвали навбатдорӣ — ${MONTHS[month - 1]} ${year}</h1>
          <div class="grid">
            ${monthDays.map(md => `
              <div class="card">
                <div class="date"><span>${md.date}</span><span style="font-size: 0.8em; color: #666;">${md.dayName}</span></div>
                ${md.duty ? `
                  <div class="task">${md.duty.task}</div>
                  <div class="users">${md.duty.users.map(u => u.name).join(", ")}</div>
                ` : `<div class="users">—</div>`}
              </div>
            `).join("")}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const input = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-white/15 dark:bg-navy-800 dark:text-white";
  const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Навбатдорӣ</h2>
        
        {/* Тугмаҳои моҳ */}
        <div className="flex items-center gap-2 bg-white dark:bg-navy-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-white/10">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"><ChevronLeft size={20} /></button>
          <div className="font-semibold min-w-[120px] text-center">{MONTHS[month - 1]} {year}</div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition"><ChevronRight size={20} /></button>
        </div>
      </div>

      {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}

      <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          {editingId ? <Pencil size={18} className="text-sky-500" /> : <Plus size={18} className="text-sky-500" />}
          {editingId ? "Таҳрири ҷадвал" : "Илова кардани ҷадвал"}
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={label}>Рӯз</label>
            <select className={input} value={day} onChange={(e) => setDay(e.target.value)}>
              {DAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Вазифа</label>
            <input className={input} value={task} onChange={(e) => setTask(e.target.value)} placeholder="Масалан: Уборка" required />
          </div>
        </div>

        <div className="mt-4">
          <label className={label}>Мураббиён (якчандро интихоб кунед)</label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 mt-2">
            {users.map((u) => (
              <label key={u.uid} className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition ${selectedUsers.includes(u.uid) ? "border-sky-500 bg-sky-50 dark:bg-sky-500/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-navy-800 dark:hover:bg-white/5"}`}>
                <input type="checkbox" checked={selectedUsers.includes(u.uid)} onChange={() => toggleUser(u.uid)} className="size-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500" />
                <span className="text-sm font-medium">{u.fullName}</span>
              </label>
            ))}
          </div>
        </div>

        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
        {ok && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}

        <div className="mt-5 flex gap-2">
          <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400">
            {busy && <Loader2 className="animate-spin" size={16} />}
            {editingId ? "Нигоҳ доштан" : "Илова кардан"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold text-slate-800 hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
              Бекор кардан
            </button>
          )}
        </div>
      </form>

      {/* Ҷадвали зебои моҳона дар шакли карточкаҳо */}
      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Ҷадвали моҳона — {MONTHS[month - 1]} {year}</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={printSchedule} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20">
              <Printer size={16} /> Чоп
            </button>
            <button onClick={downloadPDF} disabled={downloading} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20">
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PDF
            </button>
            <button onClick={downloadImage} disabled={downloading} className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20">
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />} Расм
            </button>
          </div>
        </div>

        <div ref={scheduleRef} className="p-4 bg-white dark:bg-navy-900">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {monthDays.map((md) => (
              <div key={md.date} className={`rounded-xl border p-3 ${md.duty ? "border-sky-200 bg-sky-50/50 dark:border-sky-500/20 dark:bg-sky-500/5" : "border-slate-200 dark:border-white/10"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold">{md.date}</span>
                  <span className="text-xs text-slate-500">{md.dayName}</span>
                </div>
                {md.duty ? (
                  <div className="text-xs space-y-1">
                    <div className="font-medium text-sky-700 dark:text-sky-300">{md.duty.task}</div>
                    <div className="text-emerald-600 dark:text-emerald-400">{md.duty.users.map(u => u.name).join(", ")}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">—</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
