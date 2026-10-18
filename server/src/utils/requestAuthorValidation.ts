export const validateAcademicProfileAuthors = (
    academicProfile: Record<string, any> | null | undefined
): string | null => {
    if (!academicProfile || typeof academicProfile !== "object") {
        return null;
    }

    const clean = (value: unknown): string =>
        typeof value === "string" ? value.trim() : "";

    const correspondingAuthor = academicProfile.correspondingAuthor;
    const correspondingName = clean(correspondingAuthor?.name);
    const correspondingDesignation = clean(correspondingAuthor?.designation);

    if (!correspondingName || !correspondingDesignation) {
        return "Corresponding author name and designation are required.";
    }

    const coAuthors = Array.isArray(academicProfile.coAuthors)
        ? academicProfile.coAuthors
        : [];

    for (const coAuthor of coAuthors) {
        if (!coAuthor || typeof coAuthor !== "object") {
            continue;
        }

        const coAuthorName = clean(coAuthor.name);
        const coAuthorDesignation = clean(coAuthor.designation);
        const coAuthorOrcid = clean(coAuthor.orcidId);

        if (coAuthorName || coAuthorDesignation || coAuthorOrcid) {
            if (!coAuthorName || !coAuthorDesignation) {
                return "Each co-author must include both name and designation.";
            }
        }
    }

    const supervisor = academicProfile.supervisor;
    const supervisorName = clean(supervisor?.name);
    const supervisorDesignation = clean(supervisor?.designation);

    if (!supervisorName || !supervisorDesignation) {
        return "Supervisor name and designation are required.";
    }

    return null;
};
