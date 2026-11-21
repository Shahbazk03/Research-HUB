export interface CvPublication {
    title: string;
    journal: string;
    year: string;
    indexing: string;
    url: string;
}
export interface CvProfile {
    title: string;
    designation: string;
    institution: string;
    department: string;
    city: string;
    country: string;
    highestQualification: string;
    yearsOfExperience: string;
    bio: string;
    googleScholarUrl: string;
    orcidId: string;
    linkedinUrl: string;
    expertise: string[];
    publications: CvPublication[];
}
export interface CvExtractionResult {
    method: "ai" | "basic";
    profile: CvProfile;
    note?: string;
}
export declare const extractBasic: (text: string) => CvProfile;
/** Resolve a public /uploads/writer-cv/<file> URL to a file on disk, refusing anything else. */
export declare const resolveCvPath: (cvUrl: string) => string | null;
export declare const extractProfileFromCv: (filePath: string) => Promise<CvExtractionResult>;
