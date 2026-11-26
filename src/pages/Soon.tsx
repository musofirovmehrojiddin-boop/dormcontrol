import { useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NAV } from "../lib/nav";

export default function Soon() {
  const { page } = useParams();
  const { profile } = useAuth();
  const title = profile ? NAV[profile.role].find((i) => i.slug === page)?.title : "";
  return (
    <div className="grid place-items-center rounded-2xl bg-white p-10 text-center shadow-sm dark:bg-navy-900">
      <Construction className="mb-3 text-sky-500" size={36} />
      <h2 className="text-xl font-semibold">{title || "Саҳифа"}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ин саҳифа дар марҳилаҳои оянда сохта мешавад.</p>
    </div>
  );
}
