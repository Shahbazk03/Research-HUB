/*
| In-memory cache for the public catalogue (services, domains, settings, experts…).
|
| These responses are identical for every visitor and change only when staff edit
| them, so repeat requests are answered without a database round-trip. Any
| successful write under /api/admin clears the cache, so edits show immediately.
*/
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 200;
const store = new Map();
export const clearPublicCache = () => {
    store.clear();
};
/**
 * Serve GET responses from memory; cache successful JSON responses.
 * Public catalogue handlers never read the signed-in user, so the cached body is the same for everyone.
 */
export const publicCache = (req, res, next) => {
    if (req.method !== "GET") {
        next();
        return;
    }
    const key = req.originalUrl;
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) {
        res.setHeader("X-Cache", "HIT");
        res.status(hit.status).json(hit.body);
        return;
    }
    if (hit)
        store.delete(key);
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode === 200) {
            if (store.size >= MAX_ENTRIES) {
                const oldest = store.keys().next().value;
                if (oldest !== undefined)
                    store.delete(oldest);
            }
            store.set(key, { status: res.statusCode, body, expiresAt: Date.now() + TTL_MS });
        }
        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
    };
    next();
};
/** Clear the public cache after any successful write that can change public data (staff edits, writer or profile updates). */
export const invalidatePublicCacheOnWrite = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        res.on("finish", () => {
            if (res.statusCode < 400)
                clearPublicCache();
        });
    }
    next();
};
//# sourceMappingURL=publicCache.js.map