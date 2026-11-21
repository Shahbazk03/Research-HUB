import test from "node:test";
import assert from "node:assert/strict";

import { extractBasic, resolveCvPath } from "./cvExtraction.js";

const SAMPLE_CV = `
Dr. Meera Iyer
Associate Professor, Department of Computer Science
Indian Institute of Technology Madras, Chennai
ORCID: 0000-0002-1825-0097
Google Scholar: https://scholar.google.com/citations?user=abc123
LinkedIn: https://www.linkedin.com/in/meera-iyer

Education
Ph.D. in Computer Science, IISc Bangalore, 2012

Experience
12 years of teaching and research experience

Research Interests: Machine Learning, Graph Neural Networks, Traffic Forecasting; Explainable AI

Publications
1. M. Iyer, R. Rao, "Spatio-temporal graph networks for urban traffic prediction", IEEE Transactions on Intelligent Transportation Systems, 2023. (SCIE, Scopus)
2. M. Iyer, "Explainable deep models for clinical risk scoring in hospitals", Journal of Biomedical Informatics, Elsevier, 2021.
3. Short line 2020 Journal
`;

test("basic CV parser extracts links, identifiers and designation", () => {
    const p = extractBasic(SAMPLE_CV);
    assert.equal(p.orcidId, "0000-0002-1825-0097");
    assert.match(p.googleScholarUrl, /^https:\/\/scholar\.google\.com/);
    assert.match(p.linkedinUrl, /linkedin\.com\/in\/meera-iyer/);
    assert.equal(p.designation, "Associate Professor");
    assert.equal(p.title, "Dr.");
    assert.match(p.institution, /Indian Institute of Technology Madras/);
    assert.equal(p.highestQualification, "Ph.D.");
    assert.equal(p.yearsOfExperience, "12");
});

test("basic CV parser extracts research interests", () => {
    const p = extractBasic(SAMPLE_CV);
    assert.ok(p.expertise.includes("Machine Learning"));
    assert.ok(p.expertise.includes("Graph Neural Networks"));
    assert.ok(p.expertise.includes("Explainable AI"));
});

test("basic CV parser extracts publications with year, venue and indexing", () => {
    const p = extractBasic(SAMPLE_CV);
    assert.equal(p.publications.length, 2);
    const first = p.publications[0];
    assert.equal(first.title, "Spatio-temporal graph networks for urban traffic prediction");
    assert.equal(first.year, "2023");
    assert.match(first.journal, /IEEE Transactions/);
    assert.equal(first.indexing, "Scopus");
    assert.equal(p.publications[1].year, "2021");
});

test("CV path resolution only accepts uploaded CV files", () => {
    assert.ok(resolveCvPath("http://localhost:5000/uploads/writer-cv/123_ab_cv.pdf")?.endsWith("123_ab_cv.pdf"));
    assert.equal(resolveCvPath("http://localhost:5000/uploads/payments/x.pdf"), null);
    assert.equal(resolveCvPath("http://x/uploads/writer-cv/../../.env"), null);
});
