import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/models/User.js";
import Domain from "../src/models/Domain.js";
import Category from "../src/models/Category.js";
import Service from "../src/models/Service.js";
import RequirementTemplate from "../src/models/RequirementTemplate.js";
import RequirementField from "../src/models/RequirementField.js";
import SiteSetting from "../src/models/SiteSetting.js";
import CmsFaq from "../src/models/CmsItem.js";
import ReferenceData from "../src/models/ReferenceData.js";
import { USER_ROLES, USER_STATUSES } from "../src/types/roles.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in .env");
}

async function seedDatabase(): Promise<void> {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(DATABASE_URL);
        console.log("✅ MongoDB Atlas connected");

        // 1. Site Settings
        console.log("Seeding Site Settings...");
        await SiteSetting.deleteMany({});
        await SiteSetting.create({
            platformName: "Research Hub",
            tagline: "Premier Academic Research & Publication Advisory",
            description: "High-impact research assistance, journal manuscript preparation, thesis guidance, and academic publishing support for researchers worldwide.",
            whatsappNumber: "917905632280",
            whatsappDefaultMessageTemplate: "Hello Research Hub, I am inquiring about Service Request #{requestNumber} ({serviceName}). Please provide guidance and quotations.",
            supportEmail: "support@researchhub.com",
            supportPhone: "+91 7905632280",
            businessHours: "Monday - Saturday: 9:00 AM - 8:30 PM IST",
            disclaimer: "Research Hub provides ethical academic consulting, developmental editing, technical implementation, and journal formatting services. We adhere strictly to Committee on Publication Ethics (COPE) standards and never guarantee peer-reviewed acceptance without editorial scrutiny.",
            academicIntegrityPolicy: "All research and advisory work adheres to COPE guidelines and institutional academic honesty regulations.",
            enableQuotations: true,
        });

        // 2. Reference Data
        console.log("Seeding Reference Data...");
        await ReferenceData.deleteMany({});
        await ReferenceData.create([
            {
                key: "academic_levels",
                category: "Academic Levels",
                items: [
                    { id: "bachelors", label: "Bachelor's Degree (B.Tech / B.Sc / BA)", badge: "Undergraduate", isActive: true, sortOrder: 1 },
                    { id: "masters", label: "Master's Degree (M.Tech / M.Sc / MS / MBA)", badge: "Postgraduate", isActive: true, sortOrder: 2 },
                    { id: "mphil", label: "M.Phil. Scholar", badge: "Research Scholar", isActive: true, sortOrder: 3 },
                    { id: "phd", label: "Ph.D. / Doctoral Candidate", badge: "Doctoral", isActive: true, sortOrder: 4 },
                    { id: "postdoc", label: "Postdoctoral Researcher", badge: "Fellowship", isActive: true, sortOrder: 5 },
                    { id: "faculty", label: "University Faculty & Professors", badge: "Academic Staff", isActive: true, sortOrder: 6 },
                    { id: "independent", label: "Independent Researcher & Scientist", badge: "Independent", isActive: true, sortOrder: 7 },
                    { id: "institutional", label: "Institutional / Departmental Team", badge: "Organization", isActive: true, sortOrder: 8 },
                ],
            },
            {
                key: "disciplines",
                category: "Disciplines",
                items: [
                    { id: "cs_ai", label: "Computer Science & Artificial Intelligence", badge: "CS & AI", isActive: true, sortOrder: 1 },
                    { id: "engineering", label: "Engineering & Applied Technology", badge: "Engineering", isActive: true, sortOrder: 2 },
                    { id: "medical", label: "Medicine, Healthcare & Clinical Sciences", badge: "Medical", isActive: true, sortOrder: 3 },
                    { id: "business", label: "Management, Economics & Business Studies", badge: "Management", isActive: true, sortOrder: 4 },
                    { id: "law", label: "Law, Criminology & Legal Studies", badge: "Legal", isActive: true, sortOrder: 5 },
                    { id: "social_sciences", label: "Social Sciences & Psychology", badge: "Social", isActive: true, sortOrder: 6 },
                    { id: "humanities", label: "Humanities, History & Literature", badge: "Humanities", isActive: true, sortOrder: 7 },
                    { id: "applied_sciences", label: "Physics, Chemistry & Applied Sciences", badge: "Pure Sciences", isActive: true, sortOrder: 8 },
                ],
            },
            {
                key: "publication_types",
                category: "Publication Types",
                items: [
                    { id: "journal_article", label: "Original Journal Article", description: "Full empirical or theoretical paper", badge: "High Impact", isActive: true, sortOrder: 1 },
                    { id: "conference_paper", label: "Conference Proceeding Paper", description: "Peer-reviewed conference article", badge: "Conference", isActive: true, sortOrder: 2 },
                    { id: "systematic_review", label: "Systematic Review & Meta-Analysis", description: "PRISMA-compliant synthesis", badge: "Evidence-Based", isActive: true, sortOrder: 3 },
                    { id: "thesis", label: "Ph.D. Thesis / Master's Dissertation", description: "Complete academic dissertation", badge: "Degree Defense", isActive: true, sortOrder: 4 },
                    { id: "research_proposal", label: "Research Proposal & Synopsis", description: "Grant or doctoral proposal", badge: "Proposal", isActive: true, sortOrder: 5 },
                    { id: "book_chapter", label: "Book Chapter / Monograph", description: "Edited volume contribution", badge: "Book", isActive: true, sortOrder: 6 },
                    { id: "patent", label: "Patent Specification & Claims", description: "Technical patent draft", badge: "IP", isActive: true, sortOrder: 7 },
                    { id: "technical_report", label: "Technical & Project Report", description: "Full engineering project report", badge: "Report", isActive: true, sortOrder: 8 },
                ],
            },
            {
                key: "indexing_targets",
                category: "Indexing Targets",
                items: [
                    { id: "scopus", label: "Scopus (Elsevier)", description: "Elsevier multidisciplinary database", badge: "Q1-Q4", isActive: true, sortOrder: 1 },
                    { id: "wos_sci", label: "Web of Science (SCI / SCIE / ESCI)", description: "Clarivate Analytics Impact Factor journals", badge: "JCR / Clarivate", isActive: true, sortOrder: 2 },
                    { id: "ieee", label: "IEEE Xplore", description: "Electrical, Electronics & Computing journals", badge: "IEEE", isActive: true, sortOrder: 3 },
                    { id: "acm", label: "ACM Digital Library", description: "Association for Computing Machinery", badge: "ACM", isActive: true, sortOrder: 4 },
                    { id: "pubmed", label: "PubMed / MEDLINE", description: "Biomedical & Life Sciences index", badge: "NLM / NIH", isActive: true, sortOrder: 5 },
                    { id: "springer", label: "Springer Nature", description: "Springer & Nature portfolio journals", badge: "Springer", isActive: true, sortOrder: 6 },
                    { id: "elsevier", label: "Elsevier ScienceDirect", description: "Top-tier ScienceDirect journals", badge: "Elsevier", isActive: true, sortOrder: 7 },
                    { id: "ugc_care", label: "UGC-CARE (Group I & II)", description: "University Grants Commission recognized", badge: "UGC India", isActive: true, sortOrder: 8 },
                    { id: "google_scholar", label: "Google Scholar / Peer Reviewed", description: "Standard academic indexing", badge: "Scholar", isActive: true, sortOrder: 9 },
                ],
            },
            {
                key: "citation_styles",
                category: "Citation Formats",
                items: [
                    { id: "ieee", label: "IEEE Style", description: "Standard numeric bracket notation [1]", badge: "Tech & CS", isActive: true, sortOrder: 1 },
                    { id: "apa7", label: "APA 7th Edition", description: "Author-date format for Social Sciences", badge: "Social & Med", isActive: true, sortOrder: 2 },
                    { id: "harvard", label: "Harvard Referencing", description: "Author-date system widely used in UK & Commonwealth", badge: "Business & Life", isActive: true, sortOrder: 3 },
                    { id: "chicago", label: "Chicago 17th Edition", description: "Notes-Bibliography or Author-Date", badge: "Humanities", isActive: true, sortOrder: 4 },
                    { id: "mla9", label: "MLA 9th Edition", description: "Modern Language Association style", badge: "Literature & Arts", isActive: true, sortOrder: 5 },
                    { id: "vancouver", label: "Vancouver Style", description: "Numeric superscript for medical literature", badge: "Clinical & Med", isActive: true, sortOrder: 6 },
                    { id: "journal_specific", label: "Journal-Specific / Custom Template", description: "Adheres to author guidelines of target journal", badge: "Target Specific", isActive: true, sortOrder: 7 },
                ],
            },
        ]);

        // 3. Domains
        console.log("Seeding Domains...");
        await Domain.deleteMany({});
        const domains = await Domain.create([
            {
                name: "Computer Science & Artificial Intelligence",
                slug: "cs-ai",
                description: "Deep learning, NLP, computer vision, cybersecurity, cloud architectures, and algorithmic research.",
                sortOrder: 1,
                isActive: true,
            },
            {
                name: "Medical & Clinical Health Sciences",
                slug: "medical-health",
                description: "Clinical trials, epidemiological studies, systematic meta-analyses, pharmacology, and medical writing.",
                sortOrder: 2,
                isActive: true,
            },
            {
                name: "Engineering & Applied Technology",
                slug: "engineering",
                description: "Mechanical, electrical, civil, chemical, and materials engineering simulation and modeling.",
                sortOrder: 3,
                isActive: true,
            },
            {
                name: "Management, Economics & Business",
                slug: "business-management",
                description: "Empirical business research, marketing analytics, finance modeling, organizational behavior, and case studies.",
                sortOrder: 4,
                isActive: true,
            },
            {
                name: "Law & Legal Studies",
                slug: "law-legal",
                description: "Comparative jurisprudence, constitutional law, intellectual property, international arbitration, and policy analysis.",
                sortOrder: 5,
                isActive: true,
            },
            {
                name: "Humanities & Social Sciences",
                slug: "humanities-social",
                description: "Sociological inquiry, psychological assessments, historical reviews, philosophy, and cultural analysis.",
                sortOrder: 6,
                isActive: true,
            },
        ]);

        const domainMap = new Map(domains.map((d) => [d.slug, d._id]));

        // 4. Categories
        console.log("Seeding Categories...");
        await Category.deleteMany({});
        const categories = await Category.create([
            {
                name: "Research Paper Writing & Advisory",
                slug: "research-paper-advisory",
                description: "Rigorous manuscript drafting, experimental framing, literature survey, and journal structuring.",
                domainIds: [domainMap.get("cs-ai"), domainMap.get("medical-health"), domainMap.get("engineering"), domainMap.get("business-management")],
                sortOrder: 1,
                isActive: true,
            },
            {
                name: "Thesis & Dissertation Consulting",
                slug: "thesis-dissertation",
                description: "End-to-end doctoral and master's thesis development from proposal to defense presentation.",
                domainIds: [domainMap.get("cs-ai"), domainMap.get("engineering"), domainMap.get("humanities-social")],
                sortOrder: 2,
                isActive: true,
            },
            {
                name: "Systematic Review & Meta-Analysis",
                slug: "systematic-review",
                description: "PRISMA-guided comprehensive database synthesis, statistical forest plots, and risk-of-bias evaluation.",
                domainIds: [domainMap.get("medical-health"), domainMap.get("cs-ai")],
                sortOrder: 3,
                isActive: true,
            },
            {
                name: "Technical Implementation & Simulation",
                slug: "technical-implementation",
                description: "Working code, neural net training, MATLAB/Simulink models, ANSYS/AutoCAD design, and statistical data analysis in R/SPSS/Python.",
                domainIds: [domainMap.get("cs-ai"), domainMap.get("engineering")],
                sortOrder: 4,
                isActive: true,
            },
            {
                name: "Manuscript Editing & Proofreading",
                slug: "editing-proofreading",
                description: "Native academic English proofreading, Turnitin similarity reduction, and reference style perfection.",
                domainIds: [domainMap.get("cs-ai"), domainMap.get("medical-health"), domainMap.get("engineering"), domainMap.get("business-management"), domainMap.get("law-legal"), domainMap.get("humanities-social")],
                sortOrder: 5,
                isActive: true,
            },
        ]);

        const catMap = new Map(categories.map((c) => [c.slug, c._id]));

        // 5. Services
        console.log("Seeding Services...");
        await Service.deleteMany({});
        const services = await Service.create([
            {
                name: "AI & Deep Learning Research Manuscript",
                slug: "ai-deep-learning-paper",
                shortDescription: "Complete research paper drafting on machine learning, NLP, or computer vision ready for IEEE, Scopus, or ACM indexing.",
                description: "We provide comprehensive research paper drafting with novel architectural formulations, rigorous baseline benchmarking, mathematical formulation, and experimental discussion. Includes full code verification and journal formatting.",
                pricingModel: "CUSTOM_QUOTE",
                priceRange: { min: 150, max: 450, currency: "USD" },
                turnaroundTime: "7–14 Business Days",
                deliverables: [
                    "Full Manuscript (Word & LaTeX)",
                    "Python / PyTorch Simulation Code",
                    "High-Resolution Vector Figures",
                    "Comprehensive Plagiarism Report (<10%)",
                    "Target Journal Formatting (IEEE / Springer)",
                ],
                idealFor: ["Ph.D. Scholars", "Postgraduate Researchers", "University Faculty"],
                supportedPublicationTypes: ["Original Journal Article", "Conference Proceeding Paper"],
                supportedIndexing: ["Scopus", "Web of Science (SCI / SCIE)", "IEEE Xplore", "ACM Digital Library"],
                isActive: true,
                isFeatured: true,
                sortOrder: 1,
                domainIds: [domainMap.get("cs-ai")],
                categoryIds: [catMap.get("research-paper-advisory")],
            },
            {
                name: "Ph.D. & Doctoral Thesis Assistance",
                slug: "phd-thesis-consulting",
                shortDescription: "Comprehensive doctoral dissertation advisory covering literature review, research gaps, methodology, implementation, and conclusion.",
                description: "Rigorous doctoral thesis consulting designed for high-standard university defense. We collaborate on topic crystallization, chapter-by-chapter formulation, rigorous data synthesis, and defense presentation deck.",
                pricingModel: "RANGE",
                priceRange: { min: 400, max: 1200, currency: "USD" },
                turnaroundTime: "20–45 Business Days",
                deliverables: [
                    "Complete Dissertation Chapters (1 through 5)",
                    "Comprehensive Literature Synthesis (150+ References)",
                    "Complete Methodology & Mathematical Framework",
                    "Final Synopsis & Viva Voce PowerPoint Deck",
                    "Institutional Guideline Verification",
                ],
                idealFor: ["Ph.D. Scholars", "Doctoral Candidates"],
                supportedPublicationTypes: ["Ph.D. Thesis / Master's Dissertation", "Research Proposal & Synopsis"],
                supportedIndexing: ["University Specific", "UGC-CARE"],
                isActive: true,
                isFeatured: true,
                sortOrder: 2,
                domainIds: [domainMap.get("cs-ai"), domainMap.get("engineering")],
                categoryIds: [catMap.get("thesis-dissertation")],
            },
            {
                name: "PRISMA Systematic Review & Meta-Analysis",
                slug: "systematic-review-meta-analysis",
                shortDescription: "Evidence-based systematic literature review and statistical meta-analysis complying strictly with PRISMA 2020 guidelines.",
                description: "End-to-end systematic reviews tailored for PubMed, Lancet, Cochrane, and high-impact medical and social journals. Features PICO formulation, comprehensive search query logs, risk of bias analysis, and forest plots.",
                pricingModel: "CUSTOM_QUOTE",
                priceRange: { min: 250, max: 650, currency: "USD" },
                turnaroundTime: "14–25 Business Days",
                deliverables: [
                    "PRISMA 2020 Compliant Review Manuscript",
                    "PRISMA Flow Diagram & Database Search Logs",
                    "Risk-of-Bias Quality Appraisal Tables",
                    "Statistical Meta-Analysis Forest & Funnel Plots",
                    "PROSPERO Protocol Registration Draft",
                ],
                idealFor: ["Medical Residents", "Clinical Investigators", "Ph.D. Epidemiologists"],
                supportedPublicationTypes: ["Systematic Review & Meta-Analysis"],
                supportedIndexing: ["PubMed / MEDLINE", "Scopus", "Web of Science (SCI)"],
                isActive: true,
                isFeatured: true,
                sortOrder: 3,
                domainIds: [domainMap.get("medical-health")],
                categoryIds: [catMap.get("systematic-review")],
            },
            {
                name: "Full-Stack Algorithm Implementation & Simulation",
                slug: "algorithm-implementation-simulation",
                shortDescription: "Working implementation of complex algorithms in Python, MATLAB, Simulink, C++, or R with dataset and benchmarking report.",
                description: "Turn research ideas into reproducible code. We build custom implementations of neural models, optimization algorithms, signal processing pipelines, or engineering simulations with comprehensive documentation.",
                pricingModel: "CUSTOM_QUOTE",
                priceRange: { min: 120, max: 350, currency: "USD" },
                turnaroundTime: "5–10 Business Days",
                deliverables: [
                    "Documented Clean Source Code (GitHub / ZIP)",
                    "Preprocessed Dataset & Dataloaders",
                    "Evaluation Metrics (Accuracy, F1, Loss, Latency)",
                    "Step-by-Step Execution Guide & Video Demo",
                ],
                idealFor: ["B.Tech / M.Tech Students", "AI Researchers"],
                supportedPublicationTypes: ["Technical & Project Report", "Conference Proceeding Paper"],
                supportedIndexing: ["IEEE Xplore", "ACM Digital Library"],
                isActive: true,
                isFeatured: false,
                sortOrder: 4,
                domainIds: [domainMap.get("cs-ai"), domainMap.get("engineering")],
                categoryIds: [catMap.get("technical-implementation")],
            },
            {
                name: "Manuscript Developmental Editing & Turnitin Audit",
                slug: "manuscript-editing-turnitin",
                shortDescription: "Substantive academic English polishing, technical clarity enhancement, citation repair, and similarity reduction.",
                description: "Ensure your paper avoids desk rejection due to language or formatting flaws. Our academic editors refine terminology, sentence structure, flow, and align citations strictly to journal style manuals.",
                pricingModel: "FIXED",
                priceAmount: 85,
                priceRange: { min: 85, max: 150, currency: "USD" },
                turnaroundTime: "2–4 Business Days",
                deliverables: [
                    "Line-by-Line Track Changes Document",
                    "Clean Publication-Ready Version",
                    "Turnitin Similarity Reduction Report (<10%)",
                    "Reference Audit & Cross-Checking",
                ],
                idealFor: ["All Researchers", "ESL Scholars", "Faculty Authors"],
                supportedPublicationTypes: ["Original Journal Article", "Book Chapter", "Conference Paper"],
                supportedIndexing: ["Scopus", "Web of Science", "UGC-CARE"],
                isActive: true,
                isFeatured: true,
                sortOrder: 5,
                domainIds: [domainMap.get("cs-ai"), domainMap.get("medical-health"), domainMap.get("business-management"), domainMap.get("engineering")],
                categoryIds: [catMap.get("editing-proofreading")],
            },
            {
                name: "Management & Empirical Business Study",
                slug: "management-business-study",
                shortDescription: "Quantitative and qualitative business research, hypothesis testing, structural equation modeling (SEM), and case studies.",
                description: "Full research support for management, organizational behavior, marketing, and finance researchers. Features conceptual framework design, questionnaire development, SPSS/SmartPLS structural equation modeling, and managerial implications.",
                pricingModel: "CUSTOM_QUOTE",
                priceRange: { min: 140, max: 380, currency: "USD" },
                turnaroundTime: "7–14 Business Days",
                deliverables: [
                    "Complete Empirical Research Paper",
                    "Survey Questionnaire & Raw Dataset",
                    "SPSS / SmartPLS Statistical Output & Interpretation",
                    "APA 7th Referencing and Plagiarism Report",
                ],
                idealFor: ["MBA / Ph.D. Management Scholars", "Business Faculty"],
                supportedPublicationTypes: ["Original Journal Article", "Technical & Project Report"],
                supportedIndexing: ["Scopus", "Web of Science (ESCI)", "UGC-CARE"],
                isActive: true,
                isFeatured: false,
                sortOrder: 6,
                domainIds: [domainMap.get("business-management")],
                categoryIds: [catMap.get("research-paper-advisory")],
            },
        ]);

        // 6. Dynamic Requirement Templates & Fields
        console.log("Seeding Requirement Templates & Form Fields...");
        await RequirementTemplate.deleteMany({});
        await RequirementField.deleteMany({});

        const aiService = services.find((s) => s.slug === "ai-deep-learning-paper");
        if (aiService) {
            const template = await RequirementTemplate.create({
                name: "AI & Machine Learning Research Specification",
                description: "Dynamic requirements to tailor computational and experimental research manuscripts.",
                serviceId: aiService._id,
                version: 1,
                isActive: true,
                isPublished: true,
            });

            await RequirementField.create([
                {
                    templateId: template._id,
                    key: "research_topic",
                    label: "Proposed Research Topic / Working Title",
                    description: "Provide the tentative title or core research problem.",
                    type: "TEXT",
                    isRequired: true,
                    placeholder: "e.g., Transformer-Based Lightweight Vision Architecture for Edge Devices",
                    sortOrder: 1,
                },
                {
                    templateId: template._id,
                    key: "methodology_preference",
                    label: "Preferred Core Methodology / Model Family",
                    description: "Select the architectural approach to explore.",
                    type: "SELECT",
                    isRequired: true,
                    options: [
                        { label: "Deep Learning (CNN / ResNet / YOLO)", value: "cnn_cv" },
                        { label: "Transformer / Attention Models (BERT, ViT, LLM)", value: "transformers" },
                        { label: "Graph Neural Networks (GNN / GCN)", value: "gnn" },
                        { label: "Reinforcement Learning (DQN / PPO)", value: "rl" },
                        { label: "Ensemble & Classical Machine Learning", value: "classical_ml" },
                        { label: "Open to Expert Recommendation", value: "expert_recommend" },
                    ],
                    sortOrder: 2,
                },
                {
                    templateId: template._id,
                    key: "dataset_availability",
                    label: "Dataset Availability & Source",
                    description: "Do you have existing data or require benchmark dataset curation?",
                    type: "RADIO",
                    isRequired: true,
                    options: [
                        { label: "Public Benchmark (Kaggle / HuggingFace / UCI / PhysioNet)", value: "public_benchmark" },
                        { label: "I will provide proprietary dataset", value: "user_provided" },
                        { label: "Need synthetic or simulated data generation", value: "synthetic_generation" },
                    ],
                    sortOrder: 3,
                },
                {
                    templateId: template._id,
                    key: "simulation_hardware",
                    label: "Target Execution Environment",
                    type: "SELECT",
                    isRequired: false,
                    options: [
                        { label: "Google Colab Pro (GPU / TPU)", value: "colab" },
                        { label: "Local GPU Workstation (NVIDIA RTX)", value: "local_gpu" },
                        { label: "Cloud (AWS EC2 / Azure ML)", value: "cloud" },
                    ],
                    sortOrder: 4,
                },
                {
                    templateId: template._id,
                    key: "novelty_focus",
                    label: "Primary Novelty or Contribution Focus",
                    description: "Detail any specific mathematical, algorithmic, or ablation study requirements.",
                    type: "LONG_TEXT",
                    isRequired: false,
                    placeholder: "e.g., Focus on reducing inference parameters by 40% while preserving benchmark accuracy.",
                    sortOrder: 5,
                },
            ]);
        }

        const thesisService = services.find((s) => s.slug === "phd-thesis-consulting");
        if (thesisService) {
            const template = await RequirementTemplate.create({
                name: "Doctoral Thesis & Dissertation Specification",
                description: "Doctoral milestones and institutional thesis structure.",
                serviceId: thesisService._id,
                version: 1,
                isActive: true,
                isPublished: true,
            });

            await RequirementField.create([
                {
                    templateId: template._id,
                    key: "thesis_title",
                    label: "Registered or Working Thesis Title",
                    type: "TEXT",
                    isRequired: true,
                    placeholder: "e.g., Investigations into Resilient Cyber-Physical Smart Grid Architectures",
                    sortOrder: 1,
                },
                {
                    templateId: template._id,
                    key: "current_stage",
                    label: "Current Thesis Stage",
                    type: "SELECT",
                    isRequired: true,
                    options: [
                        { label: "Initial Topic Selection & Proposal Synopsis", value: "synopsis" },
                        { label: "Literature Review (Chapter 2)", value: "lit_review" },
                        { label: "Methodology & Experimental Modeling (Chapter 3-4)", value: "methodology" },
                        { label: "Complete Draft Review & Defense Prep (All Chapters)", value: "complete_draft" },
                    ],
                    sortOrder: 2,
                },
                {
                    templateId: template._id,
                    key: "target_submission_date",
                    label: "Target University Submission Deadline",
                    type: "DATE",
                    isRequired: true,
                    sortOrder: 3,
                },
                {
                    templateId: template._id,
                    key: "required_page_count",
                    label: "Estimated Page or Word Count Limit",
                    type: "NUMBER",
                    isRequired: false,
                    placeholder: "e.g., 200",
                    sortOrder: 4,
                },
            ]);
        }

        // 7. CMS FAQs
        console.log("Seeding FAQs...");
        await CmsFaq.deleteMany({});
        await CmsFaq.create([
            {
                question: "How does the research request process work?",
                answer: "You select your required academic service, complete our dynamic specification wizard with your research objectives, and submit your request. Our senior subject matter specialist reviews your parameters and contacts you via WhatsApp or Email within a few hours with a customized scope and quotation.",
                category: "Process",
                sortOrder: 1,
                isActive: true,
            },
            {
                question: "Do you guarantee publication in Scopus or SCI journals?",
                answer: "In strict accordance with academic integrity guidelines (COPE), Research Hub does not promise or guarantee publication acceptance. Peer review outcomes rest solely with journal editorial boards. We guarantee high-impact methodological rigor, flawless academic English, vector figures, and adherence to journal author guidelines.",
                category: "Ethics & Indexing",
                sortOrder: 2,
                isActive: true,
            },
            {
                question: "How do payments and quotations operate?",
                answer: "There are no automated online payment deductions. Once your request is submitted, our team provides an itemized quotation based on your discipline, word count, simulation requirements, and deadline. All project milestones are discussed and approved directly with you via WhatsApp.",
                category: "Pricing & Billing",
                sortOrder: 3,
                isActive: true,
            },
            {
                question: "What citation and formatting styles are supported?",
                answer: "We support IEEE, APA 7th Edition, Harvard, Chicago 17th Edition, MLA 9th Edition, Vancouver, Elsevier single/double column, Springer LNCS, and institutional thesis formatting guidelines.",
                category: "Formatting",
                sortOrder: 4,
                isActive: true,
            },
            {
                question: "Is my research idea and dataset kept confidential?",
                answer: "Absolutely. All research materials, datasets, and personal identities are protected under strict non-disclosure policies. Your intellectual property remains entirely yours.",
                category: "Confidentiality",
                sortOrder: 5,
                isActive: true,
            },
        ]);

        // 8. Admin User
        console.log("Verifying / Creating Admin Account...");
        const adminEmail = process.env.ADMIN_EMAIL || "shahbaz@example.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        await User.findOneAndUpdate(
            { email: adminEmail },
            {
                email: adminEmail,
                passwordHash,
                firstName: "Shahbaz",
                lastName: "Admin",
                role: USER_ROLES.ADMIN,
                status: USER_STATUSES.ACTIVE,
                phone: "+91 7905632280",
                whatsapp: "917905632280",
                institution: "Research Hub Headquarters",
                department: "Academic Operations",
            },
            { upsert: true, new: true }
        );

        console.log("✅ Seed completed successfully!");
        console.log(`Admin Email: ${adminEmail}`);
        console.log(`Admin Password: ${adminPassword}`);
    } catch (error) {
        console.error("❌ Seed failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
}

seedDatabase();
