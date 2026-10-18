import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import ReferralCode from "../models/ReferralCode.js";
import { normalizeReferralCode } from "../utils/referralValidation.js";

const isValidObjectId = (id: unknown): boolean =>
    typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

export const getAdminReferralCodes = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const referrals = await ReferralCode.find({})
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: referrals.map((item) => ({
                ...item,
                _id: item._id.toString(),
            })),
        });
    } catch (error) {
        next(error);
    }
};

export const createAdminReferralCode = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { referrerName, code, discountAmount, isActive, notes } = req.body ?? {};

        const cleanName = String(referrerName ?? "").trim();
        const normalizedCode = normalizeReferralCode(code);
        const parsedDiscount = Number(discountAmount) || 0;

        if (!cleanName) {
            res.status(400).json({
                success: false,
                message: "Referrer name is required",
            });
            return;
        }

        if (!normalizedCode) {
            res.status(400).json({
                success: false,
                message: "Referral code is required",
            });
            return;
        }

        if (parsedDiscount < 0) {
            res.status(400).json({
                success: false,
                message: "Discount amount cannot be negative",
            });
            return;
        }

        const existing = await ReferralCode.findOne({ code: normalizedCode });
        if (existing) {
            res.status(409).json({
                success: false,
                message: "This referral code already exists. Please use a unique code.",
            });
            return;
        }

        const referral = await ReferralCode.create({
            referrerName: cleanName,
            code: normalizedCode,
            discountAmount: parsedDiscount,
            isActive: isActive !== false,
            notes: notes ? String(notes).trim() : "",
            createdBy: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        });

        res.status(201).json({
            success: true,
            message: "Referral code created successfully",
            data: { ...referral.toObject(), _id: referral._id.toString() },
        });
    } catch (error: any) {
        if (error?.code === 11000) {
            res.status(409).json({
                success: false,
                message: "This referral code already exists. Please use a unique code.",
            });
            return;
        }
        next(error);
    }
};

export const updateAdminReferralCode = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = req.params.id;
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid referral code ID",
            });
            return;
        }

        const { referrerName, code, discountAmount, isActive, notes } = req.body ?? {};
        const update: Record<string, unknown> = {};

        if (referrerName !== undefined) {
            const cleanName = String(referrerName).trim();
            if (!cleanName) {
                res.status(400).json({
                    success: false,
                    message: "Referrer name is required",
                });
                return;
            }
            update.referrerName = cleanName;
        }

        if (code !== undefined) {
            const normalizedCode = normalizeReferralCode(code);
            if (!normalizedCode) {
                res.status(400).json({
                    success: false,
                    message: "Referral code is required",
                });
                return;
            }
            update.code = normalizedCode;
        }

        if (discountAmount !== undefined) {
            const parsedDiscount = Number(discountAmount) || 0;
            if (parsedDiscount < 0) {
                res.status(400).json({
                    success: false,
                    message: "Discount amount cannot be negative",
                });
                return;
            }
            update.discountAmount = parsedDiscount;
        }

        if (isActive !== undefined) {
            update.isActive = Boolean(isActive);
        }

        if (notes !== undefined) {
            update.notes = String(notes).trim();
        }

        const referral = await ReferralCode.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });

        if (!referral) {
            res.status(404).json({
                success: false,
                message: "Referral code not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Referral code updated successfully",
            data: { ...referral.toObject(), _id: referral._id.toString() },
        });
    } catch (error: any) {
        if (error?.code === 11000) {
            res.status(409).json({
                success: false,
                message: "This referral code already exists. Please use a unique code.",
            });
            return;
        }
        next(error);
    }
};

export const deleteAdminReferralCode = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = req.params.id;
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid referral code ID",
            });
            return;
        }

        const referral = await ReferralCode.findByIdAndDelete(id);
        if (!referral) {
            res.status(404).json({
                success: false,
                message: "Referral code not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Referral code removed successfully",
            data: { id: referral._id.toString() },
        });
    } catch (error) {
        next(error);
    }
};
