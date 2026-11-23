import type { NextFunction, Request, Response } from "express";
export declare const clearPublicCache: () => void;
/**
 * Serve GET responses from memory; cache successful JSON responses.
 * Public catalogue handlers never read the signed-in user, so the cached body is the same for everyone.
 */
export declare const publicCache: (req: Request, res: Response, next: NextFunction) => void;
/** Clear the public cache after any successful write that can change public data (staff edits, writer or profile updates). */
export declare const invalidatePublicCacheOnWrite: (req: Request, res: Response, next: NextFunction) => void;
