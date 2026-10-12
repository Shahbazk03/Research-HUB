import mongoose from "mongoose";
import RequirementTemplate from "../models/RequirementTemplate.js";
import RequirementField, { REQUIREMENT_FIELD_TYPES, } from "../models/RequirementField.js";
import Service from "../models/Service.js";
const getParamString = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value;
};
const isValidObjectId = (id) => {
    return !!id && mongoose.Types.ObjectId.isValid(id);
};
/*
|--------------------------------------------------------------------------
| Requirement Templates
|--------------------------------------------------------------------------
*/
/**
 * Create a requirement template
 */
export const createRequirementTemplate = async (req, res, next) => {
    try {
        const { name, description, serviceId, version = 1, } = req.body;
        if (!name || !serviceId) {
            res.status(400).json({
                success: false,
                message: "Name and serviceId are required",
            });
            return;
        }
        if (!isValidObjectId(serviceId)) {
            res.status(400).json({
                success: false,
                message: "Invalid serviceId",
            });
            return;
        }
        const service = await Service.findById(serviceId);
        if (!service) {
            res.status(404).json({
                success: false,
                message: "Service not found",
            });
            return;
        }
        const existingTemplate = await RequirementTemplate.findOne({
            serviceId,
            version,
        });
        if (existingTemplate) {
            res.status(409).json({
                success: false,
                message: `Version ${version} already exists for this service`,
            });
            return;
        }
        const template = await RequirementTemplate.create({
            name,
            description,
            serviceId,
            version,
        });
        res.status(201).json({
            success: true,
            data: template,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Get all requirement templates
 */
export const getRequirementTemplates = async (_req, res, next) => {
    try {
        const templates = await RequirementTemplate.find()
            .populate("serviceId", "name slug")
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({
            success: true,
            count: templates.length,
            data: templates,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Get template by ID with all fields
 */
export const getRequirementTemplateById = async (req, res, next) => {
    try {
        const id = getParamString(req.params.id);
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid template ID",
            });
            return;
        }
        const template = await RequirementTemplate.findById(id)
            .populate("serviceId", "name slug")
            .lean();
        if (!template) {
            res.status(404).json({
                success: false,
                message: "Requirement template not found",
            });
            return;
        }
        const fields = await RequirementField.find({
            templateId: id,
            isActive: true,
        })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();
        res.status(200).json({
            success: true,
            data: {
                template,
                fields,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Update requirement template
 */
export const updateRequirementTemplate = async (req, res, next) => {
    try {
        const id = getParamString(req.params.id);
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid template ID",
            });
            return;
        }
        const { name, description, isActive, isPublished, } = req.body;
        const template = await RequirementTemplate.findByIdAndUpdate(id, {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(isActive !== undefined && { isActive }),
            ...(isPublished !== undefined && { isPublished }),
        }, {
            new: true,
            runValidators: true,
        });
        if (!template) {
            res.status(404).json({
                success: false,
                message: "Requirement template not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: template,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Delete requirement template
 */
export const deleteRequirementTemplate = async (req, res, next) => {
    try {
        const id = getParamString(req.params.id);
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid template ID",
            });
            return;
        }
        const template = await RequirementTemplate.findByIdAndDelete(id);
        if (!template) {
            res.status(404).json({
                success: false,
                message: "Requirement template not found",
            });
            return;
        }
        await RequirementField.deleteMany({
            templateId: id,
        });
        res.status(200).json({
            success: true,
            message: "Requirement template and its fields deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
/*
|--------------------------------------------------------------------------
| Requirement Fields
|--------------------------------------------------------------------------
*/
/**
 * Create a requirement field
 */
export const createRequirementField = async (req, res, next) => {
    try {
        const { templateId, label, key, description, type, isRequired = false, placeholder, options, validation, defaultValue, sortOrder = 0, } = req.body;
        if (!templateId || !label || !key || !type) {
            res.status(400).json({
                success: false,
                message: "templateId, label, key and type are required",
            });
            return;
        }
        if (!isValidObjectId(templateId)) {
            res.status(400).json({
                success: false,
                message: "Invalid templateId",
            });
            return;
        }
        if (!REQUIREMENT_FIELD_TYPES.includes(type)) {
            res.status(400).json({
                success: false,
                message: "Invalid requirement field type",
                allowedTypes: REQUIREMENT_FIELD_TYPES,
            });
            return;
        }
        const template = await RequirementTemplate.findById(templateId);
        if (!template) {
            res.status(404).json({
                success: false,
                message: "Requirement template not found",
            });
            return;
        }
        const normalizedKey = String(key).toLowerCase();
        const existingField = await RequirementField.findOne({
            templateId,
            key: normalizedKey,
        });
        if (existingField) {
            res.status(409).json({
                success: false,
                message: "A field with this key already exists in this template",
            });
            return;
        }
        /*
         * SELECT / MULTI_SELECT / RADIO fields require options.
         */
        if (["SELECT", "MULTI_SELECT", "RADIO"].includes(type) &&
            (!Array.isArray(options) || options.length === 0)) {
            res.status(400).json({
                success: false,
                message: `${type} fields require at least one option`,
            });
            return;
        }
        const field = await RequirementField.create({
            templateId,
            label,
            key: normalizedKey,
            description,
            type,
            isRequired,
            placeholder,
            options,
            validation,
            defaultValue,
            sortOrder,
        });
        res.status(201).json({
            success: true,
            data: field,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Get fields belonging to a template
 */
export const getRequirementFields = async (req, res, next) => {
    try {
        const templateId = getParamString(req.params.templateId);
        if (!isValidObjectId(templateId)) {
            res.status(400).json({
                success: false,
                message: "Invalid template ID",
            });
            return;
        }
        const fields = await RequirementField.find({
            templateId,
        })
            .sort({ sortOrder: 1, createdAt: 1 })
            .lean();
        res.status(200).json({
            success: true,
            count: fields.length,
            data: fields,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Update a requirement field
 */
export const updateRequirementField = async (req, res, next) => {
    try {
        const id = getParamString(req.params.id);
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid field ID",
            });
            return;
        }
        const { label, key, description, type, isRequired, isActive, placeholder, options, validation, defaultValue, sortOrder, } = req.body;
        if (type !== undefined &&
            !REQUIREMENT_FIELD_TYPES.includes(type)) {
            res.status(400).json({
                success: false,
                message: "Invalid requirement field type",
                allowedTypes: REQUIREMENT_FIELD_TYPES,
            });
            return;
        }
        if (type !== undefined &&
            ["SELECT", "MULTI_SELECT", "RADIO"].includes(type) &&
            (!Array.isArray(options) || options.length === 0)) {
            res.status(400).json({
                success: false,
                message: `${type} fields require at least one option`,
            });
            return;
        }
        const field = await RequirementField.findByIdAndUpdate(id, {
            ...(label !== undefined && { label }),
            ...(key !== undefined && {
                key: String(key).toLowerCase(),
            }),
            ...(description !== undefined && {
                description,
            }),
            ...(type !== undefined && { type }),
            ...(isRequired !== undefined && {
                isRequired,
            }),
            ...(isActive !== undefined && {
                isActive,
            }),
            ...(placeholder !== undefined && {
                placeholder,
            }),
            ...(options !== undefined && { options }),
            ...(validation !== undefined && {
                validation,
            }),
            ...(defaultValue !== undefined && {
                defaultValue,
            }),
            ...(sortOrder !== undefined && {
                sortOrder,
            }),
        }, {
            new: true,
            runValidators: true,
        });
        if (!field) {
            res.status(404).json({
                success: false,
                message: "Requirement field not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: field,
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Delete a requirement field
 */
export const deleteRequirementField = async (req, res, next) => {
    try {
        const id = getParamString(req.params.id);
        if (!isValidObjectId(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid field ID",
            });
            return;
        }
        const field = await RequirementField.findByIdAndDelete(id);
        if (!field) {
            res.status(404).json({
                success: false,
                message: "Requirement field not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Requirement field deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
/**
 * Reorder requirement fields
 */
export const reorderRequirementFields = async (req, res, next) => {
    try {
        const templateId = getParamString(req.params.templateId);
        if (!isValidObjectId(templateId)) {
            res.status(400).json({
                success: false,
                message: "Invalid template ID",
            });
            return;
        }
        const { fieldIds } = req.body;
        if (!Array.isArray(fieldIds)) {
            res.status(400).json({
                success: false,
                message: "fieldIds must be an array",
            });
            return;
        }
        if (fieldIds.length === 0) {
            res.status(400).json({
                success: false,
                message: "fieldIds cannot be empty",
            });
            return;
        }
        const fields = await RequirementField.find({
            templateId,
            _id: { $in: fieldIds },
        });
        if (fields.length !== fieldIds.length) {
            res.status(400).json({
                success: false,
                message: "One or more field IDs are invalid or do not belong to this template",
            });
            return;
        }
        await Promise.all(fieldIds.map((fieldId, index) => RequirementField.findByIdAndUpdate(fieldId, {
            sortOrder: index,
        })));
        const updatedFields = await RequirementField.find({
            templateId,
        })
            .sort({ sortOrder: 1 })
            .lean();
        res.status(200).json({
            success: true,
            data: updatedFields,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=adminRequirement.controller.js.map