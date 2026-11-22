
"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/utils/AuthProvider";

const Header = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pictureUnavailable, setPictureUnavailable] = useState(false);
  const [organizationName, setOrganizationName] = useState(user?.organization?.name || "Your Organization");
  const router = useRouter();

  const profilePictureSrc = user?.profilePictureUrl
    ? `/api/organization-image?url=${encodeURIComponent(user.profilePictureUrl)}`
    : "";



  const userInitials =
    user?.email
      ?.split("@")[0]
      ?.split(" ")
      .map((n: string) => n[0]?.toUpperCase())
      .join("") || "U";

  useEffect(() => {
    setPictureUnavailable(false);
  }, [profilePictureSrc]);

  useEffect(() => {
    setOrganizationName(user?.organization?.name || "Your Organization");
    if (!user?.token) return;

    const controller = new AbortController();
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
    const apiBase = baseUrl.endsWith("/api/v1") ? baseUrl : `${baseUrl}/api/v1`;

    fetch(`${apiBase}/organizations/me`, {
      headers: { Authorization: `Bearer ${user.token}` },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((response) => {
        const name = response?.data?.organization?.name ?? response?.organization?.name;
        if (typeof name === "string" && name.trim()) setOrganizationName(name);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Unable to load organization name:", error);
        }
      });

    return () => controller.abort();
  }, [user?.token, user?.organization?.name]);

  return (
    <div id="header" className="!flex !justify-between !items-center relative">
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-3">
        <img src="/punchly-icon.svg" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-[#263238]">Punchly</p>
          <p className="truncate text-xs leading-tight text-[#66747A]" title={organizationName}>{organizationName}</p>
        </div>
      </div>

      <div className="relative ml-auto flex items-center gap-[20px]">


        <button
          type="button"
          aria-label="Open profile menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-[10px] bg-transparent text-left cursor-pointer"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <div className="w-[40px] h-[40px] bg-[#F2F4F7] border border-[#E5E7EB] rounded-full box-border flex items-center justify-center text-[#344249] font-semibold text-sm overflow-hidden">
            {profilePictureSrc && !pictureUnavailable ? (
              <img
                src={profilePictureSrc}
                alt="Profile picture"
                className="h-full w-full object-cover"
                onError={() => setPictureUnavailable(true)}
              />
            ) : userInitials}
          </div>

          <div>
            <h3 className="font-medium text-[14px] leading-[150%] text-[#344249]">
            {user?.fullName || "??"}
            </h3>
            <p className="font-normal text-[12px] leading-[150%] text-[#344249]">
              {user?.role || "??"}
            </p>
          </div>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div role="menu" className="fixed right-4 top-[72px] z-[70] w-[min(280px,calc(100vw-2rem))] border border-gray-200 bg-white shadow-lg md:absolute md:right-0 md:top-[60px] md:z-50">
            <div className="absolute top-[-6px] right-5 w-3 h-3 bg-white rotate-45 border-t border-l border-gray-200"></div>
            <div className="p-4 flex flex-col gap-2">
              <div>
                <p className="text-sm text-gray-700 mb-0.5">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <hr className="border-gray-100 my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/profile");
                }}
                className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-center cursor-pointer font-medium rounded-none"
              >
                Profile Settings
              </button>
              <button
                onClick={async () => {
                  signOut();
                  setMenuOpen(false);
                  router.push("/");
                }}
                className="w-full px-4 py-2 text-sm text-white !bg-[#36474F]   hover:bg-[#263238] rounded-none text-center cursor-pointer font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
