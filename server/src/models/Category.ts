import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    sortOrder: number;

    domainIds: mongoose.Types.ObjectId[];

    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
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

        domainIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Domain",
                index: true,
            },
        ],
    },
    {
        timestamps: true,
    }
);

categorySchema.index({
    name: "text",
    description: "text",
});

const Category = mongoose.model<ICategory>(
    "Category",
    categorySchema
);

export default Category;