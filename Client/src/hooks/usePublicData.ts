import { useQuery } from "@tanstack/react-query";
import {
  getPublicCategories,
  getPublicDomains,
  getPublicFaqs,
  getPublicReferenceData,
  getPublicServices,
  getPublicSettings,
} from "../api";
import { Domain, Service } from "../api/types";

const FIVE_MIN = 5 * 60 * 1000;

export const useSettings = () =>
  useQuery({ queryKey: ["public-settings"], queryFn: getPublicSettings, staleTime: FIVE_MIN });

export const useDomains = () =>
  useQuery({ queryKey: ["public-domains"], queryFn: getPublicDomains, staleTime: FIVE_MIN });

export const useCategories = () =>
  useQuery({ queryKey: ["public-categories"], queryFn: () => getPublicCategories(), staleTime: FIVE_MIN });

export const useAllServices = () =>
  useQuery({ queryKey: ["public-services-all"], queryFn: () => getPublicServices(), staleTime: FIVE_MIN });

export const useFeaturedServices = () =>
  useQuery({
    queryKey: ["public-services-featured"],
    queryFn: () => getPublicServices({ featured: true }),
    staleTime: FIVE_MIN,
  });

export const useFaqs = () => useQuery({ queryKey: ["public-faqs"], queryFn: getPublicFaqs, staleTime: FIVE_MIN });

export const useReferenceData = () =>
  useQuery({ queryKey: ["public-reference-data"], queryFn: getPublicReferenceData, staleTime: FIVE_MIN });

/** Slug of the patents & IP discipline created by scripts/seed-ip-services.ts */
export const IP_DOMAIN_SLUG = "patents-ip";

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : (value as { _id?: string })?._id || "";

export const serviceInDomain = (service: Service, domainId?: string): boolean =>
  !domainId || (service.domainIds || []).some((d) => idOf(d) === domainId);

export const serviceInCategory = (service: Service, categoryId?: string): boolean =>
  !categoryId || (service.categoryIds || []).some((c) => idOf(c) === categoryId);

export const findIpDomain = (domains?: Domain[]) => domains?.find((d) => d.slug === IP_DOMAIN_SLUG);

/** True when a service belongs to the patents & IP practice. */
export const isIpService = (service: Service | undefined | null, domains?: Domain[]): boolean => {
  if (!service) return false;
  const ip = findIpDomain(domains);
  if (ip && serviceInDomain(service, ip._id)) return true;
  return /patent|trademark|copyright|design registration|intellectual property/i.test(service.name);
};

/** Build a wa.me link from a stored number (digits only). */
export const whatsappLink = (number?: string, text?: string): string | undefined => {
  const digits = (number || "").replace(/\D/g, "");
  if (!digits) return undefined;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
