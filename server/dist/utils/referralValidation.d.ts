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
export declare const normalizeReferralCode: (value: unknown) => string;
export declare const calculateReferralDiscount: ({ code, referrerName, discountAmount, baseAmount, currency, }: ReferralCalculationInput) => ReferralCalculationResult;
