import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/models/User.js";
import {
    USER_ROLES,
    USER_STATUSES,
} from "../src/types/roles.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in .env");
}

const ADMIN_EMAIL = "shahbaz@example.com";
const ADMIN_PASSWORD = "admin123";

async function createOrResetAdmin(): Promise<void> {
    try {
        await mongoose.connect(DATABASE_URL);

        console.log("MongoDB connected");

        const passwordHash = await bcrypt.hash(
            ADMIN_PASSWORD,
            12
        );

        const existingUser = await User.findOne({
            email: ADMIN_EMAIL,
        }).select("+passwordHash");

        if (existingUser) {
            existingUser.passwordHash = passwordHash;
            existingUser.role = USER_ROLES.ADMIN;
            existingUser.status = USER_STATUSES.ACTIVE;
            existingUser.firstName = "Admin";
            existingUser.lastName = "ResearchHub";

            await existingUser.save();

            console.log("");
            console.log("Admin account RESET successfully");
        } else {
            await User.create({
                email: ADMIN_EMAIL,
                passwordHash,
                firstName: "Admin",
                lastName: "ResearchHub",
                role: USER_ROLES.ADMIN,
                status: USER_STATUSES.ACTIVE,
            });

            console.log("");
            console.log("Admin account CREATED successfully");
        }

        console.log("");
        console.log("Email:", ADMIN_EMAIL);
        console.log("Password:", ADMIN_PASSWORD);
        console.log("Role:", USER_ROLES.ADMIN);
        console.log("Status:", USER_STATUSES.ACTIVE);
        console.log("");
    } catch (error) {
        console.error("Failed to create/reset admin:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createOrResetAdmin();