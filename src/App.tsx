import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useTheme } from "./lib/useTheme";
import type { Role } from "./lib/types";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Soon from "./pages/Soon";
import UsersPage from "./pages/admin/Users";
import RoomsPage from "./pages/admin/Rooms";
import StudentsPage from "./pages/admin/Students";
import AttendancePage from "./pages/Attendance";
import DutyPage from "./pages/Duty";

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="animate-spin text-sky-500" size={32} />
    </div>
  );
}

function Home() {
  const { profile, loading } = useAuth();
  if (loading) return <Splash />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={"/" + profile.role} replace />;
}

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Splash />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== role) return <Navigate to={"/" + profile.role} replace />;
  return <>{children}</>;
}

const ROLES: Role[] = ["admin", "director", "educator"];

export default function App() {
  useTheme();
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          {ROLES.map((r) => (
            <Route key={r} path={"/" + r} element={<Guard role={r}><Layout /></Guard>}>
              <Route index element={<Dashboard />} />
              {(r === "admin" || r === "director") && <Route path="users" element={<UsersPage />} />}
              {(r === "admin" || r === "director") && <Route path="rooms" element={<RoomsPage />} />}
              <Route path="students" element={<StudentsPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="duty" element={<DutyPage />} />
              <Route path=":page" element={<Soon />} />
            </Route>
          ))}
          <Route path="*" element={<Home />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
