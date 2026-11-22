"use client";
import Image from "next/image";
import dashboard from "../public/DashboardIcon/darhboard.svg";
import employee from "../public/DashboardIcon/employee.svg";
import employeeWhite from "../public/DashboardIcon/employeeWhite.svg";
import time from "../public/DashboardIcon/time.svg";
import timeWhite from "../public/DashboardIcon/timeWhite.svg";
import filedock from "../public/DashboardIcon/File_dock_light.svg";
import dashboardWhite from "../public/DashboardIcon/dashboardWhite.svg";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUserPrivileges } from "@/utils/userPrivileges";

const getOrganizationImageSrc = (imageUrl: string) => {
  return `/api/organization-image?url=${encodeURIComponent(imageUrl)}`;
};

const SideNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useUserPrivileges();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [organization, setOrganization] = useState<{ name: string; bannerUrl: string | null }>({
    name: user?.organization?.name ?? "Your Organization",
    bannerUrl: user?.organization?.bannerUrl ?? null,
  });
  const [bannerUnavailable, setBannerUnavailable] = useState(false);

  useEffect(() => {
    setBannerUnavailable(false);
  }, [organization.bannerUrl]);

  useEffect(() => {
    if (!user?.token) {
      setOrganization({ name: "Your Organization", bannerUrl: null });
      return;
    }
    if (user.organization) {
      setOrganization({
        name: user.organization.name || "Your Organization",
        bannerUrl: user.organization.bannerUrl || null,
      });
    }

    const controller = new AbortController();
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
    const apiBase = baseUrl.endsWith("/api/v1") ? baseUrl : `${baseUrl}/api/v1`;

    fetch(`${apiBase}/organizations/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((response) => {
        const org = response?.data?.organization ?? response?.organization;
        if (!org) return;
        setOrganization({
          name: typeof org.name === "string" && org.name ? org.name : "Your Organization",
          bannerUrl: typeof org.bannerUrl === "string" && org.bannerUrl ? org.bannerUrl : null,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Unable to load organization details:", error);
      });

    return () => controller.abort();
  }, [user?.token, user?.organization?.name, user?.organization?.bannerUrl]);

  const userRole = user?.role?.toUpperCase();

  const menuItems = userRole === "AGENT"
    ? [
        { label: "Dashboard", icon: dashboard, iconWhite: dashboardWhite, path: "/dashboard" },
        { label: "My Attendance", icon: time, iconWhite: timeWhite, path: "/attendances" },
        { label: "My Leave", icon: filedock, iconWhite: filedock, path: "/leave" },
        { label: "My Profile", icon: employee, iconWhite: employeeWhite, path: "/profile" },
      ]
    : [
        { label: "Dashboard", icon: dashboard, iconWhite: dashboardWhite, path: "/dashboard" },
        { label: "Employee", icon: employee, iconWhite: employeeWhite, path: "/hr/employeemanagement" },
        { label: "Attendance", icon: time, iconWhite: timeWhite, path: "/attendances" },
        { label: "Summary", icon: time, iconWhite: timeWhite, path: "/attendancesummary" },
        { label: "Office Location", icon: employee, iconWhite: employeeWhite, path: "/officelocation" },
        { label: "Leave", icon: filedock, iconWhite: filedock, path: "/leave" },
        { label: "Profile", icon: employee, iconWhite: employeeWhite, path: "/profile" },
      ];

  return (
    <div id="side-nav" className="!flex !flex-col !h-full !bg-[#263238]">
      <div className="mb-5 w-full border-b border-white/10 px-3 pb-4 pt-3">
        <div className="relative h-[132px] w-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#53666D_0%,#36474F_48%,#263238_100%)] shadow-inner">
          {organization.bannerUrl && !bannerUnavailable && (
            <img
              src={getOrganizationImageSrc(organization.bannerUrl)}
              alt={`${organization.name} banner`}
              className="absolute inset-0 h-full w-full scale-105 object-cover blur-[3px] md:scale-100 md:blur-none"
              onError={() => setBannerUnavailable(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10191d]/90 via-[#10191d]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/75">Workspace</p>
            <h1 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.45)]" title={organization.name}>
              {organization.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-[10px] px-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const isHovered = hoveredItem === item.label;

          return (
            <Link
              key={item.label}
              href={item.path}
              className={`flex items-center gap-[10px] px-3 py-[8px] p-[10px] cursor-pointer transition-all 
                ${isActive || isHovered ? "bg-[#46555B]" : "hover:bg-[#36454B]"}`}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Image
                src={item.iconWhite}
                alt={item.label}
                width={24}
                height={24}
              />
              <p
                className={`font-medium text-[14px] leading-[150%] 
                  ${isActive || isHovered ? "text-[#fff]" : "text-[#DCE4E6]"}`}
              >
                {item.label}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SideNav;
