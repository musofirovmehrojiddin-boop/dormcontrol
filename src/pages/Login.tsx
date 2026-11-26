import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const msg = (e as Error)?.message ?? "";
  if (msg === "inactive") return "Аккаунт баста шудааст ё ҳуқуқи дастрасӣ нест.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email")
    return "Логин ё рамз нодуруст аст.";
  if (code === "auth/too-many-requests") return "Кӯшишҳо аз ҳад зиёд. Баъдтар боз кӯшиш кунед.";
  if (code === "auth/network-request-failed") return "Пайвастшавӣ ба интернет нест.";
  return "Хато ҳангоми воридшавӣ. Боз кӯшиш кунед.";
}

export default function Login() {
  const { profile, login } = useAuth();
  const [l, setL] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (profile) return <Navigate to={"/" + profile.role} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(l, p);
    } catch (x) {
      setErr(errorText(x));
    }
    setBusy(false);
  };

  const input =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 dark:border-white/15 dark:bg-navy-800 dark:text-white";

  return (
    <div className="min-h-dvh grid place-items-center bg-gradient-to-br from-navy-900 via-navy-700 to-sky-500 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl dark:bg-navy-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-navy-900 text-sky-300 dark:bg-sky-500 dark:text-white">
            <Building2 size={28} />
          </div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white">DormControl</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Назорати дақиқ — идоракунии осон</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Логин</label>
        <input className={input + " mb-4"} value={l} onChange={(e) => setL(e.target.value)} autoComplete="username" autoCapitalize="none" required />

        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Рамз</label>
        <input className={input} type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required />

        {err && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}

        <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 font-semibold text-white transition hover:bg-navy-700 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400">
          {busy && <Loader2 className="animate-spin" size={18} />}
          Ворид шудан
        </button>
      </form>
    </div>
  );
}
