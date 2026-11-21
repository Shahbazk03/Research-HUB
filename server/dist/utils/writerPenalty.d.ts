export declare const DEFAULT_PENALTY_PER_DAY_PCT = 5;
export declare const DEFAULT_MAX_PENALTY_PCT = 50;
export interface PenaltyInput {
    fee: number;
    deadline: Date | string;
    deliveredAt?: Date | string | null;
    penaltyPerDayPct?: number;
    maxPenaltyPct?: number;
    now?: Date;
}
export interface PenaltyResult {
    lateDays: number;
    penaltyPct: number;
    penaltyAmount: number;
    payableAmount: number;
    isLate: boolean;
}
export declare const calculateWriterPenalty: ({ fee, deadline, deliveredAt, penaltyPerDayPct, maxPenaltyPct, now, }: PenaltyInput) => PenaltyResult;
