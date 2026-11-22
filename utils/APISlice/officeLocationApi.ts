import { baseApi } from './baseApi';

export interface OfficeLocationPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export const officeLocationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOfficeLocationById: builder.query<any, string>({
      query: (officeId) => `/api/v1/office-location/${encodeURIComponent(officeId)}`,
      providesTags: ["OfficeLocation"],
    }),
    getAgentOfficeShifts: builder.query<any, string>({
      query: (officeId) => `/api/v1/office-location/${encodeURIComponent(officeId)}/shifts`,
      providesTags: ["Shift"],
    }),
    getOfficeLocations: builder.query<any, void>({
      query: () => '/office-location',
      providesTags: ['OfficeLocation'],
    }),
    addOfficeLocation: builder.mutation<any, { name: string; address: string; latitude?: number; longitude?: number; radius?: number }>({
      query: (body) => ({
        url: '/office-location',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OfficeLocation'],
    }),
    updateOfficeLocation: builder.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/office-location/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['OfficeLocation'],
    }),
    getShiftsByOffice: builder.query<any, string>({
      query: (officeId) => `/office-location/${officeId}/shifts`,
      providesTags: ['Shift'],
    }),
    addShift: builder.mutation<any, { name: string; startTime: string; endTime: string; officeId: string }>({
      query: (body) => ({
        url: `/office-location/${body.officeId}/shifts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shift'],
    }),
    updateShift: builder.mutation<any, { id: string; name?: string; startTime?: string; endTime?: string }>({
      query: ({ id, ...body }) => ({
        url: `/office-location/shifts/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Shift'],
    }),
    deleteShift: builder.mutation<any, string>({
      query: (shiftId) => ({
        url: `/office-location/shifts/${shiftId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Shift'],
    }),
    assignUserToShift: builder.mutation<any, { userId: string; shiftId: string }>({
      query: (body) => ({
        url: `/office-location/shifts/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shift', 'User'],
    }),
  }),
});

export const {
  useGetOfficeLocationByIdQuery,
  useGetAgentOfficeShiftsQuery,
  useGetOfficeLocationsQuery,
  useAddOfficeLocationMutation,
  useUpdateOfficeLocationMutation,
  useGetShiftsByOfficeQuery,
  useAddShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
  useAssignUserToShiftMutation,
} = officeLocationApi;
