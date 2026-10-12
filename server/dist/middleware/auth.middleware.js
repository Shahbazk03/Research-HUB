import { verifyAccessToken, } from "../utils/jwt.js";
import { USER_STATUSES, } from "../types/roles.js";
import User from "../models/User.js";
/*
|--------------------------------------------------------------------------
| Authenticate Middleware
|--------------------------------------------------------------------------
|
| Reads:
|
| Authorization: Bearer <JWT>
|
| Then:
|
| 1. Extracts the token
| 2. Verifies the JWT
| 3. Checks that the user still exists
| 4. Checks that the account is ACTIVE
| 5. Attaches the user to req.user
|
|--------------------------------------------------------------------------
*/
export const authenticate = async (req, res, next) => {
    try {
        /*
        |--------------------------------------------------------------------------
        | Get Authorization Header
        |--------------------------------------------------------------------------
        */
        const authorization = req.headers.authorization;
        if (!authorization) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Validate Bearer Format
        |--------------------------------------------------------------------------
        */
        if (!authorization.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Invalid authorization format",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Extract Token
        |--------------------------------------------------------------------------
        */
        const token = authorization.substring(7).trim();
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication token is missing",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Verify JWT
        |--------------------------------------------------------------------------
        */
        let payload;
        try {
            payload =
                verifyAccessToken(token);
        }
        catch (error) {
            console.error("JWT verification failed:", error);
            res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Validate Payload
        |--------------------------------------------------------------------------
        */
        if (!payload ||
            !payload.userId ||
            !payload.role) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Find Current User
        |--------------------------------------------------------------------------
        |
        | We check the database rather than trusting the JWT alone.
        |
        | This means a suspended/deleted user cannot continue using
        | an old valid JWT.
        |
        |--------------------------------------------------------------------------
        */
        const user = await User.findById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User account no longer exists",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Check Account Status
        |--------------------------------------------------------------------------
        */
        if (user.status !==
            USER_STATUSES.ACTIVE) {
            res.status(403).json({
                success: false,
                message: "Your account is not active. Please contact support.",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Verify JWT Role Against Database
        |--------------------------------------------------------------------------
        |
        | The database is the current source of truth for the user's role.
        |
        |--------------------------------------------------------------------------
        */
        if (user.role !== payload.role) {
            res.status(401).json({
                success: false,
                message: "Authentication token is no longer valid",
            });
            return;
        }
        /*
        |--------------------------------------------------------------------------
        | Attach Authenticated User
        |--------------------------------------------------------------------------
        */
        req.user = {
            userId: user._id.toString(),
            role: user.role,
        };
        /*
        |--------------------------------------------------------------------------
        | Continue
        |--------------------------------------------------------------------------
        */
        next();
    }
    catch (error) {
        console.error("Authentication middleware error:", error);
        next(error);
    }
};
//# sourceMappingURL=auth.middleware.js.map