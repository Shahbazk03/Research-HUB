import mongoose, { Schema } from "mongoose";
const cmsFaqSchema = new Schema({
    question: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
    },
    answer: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    category: {
        type: String,
        default: "General",
        trim: true,
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
export const CmsFaq = mongoose.model("CmsFaq", cmsFaqSchema);
export default CmsFaq;
//# sourceMappingURL=CmsItem.js.map