import test from "node:test";
import assert from "node:assert/strict";

import { calculateWriterPenalty } from "./writerPenalty.js";

const deadline = new Date("2026-12-10T18:00:00Z");

test("on-time delivery has no penalty", () => {
    const r = calculateWriterPenalty({ fee: 10000, deadline, deliveredAt: "2026-12-10T17:00:00Z" });
    assert.equal(r.isLate, false);
    assert.equal(r.payableAmount, 10000);
});

test("each started day late costs the daily percentage", () => {
    const r = calculateWriterPenalty({ fee: 10000, deadline, deliveredAt: "2026-12-12T09:00:00Z", penaltyPerDayPct: 5 });
    assert.equal(r.lateDays, 2);
    assert.equal(r.penaltyAmount, 1000);
    assert.equal(r.payableAmount, 9000);
});

test("penalty is capped at the maximum percentage", () => {
    const r = calculateWriterPenalty({ fee: 10000, deadline, deliveredAt: "2027-02-01T00:00:00Z", penaltyPerDayPct: 5, maxPenaltyPct: 50 });
    assert.equal(r.penaltyPct, 50);
    assert.equal(r.payableAmount, 5000);
});

test("undelivered work accrues penalty against now", () => {
    const r = calculateWriterPenalty({ fee: 2000, deadline, now: new Date("2026-12-11T19:00:00Z") });
    assert.equal(r.lateDays, 2);
    assert.equal(r.penaltyAmount, 200);
});
