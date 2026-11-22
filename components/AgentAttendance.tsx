"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { SVGLoader } from "@/components/SVGLoader";
import { useGetAttendanceByUserQuery, useSubmitAgentAttendanceMutation } from "@/utils/APISlice/attendanceApi";
import { useGetAgentOfficeShiftsQuery, useGetOfficeLocationByIdQuery } from "@/utils/APISlice/officeLocationApi";
import { useUserPrivileges } from "@/utils/userPrivileges";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { BrowserQRCodeReader } from "@zxing/browser";
import { io } from "socket.io-client";

const extractAttendance = (payload: any): any[] => {
  const result = payload?.data?.data?.data ?? payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.attendance)) return result.attendance;
  if (Array.isArray(result?.attendances)) return result.attendances;
  return [];
};

const getDeviceId = () => {
  const key = "attendly_device_id";
  let deviceId = window.localStorage.getItem(key);
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, deviceId);
  }
  return deviceId;
};

const getCurrentLocation = () => new Promise<{ userLat: number; userLng: number }>((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error("Location is not available in this browser."));
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ userLat: coords.latitude, userLng: coords.longitude }),
    () => reject(new Error("Allow location access to clock in or out.")),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

const getSocketUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
};

const hasOpenAttendance = (records: any[]) => records.some((record) => Boolean(record?.clockIn) && !record?.clockOut);

const formatWorkedDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function AgentAttendance({ showClockControls = false }: { showClockControls?: boolean }) {
  const { user } = useUserPrivileges();
  const userId = user?.id ?? "";
  const officeId = user?.officeId ?? "";
  const [organizationName, setOrganizationName] = useState(user?.organization?.name ?? "");
  const { data, isLoading, isError } = useGetAttendanceByUserQuery(userId, { skip: !userId });
  const { data: officeResponse, isLoading: isLoadingOffice } = useGetOfficeLocationByIdQuery(officeId, { skip: !officeId });
  const { data: shiftResponse } = useGetAgentOfficeShiftsQuery(officeId, { skip: !officeId });
  const [submitAttendance, { isLoading: isSubmitting }] = useSubmitAgentAttendanceMutation();
  const [isScanning, setIsScanning] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [workedDurationMs, setWorkedDurationMs] = useState<number | null>(null);
  const [insideOffice, setInsideOffice] = useState<boolean | null>(null);
  const [outsideDurationMs, setOutsideDurationMs] = useState<number | null>(null);
  const [outsideSince, setOutsideSince] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const stopLiveTrackingRef = useRef<() => void>(() => {});
  const trackingActiveRef = useRef(false);
  const trackingSuppressedRef = useRef(false);
  const records = extractAttendance(data);
  const attendanceIsOpen = hasOpenAttendance(records);
  const office = officeResponse?.data?.data?.office ?? officeResponse?.data?.office ?? officeResponse?.data?.data ?? officeResponse?.data ?? officeResponse;
  const shiftsValue = shiftResponse?.data?.data?.shifts ?? shiftResponse?.data?.shifts ?? shiftResponse?.data?.data ?? shiftResponse?.data ?? shiftResponse;
  const shifts = Array.isArray(shiftsValue) ? shiftsValue : [];

  const stopLiveTracking = useCallback(() => {
    stopLiveTrackingRef.current();
    stopLiveTrackingRef.current = () => {};
    trackingActiveRef.current = false;
    setIsLiveTracking(false);
    setInsideOffice(null);
    setOutsideSince(null);
    setOutsideDurationMs(null);
    setWorkedDurationMs(null);
  }, []);

  const startLiveTracking = useCallback(() => {
    if (trackingActiveRef.current) return;
    if (!user?.token) {
      toast.error("Please sign in again before starting attendance location tracking.");
      return;
    }
    stopLiveTrackingRef.current();
    trackingActiveRef.current = true;
    trackingSuppressedRef.current = false;
    const socket = io(getSocketUrl(), { auth: { token: user.token } });
    let latestPosition: GeolocationPosition | null = null;
    let lastSentAt = 0;
    let lastSentPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;

    const emitLocation = (onlyIfMoved = false) => {
      if (!socket.connected || !latestPosition) return;
      const now = Date.now();
      if (now - lastSentAt < 5000) return;
      if (onlyIfMoved && lastSentPosition) {
        const latDelta = latestPosition.coords.latitude - lastSentPosition.coords.latitude;
        const lngDelta = latestPosition.coords.longitude - lastSentPosition.coords.longitude;
        const movementMeters = Math.sqrt(latDelta * latDelta + lngDelta * lngDelta) * 111_000;
        if (movementMeters < 5) return;
      }
      const latitude = Number(latestPosition.coords.latitude);
      const longitude = Number(latestPosition.coords.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      socket.emit("attendance:location", { latitude, longitude });
      lastSentAt = now;
      lastSentPosition = latestPosition;
    };

    const onPosition = (position: GeolocationPosition) => {
      latestPosition = position;
      emitLocation(true);
    };
    const onPositionError = () => {
      toast.error("Location access stopped. Allow location access to keep attendance tracking active.");
    };
    const onLocationResult = (result: {
      workedDurationMs?: number;
      inside?: boolean;
      outsideDurationMs?: number;
      outsideSince?: string | null;
    }) => {
      if (typeof result?.workedDurationMs === "number") setWorkedDurationMs(result.workedDurationMs);
      if (typeof result?.inside === "boolean") setInsideOffice(result.inside);
      if (typeof result?.outsideDurationMs === "number") setOutsideDurationMs(result.outsideDurationMs);
      setOutsideSince(typeof result?.outsideSince === "string" ? result.outsideSince : null);
    };

    socket.on("connect", () => emitLocation());
    socket.on("attendance:location-result", onLocationResult);
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      });
    } else {
      toast.error("This browser does not support attendance location tracking.");
    }
    const intervalId = window.setInterval(() => emitLocation(), 12000);

    stopLiveTrackingRef.current = () => {
      window.clearInterval(intervalId);
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
      socket.off("attendance:location-result", onLocationResult);
      socket.disconnect();
    };
    setIsLiveTracking(true);
  }, [user?.token]);

  useEffect(() => {
    if (showClockControls && attendanceIsOpen && !trackingSuppressedRef.current && !trackingActiveRef.current) startLiveTracking();
  }, [attendanceIsOpen, isLiveTracking, showClockControls, startLiveTracking]);

  useEffect(() => () => {
    stopLiveTrackingRef.current();
  }, []);

  useEffect(() => {
    setOrganizationName(user?.organization?.name ?? "");
    if (!showClockControls || !user?.token) return;

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
  }, [showClockControls, user?.token, user?.organization?.name]);

  const clock = useCallback(async (scannedToken: string) => {
    if (!userId) return toast.error("Please sign in again before clocking in or out.");
    try {
      const location = await getCurrentLocation();
      await submitAttendance({ token: scannedToken, userId, ...location, deviceId: getDeviceId() }).unwrap();
      if (attendanceIsOpen) {
        trackingSuppressedRef.current = true;
        stopLiveTracking();
        toast.success("Attendance recorded. Location tracking stopped.");
      } else {
        setWorkedDurationMs(null);
        setInsideOffice(null);
        startLiveTracking();
        toast.success("Attendance recorded. Live location tracking started.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to record attendance."));
    }
  }, [attendanceIsOpen, startLiveTracking, stopLiveTracking, submitAttendance, userId]);

  useEffect(() => {
    if (!isScanning) return;
    let cancelled = false;
    let hasScanned = false;

    const startScanner = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        toast.error("Camera scanning requires HTTPS or localhost and a browser with camera support.");
        setIsScanning(false);
        return;
      }
      try {
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || cancelled || hasScanned) return;
            hasScanned = true;
            setIsScanning(false);
            void clock(result.getText());
          }
        );
        if (cancelled) controls.stop();
        else scannerControlsRef.current = controls;
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error, "Could not access the camera. Check camera permission and try again."));
          setIsScanning(false);
        }
      }
    };

    void startScanner();
    return () => {
      cancelled = true;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [clock, isScanning]);

  return (
    <div className="w-full">
      {showClockControls ? <PageHeader text="Your Dashboard" /> : <PageHeader text="My Attendance" />}
      {showClockControls && <section className="mt-6 mb-8 border border-[#E5E7EB] bg-white p-5">
        <h2 className="font-semibold text-[#344249]">Clock in or out</h2>
        <p className="text-sm text-[#66747A] mt-1">Scan the office QR code to clock in or out. Attendance is recorded after the scan and location check.</p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => setIsScanning((current) => !current)} disabled={isSubmitting} className="px-5 py-3 !bg-[#36474F] text-white disabled:opacity-60">{isSubmitting ? "Recording…" : isScanning ? "Close camera" : "Scan QR"}</button>
        </div>
        {isScanning && <div className="mt-4 w-full max-w-md">
          <video ref={videoRef} muted playsInline autoPlay className="w-full aspect-video bg-black object-cover" aria-label="Camera QR scanner" />
          <p className="mt-2 text-xs text-[#66747A]">Point the camera at the office QR code. Allow camera access if your browser asks.</p>
        </div>}
      </section>}

      {showClockControls && (attendanceIsOpen || isLiveTracking) && <section className="mb-8 flex flex-col gap-2 border border-[#E5E7EB] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-[#344249]">Live worked time</h2>
          <p className="mt-1 text-sm text-[#66747A]">
            {insideOffice === false
              ? `Paused outside office radius${outsideSince ? ` since ${new Date(outsideSince).toLocaleTimeString()}` : ""}`
              : insideOffice === true ? "Attendance timer is running" : "Waiting for the office location check…"}
          </p>
          {insideOffice === false && outsideDurationMs !== null && <p className="mt-1 text-xs text-[#66747A]">Outside for {formatWorkedDuration(outsideDurationMs)}</p>}
        </div>
        <p className="font-mono text-2xl font-semibold tabular-nums text-[#263238]" aria-live="polite">
          {workedDurationMs === null ? "--:--:--" : formatWorkedDuration(workedDurationMs)}
        </p>
      </section>}

      {showClockControls && <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-[#E5E7EB] bg-white p-5">
          <h2 className="font-semibold text-[#344249]">Your organization</h2>
          <p className="mt-2 text-sm text-[#66747A]">{organizationName || "Organization details unavailable"}</p>
        </div>
        <div className="border border-[#E5E7EB] bg-white p-5">
          <h2 className="font-semibold text-[#344249]">Your office</h2>
          <p className="mt-2 text-sm text-[#66747A]">{isLoadingOffice ? "Loading office…" : officeId ? office?.name ?? "Office details unavailable" : "No office assigned"}</p>
          {office?.address && <p className="mt-1 text-sm text-[#66747A]">{office.address}</p>}
        </div>
        <div className="border border-[#E5E7EB] bg-white p-5">
          <h2 className="font-semibold text-[#344249]">Office shifts</h2>
          {shifts.length ? <ul className="mt-2 space-y-1 text-sm text-[#66747A]">{shifts.map((shift: any) => <li key={shift.id ?? shift._id}>{shift.name ?? "Shift"}: {shift.startTime ?? "—"} – {shift.endTime ?? "—"}</li>)}</ul> : <p className="mt-2 text-sm text-[#66747A]">{officeId ? "No shifts available." : "Assign an office to view shifts."}</p>}
        </div>
      </section>}

      <div className="table-responsive-vertical"><div className="table-container"><table className="table">
        <thead><tr><th>Date</th><th>Clock in</th><th>Clock out</th><th>Status</th></tr></thead>
        <tbody>
          {isLoading ? <tr><td colSpan={4} className="py-8 text-center"><div className="flex justify-center"><SVGLoader width="28px" height="28px" color="#36474F" /></div></td></tr>
            : isError ? <tr><td colSpan={4} className="py-8 text-center text-red-600">Could not load your attendance.</td></tr>
              : records.length ? records.map((record: any) => <tr key={record.id ?? `${record.clockIn}-${record.clockOut}`}>
                <td>{record.clockIn ? new Date(record.clockIn).toLocaleDateString() : record.date ? new Date(record.date).toLocaleDateString() : "—"}</td>
                <td>{record.clockIn ? new Date(record.clockIn).toLocaleTimeString() : "—"}</td>
                <td>{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : "—"}</td>
                <td>{record.status ?? (record.clockOut ? "Complete" : record.clockIn ? "In progress" : "—")}</td>
              </tr>)
                : <tr><td colSpan={4} className="py-8 text-center">No attendance records found.</td></tr>}
        </tbody>
      </table></div></div>
    </div>
  );
}
