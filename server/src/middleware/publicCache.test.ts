import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { NextFunction, Request, Response } from "express";

import { clearPublicCache, invalidatePublicCacheOnWrite, publicCache } from "./publicCache.js";

const makeRes = () => {
    const res = new EventEmitter() as EventEmitter & Record<string, any>;
    res.statusCode = 200;
    res.headers = {} as Record<string, string>;
    res.body = undefined;
    res.setHeader = (k: string, v: string) => {
        res.headers[k] = v;
    };
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (body: unknown) => {
        res.body = body;
        return res;
    };
    return res;
};

const run = (url: string, handler: (res: any) => void, method = "GET") => {
    const req = { method, originalUrl: url, headers: {} } as unknown as Request;
    const res = makeRes();
    let reachedHandler = false;
    publicCache(req, res as unknown as Response, (() => {
        reachedHandler = true;
        handler(res);
    }) as NextFunction);
    return { res, reachedHandler };
};

test("second identical request is served from memory", () => {
    clearPublicCache();
    let dbCalls = 0;
    const handler = (res: any) => {
        dbCalls += 1;
        res.status(200).json({ success: true, data: [1, 2, 3] });
    };

    const first = run("/api/services?featured=true", handler);
    const second = run("/api/services?featured=true", handler);

    assert.equal(dbCalls, 1);
    assert.equal(first.res.headers["X-Cache"], "MISS");
    assert.equal(second.reachedHandler, false);
    assert.equal(second.res.headers["X-Cache"], "HIT");
    assert.deepEqual(second.res.body, { success: true, data: [1, 2, 3] });
});

test("error responses are not cached", () => {
    clearPublicCache();
    let calls = 0;
    const handler = (res: any) => {
        calls += 1;
        res.status(404).json({ success: false });
    };
    run("/api/services/missing", handler);
    run("/api/services/missing", handler);
    assert.equal(calls, 2);
});

test("a successful staff write clears the cache", () => {
    clearPublicCache();
    let calls = 0;
    const handler = (res: any) => {
        calls += 1;
        res.status(200).json({ success: true });
    };
    run("/api/domains", handler);

    const writeReq = { method: "PUT" } as Request;
    const writeRes = makeRes();
    invalidatePublicCacheOnWrite(writeReq, writeRes as unknown as Response, (() => undefined) as NextFunction);
    writeRes.statusCode = 200;
    writeRes.emit("finish");

    run("/api/domains", handler);
    assert.equal(calls, 2);
});

test("a failed write keeps the cache", () => {
    clearPublicCache();
    let calls = 0;
    const handler = (res: any) => {
        calls += 1;
        res.status(200).json({ success: true });
    };
    run("/api/faqs", handler);

    const writeRes = makeRes();
    invalidatePublicCacheOnWrite({ method: "POST" } as Request, writeRes as unknown as Response, (() => undefined) as NextFunction);
    writeRes.statusCode = 400;
    writeRes.emit("finish");

    run("/api/faqs", handler);
    assert.equal(calls, 1);
});
