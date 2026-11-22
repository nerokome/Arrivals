"use client";

import React, { useEffect, useState } from "react";
import { NoRecordFound, SVGLoaderFetch } from "@/components/Options";
import PageHeader from "@/components/PageHeader";
import Search from "@/components/Search";
import moment from "moment";
import { toast } from "sonner";

import OfficeLocationModal from "@/components/modals/OfficeLocationModal";
import ShiftModal from "@/components/modals/ShiftModal";
import WorkScheduleModal from "@/components/modals/WorkScheduleModal";
import OfficeLocationUpdateModal from "@/components/modals/OfficeLocationUpdateModal";

import {
	useGetOfficeLocationsQuery,
	useAddOfficeLocationMutation,
	useUpdateOfficeLocationMutation,
} from "@/utils/APISlice/officeLocationApi";
import { useUserPrivileges } from "@/utils/userPrivileges";

const Attendance = () => {
	const { isSuperAdmin, isAdmin } = useUserPrivileges();
	const canManageOffice = isSuperAdmin || isAdmin;

	const { data: officeData, isLoading } = useGetOfficeLocationsQuery();

	const [addOfficeLocation, { isSuccess: addSuccess }] =
		useAddOfficeLocationMutation();

	const [updateOfficeLocation, { isSuccess: updateSuccess }] =
		useUpdateOfficeLocationMutation();

	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const [shiftModalOpen, setShiftModalOpen] = useState(false);
	const [workScheduleModalOpen, setWorkScheduleModalOpen] = useState(false);

	const [selectedOfficeId, setSelectedOfficeId] = useState("");
	const [mapOffice, setMapOffice] = useState<any | null>(null);

	const officeLocations =
		officeData?.data?.data || officeData?.data || officeData || [];

	const dataToRender = Array.isArray(officeLocations)
		? officeLocations.filter((office: any) => {
				const query = searchQuery.toLowerCase();

				return (
					office.name?.toLowerCase().includes(query) ||
					office.address?.toLowerCase().includes(query) ||
					office.id?.toLowerCase().includes(query)
				);
			})
		: [];

	const getMapCoordinates = (office: any): [string, string] | null => {
		const latitude = office?.latitude ?? office?.lat ?? office?.location?.latitude ?? office?.location?.lat;
		const longitude = office?.longitude ?? office?.lng ?? office?.location?.longitude ?? office?.location?.lng;
		if (latitude !== undefined && longitude !== undefined && String(latitude) !== "" && String(longitude) !== "") return [String(latitude), String(longitude)];
		const coordinates = office?.location?.coordinates;
		if (Array.isArray(coordinates) && coordinates.length >= 2) return [String(coordinates[1]), String(coordinates[0])];
		return null;
	};

	const getMapQuery = (office: any) => {
		const coordinates = getMapCoordinates(office);
		return coordinates ? coordinates.join(",") : [office?.name, office?.address].filter(Boolean).join(", ");
	};

	useEffect(() => {
		if (addSuccess) {
			toast.success("Office Locations Created!");
		} else if (updateSuccess) {
			toast.success("Office Locations Updated!");
		}
	}, [addSuccess, updateSuccess]);

	return (
		<div className="w-full">
			<PageHeader text={"Office Location"} />

			<div className="flex flex-col md:flex-row justify-between gap-5 mt-6">
				<Search
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search office location..."
				/>

				<div className="flex flex-col md:flex-row gap-5">
					{canManageOffice && (
						<button
							className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#36474F] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
							onClick={() => setIsOpen(true)}
						>
							Create Office
						</button>
					)}
				</div>
			</div>

			{mapOffice && (
				<section className="mt-5 border border-[#E5E7EB] bg-white p-4">
					<div className="mb-3 flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 className="font-semibold text-[#344249]">{mapOffice.name}</h2>
							<p className="mt-1 text-sm text-[#66747A]">{mapOffice.address}</p>
							{getMapCoordinates(mapOffice) && <p className="mt-1 text-xs text-[#66747A]">Latitude {getMapCoordinates(mapOffice)?.[0]} · Longitude {getMapCoordinates(mapOffice)?.[1]}</p>}
						</div>
						<div className="flex gap-3">
							<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getMapQuery(mapOffice))}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#36474F] underline">Open in Maps</a>
							<button type="button" onClick={() => setMapOffice(null)} className="text-sm text-[#66747A]">Close map</button>
						</div>
					</div>
					<iframe
						title={`Map for ${mapOffice.name}`}
						 src={`https://maps.google.com/maps?q=${encodeURIComponent(getMapQuery(mapOffice))}&output=embed`}
						 className="h-[360px] w-full border-0"
						 loading="lazy"
						 referrerPolicy="no-referrer-when-downgrade"
					/>
				</section>
			)}

			<div className="table-responsive-vertical mt-5">
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Office ID</th>
								<th>Name</th>
								<th>Address</th>
								<th>Map</th>
								<th>Created At</th>
								<th>Updated At</th>
								<th>Manage Shifts</th>
								<th>Manage Work Schedule</th>
								<th>Action</th>
							</tr>
						</thead>

						<tbody>
							{isLoading ? (
								<SVGLoaderFetch colSpan={9} />
							) : dataToRender?.length === 0 ? (
								<NoRecordFound colSpan={9} />
							) : (
								dataToRender.map((office: any) => (
									<tr key={office.id}>
										<td data-title="Office ID">
											<button
												onClick={() => {
													navigator.clipboard.writeText(office.id);
													toast.success(
														"Copied Office ID to clipboard"
													);
												}}
												className="cursor-pointer flex flex-row justify-center items-center px-[6px] py-[4px] w-[70px] h-[22px] border font-medium text-[12px] leading-[18px] bg-[#EDF2F3] border-[#93C5FD] text-[#36474F]"
												title="Copy Office ID"
											>
												Copy ID
											</button>
										</td>

										<td data-title="Name">
											{office.name}
										</td>

										<td data-title="Address">
											{office.address}
										</td>

						<td data-title="Map">
							<button type="button" onClick={() => setMapOffice(office)} className="border border-[#DCE2E4] px-3 py-1 text-sm text-[#344249] hover:bg-[#F2F4F5]">
								{mapOffice?.id === office.id ? "Showing map" : "View map"}
							</button>
						</td>

										<td data-title="Created At">
											{moment(office.createdAt).format(
												"YYYY-MM-DD HH:mm"
											)}
										</td>

										<td data-title="Updated At">
											{moment(office.updatedAt).format(
												"YYYY-MM-DD HH:mm"
											)}
										</td>

										<td data-title="Manage Shifts">
											<button
												className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#36474F] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
												onClick={() => {
													setSelectedOfficeId(
														office.id
													);
													setShiftModalOpen(true);
												}}
											>
												Manage Shifts
											</button>
										</td>

										<td data-title="Manage Work Schedule">
											<button
												className="flex flex-row justify-center items-center px-5 py-[8px] gap-2 !bg-[#36474F] font-normal text-[14px] leading-[150%] text-[#FFFFFF] rounded-none"
												onClick={() =>
													setWorkScheduleModalOpen(
														true
													)
												}
											>
												Manage Work Schedule
											</button>
										</td>

										<td data-title="Actions">
											<OfficeLocationUpdateModal
												id={office?.id}
												office={office}
											/>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<OfficeLocationModal
				isOpen={isOpen}
				setIsOpen={setIsOpen}
			/>

			{shiftModalOpen && (
				<ShiftModal
					isOpen={shiftModalOpen}
					setIsOpen={setShiftModalOpen}
					officeId={selectedOfficeId}
				/>
			)}

			<WorkScheduleModal
				isOpen={workScheduleModalOpen}
				setIsOpen={setWorkScheduleModalOpen}
			/>
		</div>
	);
};

export default Attendance;
