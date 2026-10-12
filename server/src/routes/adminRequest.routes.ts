import { Router } from "express";

import {
    authenticate,
} from "../middleware/auth.middleware.js";

import {
    requireAdmin,
} from "../middleware/admin.middleware.js";

import {
    getAdminServiceRequests,
    getAdminServiceRequestById,
    updateAdminServiceRequest,
    deleteAdminServiceRequest,
} from "../controllers/adminRequest.controller.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| ADMIN SERVICE REQUEST ROUTES
|--------------------------------------------------------------------------
|
| Base:
| /api/admin/requests
|
| Authentication:
| authenticate -> requireAdmin
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| AUTHENTICATION + ADMIN ACCESS
|--------------------------------------------------------------------------
*/

router.use(
    authenticate,
    requireAdmin
);

/*
|--------------------------------------------------------------------------
| GET ALL REQUESTS
|--------------------------------------------------------------------------
|
| GET /api/admin/requests
|
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    getAdminServiceRequests
);

/*
|--------------------------------------------------------------------------
| GET REQUEST BY ID
|--------------------------------------------------------------------------
|
| GET /api/admin/requests/:id
|
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    getAdminServiceRequestById
);

/*
|--------------------------------------------------------------------------
| UPDATE REQUEST
|--------------------------------------------------------------------------
|
| PUT /api/admin/requests/:id
|
|--------------------------------------------------------------------------
*/

router.put(
    "/:id",
    updateAdminServiceRequest
);

/*
|--------------------------------------------------------------------------
| DELETE REQUEST
|--------------------------------------------------------------------------
|
| DELETE /api/admin/requests/:id
|
|--------------------------------------------------------------------------
*/

router.delete(
    "/:id",
    deleteAdminServiceRequest
);

export default router;