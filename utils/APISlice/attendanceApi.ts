import { baseApi } from "./baseApi";

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAttendanceByUser: builder.query<any, string>({
      query: (userId) => `/api/v1/attendance/${encodeURIComponent(userId)}`,
      providesTags: ["Attendance"],
    }),
    submitAgentAttendance: builder.mutation<any, {
      token: string;
      userId: string;
      userLat: number;
      userLng: number;
      deviceId: string;
    }>({
      query: (body) => ({
        url: "/api/v1/attendance",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Attendance"],
    }),
    getAttendance: builder.query<any, void>({
      query: () => "/attendance",
      providesTags: ["Attendance"],
    }),
    getAttendanceParams: builder.query<any, any>({
      query: (params) => ({
        url: "/attendance",
        params: {
          page: params.page,
          limit: params.limit,
          filterByDate: params.filterByDate,
          startDate: params.startDate,
          endDate: params.endDate,
          search: params.search,
          officeId: params.officeId,
        },
      }),
      providesTags: ["Attendance"],
    }),
 getAttendanceSummary: builder.query<any, { id?: string; params: any }>({
  query: ({ id, params }) => ({
    url: id ? `/attendance/summary/${id}` : "/attendance/summary",
    params: {
      page: params.page,
      limit: params.limit,
      filterByDate: params.filterByDate,
      startDate: params.startDate,
      endDate: params.endDate,
      search: params.search,
      status: params.status,
    },
  }),
}),
    addAttendanceManual: builder.mutation<any, any>({
      query: (body) => ({
        url: "/attendance/manual",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Attendance"],
    }),
    getDashboardStats: builder.query<
      any,
      { officeId?: string; startDate?: string; endDate?: string }
    >({
      query: ({ officeId, startDate, endDate }) => ({
        url: "/attendance/dashboard/stats",
        params: {
          officeId,
          startDate,
          endDate,
        },
      }),
      providesTags: ["Attendance"],
    }),
    updateAttendanceStatus: builder.mutation<
      any,
      { attendanceId: string; status: string }
    >({
      query: ({ attendanceId, status }) => ({
        url: `/attendance/status/${attendanceId}`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["Attendance"],
    }),
    
    resetUserDevice: builder.mutation<any, { userId: string }>({
      query: ({ userId }) => ({
        url: `/attendance/${userId}/reset-device`,
        method: "POST",
      }),
      invalidatesTags: ["Attendance"],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetAttendanceByUserQuery,
  useSubmitAgentAttendanceMutation,
  useGetAttendanceParamsQuery,
  useGetAttendanceSummaryQuery,
  useAddAttendanceManualMutation,
  useGetDashboardStatsQuery,
  useUpdateAttendanceStatusMutation,
  useResetUserDeviceMutation,
} = attendanceApi;
