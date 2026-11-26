import { useEffect, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { DoorOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";

type Room = {
  id: string;
  number: string;
  capacity: number;
  floor: number;
  createdAt?: unknown;
};

export default function Rooms() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadErr, setLoadErr] = useState("");

  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [floor, setFloor] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(
    () =>
      onSnapshot(
        collection(db, "rooms"),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Room, "id">) }));
          list.sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number));
          setRooms(list);
        },
        () => setLoadErr("Рӯйхати ҳуҷраҳоро хондан имкон нест.")
      ),
    []
  );

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    const n = number.trim();
    const cap = parseInt(capacity, 10);
    const fl = parseInt(floor, 10);
    if (!/^[0-9A-Za-z-]{1,10}$/.test(n)) return setErr("Рақами ҳуҷра: 1–10 аломат (ҳарф/рақам/тире).");
    if (!Number.isFinite(cap) || cap < 1 || cap > 20) return setErr("Ҷойҳо: аз 1 то 20.");
    if (!Number.isFinite(fl) || fl < 1 || fl > 20) return setErr("Ошёна: аз 1 то 20.");
    if (rooms.some((r) => r.number.toLowerCase() === n.toLowerCase())) return setErr("Ин ҳуҷра аллакай мавҷуд аст.");

    setBusy(true);
    try {
      await addDoc(collection(db, "rooms"), {
        number: n,
        capacity: cap,
        floor: fl,
        occupied: 0,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "activityLogs"), {
        uid: profile?.uid ?? "",
        action: "room.create",
        target: n,
        at: serverTimestamp(),
      });
      setOk(`Ҳуҷраи ${n} илова шуд.`);
      setNumber("");
    } catch {
      setErr("Хато рух дод. Қоидаҳои Firestore-ро санҷед.");
    }
    setBusy(false);
  };

  const remove = async (r: Room) => {
    if (!confirm(`Ҳуҷраи ${r.number}-ро нест кунед?`)) return;
    try {
      await deleteDoc(doc(db, "rooms", r.id));
      await addDoc(collection(db, "activityLogs"), {
        uid: profile?.uid ?? "",
        action: "room.delete",
        target: r.number,
        at: serverTimestamp(),
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
      <h2 className="text-xl font-bold">Ҳуҷраҳо</h2>

      <form onSubmit={create} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Plus size={18} className="text-sky-500" /> Ҳуҷраи нав
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={label}>Рақами ҳуҷра</label>
            <input className={input} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="101" required />
          </div>
          <div>
            <label className={label}>Шумораи ҷойҳо</label>
            <input className={input} type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Ошёна</label>
            <input className={input} type="number" min={1} max={20} value={floor} onChange={(e) => setFloor(e.target.value)} required />
          </div>
        </div>

        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
        {ok && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}

        <button disabled={busy} className="mt-5 flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400">
          {busy && <Loader2 className="animate-spin" size={16} />}
          Илова кардан
        </button>
      </form>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-3 font-semibold">Рӯйхат ({rooms.length})</h3>
        {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}
        {rooms.length === 0 && !loadErr && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Ҳанӯз ҳуҷра нест.</p>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {rooms.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                  <DoorOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">Ҳуҷраи {r.number}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Ошёнаи {r.floor} · {r.capacity} ҷой
                  </div>
                </div>
              </div>
              {profile?.role === "admin" && (
                <button
                  onClick={() => remove(r)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <Trash2 size={16} /> Нест кардан
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
