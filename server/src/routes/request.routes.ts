import { Router } from "express";
import {
    createServiceRequest,
    getCustomerServiceRequests,
    getServiceRequestById,
    cancelCustomerRequest,
    respondCustomerRequest,
    submitCustomerPayment,
} from "../controllers/request.controller.js";
import { validateReferralCode } from "../controllers/referral.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

// Customer Service Requests (All require authentication)
router.use(authenticate);

router.post("/", createServiceRequest);
router.get("/", getCustomerServiceRequests);
router.get("/:id", getServiceRequestById);
router.patch("/:id/cancel", cancelCustomerRequest);
router.patch("/:id/respond", respondCustomerRequest);
router.post("/:id/validate-referral", validateReferralCode);
router.post("/:id/payment", submitCustomerPayment);

export default router;