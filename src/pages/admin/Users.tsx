import { useEffect, useState, type FormEvent } from "react";
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { getApps, initializeApp } from "firebase/app";
import { Loader2, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { app, db } from "../../lib/firebase";
import { toEmail, useAuth } from "../../context/AuthContext";
import { ROLE_LABEL } from "../../lib/nav";
import type { Role, UserProfile } from "../../lib/types";

// Auth-i duyum: admin bo sakhtani korbari nav az akkaunti khud berun namebarad
function secondaryAuth() {
  const existing = getApps().find((a) => a.name === "secondary");
  return getAuth(existing ?? initializeApp(app.options, "secondary"));
}

function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use") return "Ин логин аллакай мавҷуд аст.";
  if (code === "auth/weak-password") return "Рамз хеле заиф аст (камаш 8 аломат).";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "Иҷозат нест. Қоидаҳои Firestore-ро санҷед.";
  if (code === "auth/network-request-failed") return "Пайвастшавӣ ба интернет нест.";
  return "Хато рух дод. Боз кӯшиш кунед.";
}

const ROLE_ORDER: Record<Role, number> = { admin: 0, director: 1, educator: 2 };

export default function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadErr, setLoadErr] = useState("");

  const [fullName, setFullName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("educator");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snap) => {
          const list = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }));
          list.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName));
          setUsers(list);
        },
        () => setLoadErr("Рӯйхатро хондан имкон нест.")
      ),
    []
  );

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk("");
    const l = login.trim().toLowerCase();
    if (fullName.trim().length < 3) return setErr("Ному насабро пурра нависед.");
    if (!/^[a-z0-9._-]{3,30}$/.test(l)) return setErr("Логин: 3–30 аломат, танҳо ҳарфҳои лотинӣ, рақам, нуқта, зерхат ё тире.");
    if (password.length < 8) return setErr("Рамз бояд камаш 8 аломат бошад.");

    setBusy(true);
    try {
      const sAuth = secondaryAuth();
      const cred = await createUserWithEmailAndPassword(sAuth, toEmail(l), password);
      await signOut(sAuth);
      await setDoc(doc(db, "users", cred.user.uid), {
        role,
        fullName: fullName.trim(),
        login: l,
        active: true,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "activityLogs"), {
        uid: profile?.uid ?? "",
        action: "user.create",
        target: l,
        at: serverTimestamp(),
      });
      setOk(`Аккаунт сохта шуд: ${l}. Логин ва рамзро ба соҳибаш диҳед.`);
      setFullName("");
      setLogin("");
      setPassword("");
    } catch (x) {
      setErr(errorText(x));
    }
    setBusy(false);
  };

  const toggle = async (u: UserProfile) => {
    try {
      await updateDoc(doc(db, "users", u.uid), { active: !u.active });
      await addDoc(collection(db, "activityLogs"), {
        uid: profile?.uid ?? "",
        action: u.active ? "user.deactivate" : "user.activate",
        target: u.login,
        at: serverTimestamp(),
      });
    } catch (x) {
      setErr(errorText(x));
    }
  };

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-white/15 dark:bg-navy-800 dark:text-white";
  const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Корбарон</h2>

      <form onSubmit={create} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <UserPlus size={18} className="text-sky-500" /> Аккаунти нав
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={label}>Ному насаб</label>
            <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className={label}>Нақш</label>
            <select className={input} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="educator">Мураббӣ</option>
              <option value="director">Директор</option>
            </select>
          </div>
          <div>
            <label className={label}>Логин (лотинӣ)</label>
            <input className={input} value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" required />
          </div>
          <div>
            <label className={label}>Рамз (камаш 8 аломат)</label>
            <input className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" required />
          </div>
        </div>

        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
        {ok && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ok}</p>}

        <button disabled={busy} className="mt-5 flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400">
          {busy && <Loader2 className="animate-spin" size={16} />}
          Сохтан
        </button>
      </form>

      <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-navy-900">
        <h3 className="mb-3 font-semibold">Рӯйхат ({users.length})</h3>
        {loadErr && <p className="text-sm text-red-600">{loadErr}</p>}
        <ul className="divide-y divide-slate-100 dark:divide-white/10">
          {users.map((u) => (
            <li key={u.uid} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{u.fullName}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {ROLE_LABEL[u.role]} · {u.login}
                  {!u.active && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-700 dark:bg-red-500/20 dark:text-red-300">баста</span>}
                </div>
              </div>
              {u.uid !== profile?.uid && (
                <button
                  onClick={() => toggle(u)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  {u.active ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                  {u.active ? "Бастан" : "Фаъол кардан"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
