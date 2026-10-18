export interface ReferralCalculationInput {
    code: string;
    referrerName: string;
    discountAmount: number;
    baseAmount: number;
    currency?: string;
}

export interface ReferralCalculationResult {
    code: string;
    referrerName: string;
    discountAmount: number;
    currency: string;
    originalAmount: number;
    finalAmount: number;
}

export const normalizeReferralCode = (value: unknown): string => {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
};

export const calculateReferralDiscount = ({
    code,
    referrerName,
    discountAmount,
    baseAmount,
    currency = "INR",
}: ReferralCalculationInput): ReferralCalculationResult => {
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
