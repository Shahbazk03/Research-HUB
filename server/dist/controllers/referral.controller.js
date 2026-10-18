import ReferralCode from "../models/ReferralCode.js";
import { calculateReferralDiscount, normalizeReferralCode } from "../utils/referralValidation.js";
export const validateReferralCode = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        const { code, amount } = req.body ?? {};
        const normalizedCode = normalizeReferralCode(code);
        if (!normalizedCode) {
            res.status(400).json({
                success: false,
                message: "Referral code is required",
            });
            return;
        }
        const referral = await ReferralCode.findOne({
            code: normalizedCode,
            isActive: true,
        }).lean();
        if (!referral) {
            res.status(404).json({
                success: false,
                message: "Referral code is invalid or inactive",
            });
            return;
        }
        const baseAmount = Number(amount ?? 0) || 0;
        const result = calculateReferralDiscount({
            code: referral.code,
            referrerName: referral.referrerName,
            discountAmount: referral.discountAmount,
            baseAmount,
            currency: "INR",
        });
        res.status(200).json({
            success: true,
            message: "Referral code validated successfully",
            data: {
                ...referral,
                _id: referral._id.toString(),
                code: result.code,
                referrerName: result.referrerName,
                discountAmount: result.discountAmount,
                originalAmount: result.originalAmount,
                finalAmount: result.finalAmount,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
export const getReferralCodes = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
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
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=referral.controller.js.map