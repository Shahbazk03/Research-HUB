import { Request, Response, NextFunction } from "express";
import Domain from "../models/Domain.js";

export const createDomain = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name, slug, description, imageUrl, sortOrder } = req.body;

        if (!name || !slug) {
            res.status(400).json({
                success: false,
                message: "Name and slug are required",
            });
            return;
        }

        const existingDomain = await Domain.findOne({
            slug: slug.toLowerCase(),
        });

        if (existingDomain) {
            res.status(409).json({
                success: false,
                message: "A domain with this slug already exists",
            });
            return;
        }

        const domain = await Domain.create({
            name,
            slug: slug.toLowerCase(),
            description,
            imageUrl,
            sortOrder,
        });

        res.status(201).json({
            success: true,
            data: domain,
        });
    } catch (error) {
        next(error);
    }
};

export const getDomains = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const domains = await Domain.find()
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: domains.length,
            data: domains,
        });
    } catch (error) {
        next(error);
    }
};

export const getDomainById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const domain = await Domain.findById(req.params.id);

        if (!domain) {
            res.status(404).json({
                success: false,
                message: "Domain not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: domain,
        });
    } catch (error) {
        next(error);
    }
};

export const updateDomain = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { name, slug, description, imageUrl, sortOrder, isActive } =
            req.body;

        const domain = await Domain.findByIdAndUpdate(
            req.params.id,
            {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug: slug.toLowerCase() }),
                ...(description !== undefined && { description }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(isActive !== undefined && { isActive }),
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!domain) {
            res.status(404).json({
                success: false,
                message: "Domain not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: domain,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteDomain = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const domain = await Domain.findByIdAndDelete(req.params.id);

        if (!domain) {
            res.status(404).json({
                success: false,
                message: "Domain not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Domain deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};