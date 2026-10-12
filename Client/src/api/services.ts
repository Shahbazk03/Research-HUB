import apiClient from './client';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Domain {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  domainIds: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface Service {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  domainIds: string[];
  categoryIds: string[];
  // Academic-specific metadata
  deliverables?: string[];
  turnaround?: string;
  idealFor?: string;
}

export type ServiceRequestStatus =
  | 'NEW' | 'UNDER_REVIEW' | 'NEEDS_INFORMATION'
  | 'QUOTATION_SENT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ServiceRequest {
  _id: string;
  requestNumber: string;
  userId?: string;
  customer: { name: string; email: string; phone?: string; whatsapp?: string; };
  serviceId: string | Service;
  domainId?: string;
  categoryId?: string;
  requirements: Record<string, unknown>;
  additionalMessage?: string;
  preferredContactMethod: 'WHATSAPP' | 'EMAIL' | 'PHONE';
  status: ServiceRequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementField {
  _id: string; key: string; label: string; description?: string;
  type: 'TEXT' | 'LONG_TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE' |
        'SELECT' | 'MULTI_SELECT' | 'RADIO' | 'CHECKBOX' | 'BOOLEAN' | 'FILE' | 'MULTI_FILE';
  isRequired: boolean; isActive: boolean; placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: { min?: number; max?: number };
  defaultValue?: unknown; sortOrder: number;
}

export interface RequirementTemplate {
  _id: string; name: string; description?: string; serviceId: string;
  version: number; isActive: boolean; isPublished: boolean;
  fields: RequirementField[];
}

// ─── Academic Departments (Domains) ────────────────────────────────────────

export const MOCK_DOMAINS: Domain[] = [
  { _id: 'd1', name: 'Computer Science & AI', slug: 'cs-ai', description: 'Software projects, AI/ML systems, web & mobile apps, cybersecurity and data science', isActive: true, sortOrder: 1 },
  { _id: 'd2', name: 'Medical & Health Sciences', slug: 'medical', description: 'Clinical research, healthcare studies, biomedical projects and medical writing', isActive: true, sortOrder: 2 },
  { _id: 'd3', name: 'Business & Management', slug: 'business', description: 'MBA projects, case studies, business plans, marketing research and HR studies', isActive: true, sortOrder: 3 },
  { _id: 'd4', name: 'Engineering', slug: 'engineering', description: 'Civil, mechanical, electrical and chemical engineering projects and research', isActive: true, sortOrder: 4 },
  { _id: 'd5', name: 'Social Sciences', slug: 'social-sciences', description: 'Sociology, psychology, political science, education and anthropology research', isActive: true, sortOrder: 5 },
  { _id: 'd6', name: 'Economics & Finance', slug: 'economics', description: 'Economic analysis, financial modeling, investment research and quantitative studies', isActive: true, sortOrder: 6 },
  { _id: 'd7', name: 'Law & Legal Studies', slug: 'law', description: 'Legal research, case briefs, contract analysis and policy reviews', isActive: true, sortOrder: 7 },
  { _id: 'd8', name: 'Humanities & Arts', slug: 'humanities', description: 'Literature, history, philosophy, cultural studies and creative writing', isActive: true, sortOrder: 8 },
];

// ─── Service Types (Categories) ────────────────────────────────────────────

export const MOCK_CATEGORIES: (Category & { domainId: string })[] = [
  { _id: 'c1', domainId: 'd1', domainIds: ['d1'], name: 'Project Writing', slug: 'project-writing', description: 'Complete project development with documentation, code and report', isActive: true, sortOrder: 1 },
  { _id: 'c2', domainId: 'd1', domainIds: ['d1'], name: 'Research Paper', slug: 'research-paper', description: 'Original research papers ready for journal or conference submission', isActive: true, sortOrder: 2 },
  { _id: 'c3', domainId: 'd1', domainIds: ['d1'], name: 'Thesis / Dissertation', slug: 'thesis', description: 'Complete thesis or dissertation for bachelor\'s, master\'s or PhD', isActive: true, sortOrder: 3 },
  { _id: 'c4', domainId: 'd1', domainIds: ['d1'], name: 'Paper Review & Editing', slug: 'review', description: 'Expert review, editing and plagiarism removal for your existing paper', isActive: true, sortOrder: 4 },
  { _id: 'c5', domainId: 'd2', domainIds: ['d2'], name: 'Project Writing', slug: 'medical-project', description: 'Clinical projects, case reports and medical research projects', isActive: true, sortOrder: 1 },
  { _id: 'c6', domainId: 'd2', domainIds: ['d2'], name: 'Research Paper', slug: 'medical-paper', description: 'Evidence-based medical and clinical research papers', isActive: true, sortOrder: 2 },
  { _id: 'c7', domainId: 'd2', domainIds: ['d2'], name: 'Systematic Review', slug: 'systematic-review', description: 'PRISMA-based systematic reviews and meta-analyses', isActive: true, sortOrder: 3 },
  { _id: 'c8', domainId: 'd3', domainIds: ['d3'], name: 'MBA / BBA Project', slug: 'mba-project', description: 'Business school projects, internship reports and field studies', isActive: true, sortOrder: 1 },
  { _id: 'c9', domainId: 'd3', domainIds: ['d3'], name: 'Research Paper', slug: 'business-paper', description: 'Management, marketing and organizational behaviour research', isActive: true, sortOrder: 2 },
  { _id: 'c10', domainId: 'd4', domainIds: ['d4'], name: 'Final Year Project', slug: 'engineering-fyp', description: 'Engineering final year projects with full documentation', isActive: true, sortOrder: 1 },
  { _id: 'c11', domainId: 'd4', domainIds: ['d4'], name: 'Research Paper', slug: 'engineering-paper', description: 'Technical research papers for engineering journals', isActive: true, sortOrder: 2 },
  { _id: 'c12', domainId: 'd5', domainIds: ['d5'], name: 'Research Paper', slug: 'social-paper', description: 'Qualitative and quantitative social science research', isActive: true, sortOrder: 1 },
  { _id: 'c13', domainId: 'd6', domainIds: ['d6'], name: 'Research Paper', slug: 'econ-paper', description: 'Economic research, financial analysis and policy papers', isActive: true, sortOrder: 1 },
  { _id: 'c14', domainId: 'd7', domainIds: ['d7'], name: 'Legal Research', slug: 'legal-research', description: 'Comprehensive legal research, briefs and case studies', isActive: true, sortOrder: 1 },
  { _id: 'c15', domainId: 'd8', domainIds: ['d8'], name: 'Essay & Paper', slug: 'humanities-paper', description: 'Academic essays, term papers and critical analyses', isActive: true, sortOrder: 1 },
];

// ─── Specific Services ──────────────────────────────────────────────────────

type ServiceWithCategory = Service & { categoryId: string };

export const MOCK_SERVICES: ServiceWithCategory[] = [
  // CS - Project Writing
  { _id: 's1', categoryId: 'c1', categoryIds: ['c1'], domainIds: ['d1'], name: 'Machine Learning Project', slug: 'ml-project', shortDescription: 'Custom ML models with dataset, training code, accuracy report & documentation', description: 'We build complete machine learning projects including dataset preparation, model architecture, training, evaluation, and a detailed project report. Topics include image classification, NLP, prediction systems, recommendation engines and more.', isFeatured: true, isActive: true, deliverables: ['Working source code', 'Dataset (if required)', 'Training & evaluation report', 'Full project documentation', 'PPT presentation'], turnaround: '3–7 days', idealFor: 'B.Tech / M.Tech / MCA / PhD students' },
  { _id: 's2', categoryId: 'c1', categoryIds: ['c1'], domainIds: ['d1'], name: 'Web Application Project', slug: 'web-project', shortDescription: 'Full-stack web apps with React/Node or PHP/Laravel with database & hosting guide', description: 'Complete full-stack web application development with frontend (React, HTML/CSS), backend (Node.js, PHP, Django), database (MySQL, MongoDB), and deployment guide.', isFeatured: false, isActive: true, deliverables: ['Source code (frontend + backend)', 'Database schema & files', 'Project report', 'Setup & deployment guide'], turnaround: '5–10 days', idealFor: 'B.Tech / MCA / BCA students' },
  { _id: 's3', categoryId: 'c1', categoryIds: ['c1'], domainIds: ['d1'], name: 'Mobile App Project', slug: 'mobile-project', shortDescription: 'Android / iOS / Flutter mobile application with UI, backend & project report', description: 'End-to-end mobile application development using Android (Java/Kotlin), iOS (Swift), or cross-platform Flutter. Includes UI design, backend API, database, and full documentation.', isFeatured: false, isActive: true, deliverables: ['APK / App file', 'Source code', 'Backend API (if needed)', 'Project report & documentation'], turnaround: '5–10 days', idealFor: 'B.Tech / MCA / BCA students' },
  { _id: 's4', categoryId: 'c1', categoryIds: ['c1'], domainIds: ['d1'], name: 'Data Science & Analytics Project', slug: 'data-science-project', shortDescription: 'Data analysis, visualization & predictive modeling using Python with detailed insights', description: 'Complete data science projects including EDA (Exploratory Data Analysis), data cleaning, feature engineering, visualization (Matplotlib/Seaborn/Plotly), and predictive modeling.', isFeatured: true, isActive: true, deliverables: ['Jupyter Notebook / Python script', 'Dataset', 'Visualization charts', 'Analysis report'], turnaround: '3–6 days', idealFor: 'B.Tech / M.Sc / MBA students' },
  { _id: 's5', categoryId: 'c1', categoryIds: ['c1'], domainIds: ['d1'], name: 'Cybersecurity Project', slug: 'cyber-project', shortDescription: 'Network security, penetration testing or secure system design projects', description: 'Cybersecurity projects including intrusion detection systems, vulnerability assessment, secure coding implementations, and network security analysis.', isFeatured: false, isActive: true, deliverables: ['Working prototype / tool', 'Security analysis report', 'Source code', 'Project documentation'], turnaround: '5–8 days', idealFor: 'B.Tech / M.Tech / CEH students' },
  // CS - Research Paper
  { _id: 's6', categoryId: 'c2', categoryIds: ['c2'], domainIds: ['d1'], name: 'AI / ML Research Paper', slug: 'ml-paper', shortDescription: 'Original research paper on AI/ML topic ready for IEEE, Scopus or SCI journals', description: 'We write original, plagiarism-free research papers on Artificial Intelligence, Machine Learning, Deep Learning, NLP, or Computer Vision topics, formatted for target journals.', isFeatured: true, isActive: true, deliverables: ['Original research paper (PDF/DOCX)', 'Plagiarism report', 'Journal formatting', 'References list'], turnaround: '7–14 days', idealFor: 'M.Tech / PhD researchers & faculty' },
  { _id: 's7', categoryId: 'c2', categoryIds: ['c2'], domainIds: ['d1'], name: 'Software Engineering Paper', slug: 'se-paper', shortDescription: 'Research papers on software design, agile, DevOps, testing or cloud computing', description: 'Research papers on software engineering topics including software architecture, agile methodologies, cloud computing, microservices, DevOps, and testing frameworks.', isFeatured: false, isActive: true, deliverables: ['Research paper (PDF/DOCX)', 'Plagiarism report', 'Reference list'], turnaround: '7–12 days', idealFor: 'M.Tech / PhD students' },
  // CS - Thesis
  { _id: 's8', categoryId: 'c3', categoryIds: ['c3'], domainIds: ['d1'], name: 'M.Tech / MCA Thesis', slug: 'mtech-thesis', shortDescription: 'Complete thesis writing for postgraduate CS programs with implementation & report', description: 'Full thesis development for M.Tech or MCA programs including topic selection, literature review, research methodology, implementation, results analysis, and final thesis document.', isFeatured: true, isActive: true, deliverables: ['Complete thesis document', 'Implementation / code', 'Synopsis', 'Plagiarism report', 'PPT presentation'], turnaround: '20–45 days', idealFor: 'M.Tech / MCA / M.Sc final year students' },
  // CS - Review
  { _id: 's9', categoryId: 'c4', categoryIds: ['c4'], domainIds: ['d1'], name: 'Research Paper Review & Editing', slug: 'paper-review', shortDescription: 'Expert review, proofreading, plagiarism removal and formatting of your paper', description: 'We review and edit your existing research paper for language quality, technical accuracy, plagiarism reduction, and proper formatting as per target journal guidelines.', isFeatured: false, isActive: true, deliverables: ['Edited paper (track changes)', 'Plagiarism report', 'Review comments'], turnaround: '1–3 days', idealFor: 'Any researcher or student' },
  // Medical
  { _id: 's10', categoryId: 'c5', categoryIds: ['c5'], domainIds: ['d2'], name: 'Medical Case Study / Project', slug: 'medical-project', shortDescription: 'Clinical case studies, community health projects and hospital-based research', description: 'Complete medical projects including clinical case studies, epidemiological studies, community health assessments, pharmacological studies, and hospital-based research.', isFeatured: true, isActive: true, deliverables: ['Project report', 'Case study document', 'References & bibliography'], turnaround: '5–10 days', idealFor: 'MBBS / MD / BPT / Nursing students' },
  { _id: 's11', categoryId: 'c6', categoryIds: ['c6'], domainIds: ['d2'], name: 'Medical Research Paper', slug: 'medical-paper', shortDescription: 'Evidence-based clinical research papers for PubMed, Lancet or medical journals', description: 'Original medical and clinical research papers including randomized controlled trials, observational studies, case reports, and review articles formatted for top medical journals.', isFeatured: false, isActive: true, deliverables: ['Research paper', 'Plagiarism report', 'CONSORT/PRISMA compliance'], turnaround: '10–20 days', idealFor: 'MD / PhD / Clinical researchers' },
  { _id: 's12', categoryId: 'c7', categoryIds: ['c7'], domainIds: ['d2'], name: 'Systematic Review & Meta-Analysis', slug: 'systematic-review', shortDescription: 'PRISMA-compliant systematic reviews with statistical meta-analysis', description: 'Full systematic literature reviews and meta-analyses following PRISMA guidelines, including database searching, PICO framework, quality assessment, and statistical synthesis.', isFeatured: true, isActive: true, deliverables: ['Systematic review document', 'PRISMA flowchart', 'Forest plot', 'Plagiarism report'], turnaround: '15–30 days', idealFor: 'MD / PhD researchers' },
  // Business
  { _id: 's13', categoryId: 'c8', categoryIds: ['c8'], domainIds: ['d3'], name: 'MBA / BBA Project Report', slug: 'mba-project', shortDescription: 'Complete MBA/BBA project reports on marketing, HR, finance or operations', description: 'Full MBA or BBA project reports including industry analysis, company study, primary/secondary research, data analysis, findings, and recommendations.', isFeatured: true, isActive: true, deliverables: ['Project report', 'Questionnaire / survey data', 'Charts & analysis', 'Executive summary'], turnaround: '7–14 days', idealFor: 'MBA / BBA / PGDM students' },
  { _id: 's14', categoryId: 'c9', categoryIds: ['c9'], domainIds: ['d3'], name: 'Business Research Paper', slug: 'business-paper', shortDescription: 'Research papers on marketing strategy, HR, supply chain or organizational behavior', description: 'Academic research papers on business and management topics including marketing strategy, human resource management, supply chain, consumer behavior, and corporate governance.', isFeatured: false, isActive: true, deliverables: ['Research paper', 'Plagiarism report', 'References'], turnaround: '7–12 days', idealFor: 'MBA / PhD Management students' },
  // Engineering
  { _id: 's15', categoryId: 'c10', categoryIds: ['c10'], domainIds: ['d4'], name: 'Civil Engineering Final Year Project', slug: 'civil-fyp', shortDescription: 'Structural design, environmental or construction management final year projects', description: 'Complete civil engineering projects including structural design, construction material testing, environmental impact studies, and infrastructure planning with AutoCAD/STAAD drawings.', isFeatured: true, isActive: true, deliverables: ['Project report', 'CAD drawings', 'Design calculations', 'Presentation'], turnaround: '10–20 days', idealFor: 'B.Tech / BE Civil final year students' },
  { _id: 's16', categoryId: 'c10', categoryIds: ['c10'], domainIds: ['d4'], name: 'Mechanical Engineering Project', slug: 'mech-fyp', shortDescription: 'Design, simulation and fabrication projects for mechanical engineering students', description: 'Mechanical engineering projects covering design, thermodynamics, fluid mechanics, manufacturing, and simulation using SolidWorks, ANSYS, or MATLAB.', isFeatured: false, isActive: true, deliverables: ['Project report', 'SolidWorks/ANSYS files', 'Design analysis', 'Presentation'], turnaround: '10–20 days', idealFor: 'B.Tech / BE Mechanical students' },
];

const FEATURED_SERVICES = MOCK_SERVICES.filter(s => s.isFeatured).slice(0, 6);

// ─── API Functions ─────────────────────────────────────────────────────────

export const getDomains = async (): Promise<Domain[]> => {
  try {
    const res = await apiClient.get('/admin/domains');
    if (res.data.success && res.data.data?.length > 0) return res.data.data;
  } catch { /* use mock */ }
  return MOCK_DOMAINS;
};

export const getCategories = async (domainId?: string): Promise<Category[]> => {
  try {
    const url = domainId ? `/admin/categories?domainId=${domainId}` : '/admin/categories';
    const res = await apiClient.get(url);
    if (res.data.success && res.data.data?.length > 0) return res.data.data;
  } catch { /* use mock */ }
  return domainId ? MOCK_CATEGORIES.filter(c => c.domainId === domainId) : MOCK_CATEGORIES;
};

export const getServices = async (categoryId?: string): Promise<Service[]> => {
  try {
    const url = categoryId ? `/admin/services?categoryId=${categoryId}` : '/admin/services';
    const res = await apiClient.get(url);
    if (res.data.success && res.data.data?.length > 0) return res.data.data;
  } catch { /* use mock */ }
  return categoryId
    ? MOCK_SERVICES.filter(s => s.categoryId === categoryId)
    : MOCK_SERVICES;
};

export const getServiceById = async (serviceId: string): Promise<Service | null> => {
  try {
    const res = await apiClient.get(`/admin/services/${serviceId}`);
    if (res.data.success) return res.data.data;
  } catch { /* use mock */ }
  return MOCK_SERVICES.find(s => s._id === serviceId) || null;
};

export const getFeaturedServices = async (): Promise<Service[]> => {
  try {
    const res = await apiClient.get('/admin/services?featured=true&limit=6');
    if (res.data.success && res.data.data?.length > 0) return res.data.data;
  } catch { /* use mock */ }
  return FEATURED_SERVICES;
};

export const getServiceTemplate = async (serviceId: string): Promise<RequirementTemplate | null> => {
  return null; // We use free-text requirements now
};

export const submitRequest = async (payload: {
  name: string; email: string; phone?: string; whatsapp?: string;
  serviceId: string; domainId?: string; categoryId?: string;
  requirements: Record<string, unknown>;
  additionalMessage?: string;
  preferredContactMethod: 'WHATSAPP' | 'EMAIL' | 'PHONE';
}) => {
  const res = await apiClient.post('/requests', payload);
  return res.data;
};

export const getRequestById = async (requestId: string): Promise<ServiceRequest | null> => {
  const res = await apiClient.get(`/requests/${requestId}`);
  if (res.data.success) return res.data.data;
  return null;
};

export const getAdminRequests = async (params?: {
  status?: string; page?: number; limit?: number;
}): Promise<{ requests: ServiceRequest[]; total: number; page: number; totalPages: number }> => {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const res = await apiClient.get(`/admin/requests?${query.toString()}`);
  return res.data.data;
};

export const getAdminRequestById = async (requestId: string): Promise<ServiceRequest | null> => {
  const res = await apiClient.get(`/admin/requests/${requestId}`);
  if (res.data.success) return res.data.data;
  return null;
};

export const updateAdminRequest = async (
  requestId: string, payload: { status?: string; adminNotes?: string }
): Promise<ServiceRequest> => {
  const res = await apiClient.put(`/admin/requests/${requestId}`, payload);
  return res.data.data;
};

export const deleteAdminRequest = async (requestId: string): Promise<void> => {
  await apiClient.delete(`/admin/requests/${requestId}`);
};
