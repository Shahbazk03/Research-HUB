import "dotenv/config";
import mongoose from "mongoose";
import Service from "../src/models/Service.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in .env");
}

async function updatePricing() {
    await mongoose.connect(DATABASE_URL!);
    console.log("Connected to DB");

    // Update Ph.D. & Doctoral Thesis Assistance
    await Service.updateOne(
        { slug: "phd-thesis-consulting" },
        {
            currency: "INR",
            pricingModel: "RANGE",
            priceRange: { min: 25000, max: 75000, currency: "INR" },
        }
    );

    // Update Editing & Turnitin Audit
    await Service.updateOne(
        { slug: "turnitin-similarity-remediation" },
        {
            currency: "INR",
            pricingModel: "FIXED",
            priceAmount: 4999,
            priceRange: { min: 3999, max: 7999, currency: "INR" },
        }
    );

    // Update all other services to INR with CUSTOM_QUOTE
    await Service.updateMany(
        { slug: { $nin: ["phd-thesis-consulting", "turnitin-similarity-remediation"] } },
        {
            currency: "INR",
            pricingModel: "CUSTOM_QUOTE",
        }
    );

    const services = await Service.find().select("name slug pricingModel currency priceAmount priceRange");
    console.log("Updated Services:", JSON.stringify(services, null, 2));

    await mongoose.disconnect();
    console.log("Done");
}

updatePricing().catch((err) => {
    console.error(err);
    process.exit(1);
});
