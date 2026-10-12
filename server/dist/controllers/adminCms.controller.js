import CmsFaq from "../models/CmsItem.js";
export const getAdminFaqs = async (_req, res, next) => {
    try {
        const faqs = await CmsFaq.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
        res.status(200).json({
            success: true,
            count: faqs.length,
            data: faqs,
        });
    }
    catch (error) {
        next(error);
    }
};
export const createAdminFaq = async (req, res, next) => {
    try {
        const { question, answer, category = "General", sortOrder = 0 } = req.body;
        if (!question || !answer) {
            res.status(400).json({
                success: false,
                message: "Question and answer are required",
            });
            return;
        }
        const faq = await CmsFaq.create({
            question: question.trim(),
            answer: answer.trim(),
            category: category.trim(),
            sortOrder: Number(sortOrder) || 0,
            isActive: true,
        });
        res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            data: faq,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateAdminFaq = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { question, answer, category, sortOrder, isActive } = req.body;
        const faq = await CmsFaq.findByIdAndUpdate(id, {
            ...(question !== undefined && { question: question.trim() }),
            ...(answer !== undefined && { answer: answer.trim() }),
            ...(category !== undefined && { category: category.trim() }),
            ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
            ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        }, { new: true, runValidators: true });
        if (!faq) {
            res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            data: faq,
        });
    }
    catch (error) {
        next(error);
    }
};
export const deleteAdminFaq = async (req, res, next) => {
    try {
        const { id } = req.params;
        const faq = await CmsFaq.findByIdAndDelete(id);
        if (!faq) {
            res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminCms.controller.js.map