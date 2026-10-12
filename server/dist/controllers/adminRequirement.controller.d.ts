import { Request, Response, NextFunction } from "express";
/**
 * Create a requirement template
 */
export declare const createRequirementTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all requirement templates
 */
export declare const getRequirementTemplates: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get template by ID with all fields
 */
export declare const getRequirementTemplateById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update requirement template
 */
export declare const updateRequirementTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete requirement template
 */
export declare const deleteRequirementTemplate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Create a requirement field
 */
export declare const createRequirementField: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get fields belonging to a template
 */
export declare const getRequirementFields: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Update a requirement field
 */
export declare const updateRequirementField: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Delete a requirement field
 */
export declare const deleteRequirementField: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Reorder requirement fields
 */
export declare const reorderRequirementFields: (req: Request, res: Response, next: NextFunction) => Promise<void>;
