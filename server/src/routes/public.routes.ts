import { Router } from "express";
import {
    getPublicDomains,
    getPublicCategories,
    getPublicServices,
    getPublicServiceBySlugOrId,
    getPublicServiceTemplate,
    getPublicReferenceData,
    getPublicSettings,
    getPublicFaqs,
} from "../controllers/publicCatalog.controller.js";

const router = Router();

// Public routes for visitors and customers
router.get("/domains", getPublicDomains);
router.get("/categories", getPublicCategories);
router.get("/services", getPublicServices);
router.get("/services/:idOrSlug", getPublicServiceBySlugOrId);
router.get("/services/:serviceId/template", getPublicServiceTemplate);
router.get("/reference-data", getPublicReferenceData);
router.get("/settings", getPublicSettings);
router.get("/faqs", getPublicFaqs);

export default router;
