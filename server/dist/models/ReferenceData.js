import mongoose, { Schema } from "mongoose";
const referenceDataSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
    },
    items: [
        {
            _id: false,
            id: { type: String, required: true },
            label: { type: String, required: true },
            description: String,
            badge: String,
            isActive: { type: Boolean, default: true },
            sortOrder: { type: Number, default: 0 },
        },
    ],
}, {
    timestamps: true,
});
const ReferenceData = mongoose.model("ReferenceData", referenceDataSchema);
export default ReferenceData;
//# sourceMappingURL=ReferenceData.js.map