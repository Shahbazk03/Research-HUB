import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, FolderSearch, LifeBuoy, UserRoundPen } from "lucide-react";
import { getErrorMessage } from "../api";
import { safeHref } from "../api/types";
import { getMyEngagements, getMyWriterProfile } from "../api/writers";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorState, PageLoader, useDocumentTitle } from "../components/ui";
import { NotApprovedPanel } from "../components/writer/WriterBits";
import { OpenProjectsTab } from "../components/writer/OpenProjectsTab";
import { MyWorkTab } from "../components/writer/MyWorkTab";
import { EarningsTab } from "../components/writer/EarningsTab";
import { WriterProfileTab } from "../components/writer/WriterProfileTab";
import { EngagementDetailModal } from "../components/writer/EngagementDetailModal";
import { APPLICATION_BADGE, groupOf, initialsOf, isNotApprovedError, writerRetry } from "../components/writer/writerHelpers";
import { pathFor } from "../router";

type Tab = "projects" | "work" | "earnings" | "profile";
const TABS: [Tab, string][] = [
  ["projects", "Open projects"],
  ["work", "My work"],
  ["earnings", "Earnings"],
  ["profile", "Profile"],
];
const isTab = (v?: string): v is Tab => TABS.some(([k]) => k === v);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export const WriterPortalPage: React.FC<{
  navigate: (route: string, params?: Record<string, string | undefined>) => void;
  initialTab?: string;
}> = ({ navigate, initialTab }) => {
  const { user, isAuthenticated } = useAuth();
  useDocumentTitle("Writer portal");

  const profile = useQuery({
    queryKey: ["writer-profile"],
    queryFn: getMyWriterProfile,
    enabled: isAuthenticated && user?.role === "WRITER",
    retry: writerRetry,
  });
  const account = profile.data;
  const status = account?.writerProfile?.applicationStatus;
  const approved = status === "APPROVED";

  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "projects");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (isTab(initialTab)) setTab(initialTab);
  }, [initialTab]);

  // Unapproved writers land on their profile, the only section they can use
  useEffect(() => {
    if (account && !approved && !isTab(initialTab)) setTab("profile");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, approved]);

  // Used for the header's call to action; shares the cache with "My work"
  const engagements = useQuery({
    queryKey: ["writer-engagements"],
    queryFn: getMyEngagements,
    enabled: approved,
    retry: writerRetry,
  });
  const actionCount = (engagements.data || []).filter((e) => groupOf(e.stage) === "action").length;

  // If the account was suspended since the profile loaded, refresh it so the header and panels agree
  const refetchProfile = profile.refetch;
  useEffect(() => {
    if (isNotApprovedError(engagements.error)) refetchProfile();
  }, [engagements.error, refetchProfile]);

  const changeTab = useCallback((next: Tab) => {
    setTab(next);
    try {
      window.history.replaceState(null, "", pathFor("writer", { tab: next }));
    } catch {
      /* ignore */
    }
  }, []);

  const closeDetail = useCallback(() => setOpenId(null), []);
  const contact = () => navigate("contact");

  const notApproved = (message?: string) => (
    <NotApprovedPanel status={status === "APPROVED" ? undefined : status} message={message} onCompleteProfile={() => changeTab("profile")} onContact={contact} />
  );

  if (!isAuthenticated) {
    return (
      <div className="container-page section-tight">
        <EmptyState
          title="Sign in to the writer portal"
          message="Projects, offers and earnings are available once you sign in with your writer account."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("login", { redirect: "writer" })}>
              Sign in
            </button>
          }
        />
      </div>
    );
  }

  if (user?.role !== "WRITER") {
    return (
      <div className="container-page section-tight">
        <EmptyState
          title="This area is for Research Hub writers"
          message="You are signed in with an account that is not registered as a writer."
          action={
            <button type="button" className="btn-secondary" onClick={() => navigate("home")}>
              Go to home page
            </button>
          }
        />
      </div>
    );
  }

  if (profile.isLoading) return <PageLoader label="Loading your writer portal…" />;

  if (profile.isError || !account) {
    return (
      <div className="container-page section-tight">
        <ErrorState title="We couldn't load your writer profile" message={getErrorMessage(profile.error)} onRetry={() => profile.refetch()} />
      </div>
    );
  }

  const p = account.writerProfile;
  const fullName = [p?.title, account.firstName, account.lastName].filter(Boolean).join(" ");
  const subline = [p?.designation, account.institution].filter(Boolean).join(" · ");
  const photo = safeHref(p?.photoUrl);
  const badge = APPLICATION_BADGE[status || "PENDING"];

  let primary: React.ReactNode;
  if (!approved) {
    primary = (
      <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => changeTab("profile")}>
        <UserRoundPen className="h-4 w-4" aria-hidden="true" /> {status === "PENDING" || !status ? "Complete your profile" : "View profile"}
      </button>
    );
  } else if (actionCount > 0) {
    primary = (
      <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => changeTab("work")}>
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        {actionCount} project{actionCount === 1 ? " needs" : "s need"} your action
      </button>
    );
  } else {
    primary = (
      <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => changeTab("projects")}>
        <FolderSearch className="h-4 w-4" aria-hidden="true" /> Browse open projects
      </button>
    );
  }

  return (
    <div className="min-w-0 bg-slate-50/60 pb-16">
      {/* Header band */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page flex flex-col gap-5 py-6 sm:py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {photo ? (
              <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-4 ring-navy-50" />
            ) : (
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-900 text-lg font-semibold text-white ring-4 ring-navy-50"
                aria-hidden="true"
              >
                {initialsOf(fullName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm text-slate-500">{greeting()},</p>
              <h1 className="break-words font-serif text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{fullName || "Welcome"}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                {subline && <span className="min-w-0 break-words">{subline}</span>}
                <span className={badge.cls}>{badge.label}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={contact}>
              <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Support
            </button>
            {primary}
          </div>
        </div>
      </section>

      <div className="container-page pt-6">
        <div role="tablist" aria-label="Writer portal sections" className="flex gap-6 overflow-x-auto border-b border-slate-200">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`writer-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`writer-panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
              className={`tab ${tab === key ? "tab-active" : ""}`}
              onClick={() => changeTab(key)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = TABS.findIndex(([k]) => k === key);
                const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
                changeTab(next);
                document.getElementById(`writer-tab-${next}`)?.focus();
              }}
            >
              {label}
              {key === "work" && approved && actionCount > 0 && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{actionCount}</span>
              )}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`writer-panel-${tab}`} aria-labelledby={`writer-tab-${tab}`} className="pt-6">
          {tab === "profile" ? (
            <WriterProfileTab account={account} onContact={contact} />
          ) : !approved ? (
            notApproved()
          ) : tab === "projects" ? (
            <OpenProjectsTab onOpenEngagement={setOpenId} notApproved={notApproved} />
          ) : tab === "work" ? (
            <MyWorkTab onOpenEngagement={setOpenId} onBrowse={() => changeTab("projects")} notApproved={notApproved} />
          ) : (
            <EarningsTab onOpenEngagement={setOpenId} notApproved={notApproved} />
          )}
        </div>
      </div>

      <EngagementDetailModal engagementId={openId} onClose={closeDetail} />
    </div>
  );
};
