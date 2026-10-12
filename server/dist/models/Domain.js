import mongoose, { Schema } from "mongoose";
const domainSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000,
    },
    imageUrl: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    sortOrder: {
        type: Number,
        default: 0,
        index: true,
    },
}, {
    timestamps: true,
});
const Domain = mongoose.model("Domain", domainSchema);
export default Domain;
//# sourceMappingURL=Domain.js.map