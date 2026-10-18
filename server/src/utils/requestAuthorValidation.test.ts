import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateAcademicProfileAuthors } from "./requestAuthorValidation.js";

describe("validateAcademicProfileAuthors", () => {
  it("requires corresponding author and supervisor details", () => {
    const error = validateAcademicProfileAuthors({
      academicLevel: "Ph.D.",
      correspondingAuthor: { name: "", designation: "" },
      supervisor: { name: "Dr. Sen", designation: "Professor" },
    });

    assert.equal(
      error,
      "Corresponding author name and designation are required."
    );
  });

  it("allows optional ORCID and validates co-author entries when present", () => {
    const error = validateAcademicProfileAuthors({
      academicLevel: "Ph.D.",
      correspondingAuthor: { name: "Asha Kumar", designation: "Lead Author" },
      coAuthors: [{ name: "", designation: "Researcher" }],
      supervisor: { name: "Dr. Sen", designation: "Professor", orcidId: "" },
    });

    assert.equal(
      error,
      "Each co-author must include both name and designation."
    );
  });

  it("accepts valid author metadata with optional ORCID", () => {
    const error = validateAcademicProfileAuthors({
      academicLevel: "Ph.D.",
      correspondingAuthor: {
        name: "Asha Kumar",
        designation: "Lead Author",
        orcidId: "https://orcid.org/0000-0002-1234-5678",
      },
      coAuthors: [
        { name: "Ravi Singh", designation: "Co-author" },
        { name: "Meera Shah", designation: "Co-author", orcidId: "" },
      ],
      supervisor: {
        name: "Dr. Sen",
        designation: "Professor",
      },
    });

    assert.equal(error, null);
  });
});
