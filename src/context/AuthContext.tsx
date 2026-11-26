import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import type { UserProfile } from "../lib/types";

interface AuthValue {
  profile: UserProfile | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue>(null!);
export const useAuth = () => useContext(AuthCtx);

// Login "admin" -> admin@dormcontrol.app (pochtai voqei lozim nest)
export function toEmail(login: string) {
  const v = login.trim().toLowerCase();
  return v.includes("@") ? v : v + "@dormcontrol.app";
}

async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  const d = snap.data();
  if (!snap.exists() || !d || d.active !== true) return null;
  return { uid, role: d.role, fullName: d.fullName, login: d.login, active: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          setProfile(null);
          setLoading(false);
          return;
        }
        try {
          setProfile(await loadProfile(u.uid));
        } catch {
          setProfile(null);
        }
        setLoading(false);
      }),
    []
  );

  const login = async (l: string, p: string) => {
    const cred = await signInWithEmailAndPassword(auth, toEmail(l), p);
    const prof = await loadProfile(cred.user.uid);
    if (!prof) {
      await signOut(auth);
      throw new Error("inactive");
    }
    setProfile(prof);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return <AuthCtx.Provider value={{ profile, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
