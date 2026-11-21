import type { IRequestActivity, IServiceRequest } from "../models/ServiceRequest.js";

export const addActivity = (
    request: IServiceRequest,
    entry: Omit<IRequestActivity, "createdAt">
): void => {
    if (!Array.isArray(request.activity)) {
        request.activity = [];
    }
    request.activity.push({ ...entry, createdAt: new Date() });
};

const SAFE_URL = /^https?:\/\//i;

/** Keep only well-formed http(s) file references; anything else (javascript:, data:) is dropped. */
export const cleanFileList = (
    files: unknown,
    max = 20
): { name: string; url: string; type?: string; size?: number }[] => {
    if (!Array.isArray(files)) return [];
    return files
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .filter((f) => typeof f.url === "string" && SAFE_URL.test(f.url.trim()))
        .slice(0, max)
        .map((f) => ({
            name: String(f.name || "Attachment").trim().slice(0, 200),
            url: String(f.url).trim().slice(0, 2000),
            type: typeof f.type === "string" ? f.type.trim().slice(0, 100) : undefined,
            size: typeof f.size === "number" && Number.isFinite(f.size) ? f.size : undefined,
        }));
};

export const isSafeHttpUrl = (value: unknown): value is string =>
    typeof value === "string" && SAFE_URL.test(value.trim());

export const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive "contains" regex built from untrusted input, length-capped and escaped. */
export const safeContainsRegex = (value: string): RegExp =>
    new RegExp(escapeRegExp(value.trim().slice(0, 100)), "i");
