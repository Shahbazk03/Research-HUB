import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminRequestSearchFilter } from "./adminRequest.controller.js";
test("reference-number search uses an exact/anchored requestNumber match", () => {
    const filter = buildAdminRequestSearchFilter("RH-014581-8109");
    assert.deepEqual(filter, {
        $or: [
            { requestNumber: { $regex: "^RH-014581-8109$", $options: "i" } },
            { requestNumber: { $regex: "RH-014581-8109", $options: "i" } },
        ],
    });
});
test("generic search still expands to customer and topic fields", () => {
    const filter = buildAdminRequestSearchFilter("muhammad@example.com");
    assert.ok(filter.$or);
    const keys = filter.$or.map((entry) => Object.keys(entry)[0]);
    assert.ok(keys.includes("customer.email"));
    assert.ok(keys.includes("requestNumber"));
});
test("empty search returns no filter", () => {
    assert.deepEqual(buildAdminRequestSearchFilter("   "), {});
});
//# sourceMappingURL=adminRequest.controller.test.js.map