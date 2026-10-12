import mongoose, { Document } from "mongoose";
export declare const REQUIREMENT_FIELD_TYPES: readonly ["TEXT", "LONG_TEXT", "NUMBER", "EMAIL", "PHONE", "DATE", "SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX", "BOOLEAN", "FILE", "MULTI_FILE"];
export type RequirementFieldType = (typeof REQUIREMENT_FIELD_TYPES)[number];
export interface IRequirementField extends Document {
    templateId: mongoose.Types.ObjectId;
    label: string;
    key: string;
    description?: string;
    type: RequirementFieldType;
    isRequired: boolean;
    isActive: boolean;
    placeholder?: string;
    options?: {
        label: string;
        value: string;
    }[];
    validation?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        allowedFileTypes?: string[];
        maxFileSizeMB?: number;
    };
    defaultValue?: unknown;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const RequirementField: mongoose.Model<IRequirementField, {}, {}, {}, mongoose.Document<unknown, {}, IRequirementField, {}, mongoose.DefaultSchemaOptions> & IRequirementField & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRequirementField>;
export default RequirementField;
