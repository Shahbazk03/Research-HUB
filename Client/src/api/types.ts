export type UserRole = "CUSTOMER" | "TEAM_MEMBER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface User {
  id: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  whatsapp?: string;
  academicLevel?: string;
  institution?: string;
  department?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

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
  domainIds: string[] | Domain[];
  isActive: boolean;
  sortOrder: number;
}

export type PricingModel = "FIXED" | "RANGE" | "CUSTOM_QUOTE" | "CONTACT_FOR_PRICE";

export interface Service {
  _id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  pricingModel: PricingModel;
  currency?: string;
  priceAmount?: number;
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  turnaroundTime?: string;
  deliverables?: string[];
  idealFor?: string[];
  supportedPublicationTypes?: string[];
  supportedIndexing?: string[];
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  domainIds: (string | Domain)[];
  categoryIds: (string | Category)[];
}

export interface RequirementField {
  _id: string;
  templateId: string;
  label: string;
  key: string;
  description?: string;
  type: "TEXT" | "LONG_TEXT" | "NUMBER" | "EMAIL" | "PHONE" | "DATE" | "SELECT" | "MULTI_SELECT" | "RADIO" | "CHECKBOX" | "BOOLEAN" | "FILE" | "MULTI_FILE";
  isRequired: boolean;
  isActive: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  sortOrder: number;
}

export interface RequirementTemplate {
  _id: string;
  name: string;
  description?: string;
  serviceId: string;
  version: number;
  isActive: boolean;
  isPublished: boolean;
  fields?: RequirementField[];
}

export type ServiceRequestStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_FOR_CUSTOMER"
  | "COMPLETED"
  | "CANCELLED"
  | "UNDER_REVIEW"
  | "NEEDS_INFORMATION"
  | "QUOTATION_SENT";

export interface ServiceRequest {
  _id: string;
  requestNumber: string;
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    whatsapp?: string;
  };
  serviceId: Service | string;
  domainId?: Domain | string;
  categoryId?: Category | string;
  templateId?: RequirementTemplate | string;
  academicProfile?: {
    academicLevel?: string;
    discipline?: string;
    university?: string;
    department?: string;
    publicationType?: string;
    targetJournal?: string;
    targetConference?: string;
    indexingRequirement?: string;
    citationStyle?: string;
    wordCount?: number;
    pageCount?: number;
    deadline?: string;
  };
  requirements: Record<string, any>;
  referenceFiles: {
    name: string;
    url: string;
    type?: string;
    size?: number;
  }[];
  additionalMessage?: string;
  preferredContactMethod: "WHATSAPP" | "EMAIL" | "PHONE";
  status: ServiceRequestStatus;
  adminNotes?: string;
  quotation?: {
    amount?: number;
    currency?: string;
    notes?: string;
    providedAt?: string;
  };
  paymentQr?: {
    url: string;
    upiId?: string;
    uploadedAt?: string;
  };
  paymentSubmission?: {
    transactionId: string;
    amountPaid: number;
    currency: string;
    payerName?: string;
    payerUpiId?: string;
    screenshotUrl?: string;
    notes?: string;
    submittedAt: string;
    status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";
    verifiedAt?: string;
    adminVerificationNotes?: string;
  };
  finalDeliverable?: {
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    doiUrl?: string;
    notes?: string;
    uploadedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SiteSetting {
  platformName: string;
  tagline: string;
  description?: string;
  whatsappNumber: string;
  whatsappDefaultMessageTemplate: string;
  supportEmail: string;
  supportPhone: string;
  businessHours: string;
  disclaimer: string;
  academicIntegrityPolicy: string;
  enableQuotations: boolean;
}

export interface CmsFaq {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ReferenceItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ReferenceDataMap {
  academic_levels?: ReferenceItem[];
  disciplines?: ReferenceItem[];
  publication_types?: ReferenceItem[];
  indexing_targets?: ReferenceItem[];
  citation_styles?: ReferenceItem[];
}

export const formatServicePrice = (service?: Partial<Service> | null): string => {
  if (!service) return "Custom Quotation";
  const model = service.pricingModel || "CUSTOM_QUOTE";
  if (model === "CUSTOM_QUOTE") return "Custom Quotation";
  if (model === "CONTACT_FOR_PRICE") return "Contact for Price";

  const currency = service.currency || service.priceRange?.currency || "INR";
  const sym =
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    "₹";

  const locale = currency === "INR" ? "en-IN" : "en-US";

  if (model === "FIXED") {
    const amt = service.priceAmount != null ? Number(service.priceAmount).toLocaleString(locale) : "0";
    return `${sym}${amt}`;
  }

  if (model === "RANGE") {
    const min = service.priceRange?.min != null ? Number(service.priceRange.min).toLocaleString(locale) : "0";
    const max = service.priceRange?.max != null ? Number(service.priceRange.max).toLocaleString(locale) : "0";
    return `${sym}${min} – ${sym}${max}`;
  }

  return "Custom Quotation";
};

export const formatCurrencyAmount = (amount?: number | null, currency = "INR"): string => {
  if (amount == null || isNaN(Number(amount))) return "0";
  const curr = currency || "INR";
  const sym =
    curr === "USD" ? "$" :
    curr === "EUR" ? "€" :
    curr === "GBP" ? "£" :
    "₹";
  const locale = curr === "INR" ? "en-IN" : "en-US";
  return `${sym} ${Number(amount).toLocaleString(locale)} ${curr}`;
};
