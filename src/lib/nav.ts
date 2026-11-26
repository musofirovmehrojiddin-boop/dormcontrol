import {
  ArrowLeftRight, CalendarClock, ClipboardCheck, DoorOpen, FileText,
  GraduationCap, History, LayoutDashboard, Users, type LucideIcon,
} from "lucide-react";
import type { Role } from "./types";

export interface NavItem { slug: string; title: string; icon: LucideIcon }

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  director: "Директор",
  educator: "Мураббӣ",
};

export const NAV: Record<Role, NavItem[]> = {
  admin: [
    { slug: "", title: "Асосӣ", icon: LayoutDashboard },
    { slug: "users", title: "Корбарон", icon: Users },
    { slug: "students", title: "Донишҷӯён", icon: GraduationCap },
    { slug: "rooms", title: "Ҳуҷраҳо", icon: DoorOpen },
    { slug: "duty", title: "Навбатдорӣ", icon: CalendarClock },
    { slug: "reports", title: "Ҳисоботҳо", icon: FileText },
    { slug: "log", title: "Таърих", icon: History },
  ],
  director: [
    { slug: "", title: "Асосӣ", icon: LayoutDashboard },
    { slug: "duty", title: "Навбатдорӣ", icon: CalendarClock },
    { slug: "reports", title: "Ҳисоботҳо", icon: FileText },
    { slug: "students", title: "Донишҷӯён", icon: GraduationCap },
  ],
  educator: [
    { slug: "", title: "Асосӣ", icon: LayoutDashboard },
    { slug: "attendance", title: "Ҳозиршавӣ", icon: ClipboardCheck },
    { slug: "handover", title: "Навбат", icon: ArrowLeftRight },
    { slug: "students", title: "Донишҷӯён", icon: GraduationCap },
  ],
};
