import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAdmin, requireStaff } from "../middleware/admin.middleware.js";
// Controllers
import { getAdminDashboardOverview } from "../controllers/adminDashboard.controller.js";
import { getAdminServiceRequests, getAdminServiceRequestById, updateAdminServiceRequest, deleteAdminServiceRequest, updateAdminServiceRequestStatus, getAdminServiceRequestStats, } from "../controllers/adminRequest.controller.js";
import { createDomain, getDomains, getDomainById, updateDomain, deleteDomain, } from "../controllers/adminDomain.controller.js";
import { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory, } from "../controllers/adminCategory.controller.js";
import { createService, getServices, getServiceById, updateService, deleteService, } from "../controllers/adminService.controller.js";
import { createRequirementTemplate, getRequirementTemplates, getRequirementTemplateById, updateRequirementTemplate, deleteRequirementTemplate, createRequirementField, getRequirementFields, updateRequirementField, deleteRequirementField, reorderRequirementFields, } from "../controllers/adminRequirement.controller.js";
import { getAdminUsers, updateAdminUserStatus, updateAdminUserRole, resetAdminUserPassword, } from "../controllers/adminUser.controller.js";
import { getAdminSettings, updateAdminSettings, } from "../controllers/adminSettings.controller.js";
import { getAdminFaqs, createAdminFaq, updateAdminFaq, deleteAdminFaq, } from "../controllers/adminCms.controller.js";
import { getAdminReferenceData, updateAdminReferenceData, } from "../controllers/adminReferenceData.controller.js";
const router = Router();
// Protect all admin routes with authentication and staff/admin role check
router.use(authenticate, requireStaff);
/* -------------------------------------------------------------------------- */
/* Dashboard Overview & Statistics                                            */
/* -------------------------------------------------------------------------- */
router.get("/overview", getAdminDashboardOverview);
/* -------------------------------------------------------------------------- */
/* Service Requests Management                                                */
/* -------------------------------------------------------------------------- */
router.get("/requests/stats", getAdminServiceRequestStats);
router.get("/requests", getAdminServiceRequests);
router.get("/requests/:id", getAdminServiceRequestById);
router.put("/requests/:id", updateAdminServiceRequest);
router.put("/requests/:id/status", updateAdminServiceRequestStatus);
router.delete("/requests/:id", requireAdmin, deleteAdminServiceRequest);
/* -------------------------------------------------------------------------- */
/* Disciplines / Research Domains Management                                  */
/* -------------------------------------------------------------------------- */
router.get("/domains", getDomains);
router.post("/domains", requireAdmin, createDomain);
router.get("/domains/:id", getDomainById);
router.put("/domains/:id", requireAdmin, updateDomain);
router.delete("/domains/:id", requireAdmin, deleteDomain);
/* -------------------------------------------------------------------------- */
/* Categories / Service Types Management                                      */
/* -------------------------------------------------------------------------- */
router.get("/categories", getCategories);
router.post("/categories", requireAdmin, createCategory);
router.get("/categories/:id", getCategoryById);
router.put("/categories/:id", requireAdmin, updateCategory);
router.delete("/categories/:id", requireAdmin, deleteCategory);
/* -------------------------------------------------------------------------- */
/* Services & Pricing Management                                              */
/* -------------------------------------------------------------------------- */
router.get("/services", getServices);
router.post("/services", requireAdmin, createService);
router.get("/services/:id", getServiceById);
router.put("/services/:id", requireAdmin, updateService);
router.delete("/services/:id", requireAdmin, deleteService);
/* -------------------------------------------------------------------------- */
/* Requirement Templates & Dynamic Fields                                      */
/* -------------------------------------------------------------------------- */
router.get("/requirements/templates", getRequirementTemplates);
router.post("/requirements/templates", requireAdmin, createRequirementTemplate);
router.get("/requirements/templates/:id", getRequirementTemplateById);
router.put("/requirements/templates/:id", requireAdmin, updateRequirementTemplate);
router.delete("/requirements/templates/:id", requireAdmin, deleteRequirementTemplate);
router.get("/requirements/fields/:templateId", getRequirementFields);
router.post("/requirements/fields", requireAdmin, createRequirementField);
router.put("/requirements/fields/:id", requireAdmin, updateRequirementField);
router.delete("/requirements/fields/:id", requireAdmin, deleteRequirementField);
router.post("/requirements/fields/reorder", requireAdmin, reorderRequirementFields);
/* -------------------------------------------------------------------------- */
/* User Accounts & Role Management                                            */
/* -------------------------------------------------------------------------- */
router.get("/users", requireAdmin, getAdminUsers);
router.patch("/users/:id/status", requireAdmin, updateAdminUserStatus);
router.patch("/users/:id/role", requireAdmin, updateAdminUserRole);
router.post("/users/:id/reset-password", requireAdmin, resetAdminUserPassword);
/* -------------------------------------------------------------------------- */
/* Website Settings & WhatsApp Configuration                                  */
/* -------------------------------------------------------------------------- */
router.get("/settings", getAdminSettings);
router.put("/settings", requireAdmin, updateAdminSettings);
/* -------------------------------------------------------------------------- */
/* CMS & FAQ Content Management                                               */
/* -------------------------------------------------------------------------- */
router.get("/cms/faqs", getAdminFaqs);
router.post("/cms/faqs", requireAdmin, createAdminFaq);
router.put("/cms/faqs/:id", requireAdmin, updateAdminFaq);
router.delete("/cms/faqs/:id", requireAdmin, deleteAdminFaq);
/* -------------------------------------------------------------------------- */
/* Reference Data Management                                                  */
/* -------------------------------------------------------------------------- */
router.get("/reference-data", getAdminReferenceData);
router.put("/reference-data/:key", requireAdmin, updateAdminReferenceData);
export default router;
//# sourceMappingURL=admin.routes.js.map