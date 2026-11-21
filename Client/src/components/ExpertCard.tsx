import React from "react";
import { Award, BookOpen, Building2, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import { PublicExpert } from "../api/writers";
import { safeHref } from "../api/types";

const initialsOf = (name: string) =>
  name
    .replace(/^(Dr\.?|Prof\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export const ExpertAvatar: React.FC<{ expert: PublicExpert; size?: "md" | "lg" }> = ({ expert, size = "md" }) => {
  const dim = size === "lg" ? "h-20 w-20 text-2xl" : "h-14 w-14 text-lg";
  const photo = safeHref(expert.photoUrl);
  return photo ? (
    <img src={photo} alt="" className={`${dim} shrink-0 rounded-full object-cover ring-4 ring-white`} loading="lazy" />
  ) : (
    <span className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-semibold text-white ring-4 ring-white`} aria-hidden="true">
      {initialsOf(expert.name)}
    </span>
  );
};

/** Public profile card for the "Our experts" section and directory. No contact details. */
export const ExpertCard: React.FC<{ expert: PublicExpert; detailed?: boolean }> = ({ expert, detailed }) => {
  const joined = expert.joinedAt ? new Date(expert.joinedAt).getFullYear() : undefined;
  const scholar = safeHref(expert.googleScholarUrl);

  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <div className="h-14 bg-gradient-to-r from-navy-900 to-navy-700" aria-hidden="true" />
      <div className="-mt-8 flex flex-1 flex-col px-5 pb-5">
        <div className="flex items-end justify-between gap-3">
          <ExpertAvatar expert={expert} />
          {joined && <span className="badge-neutral mb-1 text-[11px]">Member since {joined}</span>}
        </div>

        <h3 className="mt-3 text-lg font-semibold leading-snug text-navy-900">{expert.name}</h3>
        {expert.designation && <p className="text-sm font-medium text-navy-700">{expert.designation}</p>}
        <div className="mt-2 space-y-1 text-sm text-slate-600">
          {expert.institution && (
            <p className="flex items-start gap-2">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {expert.institution}
                {expert.department ? `, ${expert.department}` : ""}
              </span>
            </p>
          )}
          {expert.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              {expert.location}
            </p>
          )}
        </div>

        {/* Achievement stats */}
        <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-md border border-slate-100 bg-slate-50 text-center">
          <div className="px-2 py-2.5">
            <dt className="text-[11px] text-slate-500">Publications</dt>
            <dd className="text-base font-semibold text-navy-900">{expert.publicationCount}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="text-[11px] text-slate-500">Experience</dt>
            <dd className="text-base font-semibold text-navy-900">{expert.yearsOfExperience != null ? `${expert.yearsOfExperience} yrs` : "—"}</dd>
          </div>
          <div className="px-2 py-2.5">
            <dt className="text-[11px] text-slate-500">Projects here</dt>
            <dd className="text-base font-semibold text-navy-900">{expert.projectsCompleted}</dd>
          </div>
        </dl>

        {expert.expertise.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {expert.expertise.slice(0, detailed ? 12 : 4).map((e) => (
              <span key={e} className="badge-navy text-[11px]">
                {e}
              </span>
            ))}
            {!detailed && expert.expertise.length > 4 && <span className="badge-neutral text-[11px]">+{expert.expertise.length - 4}</span>}
          </div>
        )}

        {expert.indexedIn.length > 0 && (
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-600">
            <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" />
            Published in {expert.indexedIn.join(", ")}
          </p>
        )}

        {detailed && expert.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{expert.bio}</p>}

        {detailed && expert.recentPublications.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">
              <BookOpen className="h-3.5 w-3.5" /> Recent publications
            </p>
            <ul className="mt-2 space-y-2">
              {expert.recentPublications.map((p) => (
                <li key={p.title} className="text-sm leading-snug text-slate-700">
                  {p.title}
                  {(p.journal || p.year) && (
                    <span className="block text-xs text-slate-500">
                      {[p.journal, p.year].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified by Research Hub
          </span>
          {scholar && (
            <a href={scholar} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
              Scholar <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
