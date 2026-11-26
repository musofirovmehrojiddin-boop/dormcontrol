import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { GraduationCap, Loader2, Plus, Trash2, Pencil, HeartPulse } from "lucide-react";

type Room = { id: string; number: string; capacity: number; floor: number; occupied: number; };
type Gender = "male" | "female";

type Student = {
  id: string;
  fullName: string;
  phone: string;
  course: number;
  group: string;
  roomId: string;
  roomNumber: string;
  gender: Gender;
  health: string;
  createdAt?: unknown;
};

export default function Students() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadErr, setLoadErr] = useState("");

  // Формаи нав / таҳрир
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("1");
  const [group, setGroup] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [health, setHealth] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Student, "id">) }));
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setStudents(list);
    }, () => setLoadErr("Рӯйхати донишҷӯёнро хондан имкон нест."));

    const unsubRooms = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) }));
      list.sort((a, b) => a.number.localeCompare(b.number));
      setRooms(list);
    }, () => setLoadErr("Рӯйхати ҳуҷраҳоро хондан имкон нест."));

    return () => { unsubStudents(); unsubRooms(); };
  }, []);

  const canEdit = profile?.role === "admin" || profile?.role === "director";
  const availableRooms = rooms.filter((r) => {
    if (editingId) {
      const currentStudent = students.find((s) => s.id === editingId);
      if (currentStudent && currentStudent.roomId === r.id) return true;
    }
    return (r.occupied ?? 0) < r.capacity;
  });

  const resetForm = () => {
    setEditingId(null);
    setFullName(""); setPhone(""); setCourse("1"); setGroup("");
    setGender("male"); setHealth(""); setRoomId("");
    setErr(""); setOk("");
  };

  const startEdit = (s: Student) => {
    setEditingId(s.id);
    setFullName(s.fullName); setPhone(s.phone || ""); setCourse(String(s.course));
    setGroup(s.group || ""); setGender(s.gender || "male"); setHealth(s.health || "");
    setRoomId(s.roomId);
    setErr(""); setOk("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setOk("");
    const n = fullName.trim();
    const p = phone.trim();
    const g = group.trim();
    const c = parseInt(course, 10);
    if (n.length < 3) return setErr("Ному насабро пурра нависед.");
    if (p && !/^\+?[0-9\s-]{7,20}$/.test(p)) return setErr("Рақами телефон дуруст нест.");
    if (!Number.isFinite(c) || c < 1 || c > 6) return setErr("Курс: аз 1 то 6.");
    if (!roomId) return setErr("Ҳуҷраро интихоб кунед.");

    const room = rooms.find((r) => r.id === roomId);
    if (!room) return setErr("Ҳуҷра ёфт нашуд.");

    const prevStudent = editingId ? students.find((s) => s.id === editingId) : null;
    if (prevStudent?.roomId !== roomId) {
      if ((room.occupied ?? 0) >= room.capacity) return setErr("Ин ҳуҷра пур аст.");
    }

    setBusy(true);
    try {
      const data = {
        fullName: n, phone: p, course: c, group: g, gender,
        health: health.trim(), roomId: room.id, roomNumber: room.number,
      };

      if (editingId && prevStudent) {
        await updateDoc(doc(db, "students", editingId), data);
        if (prevStudent.roomId !== roomId) {
          await updateDoc(doc(db, "rooms", prevStudent.roomId), { occupied: increment(-1) });
          await updateDoc(doc(db, "rooms", roomId), { occupied: increment(1) });
        }
        await addDoc(collection(db, "activityLogs"), {
          uid: profile?.uid ?? "", action: "student.update", target: n, at: serverTimestamp(),
        });
        setOk(`Донишҷӯ ${n} навсозӣ шуд.`);
      } else {
        await addDoc(collection(db, "students"), { ...data, createdAt: serverTimestamp() });
        await updateDoc(doc(db, "rooms", roomId), { occupied: increment(1) });
        await addDoc(collection(db, "activityLogs"), {
          uid: profile?.uid ?? "", action: "student.create", target: n, at: serverTimestamp(),
        });
        setOk(`Донишҷӯ ${n} илова шуд.`);
      }
      resetForm();
    } catch (x) {
      console.error(x);
      setErr("Хато рух дод. Қоидаҳои Firestore-ро санҷед.");
    }
    setBusy(false);
  };

  const remove = async (s: Student) => {
    if (!confirm(`Донишҷӯи «${s.fullName}»-ро нест кунед?`)) return;
    try {
      await deleteDoc(doc(db, "students", s.id));
      const room = rooms.find((r) => r.id === s.roomId);
      if (room && (room.occupied ?? 0) > 0) {
        await updateDoc(doc(db, "rooms", room.id), { occupied: increment(-1) });
      }
      await addDoc(collection(db, "activityLogs"), {
        uid: profile?.uid ?? "", action: "student.delete", target: s.fullName, at: serverTimestamp(),
      });
    } catch {
      setErr("Нест кардан имкон надод.");
    }
  };

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-white/15 dark:bg-navy-800 dark:text-white";
  const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Донишҷӯён</h2>

      {canEdit && (
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            {editingId ? <Pencil size={18} className="text-sky-500" /> : <Plus size={18} className="text-sky-500" />}
            {editingId ? "Таҳрири донишҷӯ" : "Донишҷӯи нав"}
          </h3>

          {availableRooms.length === 0 && !editingId && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Ҳуҷраи холӣ нест. Аввал ҳуҷра илова кунед (ё ҷойро зиёд кунед).
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={label}>Ному насаб</label>
              <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className={label}>Телефон (ихтиёрӣ)</label>
              <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 90 000 00 00" />
            </div>
            <div>
              <label className={label}>Ҷинс</label>
              <select className={input} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="male">Мард</option>
                <option value="female">Зан</option>
              </select>
            </div>
            <div>
              <label className={label}>Курс</label>
              <select className={input} value={course} onChange={(e) => setCourse(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => (<option key={n} value={n}>Курси {n}</option>))}
              </select>
            </div>
            <div>
              <label className={label}>Гурӯҳ (ихтиёрӣ)</label>
              <input className={input} value={group} onChange={(e) => setGroup(e.target.value)} placeholder="масалан 101-А" />
            </div>
            <div>
              <label className={label}>Ҳуҷра (танҳо бо ҷои холӣ)</label>
              <select className={input} value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
                <option value="">— Интихоб кунед —</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Ҳуҷраи {r.number} · Ошёнаи {r.floor} · {r.capacity - (r.occupied ?? 0)} ҷои холӣ
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={label}>Вазъи саломатӣ (ихтиёрӣ)</label>
              <textarea className={`${input} min-h-[80px]`} value={health} onChange={(e) => setHealth(e.target.value)} placeholder="Масалан: Аллергия ба ғизо... ё холӣ гузоред" />
            </div>
          </div>

          {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
          {ok && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" disabled={busy || (!editingId && availableRooms.length === 0)} className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400">
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
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-3 font-semibold">Рӯйхат ({students.length})</h3>
        {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}
        {students.length === 0 && !loadErr && <p className="text-sm text-slate-500 dark:text-slate-400">Ҳанӯз донишҷӯ нест.</p>}
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.fullName}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {s.gender === "female" ? "Зан" : "Мард"} · Курси {s.course}
                    {s.group ? ` · ${s.group}` : ""} · Ҳуҷраи {s.roomNumber}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </div>
                  {s.health && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-300">
                      <HeartPulse size={12} /> {s.health}
                    </div>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => startEdit(s)} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20">
                    <Pencil size={16} /> Таҳрир
                  </button>
                  <button onClick={() => remove(s)} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20">
                    <Trash2 size={16} /> Нест кардан
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
