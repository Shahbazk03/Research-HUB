import type { IWriterProfile } from "../models/User.js";
/**
 * Build a safe writer-profile patch from untrusted input.
 * Writers may edit their own details; only admins may set application status,
 * the website feature flag and internal notes.
 */
export declare const cleanWriterProfileInput: (input: unknown, { admin }?: {
    admin?: boolean;
}) => Partial<IWriterProfile>;
type RequestLike = Record<string, any>;
/**
 * What a writer may see about a customer request.
 * Customer identity and contact details are never included. Reference files
 * and author names are only shared once the writer has accepted the work.
 */
export declare const toWriterBrief: (request: RequestLike, { full }?: {
    full?: boolean;
}) => Record<string, unknown>;
/** Public "Our experts" card. Contains no contact details. */
export declare const toPublicExpert: (user: RequestLike, completedCount?: number) => {
    _id: string;
    name: string;
    designation: any;
    institution: any;
    department: any;
    location: string | undefined;
    highestQualification: any;
    yearsOfExperience: any;
    expertise: any;
    bio: any;
    photoUrl: any;
    googleScholarUrl: any;
    orcidId: any;
    publicationCount: number;
    indexedIn: (string | undefined)[];
    recentPublications: {
        title: string;
        journal: string | undefined;
        year: number | undefined;
    }[];
    projectsCompleted: number;
    joinedAt: any;
};
export {};
