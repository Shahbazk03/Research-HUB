import type { IRequestActivity, IServiceRequest } from "../models/ServiceRequest.js";
export declare const addActivity: (request: IServiceRequest, entry: Omit<IRequestActivity, "createdAt">) => void;
/** Keep only well-formed http(s) file references; anything else (javascript:, data:) is dropped. */
export declare const cleanFileList: (files: unknown, max?: number) => {
    name: string;
    url: string;
    type?: string;
    size?: number;
}[];
export declare const isSafeHttpUrl: (value: unknown) => value is string;
export declare const escapeRegExp: (value: string) => string;
/** Case-insensitive "contains" regex built from untrusted input, length-capped and escaped. */
export declare const safeContainsRegex: (value: string) => RegExp;
