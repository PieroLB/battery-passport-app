// Single entry point for API calls. JWT and ApiError mapping are added in T-21.
export const useApi = () => $fetch.create({ baseURL: '/api' });
