import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getStoredAuthUser } from "@/utils/auth";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    prepareHeaders: (headers) => {
      const user = getStoredAuthUser();

      if (user?.token) {
        headers.set("Authorization", `Bearer ${user.token}`);
      }

      return headers;
    },
  }),
  tagTypes: [
    "Attendance",
    "User",
    "OfficeLocation",
    "Shift",
    "WorkSchedule",
    "LeaveRequest",
  ],
  endpoints: () => ({}),
});
