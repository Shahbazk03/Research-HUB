import ReferenceData from "../models/ReferenceData.js";
export const getAdminReferenceData = async (_req, res, next) => {
    try {
        const records = await ReferenceData.find().sort({ category: 1 }).lean();
        res.status(200).json({
            success: true,
            data: records,
        });
    }
    catch (error) {
        next(error);
    }
};
export const updateAdminReferenceData = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { category, items } = req.body;
        if (!Array.isArray(items)) {
            res.status(400).json({
                success: false,
                message: "Items must be an array",
            });
            return;
        }
        const updated = await ReferenceData.findOneAndUpdate({ key }, {
            ...(category && { category }),
            items,
        }, { upsert: true, new: true, runValidators: true });
        res.status(200).json({
            success: true,
            message: "Reference data updated successfully",
            data: updated,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminReferenceData.controller.js.map