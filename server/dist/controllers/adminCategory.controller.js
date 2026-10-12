import Category from "../models/Category.js";
import Domain from "../models/Domain.js";
export const createCategory = async (req, res, next) => {
    try {
        const { name, slug, description, domainIds = [], sortOrder = 0, } = req.body;
        if (!name || !slug) {
            res.status(400).json({
                success: false,
                message: "Name and slug are required",
            });
            return;
        }
        if (domainIds.length > 0) {
            const domainCount = await Domain.countDocuments({
                _id: { $in: domainIds },
            });
            if (domainCount !== domainIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more domains are invalid",
                });
                return;
            }
        }
        const category = await Category.create({
            name,
            slug: slug.toLowerCase(),
            description,
            domainIds,
            sortOrder,
        });
        res.status(201).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getCategories = async (req, res, next) => {
    try {
        const categories = await Category.find()
            .populate("domainIds", "name slug")
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    }
    catch (error) {
        next(error);
    }
};
export const getCategoryById = async (req, res, next) => {
    try {
        const category = await Category.findById(req.params.id).populate("domainIds", "name slug");
        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateCategory = async (req, res, next) => {
    try {
        const { name, slug, description, domainIds, sortOrder, isActive, } = req.body;
        if (domainIds !== undefined && domainIds.length > 0) {
            const domainCount = await Domain.countDocuments({
                _id: { $in: domainIds },
            });
            if (domainCount !== domainIds.length) {
                res.status(400).json({
                    success: false,
                    message: "One or more domains are invalid",
                });
                return;
            }
        }
        const category = await Category.findByIdAndUpdate(req.params.id, {
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug: slug.toLowerCase() }),
            ...(description !== undefined && { description }),
            ...(domainIds !== undefined && { domainIds }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(isActive !== undefined && { isActive }),
        }, {
            new: true,
            runValidators: true,
        });
        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: category,
        });
    }
    catch (error) {
        next(error);
    }
};
export const deleteCategory = async (req, res, next) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminCategory.controller.js.map