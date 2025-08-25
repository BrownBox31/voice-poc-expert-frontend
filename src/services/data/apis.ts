export const ApiEndpoints = {
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh-token',
  ALL_INSPECTIONS: '/inspection/all',
  INSPECTION_DETAILS: 'resolution/issues/v2/vin/',//Put API where the VIN is appended to the end of the URL
  UPDATE_ISSUE_STATUS: 'resolution/issues/', // Issue id will be appended to the end of the URL. In addition there will be a json object {"status":"closed", "comments":"works" }'
} as const;