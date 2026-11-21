import { Router } from "express";
import { register, login, getCurrentUser, logout, updateProfile, } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { registerWriter } from "../controllers/experts.controller.js";
const router = Router();
/* Public Authentication Routes */
router.post("/register", register);
router.post("/register-writer", registerWriter);
router.post("/login", login);
router.post("/logout", logout);
/* Protected Authentication Routes */
router.get("/me", authenticate, getCurrentUser);
router.put("/profile", authenticate, updateProfile);
export default router;
//# sourceMappingURL=auth.routes.js.map