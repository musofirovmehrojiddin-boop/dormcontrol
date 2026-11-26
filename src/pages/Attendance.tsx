import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { CalendarDays, CheckCircle2, XCircle, HeartPulse, Loader2 } from "lucide-react";

type Student = { id: string; fullName: string; roomNumber: string; group?: string; };
type Status = "present" | "absent" | "sick";
type RecordData = { status: Status; updatedAt?: unknown; updatedBy?: string };

export default function Attendance() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Рӯйхати донишҷӯён
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setStudents(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Қайдҳои ин рӯз
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "attendance"), (snap) => {
      const map: Record<string, Status> = {};
      snap.forEach((d) => {
        const data = d.data() as RecordData & { date: string; studentId: string };
        if (data.date === date) {
          map[data.studentId] = data.status;
        }
      });
      setRecords(map);
      setLoading(false);
    });
    return unsub;
  }, [date]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, sick = 0;
    Object.values(records).forEach((s) => {
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "sick") sick++;
    });
    return { present, absent, sick };
  }, [records]);

  const setStatus = async (studentId: string, status: Status) => {
    setSavingId(studentId);
    const docId = `${date}_${studentId}`;
    try {
      await setDoc(doc(db, "attendance", docId), {
        date,
        studentId,
        status,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.uid ?? "",
      });
    } catch (e) {
      console.error(e);
      alert("Хато ҳангоми сабт.");
    }
    setSavingId(null);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Ҳозиршавӣ</h2>
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-slate-500" />
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-white/15 dark:bg-navy-800 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <div className="text-xs font-medium uppercase">Ҳозир</div>
          <div className="mt-1 text-2xl font-bold">{stats.present}</div>
        </div>
        <div className="rounded-2xl bg-red-50 p-4 text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <div className="text-xs font-medium uppercase">Ғоиб</div>
          <div className="mt-1 text-2xl font-bold">{stats.absent}</div>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <div className="text-xs font-medium uppercase">Бемор</div>
          <div className="mt-1 text-2xl font-bold">{stats.sick}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        {loading && students.length === 0 ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="animate-spin text-sky-500" size={28} />
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Ҳанӯз донишҷӯ нест.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {students.map((s) => {
              const st = records[s.id];
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.fullName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Ҳуҷраи {s.roomNumber}{s.group ? ` · ${s.group}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {savingId === s.id && <Loader2 className="animate-spin text-sky-500" size={16} />}
                    <button
                      onClick={() => setStatus(s.id, "present")}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        st === "present"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-emerald-100 dark:bg-white/10 dark:text-white dark:hover:bg-emerald-500/20"
                      }`}
                    >
                      <CheckCircle2 size={16} /> Ҳозир
                    </button>
                    <button
                      onClick={() => setStatus(s.id, "absent")}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        st === "absent"
                          ? "bg-red-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-red-100 dark:bg-white/10 dark:text-white dark:hover:bg-red-500/20"
                      }`}
                    >
                      <XCircle size={16} /> Ғоиб
                    </button>
                    <button
                      onClick={() => setStatus(s.id, "sick")}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        st === "sick"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 dark:bg-white/10 dark:text-white dark:hover:bg-amber-500/20"
                      }`}
                    >
                      <HeartPulse size={16} /> Бемор
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
