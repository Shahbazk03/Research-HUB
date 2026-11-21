/*
|--------------------------------------------------------------------------
| Patents & Intellectual Property catalogue (safe, additive)
|--------------------------------------------------------------------------
|
| Adds the "Patents & Intellectual Property" discipline, its categories,
| services and request templates.
|
| - Nothing is deleted.
| - Records are matched by slug; existing records are left untouched
|   ($setOnInsert), so edits made in the admin panel are never overwritten.
| - Safe to run more than once.
|
| Run:  npx tsx scripts/seed-ip-services.ts
|
*/
import "dotenv/config";
import mongoose from "mongoose";

import Domain from "../src/models/Domain.js";
import Category from "../src/models/Category.js";
import Service from "../src/models/Service.js";
import RequirementTemplate from "../src/models/RequirementTemplate.js";
import RequirementField from "../src/models/RequirementField.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in .env");
}

type FieldSeed = {
    key: string;
    label: string;
    type: string;
    isRequired?: boolean;
    description?: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
};

const opts = (...labels: string[]) =>
    labels.map((label) => ({
        label,
        value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    }));

const TECH_FIELDS = opts(
    "Computer Science & Software",
    "Electronics & Electrical",
    "Mechanical & Manufacturing",
    "Chemical & Materials",
    "Pharmaceutical & Biotechnology",
    "Medical Devices & Healthcare",
    "Agriculture & Food Technology",
    "Civil & Environmental",
    "Other"
);

const INVENTION_CORE: FieldSeed[] = [
    {
        key: "invention_title",
        label: "Title of the invention",
        type: "TEXT",
        isRequired: true,
        placeholder: "e.g., IoT-based smart irrigation controller using soil-moisture prediction",
    },
    {
        key: "technical_field",
        label: "Technical field",
        type: "SELECT",
        isRequired: true,
        options: TECH_FIELDS,
    },
    {
        key: "invention_summary",
        label: "Describe the invention",
        type: "LONG_TEXT",
        isRequired: true,
        description: "What problem does it solve, how does it work, and what is new compared with existing solutions?",
    },
];

const DEVELOPMENT_STAGE: FieldSeed = {
    key: "development_stage",
    label: "Stage of development",
    type: "RADIO",
    isRequired: false,
    options: opts("Concept / idea", "Working prototype", "Tested and validated", "In commercial use"),
};

const PUBLIC_DISCLOSURE: FieldSeed = {
    key: "public_disclosure",
    label: "Has the invention been published, presented or sold?",
    type: "RADIO",
    isRequired: true,
    description: "Earlier public disclosure can affect patentability, so please answer accurately.",
    options: opts("No, it is confidential", "Yes, within the last 12 months", "Yes, more than 12 months ago", "Not sure"),
};

const DOMAIN = {
    slug: "patents-ip",
    name: "Patents & Intellectual Property",
    description:
        "Patent searches, specification drafting, filing support, design registration, trademarks and copyright for researchers, start-ups and institutions.",
    sortOrder: 0,
};

const CATEGORIES = [
    {
        slug: "patent-search-drafting",
        name: "Patent Search & Drafting",
        description: "Patentability searches, provisional and complete specifications, claims and drawings.",
        sortOrder: 1,
    },
    {
        slug: "patent-filing-prosecution",
        name: "Patent Filing & Prosecution",
        description: "Filing support in India and under the PCT, and responses to examination reports.",
        sortOrder: 2,
    },
    {
        slug: "design-registration",
        name: "Design Registration",
        description: "Protection for the shape, pattern and appearance of products.",
        sortOrder: 3,
    },
    {
        slug: "trademark-copyright",
        name: "Trademark & Copyright",
        description: "Brand, logo, software and creative-work protection.",
        sortOrder: 4,
    },
];

type ServiceSeed = {
    slug: string;
    name: string;
    category: string;
    shortDescription: string;
    description: string;
    turnaroundTime: string;
    deliverables: string[];
    idealFor: string[];
    isFeatured?: boolean;
    sortOrder: number;
    fields: FieldSeed[];
};

const IDEAL_INVENTORS = ["Ph.D. scholars & faculty", "University IPR cells", "Start-ups & independent inventors"];

const SERVICES: ServiceSeed[] = [
    {
        slug: "patentability-search",
        name: "Prior-Art & Patentability Search",
        category: "patent-search-drafting",
        shortDescription:
            "A structured search of patent and non-patent literature with an opinion on novelty and inventive step before you invest in filing.",
        description:
            "We search international patent databases and scientific literature for the closest prior art, map it against the features of your invention, and give a written opinion on novelty and inventive step with recommendations for strengthening the claims.",
        turnaroundTime: "5–7 business days",
        deliverables: [
            "Patentability search report",
            "Closest prior-art documents with feature mapping",
            "Opinion on novelty and inventive step",
            "Recommendations for claim strategy",
        ],
        idealFor: IDEAL_INVENTORS,
        isFeatured: true,
        sortOrder: 1,
        fields: [...INVENTION_CORE, PUBLIC_DISCLOSURE, {
            key: "search_jurisdictions",
            label: "Where do you plan to protect the invention?",
            type: "MULTI_SELECT",
            isRequired: false,
            options: opts("India", "United States", "Europe", "PCT (international)", "Not decided yet"),
        }],
    },
    {
        slug: "provisional-patent-drafting",
        name: "Provisional Patent Specification",
        category: "patent-search-drafting",
        shortDescription:
            "Secure an early priority date with a well-structured provisional specification drafted from your invention disclosure.",
        description:
            "Our technical writers prepare a provisional specification that describes your invention in enough detail to support the complete specification later, so you can establish a priority date quickly while development continues.",
        turnaroundTime: "7–10 business days",
        deliverables: [
            "Provisional specification (Form 2 format)",
            "Abstract and field of invention",
            "Draft drawings / figure list",
            "Filing checklist",
        ],
        idealFor: IDEAL_INVENTORS,
        isFeatured: true,
        sortOrder: 2,
        fields: [...INVENTION_CORE, DEVELOPMENT_STAGE, PUBLIC_DISCLOSURE],
    },
    {
        slug: "complete-patent-specification",
        name: "Complete Specification & Claims Drafting",
        category: "patent-search-drafting",
        shortDescription:
            "Full patent specification with independent and dependent claims, detailed description, abstract and drawings.",
        description:
            "We draft the complete specification, including a claim set built to cover your invention broadly while remaining defensible, a detailed description with embodiments, and formal drawings. We can convert an existing provisional application within the statutory timeline.",
        turnaroundTime: "10–15 business days",
        deliverables: [
            "Complete specification (Form 2 format)",
            "Independent and dependent claims",
            "Detailed description and embodiments",
            "Abstract and formal drawings",
        ],
        idealFor: IDEAL_INVENTORS,
        isFeatured: true,
        sortOrder: 3,
        fields: [
            ...INVENTION_CORE,
            {
                key: "provisional_filed",
                label: "Have you already filed a provisional application?",
                type: "RADIO",
                isRequired: true,
                options: opts("No", "Yes, in India", "Yes, in another country"),
            },
            DEVELOPMENT_STAGE,
            PUBLIC_DISCLOSURE,
        ],
    },
    {
        slug: "patent-drawings",
        name: "Patent Illustrations & Drawings",
        category: "patent-search-drafting",
        shortDescription: "Formal black-and-white patent drawings, flowcharts and block diagrams that meet patent office rules.",
        description:
            "We convert sketches, CAD files, photographs and circuit diagrams into formal patent drawings with correct numbering, line weights and sheet layout for Indian and international filings.",
        turnaroundTime: "3–5 business days",
        deliverables: ["Formal drawing sheets (PDF)", "Reference-numeral list", "Editable source files"],
        idealFor: IDEAL_INVENTORS,
        sortOrder: 4,
        fields: [
            { key: "invention_title", label: "Title of the invention", type: "TEXT", isRequired: true },
            { key: "number_of_figures", label: "Approximate number of figures", type: "NUMBER", isRequired: true },
            {
                key: "drawing_type",
                label: "Type of drawings needed",
                type: "MULTI_SELECT",
                isRequired: false,
                options: opts("Mechanical views", "Flowcharts", "Block / circuit diagrams", "Chemical structures", "Graphs / charts"),
            },
        ],
    },
    {
        slug: "patent-filing-support",
        name: "Patent Filing Support (India & PCT)",
        category: "patent-filing-prosecution",
        shortDescription:
            "End-to-end preparation of forms and documents for filing in India or internationally under the PCT, coordinated with registered patent agents.",
        description:
            "We prepare the filing package — specification, statutory forms, inventor and applicant declarations, and fee calculation — and coordinate submission through a registered patent agent. Includes guidance on publication, request for examination and deadlines.",
        turnaroundTime: "3–5 business days after documents are final",
        deliverables: [
            "Filing-ready document set",
            "Statutory forms (applicant / inventor details)",
            "Official fee estimate",
            "Docket of upcoming deadlines",
        ],
        idealFor: IDEAL_INVENTORS,
        sortOrder: 5,
        fields: [
            { key: "invention_title", label: "Title of the invention", type: "TEXT", isRequired: true },
            {
                key: "filing_route",
                label: "Filing route",
                type: "RADIO",
                isRequired: true,
                options: opts("India – provisional", "India – complete", "PCT international application", "Not sure, please advise"),
            },
            {
                key: "applicant_category",
                label: "Applicant category",
                type: "SELECT",
                isRequired: true,
                description: "Official fees differ by applicant category.",
                options: opts("Individual / natural person", "Start-up", "Small entity / MSME", "Educational institution", "Large entity"),
            },
            {
                key: "specification_ready",
                label: "Is the specification ready?",
                type: "RADIO",
                isRequired: true,
                options: opts("Yes, ready to file", "Draft needs review", "No, it needs to be drafted"),
            },
        ],
    },
    {
        slug: "patent-fer-response",
        name: "Examination Report (FER) Response",
        category: "patent-filing-prosecution",
        shortDescription: "Technical and legal analysis of examiner objections with a reasoned response and claim amendments.",
        description:
            "We analyse each objection in the First Examination Report, compare the cited documents with your claims, and prepare a reasoned written response with amended claims where needed, ready for submission before the deadline.",
        turnaroundTime: "7–10 business days",
        deliverables: ["Objection-wise analysis", "Written response", "Amended claim set (if required)", "Hearing preparation notes"],
        idealFor: IDEAL_INVENTORS,
        sortOrder: 6,
        fields: [
            { key: "application_number", label: "Patent application number", type: "TEXT", isRequired: true },
            { key: "fer_issue_date", label: "Date the examination report was issued", type: "DATE", isRequired: true },
            {
                key: "objection_summary",
                label: "Main objections raised",
                type: "LONG_TEXT",
                isRequired: false,
                description: "Briefly list the objections, or attach the report on the next step.",
            },
        ],
    },
    {
        slug: "design-registration",
        name: "Industrial Design Registration",
        category: "design-registration",
        shortDescription: "Protect the shape, configuration, pattern or ornamentation of a product with a registered design.",
        description:
            "We assess registrability, classify the design under the Locarno classification, prepare representation sheets and the statement of novelty, and assemble the application for filing.",
        turnaroundTime: "5–7 business days",
        deliverables: ["Registrability assessment", "Locarno classification", "Representation sheets", "Application documents"],
        idealFor: ["Product designers", "Manufacturers & MSMEs", "Start-ups"],
        sortOrder: 7,
        fields: [
            { key: "article_name", label: "Name of the product / article", type: "TEXT", isRequired: true },
            {
                key: "design_novelty",
                label: "What is new about the appearance?",
                type: "LONG_TEXT",
                isRequired: true,
            },
            PUBLIC_DISCLOSURE,
        ],
    },
    {
        slug: "trademark-registration",
        name: "Trademark Search & Registration",
        category: "trademark-copyright",
        shortDescription: "Clearance search, class selection and application filing support for brand names and logos.",
        description:
            "We search for conflicting marks, advise on the right classes of goods and services, and prepare the trademark application, then help you track examination and publication.",
        turnaroundTime: "3–5 business days",
        deliverables: ["Clearance search report", "Class recommendation", "Application documents", "Status tracking guidance"],
        idealFor: ["Start-ups", "Research labs & centres", "Businesses and professionals"],
        sortOrder: 8,
        fields: [
            { key: "mark_name", label: "Brand name / mark", type: "TEXT", isRequired: true },
            {
                key: "mark_type",
                label: "Type of mark",
                type: "RADIO",
                isRequired: true,
                options: opts("Word mark", "Logo / device", "Word and logo"),
            },
            {
                key: "goods_services",
                label: "Goods or services the mark will be used for",
                type: "LONG_TEXT",
                isRequired: true,
            },
            {
                key: "already_in_use",
                label: "Is the mark already in use?",
                type: "RADIO",
                isRequired: false,
                options: opts("Yes", "No, proposed to be used"),
            },
        ],
    },
    {
        slug: "copyright-registration",
        name: "Copyright Registration",
        category: "trademark-copyright",
        shortDescription: "Registration support for software, literary, artistic and research works.",
        description:
            "We prepare the copyright application, statement of particulars and supporting documents for software, manuscripts, course material, artistic works and databases.",
        turnaroundTime: "3–5 business days",
        deliverables: ["Application documents", "Statement of particulars", "Filing guidance"],
        idealFor: ["Authors & academics", "Software developers", "Creative professionals"],
        sortOrder: 9,
        fields: [
            { key: "work_title", label: "Title of the work", type: "TEXT", isRequired: true },
            {
                key: "work_type",
                label: "Type of work",
                type: "SELECT",
                isRequired: true,
                options: opts("Software / computer program", "Literary work (book, manuscript, thesis)", "Artistic work", "Musical / sound recording", "Cinematograph / video", "Database / compilation"),
            },
            {
                key: "work_published",
                label: "Has the work been published?",
                type: "RADIO",
                isRequired: false,
                options: opts("Unpublished", "Published"),
            },
        ],
    },
];

async function seedIpServices(): Promise<void> {
    await mongoose.connect(DATABASE_URL as string);
    console.log("Connected. Adding Patents & IP catalogue (existing records are not modified)...");

    const domain = await Domain.findOneAndUpdate(
        { slug: DOMAIN.slug },
        { $setOnInsert: { ...DOMAIN, isActive: true } },
        { upsert: true, new: true }
    );

    const categoryIds = new Map<string, mongoose.Types.ObjectId>();
    for (const category of CATEGORIES) {
        const doc = await Category.findOneAndUpdate(
            { slug: category.slug },
            { $setOnInsert: { ...category, isActive: true, domainIds: [domain._id] } },
            { upsert: true, new: true }
        );
        categoryIds.set(category.slug, doc._id as mongoose.Types.ObjectId);
    }

    let createdServices = 0;
    let createdTemplates = 0;

    for (const seed of SERVICES) {
        const { fields, category, ...serviceData } = seed;
        const existing = await Service.findOne({ slug: seed.slug }).select("_id");

        const service =
            existing ??
            (await Service.create({
                ...serviceData,
                pricingModel: "CUSTOM_QUOTE",
                currency: "INR",
                isActive: true,
                isFeatured: Boolean(seed.isFeatured),
                supportedPublicationTypes: ["Patent Specification & Claims"],
                domainIds: [domain._id],
                categoryIds: [categoryIds.get(category) as mongoose.Types.ObjectId],
            }));

        if (!existing) createdServices++;

        const hasTemplate = await RequirementTemplate.exists({ serviceId: service._id });
        if (hasTemplate) continue;

        const template = await RequirementTemplate.create({
            name: `${seed.name} – request details`,
            description: `Information needed to start ${seed.name.toLowerCase()}.`,
            serviceId: service._id,
            version: 1,
            isActive: true,
            isPublished: true,
        });

        await RequirementField.insertMany(
            fields.map((field, index) => ({
                ...field,
                isRequired: Boolean(field.isRequired),
                isActive: true,
                templateId: template._id,
                sortOrder: index + 1,
            }))
        );
        createdTemplates++;
    }

    console.log(
        `Done. Discipline: ${domain.name}. New services: ${createdServices}/${SERVICES.length}. New request templates: ${createdTemplates}.`
    );
}

seedIpServices()
    .catch((error) => {
        console.error("Failed to add IP services:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
