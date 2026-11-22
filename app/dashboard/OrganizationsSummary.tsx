"use client";

import { useEffect, useState } from "react";
import { useUserPrivileges } from "@/utils/userPrivileges";

interface OrganizationSummary {
	id: string;
	name: string;
	logoUrl: string | null;
	createdAt: string;
	agentCount: number;
}

interface PlatformSummary {
	totalOrganizations: number;
	totalAgents: number;
	organizations: OrganizationSummary[];
}

const OrganizationsSummary = () => {
	const { user } = useUserPrivileges();
	const [summary, setSummary] = useState<PlatformSummary | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!user?.token || user.role?.toUpperCase() !== "SUPER_ADMIN") {
			setIsLoading(false);
			return;
		}
		setIsLoading(true);

		const controller = new AbortController();
		const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");
		const apiBase = baseUrl.endsWith("/api/v1") ? baseUrl : `${baseUrl}/api/v1`;

		fetch(`${apiBase}/organizations/platform-summary`, {
			headers: { Authorization: `Bearer ${user.token}` },
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Unable to load organization summary.");
				return response.json();
			})
			.then((response) => {
				const data = response?.data?.data;
				if (!data || !Array.isArray(data.organizations)) {
					throw new Error("Organization summary response is invalid.");
				}
				setSummary(data);
				setError("");
			})
			.catch((requestError: unknown) => {
				if (requestError instanceof Error && requestError.name === "AbortError") return;
				setError(requestError instanceof Error ? requestError.message : "Unable to load organization summary.");
			})
			.finally(() => {
				if (!controller.signal.aborted) setIsLoading(false);
			});

		return () => controller.abort();
	}, [user?.token, user?.role]);

	if (user?.role?.toUpperCase() !== "SUPER_ADMIN") return null;

	return (
		<section className="mt-12" aria-labelledby="organizations-heading">
			<h2 id="organizations-heading" className="mb-5 text-xl font-semibold text-[#263238]">Organizations</h2>
			{error && <p role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
			<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<SummaryCard label="Total Organizations" value={summary?.totalOrganizations} loading={isLoading} />
				<SummaryCard label="Total Agents" value={summary?.totalAgents} loading={isLoading} />
			</div>
			<div className="overflow-x-auto border border-[#E5E7EB] bg-white">
				<table className="w-full min-w-[600px] text-left">
					<thead className="bg-[#F3F6F7] text-xs uppercase text-[#59676C]">
						<tr>
							<th scope="col" className="px-5 py-4">Organization</th>
							<th scope="col" className="px-5 py-4">Created</th>
							<th scope="col" className="px-5 py-4 text-right">Agents</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[#E5E7EB] text-sm text-[#263238]">
						{isLoading ? (
							<tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500">Loading organizations…</td></tr>
						) : summary?.organizations.length ? summary.organizations.map((organization) => (
							<tr key={organization.id}>
								<td className="px-5 py-4 font-medium">
									<div className="flex items-center gap-3">
										{organization.logoUrl && <img src={organization.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />}
										<span>{organization.name}</span>
									</div>
								</td>
								<td className="px-5 py-4">{organization.createdAt ? new Date(organization.createdAt).toLocaleDateString() : "—"}</td>
								<td className="px-5 py-4 text-right">{organization.agentCount}</td>
							</tr>
						)) : (
							<tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500">No organizations found.</td></tr>
						)}
					</tbody>
				</table>
			</div>
		</section>
	);
};

function SummaryCard({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
	return (
		<div className="border border-[#E5E7EB] bg-white p-5">
			<p className="text-sm text-[#59676C]">{label}</p>
			<p className="mt-2 text-3xl font-semibold text-[#263238]">{loading ? "—" : value ?? 0}</p>
		</div>
	);
}

export default OrganizationsSummary;
