import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { calculateReferralDiscount } from "./referralValidation.js";

describe("calculateReferralDiscount", () => {
  it("applies the referral discount to the quoted amount", () => {
    const result = calculateReferralDiscount({
      code: "SHAHBAZ01",
      referrerName: "Shahbaz",
      discountAmount: 500,
      baseAmount: 6000,
      currency: "INR",
    });

    assert.deepEqual(result, {
      code: "SHAHBAZ01",
      referrerName: "Shahbaz",
      discountAmount: 500,
      currency: "INR",
      originalAmount: 6000,
      finalAmount: 5500,
    });
  });

  it("never allows the discount to drop below zero", () => {
    const result = calculateReferralDiscount({
      code: "TEST01",
      referrerName: "Test User",
      discountAmount: 5000,
      baseAmount: 4500,
      currency: "INR",
    });

    assert.equal(result.finalAmount, 0);
  });
});
