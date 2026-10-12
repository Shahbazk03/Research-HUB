import {
    Request,
    Response,
    NextFunction,
} from "express";

import bcrypt from "bcryptjs";

import User from "../models/User.js";

import {
    generateAccessToken,
} from "../utils/jwt.js";

import {
    USER_ROLES,
    USER_STATUSES,
} from "../types/roles.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const sanitizeUser = (user: any) => {
    return {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        whatsapp: user.whatsapp,
        academicLevel: user.academicLevel,
        institution: user.institution,
        department: user.department,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
|
| POST /api/auth/register
|
| Body:
|
| {
|   "email": "user@example.com",
|   "password": "StrongPassword123!",
|   "firstName": "John",
|   "lastName": "Doe",
|   "phone": "+919876543210"
| }
|
|--------------------------------------------------------------------------
*/

export const register = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            phone,
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | Required fields
        |--------------------------------------------------------------------------
        */

        if (
            !email ||
            !password ||
            !firstName
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Email, password and first name are required",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Validate field types
        |--------------------------------------------------------------------------
        */

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof firstName !== "string"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Invalid registration data",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Normalize email
        |--------------------------------------------------------------------------
        */

        const normalizedEmail =
            email.trim().toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | Validate email
        |--------------------------------------------------------------------------
        */

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            res.status(400).json({
                success: false,
                message:
                    "Please provide a valid email address",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Password validation
        |--------------------------------------------------------------------------
        */

        if (password.length < 8) {
            res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 8 characters",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Check existing account
        |--------------------------------------------------------------------------
        */

        const existingUser =
            await User.findOne({
                email: normalizedEmail,
            });

        if (existingUser) {
            res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Hash password
        |--------------------------------------------------------------------------
        */

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        /*
        |--------------------------------------------------------------------------
        | Create customer
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | Public registration can ONLY create a
        | CUSTOMER account.
        |
        | The client cannot submit:
        |
        | {
        |   "role": "ADMIN"
        | }
        |
        | and elevate itself.
        |
        |--------------------------------------------------------------------------
        */

        const user = await User.create({
            email: normalizedEmail,

            passwordHash,

            firstName: firstName.trim(),

            lastName:
                typeof lastName === "string"
                    ? lastName.trim()
                    : undefined,

            phone:
                typeof phone === "string"
                    ? phone.trim()
                    : undefined,

            role: USER_ROLES.CUSTOMER,

            status: USER_STATUSES.ACTIVE,
        });

        /*
        |--------------------------------------------------------------------------
        | Generate JWT
        |--------------------------------------------------------------------------
        */

        const token =
            generateAccessToken({
                userId: user._id.toString(),
                role: user.role,
            });

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        res.status(201).json({
            success: true,
            message:
                "Account created successfully",
            data: {
                user: sanitizeUser(user),
                token,
                accessToken: token,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
|
| POST /api/auth/login
|
| Body:
|
| {
|   "email": "user@example.com",
|   "password": "StrongPassword123!"
| }
|
|--------------------------------------------------------------------------
*/

export const login = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            email,
            password,
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | Validate input
        |--------------------------------------------------------------------------
        */

        if (
            !email ||
            !password
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Email and password are required",
            });

            return;
        }

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Invalid login data",
            });

            return;
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        /*
        |--------------------------------------------------------------------------
        | Find user including passwordHash
        |--------------------------------------------------------------------------
        */

        const user =
            await User.findOne({
                email: normalizedEmail,
            }).select("+passwordHash");

        /*
        |--------------------------------------------------------------------------
        | Do not reveal whether the email exists
        |--------------------------------------------------------------------------
        */

        if (!user) {
            res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Check account status
        |--------------------------------------------------------------------------
        */

        if (
            user.status !==
            USER_STATUSES.ACTIVE
        ) {
            res.status(403).json({
                success: false,
                message:
                    "Your account is not active. Please contact support.",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Compare password
        |--------------------------------------------------------------------------
        */

        const passwordMatches =
            await bcrypt.compare(
                password,
                user.passwordHash
            );

        if (!passwordMatches) {
            res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Generate JWT
        |--------------------------------------------------------------------------
        */

        const token =
            generateAccessToken({
                userId: user._id.toString(),
                role: user.role,
            });

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            success: true,
            message:
                "Login successful",
            data: {
                user: sanitizeUser(user),
                token,
                accessToken: token,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
|
| GET /api/auth/me
|
| Requires:
|
| Authorization: Bearer <token>
|
|--------------------------------------------------------------------------
*/

export const getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        /*
        |--------------------------------------------------------------------------
        | Authentication middleware should have
        | already populated req.user.
        |--------------------------------------------------------------------------
        */

        if (!req.user) {
            res.status(401).json({
                success: false,
                message:
                    "Authentication required",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Get fresh user data from database
        |--------------------------------------------------------------------------
        */

        const user =
            await User.findById(
                req.user.userId
            );

        if (!user) {
            res.status(401).json({
                success: false,
                message:
                    "User account no longer exists",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Check account status again
        |--------------------------------------------------------------------------
        */

        if (
            user.status !==
            USER_STATUSES.ACTIVE
        ) {
            res.status(403).json({
                success: false,
                message:
                    "Your account is not active",
            });

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Return current user
        |--------------------------------------------------------------------------
        */

        res.status(200).json({
            success: true,
            data: {
                user: sanitizeUser(user),
            },
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (
    _req: Request,
    res: Response
): Promise<void> => {
    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

export const updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const {
            firstName,
            lastName,
            phone,
            whatsapp,
            academicLevel,
            institution,
            department,
        } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        if (firstName !== undefined) user.firstName = firstName.trim();
        if (lastName !== undefined) user.lastName = lastName.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (whatsapp !== undefined) user.whatsapp = whatsapp.trim();
        if (academicLevel !== undefined) user.academicLevel = academicLevel.trim();
        if (institution !== undefined) user.institution = institution.trim();
        if (department !== undefined) user.department = department.trim();

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                user: sanitizeUser(user),
            },
        });
    } catch (error) {
        next(error);
    }
};