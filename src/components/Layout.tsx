import { NavLink, Outlet } from "react-router-dom";
import { Building2, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../lib/useTheme";
import { NAV, ROLE_LABEL } from "../lib/nav";

export default function Layout() {
  const { profile, logout } = useAuth();
  const { dark, toggle } = useTheme();
  if (!profile) return null;

  const items = NAV[profile.role];
  const mobileItems = items.slice(0, 5);
  const to = (slug: string) => (slug ? `/${profile.role}/${slug}` : `/${profile.role}`);

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (kompyuter) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-navy-900 text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Building2 className="text-sky-300" />
          <div>
            <div className="font-bold">DormControl</div>
            <div className="text-xs text-sky-200">{ROLE_LABEL[profile.role]}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((it) => (
            <NavLink
              key={it.slug}
              to={to(it.slug)}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? "bg-sky-500 text-white" : "text-sky-100 hover:bg-white/10"
                }`
              }
            >
              <it.icon size={18} />
              {it.title}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="m-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sky-100 hover:bg-white/10">
          <LogOut size={18} /> Баромадан
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-navy-900/90">
          <div className="min-w-0">
            <div className="truncate font-semibold">{profile.fullName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[profile.role]}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggle} aria-label="Мавзуъ" className="rounded-xl bg-slate-100 p-2.5 dark:bg-white/10">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} aria-label="Баромадан" className="rounded-xl bg-slate-100 p-2.5 md:hidden dark:bg-white/10">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom navigation (telefon) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-slate-200 bg-white md:hidden dark:border-white/10 dark:bg-navy-900"
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, 1fr)` }}
      >
        {mobileItems.map((it) => (
          <NavLink
            key={it.slug}
            to={to(it.slug)}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive ? "text-sky-600 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <it.icon size={20} />
            {it.title}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
