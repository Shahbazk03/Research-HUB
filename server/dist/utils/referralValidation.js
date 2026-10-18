export const normalizeReferralCode = (value) => {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
};
export const calculateReferralDiscount = ({ code, referrerName, discountAmount, baseAmount, currency = "INR", }) => {
    const normalizedCode = normalizeReferralCode(code);
    const safeDiscount = Math.max(0, Number(discountAmount) || 0);
    const safeBaseAmount = Math.max(0, Number(baseAmount) || 0);
    const boundedDiscount = Math.min(safeDiscount, safeBaseAmount);
    return {
        code: normalizedCode,
        referrerName: String(referrerName ?? "").trim(),
        discountAmount: boundedDiscount,
        currency,
        originalAmount: safeBaseAmount,
        finalAmount: Math.max(0, safeBaseAmount - boundedDiscount),
    };
};
//# sourceMappingURL=referralValidation.js.map