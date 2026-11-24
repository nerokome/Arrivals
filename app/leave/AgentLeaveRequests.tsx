"use client";

import { FormEvent, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { SVGLoader } from "@/components/SVGLoader";
import { useCreateLeaveRequestMutation, useGetMyLeaveRequestsQuery } from "@/utils/APISlice/leaveApi";
import { useUserPrivileges } from "@/utils/userPrivileges";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/getErrorMessage";

const LEAVE_TYPES = [
  { value: "ANNUAL", label: "Annual" },
  { value: "SICK", label: "Sick" },
  { value: "MATERNITY", label: "Maternity" },
  { value: "PATERNITY", label: "Paternity" },
  { value: "COMPASSIONATE", label: "Compassionate" },
  { value: "UNPAID", label: "Unpaid" },
];

const extractMyLeaves = (payload: any): any[] => {
  const result = payload?.data?.data?.data ?? payload?.data?.data ?? payload?.data ?? payload;
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.leaves)) return result.leaves;
  if (Array.isArray(result?.requests)) return result.requests;
  return [];
};

export default function AgentLeaveRequests() {
  const { user } = useUserPrivileges();
  const { data, isLoading, isError } = useGetMyLeaveRequestsQuery();
  const [createRequest, { isLoading: isSubmitting }] = useCreateLeaveRequestMutation();
  const [form, setForm] = useState({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
  const leaves = extractMyLeaves(data);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return toast.error("Please sign in again to submit a leave request.");
    try {
      await createRequest(form).unwrap();
      toast.success("Leave request submitted.");
      setForm({ leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to submit leave request."));
    }
  };

  return (
    <div className="w-full">
      <PageHeader text="My Leave" />
      <form onSubmit={submit} className="mt-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 border border-[#E5E7EB] bg-white p-5">
        <h2 className="md:col-span-2 font-semibold text-[#344249]">Submit a leave request</h2>
        <label className="flex flex-col gap-2 text-sm text-[#344249]">
          Leave type
          <select
            required
            value={form.leaveType}
            onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
            className="border border-[#DCE2E4] bg-white p-3"
          >
            {LEAVE_TYPES.map((leaveType) => (
              <option key={leaveType.value} value={leaveType.value}>
                {leaveType.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-sm text-[#344249]">Start date<input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="border border-[#DCE2E4] p-3" /></label>
          <label className="flex flex-col gap-2 text-sm text-[#344249]">End date<input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="border border-[#DCE2E4] p-3" /></label>
        </div>
        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-[#344249]">Reason (optional)<textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="border border-[#DCE2E4] p-3" /></label>
        <div className="md:col-span-2 flex justify-end"><button disabled={isSubmitting} className="px-5 py-2 !bg-[#36474F] text-white disabled:opacity-60">{isSubmitting ? "Submitting…" : "Submit request"}</button></div>
      </form>

      <h2 className="font-semibold text-[#344249] mb-3">My requests</h2>
      <div className="table-responsive-vertical"><div className="table-container"><table className="table">
        <thead><tr><th>Leave type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr></thead>
        <tbody>
          {isLoading ? <tr><td colSpan={5} className="py-8 text-center"><div className="flex justify-center"><SVGLoader width="28px" height="28px" color="#36474F" /></div></td></tr>
            : isError ? <tr><td colSpan={5} className="py-8 text-center text-red-600">Could not load your leave requests.</td></tr>
              : leaves.length ? leaves.map((leave: any) => <tr key={leave.id}><td>{leave.leaveType}</td><td>{leave.startDate ? new Date(leave.startDate).toLocaleDateString() : "—"}</td><td>{leave.endDate ? new Date(leave.endDate).toLocaleDateString() : "—"}</td><td>{leave.reason || "—"}</td><td>{leave.status}</td></tr>)
                : <tr><td colSpan={5} className="py-8 text-center">You have no leave requests yet.</td></tr>}
        </tbody>
      </table></div></div>
    </div>
  );
}
