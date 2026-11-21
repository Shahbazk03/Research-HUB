/*
| Late-delivery penalty for writers.
|
| A writer who has not had work APPROVED (or at least SUBMITTED) by the agreed
| deadline loses `penaltyPerDayPct` of the agreed fee for every started day of
| delay, capped at `maxPenaltyPct`. Lateness is measured at the first
| submission that the admin eventually approves, or "now" if nothing has been
| submitted yet, so the writer always sees the running penalty.
*/
export const DEFAULT_PENALTY_PER_DAY_PCT = 5;
export const DEFAULT_MAX_PENALTY_PCT = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
export const calculateWriterPenalty = ({ fee, deadline, deliveredAt, penaltyPerDayPct = DEFAULT_PENALTY_PER_DAY_PCT, maxPenaltyPct = DEFAULT_MAX_PENALTY_PCT, now = new Date(), }) => {
    const safeFee = Number.isFinite(fee) && fee > 0 ? fee : 0;
    const due = new Date(deadline).getTime();
    const delivered = deliveredAt ? new Date(deliveredAt).getTime() : now.getTime();
    if (!Number.isFinite(due) || delivered <= due) {
        return { lateDays: 0, penaltyPct: 0, penaltyAmount: 0, payableAmount: safeFee, isLate: false };
    }
    const lateDays = Math.ceil((delivered - due) / DAY_MS);
    const penaltyPct = Math.min(Math.max(0, maxPenaltyPct), Math.max(0, penaltyPerDayPct) * lateDays);
    const penaltyAmount = Math.round((safeFee * penaltyPct) / 100);
    return {
        lateDays,
        penaltyPct,
        penaltyAmount,
        payableAmount: Math.max(0, safeFee - penaltyAmount),
        isLate: true,
    };
};
//# sourceMappingURL=writerPenalty.js.map