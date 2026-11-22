"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Ellipsis,
  LayoutDashboard,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useUserPrivileges } from "@/utils/userPrivileges";

const Footer = () => {
  const pathname = usePathname();
  const { user } = useUserPrivileges();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAgent = user?.role?.toUpperCase() === "AGENT";

  const primaryItems = isAgent
    ? [
        { label: "Home", path: "/dashboard", icon: LayoutDashboard },
        { label: "Attendance", path: "/attendances", icon: Clock3 },
        { label: "Leave", path: "/leave", icon: CalendarDays },
        { label: "Profile", path: "/profile", icon: UserRound },
      ]
    : [
        { label: "Home", path: "/dashboard", icon: LayoutDashboard },
        { label: "Employees", path: "/hr/employeemanagement", icon: UsersRound },
        { label: "Attendance", path: "/attendances", icon: Clock3 },
        { label: "Office", path: "/officelocation", icon: MapPin },
      ];

  const moreItems = [
    { label: "Leave", path: "/leave", icon: CalendarDays },
    { label: "Attendance summary", path: "/attendancesummary", icon: CalendarDays },
    { label: "Office locations", path: "/officelocation", icon: MapPin },
    { label: "Profile", path: "/profile", icon: UserRound },
  ];
  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.path));

  return (
    <div id="footer" className="!fixed !bottom-[calc(env(safe-area-inset-bottom)+10px)] !left-0 !right-0 !z-50 !flex !h-auto !w-full !items-center !justify-between !border-0 !bg-transparent !px-4 !pb-0 !shadow-none">
      {!isAgent && moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close more navigation"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-[calc(100%+10px)] right-3 z-50 min-w-52 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-1.5 shadow-[0_8px_32px_rgba(16,24,40,0.16)]">
            {moreItems.map(({ label, path, icon: Icon }) => {
              const active = pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active ? "bg-[#E7F3EF] text-[#075E54]" : "text-[#344249] hover:bg-[#F5F7F7]"}`}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <nav aria-label="Mobile navigation" className="mx-auto flex h-[72px] w-full max-w-xl items-center justify-around gap-1 rounded-full border border-white/80 bg-[#EEF1F0]/95 p-1.5 shadow-[0_8px_28px_rgba(25,42,38,0.18)] backdrop-blur-xl">
        {primaryItems.map(({ label, path, icon: Icon }) => {
          const active = pathname === path || (path !== "/dashboard" && pathname.startsWith(`${path}/`));
          return (
            <Link
              key={path}
              href={path}
              aria-current={active ? "page" : undefined}
              className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full text-[#66747A] transition-colors ${active ? "bg-white text-[#075E54] shadow-sm" : "hover:bg-white/60"}`}
            >
              <span className="relative flex h-7 items-center justify-center">
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              </span>
              <span className={`max-w-full truncate text-[10px] leading-3 ${active ? "font-semibold text-[#075E54]" : "font-medium text-[#66747A]"}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {!isAgent && (
          <button
            type="button"
            aria-label="More navigation options"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full transition-colors ${(moreOpen || isMoreActive) ? "bg-white text-[#075E54] shadow-sm" : "text-[#66747A] hover:bg-white/60"}`}
          >
            <span className="flex h-7 items-center justify-center">
              <Ellipsis size={22} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className={`text-[10px] leading-3 ${moreOpen || isMoreActive ? "font-semibold text-[#075E54]" : "font-medium text-[#66747A]"}`}>More</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default Footer;
