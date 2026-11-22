"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { useAuth } from "@/app/utils/AuthProvider";

export const LIVE_ATTENDANCE_EVENT = "attendly:live-attendance";
export const LIVE_ATTENDANCE_STORAGE_KEY = "attendly_live_attendance";

type GeofenceEvent = {
  userId?: string;
  agentId?: string;
  attendanceId?: string;
  userName?: string;
  message?: string;
  at?: string;
  outsideDurationMs?: number;
};

const getSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
};

export default function AttendanceSocketNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    const role = user?.role?.toUpperCase();
    if (!user?.token || (role !== "ADMIN" && role !== "SUPER_ADMIN")) return;

    const socket = io(getSocketUrl(), { auth: { token: user.token } });
    const update = (type: string, payload: GeofenceEvent) => {
      const agentId = payload.userId ?? payload.agentId;
      if (agentId && typeof window !== "undefined") {
        let paused: Record<string, GeofenceEvent & { isPaused: boolean }> = {};
        try {
          paused = JSON.parse(window.localStorage.getItem(LIVE_ATTENDANCE_STORAGE_KEY) ?? "{}");
        } catch {
          paused = {};
        }

        if (type === "agent-returned-to-office-radius") {
          paused[agentId] = { ...paused[agentId], ...payload, isPaused: false };
        } else {
          paused[agentId] = { ...paused[agentId], ...payload, isPaused: true };
        }
        window.localStorage.setItem(LIVE_ATTENDANCE_STORAGE_KEY, JSON.stringify(paused));
      }

      window.dispatchEvent(new CustomEvent(LIVE_ATTENDANCE_EVENT, { detail: { type, payload } }));
      const name = payload.userName || "An agent";
      const timestamp = payload.at ? new Date(payload.at).toLocaleTimeString() : "";
      if (type === "agent-left-office-radius") {
        toast.warning(`${name} left the office radius`, {
          description: [payload.message, timestamp].filter(Boolean).join(" · "),
        });
      } else if (type === "agent-returned-to-office-radius") {
        toast.success(`${name} returned to the office radius`, {
          description: typeof payload.outsideDurationMs === "number"
            ? `Outside for ${Math.round(payload.outsideDurationMs / 60000)} minutes`
            : undefined,
        });
      } else if (type === "agent-location-lost") {
        toast.warning(`${name} location stopped`, {
          description: payload.message || "The attendance timer has been paused.",
        });
      }
    };

    const onLeft = (payload: GeofenceEvent) => update("agent-left-office-radius", payload ?? {});
    const onReturned = (payload: GeofenceEvent) => update("agent-returned-to-office-radius", payload ?? {});
    const onLost = (payload: GeofenceEvent) => update("agent-location-lost", payload ?? {});

    socket.on("agent-left-office-radius", onLeft);
    socket.on("agent-returned-to-office-radius", onReturned);
    socket.on("agent-location-lost", onLost);

    return () => {
      socket.off("agent-left-office-radius", onLeft);
      socket.off("agent-returned-to-office-radius", onReturned);
      socket.off("agent-location-lost", onLost);
      socket.disconnect();
    };
  }, [user?.role, user?.token]);

  return null;
}
