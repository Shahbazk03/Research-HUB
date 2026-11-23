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

/*
| Public catalogue data (services, domains, settings, experts…) is saved in the
| browser so a returning visitor sees the page instantly, even while the server
| is still waking up. The saved copy is refreshed in the background whenever it
| is older than five minutes. Only public, non-personal data is stored here.
*/
const STORE_PREFIX = "rh_public:";
/** Bump when the shape of a public API response changes, so old saved copies are ignored. */
const STORE_VERSION = 1;
const STORE_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

interface Saved<T> {
  v: number;
  at: number;
  data: T;
}

const readSaved = <T,>(key: string): Saved<T> | undefined => {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as Saved<T>;
    if (saved?.v !== STORE_VERSION || typeof saved.at !== "number" || Date.now() - saved.at > STORE_MAX_AGE) {
      return undefined;
    }
    return saved;
  } catch {
    return undefined;
  }
};

const writeSaved = <T,>(key: string, data: T): void => {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify({ v: STORE_VERSION, at: Date.now(), data }));
  } catch {
    // Storage full or blocked (private mode): the page still works, just without the saved copy
  }
};

/** A public query that starts from the browser's saved copy and keeps it up to date. */
export const usePersistedPublicQuery = <T,>(key: string, fetcher: () => Promise<T>) =>
  useQuery({
    queryKey: [key],
    queryFn: async () => {
      const data = await fetcher();
      writeSaved(key, data);
      return data;
    },
    initialData: () => readSaved<T>(key)?.data,
    initialDataUpdatedAt: () => readSaved<T>(key)?.at,
    staleTime: FIVE_MIN,
  });

export const useSettings = () => usePersistedPublicQuery("public-settings", getPublicSettings);

export const useDomains = () => usePersistedPublicQuery("public-domains", getPublicDomains);

export const useCategories = () => usePersistedPublicQuery("public-categories", () => getPublicCategories());

export const useAllServices = () => usePersistedPublicQuery("public-services-all", () => getPublicServices());

export const useFeaturedServices = () =>
  usePersistedPublicQuery("public-services-featured", () => getPublicServices({ featured: true }));

export const useFaqs = () => usePersistedPublicQuery("public-faqs", getPublicFaqs);

export const useReferenceData = () => usePersistedPublicQuery("public-reference-data", getPublicReferenceData);

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
