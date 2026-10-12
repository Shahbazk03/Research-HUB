import Service from "../models/Service.js";
import Domain from "../models/Domain.js";
import Category from "../models/Category.js";
export const createService = async (req, res, next) => {
    try {
        const { name, slug, shortDescription, description, imageUrl, pricingModel = "CUSTOM_QUOTE", currency = "INR", priceAmount, priceRange, turnaroundTime, deliverables = [], idealFor = [], supportedPublicationTypes = [], supportedIndexing = [], domainIds = [], categoryIds = [], sortOrder = 0, isFeatured = false, isActive = true, } = req.body;
        if (!name || !slug) {
            res.status(400).json({
                success: false,
                message: "Name and slug are required",
            });
            return;
        }
        if (domainIds.length > 0) {
            const count = await Domain.countDocuments({
                _id: { $in: domainIds },
            });
            if (count !== domainIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more domains are invalid",
                });
                return;
            }
        }
        if (categoryIds.length > 0) {
            const count = await Category.countDocuments({
                _id: { $in: categoryIds },
            });
            if (count !== categoryIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more categories are invalid",
                });
                return;
            }
        }
        const existingService = await Service.findOne({
            slug: slug.toLowerCase(),
        });
        if (existingService) {
            res.status(409).json({
                success: false,
                message: "A service with this slug already exists",
            });
            return;
        }
        const normalizedPriceRange = priceRange !== undefined
            ? {
                min: priceRange.min !== undefined ? Number(priceRange.min) : undefined,
                max: priceRange.max !== undefined ? Number(priceRange.max) : undefined,
                currency: currency || priceRange.currency || "INR",
            }
            : undefined;
        const service = await Service.create({
            name,
            slug: slug.toLowerCase(),
            shortDescription,
            description,
            imageUrl,
            pricingModel,
            currency: currency || "INR",
            priceAmount: priceAmount !== undefined ? Number(priceAmount) : undefined,
            priceRange: normalizedPriceRange,
            turnaroundTime,
            deliverables,
            idealFor,
            supportedPublicationTypes,
            supportedIndexing,
            domainIds,
            categoryIds,
            sortOrder,
            isFeatured,
            isActive,
        });
        res.status(201).json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getServices = async (req, res, next) => {
    try {
        const services = await Service.find()
            .populate("domainIds", "name slug")
            .populate("categoryIds", "name slug")
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id)
            .populate("domainIds", "name slug")
            .populate("categoryIds", "name slug");
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
    }
    catch (error) {
        next(error);
    }
};
export const updateService = async (req, res, next) => {
    try {
        const { name, slug, shortDescription, description, imageUrl, pricingModel, currency, priceAmount, priceRange, turnaroundTime, deliverables, idealFor, supportedPublicationTypes, supportedIndexing, domainIds, categoryIds, sortOrder, isFeatured, isActive, } = req.body;
        if (domainIds !== undefined && domainIds.length > 0) {
            const count = await Domain.countDocuments({
                _id: { $in: domainIds },
            });
            if (count !== domainIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more domains are invalid",
                });
                return;
            }
        }
        if (categoryIds !== undefined && categoryIds.length > 0) {
            const count = await Category.countDocuments({
                _id: { $in: categoryIds },
            });
            if (count !== categoryIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more categories are invalid",
                });
                return;
            }
        }
        const normalizedPriceRange = priceRange !== undefined
            ? {
                min: priceRange.min !== undefined ? Number(priceRange.min) : undefined,
                max: priceRange.max !== undefined ? Number(priceRange.max) : undefined,
                currency: currency || priceRange.currency || "INR",
            }
            : undefined;
        const service = await Service.findByIdAndUpdate(req.params.id, {
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug: slug.toLowerCase() }),
            ...(shortDescription !== undefined && { shortDescription }),
            ...(description !== undefined && { description }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(pricingModel !== undefined && { pricingModel }),
            ...(currency !== undefined && { currency }),
            ...(priceAmount !== undefined && { priceAmount: Number(priceAmount) }),
            ...(normalizedPriceRange !== undefined && { priceRange: normalizedPriceRange }),
            ...(turnaroundTime !== undefined && { turnaroundTime }),
            ...(deliverables !== undefined && { deliverables }),
            ...(idealFor !== undefined && { idealFor }),
            ...(supportedPublicationTypes !== undefined && { supportedPublicationTypes }),
            ...(supportedIndexing !== undefined && { supportedIndexing }),
            ...(domainIds !== undefined && { domainIds }),
            ...(categoryIds !== undefined && { categoryIds }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(isFeatured !== undefined && { isFeatured }),
            ...(isActive !== undefined && { isActive }),
        }, {
            new: true,
            runValidators: true,
        });
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
    }
    catch (error) {
        next(error);
    }
};
export const deleteService = async (req, res, next) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
            res.status(404).json({
                success: false,
                message: "Service not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Service deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminService.controller.js.map