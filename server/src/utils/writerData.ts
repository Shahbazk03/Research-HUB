import type { IWriterProfile, IWriterPublication } from "../models/User.js";
import { isSafeHttpUrl } from "./requestActivity.js";

const str = (v: unknown, max: number): string | undefined => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t ? t.slice(0, max) : undefined;
};

const url = (v: unknown): string | undefined => (isSafeHttpUrl(v) ? String(v).trim().slice(0, 1000) : undefined);

/**
 * Build a safe writer-profile patch from untrusted input.
 * Writers may edit their own details; only admins may set application status,
 * the website feature flag and internal notes.
 */
export const cleanWriterProfileInput = (
    input: unknown,
    { admin = false }: { admin?: boolean } = {}
): Partial<IWriterProfile> => {
    const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const out: Partial<IWriterProfile> = {};

    const textFields: [keyof IWriterProfile, number][] = [
        ["title", 40],
        ["designation", 150],
        ["city", 100],
        ["country", 100],
        ["highestQualification", 150],
        ["bio", 3000],
        ["orcidId", 60],
    ];
    for (const [key, max] of textFields) {
        if (key in body) (out as Record<string, unknown>)[key] = str(body[key], max) ?? "";
    }

    for (const key of ["googleScholarUrl", "linkedinUrl", "cvUrl", "photoUrl"] as const) {
        if (key in body) out[key] = url(body[key]) ?? "";
    }

    if ("yearsOfExperience" in body) {
        const n = Number(body.yearsOfExperience);
        out.yearsOfExperience = Number.isFinite(n) && n >= 0 && n <= 70 ? Math.round(n) : undefined;
    }

    if ("expertise" in body && Array.isArray(body.expertise)) {
        out.expertise = Array.from(
            new Set(body.expertise.map((e) => str(e, 80)).filter((e): e is string => Boolean(e)))
        ).slice(0, 20);
    }

    if ("publications" in body && Array.isArray(body.publications)) {
        out.publications = body.publications
            .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
            .map((p): IWriterPublication | null => {
                const title = str(p.title, 400);
                if (!title) return null;
                const year = Number(p.year);
                return {
                    title,
                    journal: str(p.journal, 300),
                    year: Number.isInteger(year) && year >= 1950 && year <= 2100 ? year : undefined,
                    indexing: str(p.indexing, 120),
                    url: url(p.url),
                };
            })
            .filter((p): p is IWriterPublication => p !== null)
            .slice(0, 50);
    }

    if ("showOnWebsite" in body) out.showOnWebsite = body.showOnWebsite === true;

    if (admin) {
        if ("featuredOnWebsite" in body) out.featuredOnWebsite = body.featuredOnWebsite === true;
        if ("adminNotes" in body) out.adminNotes = str(body.adminNotes, 3000) ?? "";
    }

    return out;
};

type RequestLike = Record<string, any>;

/**
 * What a writer may see about a customer request.
 * Customer identity and contact details are never included. Reference files
 * and author names are only shared once the writer has accepted the work.
 */
export const toWriterBrief = (request: RequestLike, { full = false }: { full?: boolean } = {}) => {
    const service = request.serviceId && typeof request.serviceId === "object" ? request.serviceId : null;
    const domain = request.domainId && typeof request.domainId === "object" ? request.domainId : null;
    const profile = request.academicProfile || {};

    const brief: Record<string, unknown> = {
        _id: String(request._id),
        requestNumber: request.requestNumber,
        service: service ? { _id: String(service._id), name: service.name, slug: service.slug } : null,
        discipline: domain?.name || profile.discipline || undefined,
        requirements: request.requirements || {},
        academicLevel: profile.academicLevel,
        publicationType: profile.publicationType,
        targetJournal: profile.targetJournal,
        indexingRequirement: profile.indexingRequirement,
        citationStyle: profile.citationStyle,
        wordCount: profile.wordCount,
        customerDeadline: profile.deadline,
        brief: request.additionalMessage,
        attachmentCount: Array.isArray(request.referenceFiles) ? request.referenceFiles.length : 0,
        status: request.status,
        createdAt: request.createdAt,
    };

    if (full) {
        brief.referenceFiles = (request.referenceFiles || []).map((f: RequestLike) => ({ name: f.name, url: f.url }));
        brief.authors = {
            correspondingAuthor: profile.correspondingAuthor
                ? { name: profile.correspondingAuthor.name, designation: profile.correspondingAuthor.designation }
                : undefined,
            supervisor: profile.supervisor ? { name: profile.supervisor.name, designation: profile.supervisor.designation } : undefined,
            coAuthors: (profile.coAuthors || []).map((c: RequestLike) => ({ name: c.name, designation: c.designation })),
            university: profile.university,
            department: profile.department,
        };
    }

    return brief;
};

/** Public "Our experts" card. Contains no contact details. */
export const toPublicExpert = (user: RequestLike, completedCount = 0) => {
    const p = user.writerProfile || {};
    const publications: IWriterPublication[] = p.publications || [];
    return {
        _id: String(user._id),
        name: [p.title, user.firstName, user.lastName].filter(Boolean).join(" "),
        designation: p.designation,
        institution: user.institution,
        department: user.department,
        location: [p.city, p.country].filter(Boolean).join(", ") || undefined,
        highestQualification: p.highestQualification,
        yearsOfExperience: p.yearsOfExperience,
        expertise: p.expertise || [],
        bio: p.bio,
        photoUrl: p.photoUrl || undefined,
        googleScholarUrl: p.googleScholarUrl || undefined,
        orcidId: p.orcidId || undefined,
        publicationCount: publications.length,
        indexedIn: Array.from(new Set(publications.map((x) => x.indexing).filter(Boolean))).slice(0, 6),
        recentPublications: [...publications]
            .sort((a, b) => (b.year || 0) - (a.year || 0))
            .slice(0, 3)
            .map((x) => ({ title: x.title, journal: x.journal, year: x.year })),
        projectsCompleted: completedCount,
        joinedAt: user.createdAt,
    };
};
