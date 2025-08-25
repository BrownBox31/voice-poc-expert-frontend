export const ApiEndpoints = {
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh-token',
  ALL_INSPECTIONS: '/inspection/all',
  INSPECTION_DETAILS: 'resolution/issues/v2/vin/',//Put API where the VIN is appended to the end of the URL
} as const;