import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { USER_ROLES, USER_STATUSES } from "../types/roles.js";
export const getAdminUsers = async (req, res, next) => {
    try {
        const { role, status, search, page = "1", limit = "20" } = req.query;
        const filter = {};
        if (role && typeof role === "string" && role.trim()) {
            filter.role = role.trim();
        }
        if (status && typeof status === "string" && status.trim()) {
            filter.status = status.trim();
        }
        if (search && typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { email: regex },
                { firstName: regex },
                { lastName: regex },
                { institution: regex },
                { department: regex },
            ];
        }
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-passwordHash")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            User.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            data: users,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateAdminUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status || !Object.values(USER_STATUSES).includes(status)) {
            res.status(400).json({
                success: false,
                message: `Status must be one of: ${Object.values(USER_STATUSES).join(", ")}`,
            });
            return;
        }
        const user = await User.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).select("-passwordHash");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "User status updated successfully",
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateAdminUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role || !Object.values(USER_ROLES).includes(role)) {
            res.status(400).json({
                success: false,
                message: `Role must be one of: ${Object.values(USER_ROLES).join(", ")}`,
            });
            return;
        }
        const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true }).select("-passwordHash");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "User role updated successfully",
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
export const resetAdminUserPassword = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: "New password must contain at least 6 characters",
            });
            return;
        }
        const passwordHash = await bcrypt.hash(newPassword, 12);
        const user = await User.findByIdAndUpdate(id, { passwordHash }, { new: true }).select("-passwordHash");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: `Password reset successfully for ${user.email}`,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminUser.controller.js.map