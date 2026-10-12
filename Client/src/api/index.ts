import apiClient from "./client";
import {
  Domain,
  Category,
  Service,
  RequirementTemplate,
  ServiceRequest,
  SiteSetting,
  CmsFaq,
  ReferenceDataMap,
  User,
} from "./types";

// Public APIs
export const getPublicDomains = async (): Promise<Domain[]> => {
  const res = await apiClient.get("/domains");
  return res.data.data;
};

export const getPublicCategories = async (domainId?: string): Promise<Category[]> => {
  const url = domainId ? `/categories?domainId=${domainId}` : "/categories";
  const res = await apiClient.get(url);
  return res.data.data;
};

export const getPublicServices = async (params?: {
  domainId?: string;
  categoryId?: string;
  search?: string;
  featured?: boolean;
}): Promise<Service[]> => {
  const query = new URLSearchParams();
  if (params?.domainId) query.set("domainId", params.domainId);
  if (params?.categoryId) query.set("categoryId", params.categoryId);
  if (params?.search) query.set("search", params.search);
  if (params?.featured) query.set("featured", "true");
  const res = await apiClient.get(`/services?${query.toString()}`);
  return res.data.data;
};

export const getPublicServiceBySlugOrId = async (idOrSlug: string): Promise<Service> => {
  const res = await apiClient.get(`/services/${idOrSlug}`);
  return res.data.data;
};

export const getPublicServiceTemplate = async (serviceId: string): Promise<RequirementTemplate | null> => {
  const res = await apiClient.get(`/services/${serviceId}/template`);
  return res.data.data;
};

export const getPublicReferenceData = async (): Promise<ReferenceDataMap> => {
  const res = await apiClient.get("/reference-data");
  return res.data.data;
};

export const getPublicSettings = async (): Promise<SiteSetting> => {
  const res = await apiClient.get("/settings");
  return res.data.data;
};

export const getPublicFaqs = async (): Promise<CmsFaq[]> => {
  const res = await apiClient.get("/faqs");
  return res.data.data;
};

// Customer Request APIs
export const submitServiceRequest = async (payload: any): Promise<ServiceRequest> => {
  const res = await apiClient.post("/requests", payload);
  return res.data.data;
};

export const getCustomerRequests = async (params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<{ data: ServiceRequest[]; total: number; page: number; totalPages: number }> => {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  const res = await apiClient.get(`/requests?${query.toString()}`);
  return res.data;
};

export const getCustomerRequestById = async (id: string): Promise<ServiceRequest> => {
  const res = await apiClient.get(`/requests/${id}`);
  return res.data.data;
};

export const cancelCustomerRequest = async (id: string): Promise<ServiceRequest> => {
  const res = await apiClient.patch(`/requests/${id}/cancel`);
  return res.data.data;
};

export const respondCustomerRequest = async (id: string, message: string): Promise<ServiceRequest> => {
  const res = await apiClient.patch(`/requests/${id}/respond`, { message });
  return res.data.data;
};

export const submitCustomerPayment = async (
  id: string,
  payload: {
    transactionId: string;
    amountPaid?: number;
    currency?: string;
    payerName?: string;
    payerUpiId?: string;
    screenshotUrl?: string;
    notes?: string;
  }
): Promise<ServiceRequest> => {
  const res = await apiClient.post(`/requests/${id}/payment`, payload);
  return res.data.data;
};

export const uploadAsset = async (payload: {
  filename: string;
  base64Data: string;
  folder?: "qrcodes" | "payments" | "deliverables" | "references" | "files";
}): Promise<{ url: string; fileName: string; size: number }> => {
  const res = await apiClient.post("/upload", payload);
  return res.data;
};

// Admin APIs
export const getAdminOverview = async (): Promise<any> => {
  const res = await apiClient.get("/admin/overview");
  return res.data.data;
};

export const getAdminRequests = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: ServiceRequest[]; total: number; page: number; totalPages: number }> => {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const res = await apiClient.get(`/admin/requests?${query.toString()}`);
  return res.data;
};

export const updateAdminRequestStatus = async (id: string, status: string): Promise<ServiceRequest> => {
  const res = await apiClient.put(`/admin/requests/${id}/status`, { status });
  return res.data.data;
};

export const updateAdminRequest = async (id: string, payload: any): Promise<ServiceRequest> => {
  const res = await apiClient.put(`/admin/requests/${id}`, payload);
  return res.data.data;
};

export const deleteAdminRequest = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/requests/${id}`);
};

export const getAdminServices = async (): Promise<Service[]> => {
  const res = await apiClient.get("/admin/services");
  return res.data.data;
};

export const createAdminService = async (payload: any): Promise<Service> => {
  const res = await apiClient.post("/admin/services", payload);
  return res.data.data;
};

export const updateAdminService = async (id: string, payload: any): Promise<Service> => {
  const res = await apiClient.put(`/admin/services/${id}`, payload);
  return res.data.data;
};

export const deleteAdminService = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/services/${id}`);
};

export const getAdminDomains = async (): Promise<Domain[]> => {
  const res = await apiClient.get("/admin/domains");
  return res.data.data;
};

export const createAdminDomain = async (payload: any): Promise<Domain> => {
  const res = await apiClient.post("/admin/domains", payload);
  return res.data.data;
};

export const updateAdminDomain = async (id: string, payload: any): Promise<Domain> => {
  const res = await apiClient.put(`/admin/domains/${id}`, payload);
  return res.data.data;
};

export const deleteAdminDomain = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/domains/${id}`);
};

export const getAdminCategories = async (): Promise<Category[]> => {
  const res = await apiClient.get("/admin/categories");
  return res.data.data;
};

export const createAdminCategory = async (payload: any): Promise<Category> => {
  const res = await apiClient.post("/admin/categories", payload);
  return res.data.data;
};

export const updateAdminCategory = async (id: string, payload: any): Promise<Category> => {
  const res = await apiClient.put(`/admin/categories/${id}`, payload);
  return res.data.data;
};

export const deleteAdminCategory = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/categories/${id}`);
};

export const getAdminUsers = async (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<{ data: User[]; total: number; page: number; totalPages: number }> => {
  const query = new URLSearchParams();
  if (params?.role) query.set("role", params.role);
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const res = await apiClient.get(`/admin/users?${query.toString()}`);
  return res.data;
};

export const updateAdminUserStatus = async (id: string, status: string): Promise<User> => {
  const res = await apiClient.patch(`/admin/users/${id}/status`, { status });
  return res.data.data;
};

export const updateAdminUserRole = async (id: string, role: string): Promise<User> => {
  const res = await apiClient.patch(`/admin/users/${id}/role`, { role });
  return res.data.data;
};

export const resetAdminUserPassword = async (id: string, newPassword: string): Promise<User> => {
  const res = await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
  return res.data.data;
};

export const getAdminSettings = async (): Promise<SiteSetting> => {
  const res = await apiClient.get("/admin/settings");
  return res.data.data;
};

export const updateAdminSettings = async (payload: any): Promise<SiteSetting> => {
  const res = await apiClient.put("/admin/settings", payload);
  return res.data.data;
};

export const getAdminFaqs = async (): Promise<CmsFaq[]> => {
  const res = await apiClient.get("/admin/cms/faqs");
  return res.data.data;
};

export const createAdminFaq = async (payload: any): Promise<CmsFaq> => {
  const res = await apiClient.post("/admin/cms/faqs", payload);
  return res.data.data;
};

export const updateAdminFaq = async (id: string, payload: any): Promise<CmsFaq> => {
  const res = await apiClient.put(`/admin/cms/faqs/${id}`, payload);
  return res.data.data;
};

export const deleteAdminFaq = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/cms/faqs/${id}`);
};
