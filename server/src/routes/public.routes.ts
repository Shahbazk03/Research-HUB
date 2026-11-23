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

import { getPublicExperts } from "../controllers/experts.controller.js";
import { publicCache } from "../middleware/publicCache.js";

const router = Router();

// Catalogue data is the same for every visitor: answer repeat requests from memory
router.use(
    ["/domains", "/categories", "/services", "/reference-data", "/settings", "/faqs", "/experts"],
    publicCache
);

// Public routes for visitors and customers
router.get("/domains", getPublicDomains);
router.get("/categories", getPublicCategories);
router.get("/services", getPublicServices);
router.get("/services/:idOrSlug", getPublicServiceBySlugOrId);
router.get("/services/:serviceId/template", getPublicServiceTemplate);
router.get("/reference-data", getPublicReferenceData);
router.get("/settings", getPublicSettings);
router.get("/faqs", getPublicFaqs);
router.get("/experts", getPublicExperts);

export default router;
