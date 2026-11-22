"use client";
import React, { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { useUserPrivileges } from '@/utils/userPrivileges';
import StatsCards from './StatsCards';
import CustomDateDropdown from '@/components/CustomDateDropdown';
import AttendanceList from './component/AttendanceList';
import Chart from './component/Chart';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/getErrorMessage';
import QrScanner from './component/QrScanner';
import Dropdowns from '@/components/CustomDropdown';
import CustomDropdownOffice from '@/components/CustomDropdownOffice';
import { SVGLoader } from '@/components/SVGLoader';
import { useRouter } from 'next/navigation';

import { useGetAttendanceSummaryQuery, useGetDashboardStatsQuery } from '@/utils/APISlice/attendanceApi';
import { useGetUsersQuery, useCreateQrTokenMutation } from '@/utils/APISlice/userApi';
import { useGetOfficeLocationsQuery } from '@/utils/APISlice/officeLocationApi';
import AgentAttendance from '@/components/AgentAttendance';
import OrganizationsSummary from './OrganizationsSummary';

const EmployeeDashBoard = () => {
	const router = useRouter();
	const { user } = useUserPrivileges();
	const [selectedDateFilter, setSelectedDateFilter] = useState("Today");

	// Date filter functions
	const getDateRange = (filter: string) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const formatLocalDate = (date: Date) => {
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
		};

		switch (filter) {
			case "Today":
				const todayEnd = new Date(today);
				todayEnd.setHours(23, 59, 59, 999);
				return {
					start: formatLocalDate(today),
					end: formatLocalDate(todayEnd),
					label: "Today"
				};
			case "Yesterday":
				const yesterday = new Date(today);
				yesterday.setDate(yesterday.getDate() - 1);
				const yesterdayEnd = new Date(yesterday);
				yesterdayEnd.setHours(23, 59, 59, 999);
				return {
					start: formatLocalDate(yesterday),
					end: formatLocalDate(yesterdayEnd),
					label: "Yesterday"
				};
			case "Last Week":
				const lastWeekStart = new Date(today);
				lastWeekStart.setDate(today.getDate() - 7);
				return {
					start: formatLocalDate(lastWeekStart),
					end: formatLocalDate(today),
					label: "Last Week"
				};
			case "Last Month":
				const lastMonthStart = new Date(today);
				lastMonthStart.setMonth(today.getMonth() - 1);
				return {
					start: formatLocalDate(lastMonthStart),
					end: formatLocalDate(today),
					label: "Last Month"
				};
			default:
				return {
					start: formatLocalDate(today),
					end: formatLocalDate(today),
					label: "Today"
				};
		}
	};

	const isSuperAdmin = user?.role?.toUpperCase() === "SUPER_ADMIN";
	const isAgent = user?.role?.toUpperCase() === "AGENT";
	const isAdmin = user?.role?.toUpperCase() === "ADMIN";
	const canManageOrganization = isSuperAdmin || isAdmin;
	const [selectedOfficeId, setSelectedOfficeId] = useState("");
	const summaryOfficeId = isSuperAdmin || isAdmin ? selectedOfficeId : (user?.officeId || "");
	const shouldSkip = !user || isAgent || !canManageOrganization;

	const { data: summaryData, isLoading: isLoadingAttendance } = useGetAttendanceSummaryQuery({
		id: summaryOfficeId,
		params: {
			page: 1,
			limit: 1000,
			filterByDate: selectedDateFilter,
			startDate: getDateRange(selectedDateFilter).start,
			endDate: getDateRange(selectedDateFilter).end,
		}
	}, { skip: shouldSkip });
	const { data: statsResponse } = useGetDashboardStatsQuery({
		officeId: summaryOfficeId || undefined,
		startDate: getDateRange(selectedDateFilter).start,
		endDate: getDateRange(selectedDateFilter).end,
	}, { skip: shouldSkip });
	const { data: usersData, isLoading: isLoadingUsers } = useGetUsersQuery(undefined, { skip: !canManageOrganization });
	const { data: officeData, isLoading: isLoadingOffice } = useGetOfficeLocationsQuery(undefined, { skip: !canManageOrganization });
	const locationOptions = officeData?.data?.data || officeData?.data || officeData || [];
	const [createQrToken, { isLoading: isLoadingQR }] = useCreateQrTokenMutation();

	const [inputs, setInputs] = useState({
		officeId: "",
		type: ""
	});
	const [dataQR, setDataQR] = useState<any>(null);

	// Fetch calender data when filter changes (this will be refactored to use lazy query if needed, 
	// but for now we'll stick to basic implementation)

	useEffect(() => {
		if (user?.officeId) {
			setInputs(prev => ({
				...prev,
				officeId: user.officeId,
			}));
		}
	}, [user?.officeId]);

	// Extract data from RTK Query responses
	const users = usersData?.data?.users || usersData?.data?.data?.data || usersData?.data?.data || usersData?.data || [];
	const summaryRecords = summaryData?.data?.data?.data || summaryData?.data?.data || summaryData?.data || [];

	const employee = Array.isArray(users) ? [...users] : [];
	const attendanceRecord = Array.isArray(summaryRecords)
		? summaryRecords.flatMap((record: any) => {
			return (record?.attendance || []).map((att: any) => ({
				...att,
				userId: att.userId || record.id || record.userId,
			}));
		})
		: [];

	const handleOnChange = (input: string, value: string) => {
		setInputs((prevState) => ({
			...prevState,
			[input]: value,
		}));
	};

	const handleSubmit = async () => {
		try {
			const res = await createQrToken(inputs).unwrap();
			setDataQR(res.data || res);
			toast.success("QR Create!");
		} catch (error: any) {
			toast.error(getErrorMessage(error, "Failed to create QR"));
		}
	};

	const handleSubmits = () => {
		// getCalender logic will be updated later if needed
	};

	const handleDateFilter = (filter: string) => {
		setSelectedDateFilter(filter);
	};


	if (isAgent) return <AgentAttendance showClockControls />;
	if (!user) return null;

	return (
		<div className='w-full'>
			{isSuperAdmin && <OrganizationsSummary />}
			<div className='flex flex-col md:flex-row justify-between items-center'>
				<div>
					<PageHeader text={"Dashboard Overview"} />
				</div>
				<div className='flex flex-col md:flex-row justify-between items-center gap-4  p-4 bg-gray-50 rounded-none'>
					<div className='flex flex-col md:flex-row gap-2'>
						<span className="text-sm text-gray-600">{getDateRange(selectedDateFilter).label}</span>
					</div>
					<div className='flex flex-row gap-2'>
						<button
							onClick={() => handleDateFilter("Today")}
							className={`px-3 py-1 text-xs rounded-none border ${selectedDateFilter === "Today"
								? "!bg-[#36474F] text-white !border-[#36474F]"
								: "!bg-white !text-gray-700 !border-gray-300 !hover:bg-gray-50"
								}`}
						>
							Today
						</button>
						<button
							onClick={() => handleDateFilter("Yesterday")}
							className={`px-3 py-1 text-xs rounded-none border ${selectedDateFilter === "Yesterday"
								? "!bg-[#36474F] text-white !border-[#36474F]"
								: "!bg-white !text-gray-700 !border-gray-300 !hover:bg-gray-50"
								}`}
						>
							Yesterday
						</button>
						<button
							onClick={() => handleDateFilter("Last Week")}
							className={`px-3 py-1 text-xs rounded-none border ${selectedDateFilter === "Last Week"
								? "!bg-[#36474F] text-white !border-[#36474F]"
								: "!bg-white !text-gray-700 !border-gray-300 !hover:bg-gray-50"
								}`}
						>
							Last Week
						</button>
						<button
							onClick={() => handleDateFilter("Last Month")}
							className={`px-3 py-1 text-xs rounded-none border ${selectedDateFilter === "Last Month"
								? "!bg-[#36474F] text-white !border-[#36474F]"
								: "!bg-white !text-gray-700 !border-gray-300 !hover:bg-gray-50"
								}`}
						>
							Last Month
						</button>
					</div>
						{canManageOrganization && (
						<div className="w-full md:w-[200px]">
							<CustomDropdownOffice
								label="All Locations"
								options={[{ id: "", name: "All Locations", address: "" }, ...locationOptions]}
								name="officeId"
								handleOnChange={(_, value) => setSelectedOfficeId(value)}
								loading={isLoadingOffice}
							/>
						</div>
					)}
				</div>
				<div className='flex flex-row gap-2 w-[100%]  md:w-[27%] pt-[20px] md:p-[0px]'>
					<Dropdowns
						label="Clock Type"
						options={["CHECK_IN", "CHECK_OUT"]}
						name="type"
						handleOnChange={handleOnChange}
					/>
					<button
						className={`flex flex-row justify-center items-center px-[6px] py-[4px] h-[40px] w-[150px]   border font-medium text-[12px] leading-[18px]  
												  !bg-[#36474F] border-[#DCE4E6] text-[#fff] rounded-none
									`}
						onClick={handleSubmit}
						disabled={isLoadingQR}
					>
						Create
					</button>
				</div>
			</div>
			<div className='flex flex-col md:flex-row gap-[24px] mt-[24px]  '>
				<StatsCards
					attendanceRecords={attendanceRecord}
					users={employee}
					dateFilter={selectedDateFilter}
					dateRange={getDateRange(selectedDateFilter)}
					stats={statsResponse?.data?.data}
				/>
				<div className='w-[100%] md:w-[30%] h-full md:h-[268px] flex flex-col gap-2'>
					<QrScanner dataQR={dataQR} isLoadingQR={isLoadingQR} />

				</div>
			</div >


			<div className=' mt-[60px] h-full md:h-[350px] w-full flex flex-col md:flex-row gap-[24px]'>
				<div className='w-full md:w-[70%] h-full'>
					<div className='flex flex-row  justify-between mb-8'>
						<h3 className="font-montserrat font-medium text-[20px] leading-6 text-[#141414] flex items-center order-0 flex-none grow-0">
							Attendance list
						</h3>
						<button
							onClick={() => router.push('/attendances')}
							className="font-bold text-[16px] leading-[17px] text-[#36474F] cursor-pointer	flex items-center   flex-none  px-4 py-2 bg-white"
						>
							View All
						</button>

					</div>
					<AttendanceList />
				</div>

				<div className='w-full md:w-[30%] h-full '>
					<div className=' mb-4'>
						<CustomDateDropdown label={''} name={''} handleOnChange={handleOnChange} />

					</div>

					<div className='bg-white border border-[#E5E7EB] shadow-[0px_1px_2px_rgba(16,24,40,0.05)]  w-full h-full '>
						<Chart
							earlyCount={statsResponse?.data?.data?.earlyArrivals}
							lateCount={statsResponse?.data?.data?.lateArrivals}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}

export default EmployeeDashBoard
