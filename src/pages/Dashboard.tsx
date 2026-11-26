import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABEL } from "../lib/nav";
import { formatDushanbe } from "../lib/time";

export default function Dashboard() {
  const { profile } = useAuth();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!profile) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-sky-500 p-6 text-white shadow">
        <p className="text-sm text-sky-100">{ROLE_LABEL[profile.role]}</p>
        <h2 className="text-2xl font-bold">Хуш омадед, {profile.fullName}!</h2>
        <p className="mt-3 flex items-center gap-2 text-sm text-sky-100">
          <Clock size={16} /> Вақти Душанбе: {formatDushanbe(now)}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-navy-900">
        <p className="text-slate-600 dark:text-slate-300">
          Система кор мекунад. Бахшҳои боқимонда дар марҳилаҳои оянда илова мешаванд.
        </p>
      </div>
    </div>
  );
}
