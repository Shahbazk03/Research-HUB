import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Domain from "../models/Domain.js";
import Category from "../models/Category.js";
import Service from "../models/Service.js";
import RequirementTemplate from "../models/RequirementTemplate.js";
import RequirementField from "../models/RequirementField.js";
import ReferenceData from "../models/ReferenceData.js";
import SiteSetting from "../models/SiteSetting.js";
import CmsFaq from "../models/CmsItem.js";

const toStr = (val: unknown): string => (Array.isArray(val) ? String(val[0] || "") : String(val || ""));

export const getPublicDomains = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const domains = await Domain.find({ isActive: true })
            .sort({ sortOrder: 1, name: 1 })
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

export const getPublicCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { domainId } = req.query;
        const filter: Record<string, unknown> = { isActive: true };

        if (domainId && mongoose.Types.ObjectId.isValid(domainId as string)) {
            filter.domainIds = new mongoose.Types.ObjectId(domainId as string);
        }

        const categories = await Category.find(filter)
            .populate("domainIds", "name slug")
            .sort({ sortOrder: 1, name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicServices = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            domainId,
            categoryId,
            search,
            featured,
            pricingModel,
            page = "1",
            limit = "50",
        } = req.query;

        const filter: Record<string, unknown> = { isActive: true };

        if (domainId && mongoose.Types.ObjectId.isValid(domainId as string)) {
            filter.domainIds = new mongoose.Types.ObjectId(domainId as string);
        }

        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId as string)) {
            filter.categoryIds = new mongoose.Types.ObjectId(categoryId as string);
        }

        if (featured === "true") {
            filter.isFeatured = true;
        }

        if (pricingModel) {
            filter.pricingModel = pricingModel;
        }

        if (search && typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { name: regex },
                { shortDescription: regex },
                { description: regex },
            ];
        }

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
        const skip = (pageNum - 1) * limitNum;

        const [services, total] = await Promise.all([
            Service.find(filter)
                .populate("domainIds", "name slug")
                .populate("categoryIds", "name slug")
                .sort({ sortOrder: 1, isFeatured: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Service.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: services.length,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            data: services,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicServiceBySlugOrId = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const idOrSlug = toStr(req.params.idOrSlug);

        const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
        const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };

        const service = await Service.findOne({ ...query, isActive: true })
            .populate("domainIds", "name slug description")
            .populate("categoryIds", "name slug description")
            .lean();

        if (!service) {
            res.status(404).json({
                success: false,
                message: "Service not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: service,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicServiceTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const serviceId = toStr(req.params.serviceId);

        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            res.status(400).json({
                success: false,
                message: "Invalid service ID",
            });
            return;
        }

        // Find published or active template
        const template = await RequirementTemplate.findOne({
            serviceId: new mongoose.Types.ObjectId(serviceId),
            isActive: true,
        })
            .sort({ isPublished: -1, version: -1 })
            .lean();

        if (!template) {
            res.status(200).json({
                success: true,
                data: null,
                message: "No custom template defined for this service",
            });
            return;
        }

        const fields = await RequirementField.find({
            templateId: template._id,
            isActive: true,
        })
            .sort({ sortOrder: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: {
                ...template,
                fields,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicReferenceData = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const refList = await ReferenceData.find().lean();
        const mapped: Record<string, unknown> = {};

        for (const item of refList) {
            mapped[item.key] = item.items.filter((i) => i.isActive);
        }

        res.status(200).json({
            success: true,
            data: mapped,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let settings = await SiteSetting.findOne().lean();

        if (!settings) {
            // Provide sensible defaults if not yet created
            settings = {
                platformName: "Research Hub",
                tagline: "Premier Academic Research & Publication Advisory",
                description: "Comprehensive research support for academic scholars, postgraduates, and faculty.",
                whatsappNumber: "918004153053",
                whatsappDefaultMessageTemplate: "Hello Research Hub, I have an inquiry regarding Request #{requestNumber} for {serviceName}. Please assist me.",
                supportEmail: "support@researchhub.com",
                supportPhone: "+91 8004153053",
                businessHours: "Mon - Sat: 9:00 AM - 8:00 PM IST",
                disclaimer: "Research Hub provides ethical research consultation, technical writing guidance, proofreading, and journal formatting services.",
                academicIntegrityPolicy: "All research and advisory work adheres to COPE guidelines.",
                enableQuotations: true,
            } as any;
        }

        res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

export const getPublicFaqs = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const faqs = await CmsFaq.find({ isActive: true })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: faqs.length,
            data: faqs,
        });
    } catch (error) {
        next(error);
    }
};
