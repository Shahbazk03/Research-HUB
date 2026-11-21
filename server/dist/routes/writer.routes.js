import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/admin.middleware.js";
import { USER_ROLES } from "../types/roles.js";
import { expressInterest, getMyEngagement, getWriterEarnings, getWriterProfile, listMyEngagements, listOpenRequests, postWriterMessage, requireApprovedWriter, respondToOffer, submitWork, updateWriterProfile, withdrawInterest, extractMyCv, } from "../controllers/writer.controller.js";
/*
| Writer portal API — /api/writer
| Profile endpoints work while an application is pending review; everything
| involving projects requires an APPROVED writer.
*/
const router = Router();
router.use(authenticate, requireRole(USER_ROLES.WRITER));
router.get("/me", getWriterProfile);
router.put("/me", updateWriterProfile);
router.post("/me/cv-extract", extractMyCv);
router.get("/open-requests", requireApprovedWriter, listOpenRequests);
router.post("/open-requests/:id/interest", requireApprovedWriter, expressInterest);
router.get("/engagements", requireApprovedWriter, listMyEngagements);
router.get("/engagements/:id", requireApprovedWriter, getMyEngagement);
router.post("/engagements/:id/withdraw", requireApprovedWriter, withdrawInterest);
router.post("/engagements/:id/respond", requireApprovedWriter, respondToOffer);
router.post("/engagements/:id/messages", requireApprovedWriter, postWriterMessage);
router.post("/engagements/:id/submissions", requireApprovedWriter, submitWork);
router.get("/earnings", requireApprovedWriter, getWriterEarnings);
export default router;
//# sourceMappingURL=writer.routes.js.map