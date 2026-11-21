import test from "node:test";
import assert from "node:assert/strict";

import { cleanFileList, isSafeHttpUrl, safeContainsRegex } from "./requestActivity.js";
import { isValidStatusTransition } from "../models/ServiceRequest.js";

test("cleanFileList keeps http(s) links and drops script/data URLs", () => {
    const files = cleanFileList([
        { name: "Draft", url: "https://example.com/draft.pdf", size: 120 },
        { name: "Bad", url: "javascript:alert(1)" },
        { name: "Data", url: "data:text/html,<script>alert(1)</script>" },
        null,
        "not-an-object",
    ]);

    assert.equal(files.length, 1);
    assert.equal(files[0].url, "https://example.com/draft.pdf");
});

test("cleanFileList caps the number of files", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ name: `f${i}`, url: `https://x.test/${i}` }));
    assert.equal(cleanFileList(many, 5).length, 5);
});

test("safeContainsRegex treats special characters literally", () => {
    const regex = safeContainsRegex("(a+)+$");
    assert.ok(regex.test("text (a+)+$ text"));
    assert.ok(!regex.test("aaaa"));
    assert.doesNotThrow(() => safeContainsRegex("("));
});

test("isSafeHttpUrl only accepts http(s)", () => {
    assert.ok(isSafeHttpUrl("https://wa.me/1"));
    assert.ok(!isSafeHttpUrl("javascript:void(0)"));
    assert.ok(!isSafeHttpUrl(undefined));
});

test("status transitions block reopening completed work as NEW", () => {
    assert.ok(isValidStatusTransition("NEW", "IN_PROGRESS"));
    assert.ok(isValidStatusTransition("IN_PROGRESS", "COMPLETED"));
    assert.ok(!isValidStatusTransition("COMPLETED", "NEW"));
    assert.ok(!isValidStatusTransition("NEW", "COMPLETED"));
});
