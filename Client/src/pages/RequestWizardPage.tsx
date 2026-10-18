import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  FileText,
  Paperclip,
  Send,
  MessageSquare,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  getPublicServices,
  getPublicDomains,
  getPublicReferenceData,
  getPublicServiceTemplate,
  submitServiceRequest,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { WhatsAppButton } from "../components/common/WhatsAppButton";
import { RequirementField } from "../api/types";

interface RequestWizardPageProps {
  navigate: (route: string, params?: any) => void;
  initialServiceId?: string;
}

export const RequestWizardPage: React.FC<RequestWizardPageProps> = ({
  navigate,
  initialServiceId,
}) => {
  const { user, isAuthenticated } = useAuth();

  // Wizard Step (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Academic Profile
    academicLevel: user?.academicLevel || "",
    discipline: "",
    university: user?.institution || "",
    department: user?.department || "",
    correspondingAuthorName: "",
    correspondingAuthorDesignation: "",
    correspondingAuthorOrcidId: "",
    coAuthors: [] as { name: string; designation: string; orcidId: string }[],
    supervisorName: "",
    supervisorDesignation: "",
    supervisorOrcidId: "",

    // Step 2: Service & Scope
    serviceId: initialServiceId || "",
    publicationType: "Original Journal Article",
    targetJournal: "",
    targetConference: "",
    indexingRequirement: "Scopus",
    citationStyle: "IEEE Style",
    wordCount: 6000,
    deadline: "",

    // Step 3: Dynamic Requirements (keyed by field.key)
    requirements: {} as Record<string, any>,

    // Step 4: Guidelines & Attachments
    referenceFiles: [] as { name: string; url: string; size?: number }[],
    newFileName: "",
    newFileUrl: "",
    additionalMessage: "",

    // Step 5: Contact Info
    customerName: user ? `${user.firstName} ${user.lastName || ""}`.trim() : "",
    customerEmail: user?.email || "",
    customerPhone: user?.phone || "",
    customerWhatsapp: user?.whatsapp || user?.phone || "",
    preferredContactMethod: "WHATSAPP" as "WHATSAPP" | "EMAIL" | "PHONE",
  });

  // Queries
  const { data: services = [] } = useQuery({
    queryKey: ["public-services"],
    queryFn: () => getPublicServices(),
  });

  const { data: domains = [] } = useQuery({
    queryKey: ["public-domains"],
    queryFn: getPublicDomains,
  });

  const { data: refData } = useQuery({
    queryKey: ["public-reference-data"],
    queryFn: getPublicReferenceData,
  });

  // Auto-select first service if none selected
  useEffect(() => {
    if (!formData.serviceId && services.length > 0) {
      setFormData((prev) => ({ ...prev, serviceId: services[0]._id }));
    }
  }, [services, formData.serviceId]);

  // Dynamic template for currently selected service
  const { data: activeTemplate } = useQuery({
    queryKey: ["service-template", formData.serviceId],
    queryFn: () => (formData.serviceId ? getPublicServiceTemplate(formData.serviceId) : null),
    enabled: Boolean(formData.serviceId),
  });

  // Handle Input Changes
  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateRequirement = (reqKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      requirements: { ...prev.requirements, [reqKey]: value },
    }));
  };

  const addCoAuthor = () => {
    setFormData((prev) => ({
      ...prev,
      coAuthors: [...prev.coAuthors, { name: "", designation: "", orcidId: "" }],
    }));
  };

  const removeCoAuthor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      coAuthors: prev.coAuthors.filter((_, i) => i !== index),
    }));
  };

  const updateCoAuthor = (index: number, field: "name" | "designation" | "orcidId", value: string) => {
    setFormData((prev) => ({
      ...prev,
      coAuthors: prev.coAuthors.map((coAuthor, i) =>
        i === index ? { ...coAuthor, [field]: value } : coAuthor
      ),
    }));
  };

  const addReferenceFile = () => {
    if (!formData.newFileUrl.trim()) return;
    const newFile = {
      name: formData.newFileName.trim() || "Reference Document",
      url: formData.newFileUrl.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      referenceFiles: [...prev.referenceFiles, newFile],
      newFileName: "",
      newFileUrl: "",
    }));
  };

  const removeReferenceFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      referenceFiles: prev.referenceFiles.filter((_, i) => i !== index),
    }));
  };

  // Validation per step
  const validateStep = (): boolean => {
    setSubmitError(null);
    if (currentStep === 1) {
      if (!formData.academicLevel) {
        setSubmitError("Please select your academic level.");
        return false;
      }
      return true;
    }
    if (currentStep === 5) {
      if (!formData.correspondingAuthorName.trim()) {
        setSubmitError("Please enter the corresponding author name.");
        return false;
      }

      if (!formData.correspondingAuthorDesignation.trim()) {
        setSubmitError("Please enter the corresponding author designation.");
        return false;
      }

      if (formData.coAuthors.some((coAuthor) => {
        const hasAnyValue = coAuthor.name.trim() || coAuthor.designation.trim() || coAuthor.orcidId.trim();
        return hasAnyValue && (!coAuthor.name.trim() || !coAuthor.designation.trim());
      })) {
        setSubmitError("Each co-author must include both name and designation.");
        return false;
      }

      if (!formData.supervisorName.trim()) {
        setSubmitError("Please enter the supervisor name.");
        return false;
      }

      if (!formData.supervisorDesignation.trim()) {
        setSubmitError("Please enter the supervisor designation.");
        return false;
      }

      return true;
    }
    if (currentStep === 2) {
      if (!formData.serviceId) {
        setSubmitError("Please select a research service.");
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      // Validate required dynamic fields if template exists
      if (activeTemplate?.fields) {
        for (const f of activeTemplate.fields) {
          if (f.isRequired) {
            const val = formData.requirements[f.key];
            if (val === undefined || val === null || val === "") {
              setSubmitError(`Please complete required field: "${f.label}"`);
              return false;
            }
          }
        }
      }
      return true;
    }
    if (currentStep === 6) {
      if (!formData.customerName.trim()) {
        setSubmitError("Please provide your name.");
        return false;
      }
      if (!formData.customerEmail.trim()) {
        setSubmitError("Please provide a valid email address.");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!validateStep()) return;

    if (!isAuthenticated) {
      // Prompt customer to register or log in first
      setSubmitError("Please sign in or register to track your submitted requests.");
      navigate("login", { redirect: "wizard" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: formData.customerName,
        email: formData.customerEmail,
        phone: formData.customerPhone,
        whatsapp: formData.customerWhatsapp,
        serviceId: formData.serviceId,
        templateId: activeTemplate?._id,
        academicProfile: {
          academicLevel: formData.academicLevel,
          discipline: formData.discipline,
          university: formData.university,
          department: formData.department,
          correspondingAuthor: {
            name: formData.correspondingAuthorName.trim(),
            designation: formData.correspondingAuthorDesignation.trim(),
            orcidId: formData.correspondingAuthorOrcidId.trim() || undefined,
          },
          coAuthors: formData.coAuthors
            .filter((coAuthor) => coAuthor.name.trim() || coAuthor.designation.trim() || coAuthor.orcidId.trim())
            .map((coAuthor) => ({
              name: coAuthor.name.trim(),
              designation: coAuthor.designation.trim(),
              orcidId: coAuthor.orcidId.trim() || undefined,
            })),
          supervisor: {
            name: formData.supervisorName.trim(),
            designation: formData.supervisorDesignation.trim(),
            orcidId: formData.supervisorOrcidId.trim() || undefined,
          },
          publicationType: formData.publicationType,
          targetJournal: formData.targetJournal,
          targetConference: formData.targetConference,
          indexingRequirement: formData.indexingRequirement,
          citationStyle: formData.citationStyle,
          wordCount: Number(formData.wordCount) || 6000,
          deadline: formData.deadline,
        },
        requirements: formData.requirements,
        referenceFiles: formData.referenceFiles,
        additionalMessage: formData.additionalMessage,
        preferredContactMethod: formData.preferredContactMethod,
      };

      const res = await submitServiceRequest(payload);
      setSubmittedRequest(res);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || err.message || "Failed to submit request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceObj = services.find((s) => s._id === formData.serviceId);

  // Success Confirmation Screen
  if (submittedRequest) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl shadow-emerald-950/50">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Submission Confirmed
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Research Request Received!
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Your request has been saved directly to MongoDB. Our academic team is reviewing your requirements.
          </p>
        </div>

        {/* Request Number Badge */}
        <div className="glass-panel p-5 rounded-2xl border-indigo-500/30 max-w-md mx-auto space-y-2">
          <p className="text-xs text-slate-400">Your Unique Tracking Reference:</p>
          <div className="text-2xl font-black text-indigo-300 font-mono select-all">
            {submittedRequest.requestNumber}
          </div>
          <p className="text-[11px] text-slate-400">
            Status: <span className="text-sky-400 font-semibold">{submittedRequest.status}</span>
          </p>
        </div>

        {/* WhatsApp Collaboration CTA */}
        <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 max-w-md mx-auto text-left space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
            <MessageSquare className="w-4 h-4" />
            <span>Connect on WhatsApp</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Discuss your scope, quotation, and turnaround directly with our academic coordinator. Click below to launch chat with pre-filled request details:
          </p>
          <WhatsAppButton
            requestNumber={submittedRequest.requestNumber}
            serviceName={selectedServiceObj?.name || "Academic Service"}
            size="md"
            className="w-full"
            label="Chat on WhatsApp with Request Details"
          />
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate("customer-dashboard")}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Go to My Requests Dashboard
          </button>
          <button
            onClick={() => {
              setSubmittedRequest(null);
              setCurrentStep(1);
            }}
            className="px-5 py-2.5 rounded-xl bg-transparent border border-slate-700 hover:bg-slate-900 text-slate-300 text-xs font-semibold"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 space-y-6 min-w-0">
      {/* Header */}
      <div className="space-y-2 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Step Dynamic Wizard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Submit Research Requirements
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Tailored form driven by backend requirement templates. No online payment required.
        </p>
      </div>

      {/* Stepper Indicator */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl border-slate-800">
        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { step: 1, label: "Profile" },
            { step: 2, label: "Service" },
            { step: 3, label: "Requirements" },
            { step: 4, label: "Files" },
            { step: 5, label: "Authors" },
            { step: 6, label: "Review" },
          ].map((item) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className={`shrink-0 flex-1 min-w-[70px] py-2 px-1.5 rounded-xl transition-all text-center text-xs ${
                  isCurrent
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold"
                    : isCompleted
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-500 font-medium"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{isCompleted ? "✓" : `0${item.step}`}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </div>
                <span className="sm:hidden block text-[10px] mt-0.5">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* STEP FORMS CONTAINER */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 space-y-6">
        {/* ========================================================================= */}
        {/* STEP 1: ACADEMIC PROFILE                                                  */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Step 1: Academic Profile & Level</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tell us about your educational stage and research affiliation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Academic Level / Degree *
                </label>
                <select
                  value={formData.academicLevel}
                  onChange={(e) => updateField("academicLevel", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                >
                  <option value="">Select academic level...</option>
                  {refData?.academic_levels?.map((lvl) => (
                    <option key={lvl.id} value={lvl.label}>
                      {lvl.label}
                    </option>
                  )) || (
                    <>
                      <option value="Bachelor's Degree">Bachelor's Degree</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="Ph.D. / Doctoral Candidate">Ph.D. / Doctoral Candidate</option>
                      <option value="Postdoctoral Researcher">Postdoctoral Researcher</option>
                      <option value="University Faculty">University Faculty</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Research Discipline / Field
                </label>
                <select
                  value={formData.discipline}
                  onChange={(e) => updateField("discipline", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                >
                  <option value="">Select discipline...</option>
                  {domains.map((d) => (
                    <option key={d._id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  University / Institute Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Stanford University / IIT Delhi"
                  value={formData.university}
                  onChange={(e) => updateField("university", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department / School
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dept of Computer Science & Engineering"
                  value={formData.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SERVICE & PUBLICATION SCOPE                                       */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Step 2: Service & Target Publication</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the specific advisory service and your publishing targets.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Research Service *
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => updateField("serviceId", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                >
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.turnaroundTime || "7–14 Days"})
                    </option>
                  ))}
                </select>
                {selectedServiceObj && (
                  <p className="text-xs text-indigo-300/80 mt-1.5">
                    {selectedServiceObj.shortDescription}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Publication / Project Type
                  </label>
                  <select
                    value={formData.publicationType}
                    onChange={(e) => updateField("publicationType", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                  >
                    {refData?.publication_types?.map((pt) => (
                      <option key={pt.id} value={pt.label}>
                        {pt.label}
                      </option>
                    )) || (
                      <>
                        <option value="Original Journal Article">Original Journal Article</option>
                        <option value="Ph.D. Thesis / Dissertation">Ph.D. Thesis / Dissertation</option>
                        <option value="Systematic Review & Meta-Analysis">Systematic Review & Meta-Analysis</option>
                        <option value="Conference Proceeding Paper">Conference Proceeding Paper</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Indexing Requirement
                  </label>
                  <select
                    value={formData.indexingRequirement}
                    onChange={(e) => updateField("indexingRequirement", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                  >
                    {refData?.indexing_targets?.map((idx) => (
                      <option key={idx.id} value={idx.label}>
                        {idx.label}
                      </option>
                    )) || (
                      <>
                        <option value="Scopus">Scopus</option>
                        <option value="Web of Science (SCI / SCIE)">Web of Science (SCI / SCIE)</option>
                        <option value="IEEE Xplore">IEEE Xplore</option>
                        <option value="PubMed / MEDLINE">PubMed / MEDLINE</option>
                        <option value="UGC-CARE">UGC-CARE</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Journal / Conference Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., IEEE TPAMI, Elsevier Neural Networks..."
                    value={formData.targetJournal}
                    onChange={(e) => updateField("targetJournal", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Citation & Referencing Style
                  </label>
                  <select
                    value={formData.citationStyle}
                    onChange={(e) => updateField("citationStyle", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                  >
                    {refData?.citation_styles?.map((cs) => (
                      <option key={cs.id} value={cs.label}>
                        {cs.label}
                      </option>
                    )) || (
                      <>
                        <option value="IEEE Style">IEEE Style</option>
                        <option value="APA 7th Edition">APA 7th Edition</option>
                        <option value="Harvard Style">Harvard Style</option>
                        <option value="Vancouver Style">Vancouver Style</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Estimated Target Word Count
                  </label>
                  <input
                    type="number"
                    value={formData.wordCount}
                    onChange={(e) => updateField("wordCount", Number(e.target.value))}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Submission Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => updateField("deadline", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: DYNAMIC REQUIREMENTS (FROM BACKEND TEMPLATE)                     */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Step 3: Research Specifications</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  DYNAMIC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTemplate
                  ? `Configured parameters for "${selectedServiceObj?.name}" template.`
                  : "Specify your research topic, methodology, and objectives."}
              </p>
            </div>

            {/* If template has dynamic fields, render each dynamically */}
            {activeTemplate?.fields && activeTemplate.fields.length > 0 ? (
              <div className="space-y-4">
                {activeTemplate.fields.map((field: RequirementField) => {
                  const val = formData.requirements[field.key] || "";
                  return (
                    <div key={field._id} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-200">
                        {field.label} {field.isRequired && <span className="text-rose-400">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-[11px] text-slate-400">{field.description}</p>
                      )}

                      {/* TEXT */}
                      {field.type === "TEXT" && (
                        <input
                          type="text"
                          placeholder={field.placeholder || "Enter details..."}
                          value={val}
                          onChange={(e) => updateRequirement(field.key, e.target.value)}
                          className="w-full p-3 rounded-xl glass-input text-xs text-white"
                        />
                      )}

                      {/* LONG_TEXT */}
                      {field.type === "LONG_TEXT" && (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || "Provide details..."}
                          value={val}
                          onChange={(e) => updateRequirement(field.key, e.target.value)}
                          className="w-full p-3 rounded-xl glass-input text-xs text-white"
                        />
                      )}

                      {/* NUMBER */}
                      {field.type === "NUMBER" && (
                        <input
                          type="number"
                          placeholder={field.placeholder || "0"}
                          value={val}
                          onChange={(e) => updateRequirement(field.key, e.target.value)}
                          className="w-full p-3 rounded-xl glass-input text-xs text-white"
                        />
                      )}

                      {/* DATE */}
                      {field.type === "DATE" && (
                        <input
                          type="date"
                          value={val}
                          onChange={(e) => updateRequirement(field.key, e.target.value)}
                          className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                        />
                      )}

                      {/* SELECT */}
                      {field.type === "SELECT" && (
                        <select
                          value={val}
                          onChange={(e) => updateRequirement(field.key, e.target.value)}
                          className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                        >
                          <option value="">Select option...</option>
                          {field.options?.map((opt, i) => (
                            <option key={i} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* RADIO */}
                      {field.type === "RADIO" && (
                        <div className="space-y-2 pt-1">
                          {field.options?.map((opt, i) => (
                            <label
                              key={i}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                                val === opt.value
                                  ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                                  : "border-slate-800 text-slate-400 hover:bg-slate-900"
                              }`}
                            >
                              <input
                                type="radio"
                                name={field.key}
                                value={opt.value}
                                checked={val === opt.value}
                                onChange={() => updateRequirement(field.key, opt.value)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Universal fallback fields when no dynamic template is configured */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Proposed Research Topic / Working Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Deep Reinforcement Learning for Adaptive UAV Trajectory Planning"
                    value={formData.requirements.topic || ""}
                    onChange={(e) => updateRequirement("topic", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Core Objectives & Research Questions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="List your primary objectives, hypothesis, or research gaps to solve..."
                    value={formData.requirements.objectives || ""}
                    onChange={(e) => updateRequirement("objectives", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Preferred Methodology, Framework or Tool
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., PyTorch, MATLAB Simulink, PRISMA, SmartPLS, Qualtrics..."
                    value={formData.requirements.methodology || ""}
                    onChange={(e) => updateRequirement("methodology", e.target.value)}
                    className="w-full p-3 rounded-xl glass-input text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: GUIDELINES & ATTACHMENTS                                          */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Step 4: Reference Files & Guidelines</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Attach reference paper links, university author guidelines, or existing drafts.
              </p>
            </div>

            {/* Reference Files List */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Attached Reference Files & Links
              </label>

              {formData.referenceFiles.length > 0 ? (
                <div className="space-y-2">
                  {formData.referenceFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-medium truncate">{f.name}</span>
                        <span className="text-slate-500 truncate">({f.url})</span>
                      </div>
                      <button
                        onClick={() => removeReferenceFile(i)}
                        className="text-rose-400 hover:text-rose-300 font-semibold px-2 py-0.5"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No reference links attached yet.</p>
              )}

              {/* Add file inline form */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-300">Add Document or Cloud Link</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="File description (e.g., University Thesis Guidelines)"
                    value={formData.newFileName}
                    onChange={(e) => updateField("newFileName", e.target.value)}
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL (Google Drive, Dropbox, arXiv link...)"
                    value={formData.newFileUrl}
                    onChange={(e) => updateField("newFileUrl", e.target.value)}
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={addReferenceFile}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                >
                  + Add Reference Link
                </button>
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Special Institutional Guidelines or Directives
              </label>
              <textarea
                rows={3}
                placeholder="Mention any specific formatting requirements, professor feedback, or non-negotiable parameters..."
                value={formData.additionalMessage}
                onChange={(e) => updateField("additionalMessage", e.target.value)}
                className="w-full p-3 rounded-xl glass-input text-xs text-white"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: AUTHOR & SUPERVISOR DETAILS                                      */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Step 5: Author & Supervisor Details</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Add the corresponding author, co-authors, and supervisor details before final submission.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corresponding Author Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Asha Kumar"
                  value={formData.correspondingAuthorName}
                  onChange={(e) => updateField("correspondingAuthorName", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corresponding Author Designation *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lead Author / Research Scholar"
                  value={formData.correspondingAuthorDesignation}
                  onChange={(e) => updateField("correspondingAuthorDesignation", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corresponding Author ORCID ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="https://orcid.org/0000-0000-0000-0000"
                  value={formData.correspondingAuthorOrcidId}
                  onChange={(e) => updateField("correspondingAuthorOrcidId", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Co-Authors
                  </label>
                  <button
                    type="button"
                    onClick={addCoAuthor}
                    className="px-2.5 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                  >
                    + Add Co-author
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.coAuthors.length === 0 ? (
                    <div className="text-[11px] text-slate-500 border border-dashed border-slate-700 rounded-xl p-3">
                      No co-authors added yet. You can add multiple authors if needed.
                    </div>
                  ) : (
                    formData.coAuthors.map((coAuthor, index) => (
                      <div key={index} className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-950/40 p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Co-author {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCoAuthor(index)}
                            className="text-[10px] text-rose-300 hover:text-rose-200"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Co-author name"
                            value={coAuthor.name}
                            onChange={(e) => updateCoAuthor(index, "name", e.target.value)}
                            className="w-full p-2.5 rounded-lg glass-input text-xs text-white placeholder-slate-500"
                          />
                          <input
                            type="text"
                            placeholder="Designation"
                            value={coAuthor.designation}
                            onChange={(e) => updateCoAuthor(index, "designation", e.target.value)}
                            className="w-full p-2.5 rounded-lg glass-input text-xs text-white placeholder-slate-500"
                          />
                          <input
                            type="text"
                            placeholder="ORCID ID (optional)"
                            value={coAuthor.orcidId}
                            onChange={(e) => updateCoAuthor(index, "orcidId", e.target.value)}
                            className="sm:col-span-2 w-full p-2.5 rounded-lg glass-input text-xs text-white placeholder-slate-500"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Supervisor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Ananya Sen"
                  value={formData.supervisorName}
                  onChange={(e) => updateField("supervisorName", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Supervisor Designation *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Professor / Supervisor"
                  value={formData.supervisorDesignation}
                  onChange={(e) => updateField("supervisorDesignation", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Supervisor ORCID ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="https://orcid.org/0000-0000-0000-0000"
                  value={formData.supervisorOrcidId}
                  onChange={(e) => updateField("supervisorOrcidId", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: CONTACT & FINAL REVIEW                                            */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Step 6: Contact Preferences & Review</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Where should our academic coordinator send quotation and timeline updates?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateField("customerEmail", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp Number (with country code) *
                </label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.customerWhatsapp}
                  onChange={(e) => updateField("customerWhatsapp", e.target.value)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Contact Channel
                </label>
                <select
                  value={formData.preferredContactMethod}
                  onChange={(e) => updateField("preferredContactMethod", e.target.value as any)}
                  className="w-full p-3 rounded-xl glass-input text-xs text-white bg-slate-900"
                >
                  <option value="WHATSAPP">WhatsApp (Fastest response)</option>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone Call</option>
                </select>
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
              <p className="font-bold text-white text-sm">Summary Review</p>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Service:</span>{" "}
                  <strong>{selectedServiceObj?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Level:</span> {formData.academicLevel}
                </div>
                <div>
                  <span className="text-slate-500">Publication:</span> {formData.publicationType}
                </div>
                <div>
                  <span className="text-slate-500">Indexing:</span> {formData.indexingRequirement}
                </div>
                <div>
                  <span className="text-slate-500">Citation:</span> {formData.citationStyle}
                </div>
                <div>
                  <span className="text-slate-500">Word Count:</span> {formData.wordCount} words
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NAVIGATION ACTIONS                                                        */}
        {/* ========================================================================= */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/40 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Database...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm & Submit Request</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
