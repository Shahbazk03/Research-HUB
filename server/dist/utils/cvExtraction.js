/*
|--------------------------------------------------------------------------
| CV -> writer profile extraction
|--------------------------------------------------------------------------
|
| Reads an uploaded CV (PDF or DOCX) and returns suggested profile fields.
|
| - With ANTHROPIC_API_KEY set, Claude reads the CV (PDFs natively, Word via
|   extracted text) and returns schema-validated JSON.
| - Without a key (or if the AI call fails), a rule-based parser extracts
|   what it reliably can (links, ORCID, designation, publications with years).
|
| Results are only suggestions: the client fills empty fields and the writer
| reviews before saving. Nothing is written to the database here.
*/
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import Anthropic from "@anthropic-ai/sdk";
const require = createRequire(import.meta.url);
const EMPTY = {
    title: "",
    designation: "",
    institution: "",
    department: "",
    city: "",
    country: "",
    highestQualification: "",
    yearsOfExperience: "",
    bio: "",
    googleScholarUrl: "",
    orcidId: "",
    linkedinUrl: "",
    expertise: [],
    publications: [],
};
/* ------------------------------------------------------------------ */
/* Text extraction                                                     */
/* ------------------------------------------------------------------ */
const readText = async (filePath, ext) => {
    if (ext === ".docx") {
        const mammoth = require("mammoth");
        return (await mammoth.extractRawText({ path: filePath })).value;
    }
    if (ext === ".pdf") {
        // Import the library entry directly: the package index runs a debug self-test when required.
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        return (await pdfParse(await fs.readFile(filePath))).text;
    }
    return "";
};
/* ------------------------------------------------------------------ */
/* AI extraction (Claude)                                              */
/* ------------------------------------------------------------------ */
const str = { type: "string" };
const CV_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: [
        "title", "designation", "institution", "department", "city", "country", "highestQualification",
        "yearsOfExperience", "bio", "googleScholarUrl", "orcidId", "linkedinUrl", "expertise", "publications",
    ],
    properties: {
        title: { type: "string", description: "Honorific used in the CV: Dr., Prof., Mr., Ms., Mrs., or empty" },
        designation: { type: "string", description: "Current job title, e.g. Associate Professor" },
        institution: { type: "string", description: "Current university or organisation" },
        department: str,
        city: str,
        country: str,
        highestQualification: { type: "string", description: "e.g. Ph.D., M.Tech" },
        yearsOfExperience: { type: "string", description: "Total years of academic/research experience as digits, or empty" },
        bio: { type: "string", description: "2-3 sentence third-person professional summary based only on the CV" },
        googleScholarUrl: str,
        orcidId: { type: "string", description: "Format 0000-0000-0000-0000, or empty" },
        linkedinUrl: str,
        expertise: { type: "array", items: str, description: "Up to 12 short research subject areas" },
        publications: {
            type: "array",
            description: "Peer-reviewed papers, most recent first, at most 50",
            items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "journal", "year", "indexing", "url"],
                properties: {
                    title: str,
                    journal: { type: "string", description: "Journal or conference name" },
                    year: { type: "string", description: "Four-digit year or empty" },
                    indexing: { type: "string", description: "Only if the CV states it: Scopus, Web of Science, SCI/SCIE, UGC-CARE, PubMed, IEEE, etc." },
                    url: { type: "string", description: "DOI or link if given" },
                },
            },
        },
    },
};
const SYSTEM_PROMPT = "You extract structured profile data from academic CVs for a research-services platform. " +
    "Use only information that is explicitly present in the CV. Never guess or invent details; use an empty string or empty list when something is not stated. " +
    "Copy publication titles exactly as written. The bio must be a neutral summary of what the CV says, written in third person.";
const extractWithClaude = async (filePath, ext) => {
    const client = new Anthropic();
    let documentBlock;
    if (ext === ".pdf") {
        const data = (await fs.readFile(filePath)).toString("base64");
        documentBlock = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
    }
    else {
        const text = await readText(filePath, ext);
        if (!text.trim())
            throw new Error("No readable text in CV");
        documentBlock = { type: "document", source: { type: "text", media_type: "text/plain", data: text } };
    }
    const response = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: { type: "json_schema", schema: CV_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [
            {
                role: "user",
                content: [documentBlock, { type: "text", text: "Extract this person's academic profile from the CV above." }],
            },
        ],
    });
    if (response.stop_reason === "refusal")
        throw new Error("The CV could not be processed automatically");
    if (response.stop_reason === "max_tokens")
        throw new Error("CV too long to process completely");
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock)
        throw new Error("Empty extraction response");
    return { ...EMPTY, ...JSON.parse(textBlock.text) };
};
/* ------------------------------------------------------------------ */
/* Rule-based fallback                                                 */
/* ------------------------------------------------------------------ */
const DESIGNATIONS = [
    "Head of Department", "Associate Professor", "Assistant Professor", "Professor Emeritus", "Professor", "Dean", "Director",
    "Senior Lecturer", "Lecturer", "Postdoctoral Researcher", "Post-doctoral Fellow", "Research Scientist", "Senior Scientist",
    "Scientist", "Research Scholar", "Ph.D. Scholar", "PhD Scholar", "Research Associate", "Research Fellow", "Engineer",
];
const INDEXING_WORDS = [
    [/\bscopus\b/i, "Scopus"],
    [/web of science|\bwos\b/i, "Web of Science"],
    [/\bscie?\b/i, "SCI / SCIE"],
    [/ugc[- ]?care/i, "UGC-CARE"],
    [/pubmed/i, "PubMed"],
    [/\bieee\b/i, "IEEE"],
    [/springer/i, "Springer"],
    [/elsevier/i, "Elsevier"],
];
const VENUE_HINT = /\b(journal|transactions|proceedings|conference|international|letters|review|ieee|springer|elsevier|wiley|taylor|acm|mdpi|frontiers|plos)\b/i;
const firstMatch = (text, re) => text.match(re)?.[0] || "";
export const extractBasic = (text) => {
    const clean = text.replace(/\r/g, "");
    const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
    const out = { ...EMPTY, expertise: [], publications: [] };
    out.orcidId = firstMatch(clean, /\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/);
    out.googleScholarUrl = firstMatch(clean, /https?:\/\/scholar\.google\.[^\s)]+/i);
    out.linkedinUrl = firstMatch(clean, /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^\s)]+/i);
    const head = lines.slice(0, 25).join(" \n ");
    const designation = DESIGNATIONS.find((d) => new RegExp(`\\b${d.replace(/[.]/g, "\\.?")}\\b`, "i").test(head));
    if (designation)
        out.designation = designation;
    const title = head.match(/\b(Dr|Prof)\.?\s+[A-Z]/);
    if (title)
        out.title = `${title[1]}.`;
    const institution = lines.slice(0, 40).find((l) => /\b(university|institute|college|iit|nit|iiit|school of)\b/i.test(l) && l.length < 140);
    if (institution)
        out.institution = institution.replace(/^[,•\-\s]+|[,\s]+$/g, "");
    if (/\bph\.?\s?d\b/i.test(clean))
        out.highestQualification = "Ph.D.";
    else if (/\bm\.?\s?tech\b/i.test(clean))
        out.highestQualification = "M.Tech / M.E.";
    const years = clean.match(/(\d{1,2})\+?\s*(?:years|yrs)\.?\s+(?:of\s+)?(?:[a-z&]+\s+){0,4}experience/i);
    if (years)
        out.yearsOfExperience = years[1];
    // Research interests / areas of specialisation
    const interestIdx = lines.findIndex((l) => /^(research interests?|areas? of (interest|specialization|specialisation|expertise)|specialization|expertise)\b/i.test(l));
    if (interestIdx >= 0) {
        const chunk = [lines[interestIdx].replace(/^[^:]*:\s*/, ""), ...lines.slice(interestIdx + 1, interestIdx + 4)].join(", ");
        out.expertise = Array.from(new Set(chunk.split(/[,;•|]/).map((s) => s.trim().replace(/\.$/, "")).filter((s) => s.length > 2 && s.length < 60 && !/:/.test(s)))).slice(0, 12);
    }
    // Publications: lines with a plausible year and a venue hint
    const seen = new Set();
    for (const line of lines) {
        if (out.publications.length >= 50)
            break;
        const year = line.match(/\b(19[7-9]\d|20[0-4]\d)\b/)?.[1];
        if (!year || !VENUE_HINT.test(line) || line.length < 40)
            continue;
        const quoted = line.match(/[“"']([^“”"']{15,300})[”"']/)?.[1];
        const titleText = (quoted || line.split(/[.,]\s+/).find((p) => p.length > 25 && !VENUE_HINT.test(p)) || "").trim();
        if (!titleText || seen.has(titleText.toLowerCase()))
            continue;
        seen.add(titleText.toLowerCase());
        const venue = line.split(/[,.]\s+/).find((p) => VENUE_HINT.test(p)) || "";
        out.publications.push({
            title: titleText.slice(0, 400),
            journal: venue.replace(/\b(19|20)\d{2}\b.*$/, "").trim().slice(0, 300),
            year,
            indexing: INDEXING_WORDS.find(([re]) => re.test(line))?.[1] || "",
            url: firstMatch(line, /https?:\/\/\S+|\b10\.\d{4,9}\/\S+/),
        });
    }
    return out;
};
/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */
/** Resolve a public /uploads/writer-cv/<file> URL to a file on disk, refusing anything else. */
export const resolveCvPath = (cvUrl) => {
    const match = /\/uploads\/writer-cv\/([A-Za-z0-9_.-]+)$/.exec(cvUrl.split("?")[0]);
    if (!match)
        return null;
    return path.join(process.cwd(), "uploads", "writer-cv", path.basename(match[1]));
};
export const extractProfileFromCv = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
        throw Object.assign(new Error("Automatic filling works with PDF and .docx CVs. Please upload one of those formats."), { statusCode: 415 });
    }
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            return { method: "ai", profile: await extractWithClaude(filePath, ext) };
        }
        catch (error) {
            console.error("AI CV extraction failed, using basic parser:", error instanceof Error ? error.message : error);
        }
    }
    const text = await readText(filePath, ext);
    if (!text.trim()) {
        throw Object.assign(new Error("We couldn't read any text from this CV. If it is a scanned image, please fill the details manually."), { statusCode: 422 });
    }
    return {
        method: "basic",
        profile: extractBasic(text),
        note: "Basic reading was used. Please check the details carefully.",
    };
};
//# sourceMappingURL=cvExtraction.js.map