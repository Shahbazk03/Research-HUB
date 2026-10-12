import { Request, Response, NextFunction } from "express";
import SiteSetting from "../models/SiteSetting.js";

export const getAdminSettings = async (
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let settings = await SiteSetting.findOne();

        if (!settings) {
            settings = await SiteSetting.create({
                platformName: "Research Hub",
                tagline: "Premier Academic Research & Publication Advisory",
                description: "Comprehensive research support for academic scholars, postgraduates, and faculty across disciplines.",
                whatsappNumber: "918004153053",
                whatsappDefaultMessageTemplate: "Hello Research Hub, I have an inquiry regarding Request #{requestNumber} for {serviceName}. Please assist me.",
                supportEmail: "support@researchhub.com",
                supportPhone: "+91 8004153053",
                businessHours: "Mon - Sat: 9:00 AM - 8:00 PM IST",
                disclaimer: "Research Hub provides ethical research consultation, technical writing guidance, proofreading, and journal formatting services.",
                academicIntegrityPolicy: "All research and advisory work adheres to COPE guidelines.",
                enableQuotations: true,
            });
        }

        res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};

export const updateAdminSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            platformName,
            tagline,
            description,
            whatsappNumber,
            whatsappDefaultMessageTemplate,
            supportEmail,
            supportPhone,
            businessHours,
            disclaimer,
            academicIntegrityPolicy,
            enableQuotations,
        } = req.body;

        let settings = await SiteSetting.findOne();

        if (!settings) {
            settings = new SiteSetting({});
        }

        if (platformName !== undefined) settings.platformName = platformName.trim();
        if (tagline !== undefined) settings.tagline = tagline.trim();
        if (description !== undefined) settings.description = description.trim();
        if (whatsappNumber !== undefined) {
            const cleanWa = whatsappNumber.trim().replace(/[^0-9]/g, "");
            settings.whatsappNumber = cleanWa;
            // If supportPhone was not explicitly provided or is still holding old default, sync it with new whatsapp number
            if (supportPhone === undefined || !supportPhone.trim() || supportPhone.includes("7905632280")) {
                settings.supportPhone = cleanWa.startsWith("91") && cleanWa.length === 12
                    ? `+91 ${cleanWa.slice(2)}`
                    : `+${cleanWa}`;
            }
        }
        if (supportPhone !== undefined && supportPhone.trim() && !supportPhone.includes("7905632280")) {
            settings.supportPhone = supportPhone.trim();
        }
        if (whatsappDefaultMessageTemplate !== undefined) settings.whatsappDefaultMessageTemplate = whatsappDefaultMessageTemplate.trim();
        if (supportEmail !== undefined) settings.supportEmail = supportEmail.trim();
        if (businessHours !== undefined) settings.businessHours = businessHours.trim();
        if (disclaimer !== undefined) settings.disclaimer = disclaimer.trim();
        if (academicIntegrityPolicy !== undefined) settings.academicIntegrityPolicy = academicIntegrityPolicy.trim();
        if (enableQuotations !== undefined) settings.enableQuotations = Boolean(enableQuotations);

        await settings.save();

        res.status(200).json({
            success: true,
            message: "Platform settings updated successfully",
            data: settings,
        });
    } catch (error) {
        next(error);
    }
};
