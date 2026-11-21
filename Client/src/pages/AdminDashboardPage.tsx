import React, { useEffect, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Gift,
  GraduationCap,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LucideIcon,
  Settings,
  ShieldAlert,
  Tag,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ServiceRequest } from "../api/types";
import { useDocumentTitle } from "../components/ui";
import { FeedbackToast, useFeedback } from "../components/admin/shared";
import { OverviewTab } from "../components/admin/OverviewTab";
import { RequestsTab } from "../components/admin/RequestsTab";
import { RequestManageModal } from "../components/admin/RequestManageModal";
import { ServicesTab } from "../components/admin/ServicesTab";
import { CategoriesTab, DomainsTab } from "../components/admin/TaxonomyTabs";
import { UsersTab } from "../components/admin/UsersTab";
import { ReferralsTab } from "../components/admin/ReferralsTab";
import { SettingsTab } from "../components/admin/SettingsTab";
import { FaqsTab } from "../components/admin/FaqsTab";
import { AssignmentsTab } from "../components/admin/AssignmentsTab";
import { WritersTab } from "../components/admin/WritersTab";
import { useWriterBadgeCounts } from "../components/admin/writerShared";

interface AdminDashboardPageProps {
  navigate: (route: string, params?: Record<string, string | undefined>) => void;
  initialTab?: string;
}

type AdminTab =
  | "overview"
  | "requests"
  | "assignments"
  | "writers"
  | "services"
  | "domains"
  | "categories"
  | "users"
  | "referrals"
  | "settings"
  | "faqs";

const TABS: { id: AdminTab; label: string; icon: LucideIcon; adminOnly?: boolean; group: "Operations" | "Catalogue" | "Administration" }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Operations" },
  { id: "requests", label: "Requests", icon: FileText, group: "Operations" },
  { id: "assignments", label: "Assignments", icon: ClipboardCheck, group: "Operations" },
  { id: "writers", label: "Writers", icon: GraduationCap, group: "Administration" },
  { id: "services", label: "Services", icon: Layers, group: "Catalogue" },
  { id: "domains", label: "Disciplines", icon: Building2, group: "Catalogue" },
  { id: "categories", label: "Categories", icon: Tag, group: "Catalogue" },
  { id: "faqs", label: "FAQs", icon: HelpCircle, group: "Catalogue" },
  { id: "users", label: "Users", icon: Users, adminOnly: true, group: "Administration" },
  { id: "referrals", label: "Referral codes", icon: Gift, adminOnly: true, group: "Administration" },
  { id: "settings", label: "Settings", icon: Settings, adminOnly: true, group: "Administration" },
];

const GROUPS = ["Operations", "Catalogue", "Administration"] as const;

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrator", TEAM_MEMBER: "Team member" };

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate, initialTab }) => {
  const { user, isStaff, isAdmin } = useAuth();
  const { feedback, notify, dismiss } = useFeedback();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const writerBadges = useWriterBadgeCounts(isStaff);
  const badgeFor = (tab: AdminTab): number => (tab === "assignments" ? writerBadges.assignments : tab === "writers" ? writerBadges.writers : 0);

  const visibleTabs = TABS.filter((t) => isAdmin || !t.adminOnly);
  const activeTab: AdminTab = visibleTabs.find((t) => t.id === initialTab)?.id ?? "overview";
  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  useDocumentTitle(`Admin · ${activeMeta.label}`);

  useEffect(() => {
    try {
      sessionStorage.setItem("admin_active_tab", activeTab);
    } catch {
      /* storage unavailable */
    }
  }, [activeTab]);

  const goTo = (tab: AdminTab) => navigate("admin-dashboard", { tab });

  if (!isStaff) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16">
        <div className="card card-pad max-w-md text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-navy-900">Access restricted</h1>
          <p className="muted mt-2">The admin console is available to Research Hub staff only.</p>
          <button type="button" className="btn-primary mt-6" onClick={() => navigate("home")}>
            Return to website
          </button>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "requests":
        return <RequestsTab onManage={setSelectedRequest} />;
      case "assignments":
        return <AssignmentsTab isAdmin={isAdmin} notify={notify} onOpenRequest={setSelectedRequest} />;
      case "writers":
        return <WritersTab isAdmin={isAdmin} notify={notify} onOpenRequest={setSelectedRequest} />;
      case "services":
        return <ServicesTab isAdmin={isAdmin} notify={notify} />;
      case "domains":
        return <DomainsTab isAdmin={isAdmin} notify={notify} />;
      case "categories":
        return <CategoriesTab isAdmin={isAdmin} notify={notify} />;
      case "faqs":
        return <FaqsTab isAdmin={isAdmin} notify={notify} />;
      case "users":
        return <UsersTab currentUser={user} notify={notify} />;
      case "referrals":
        return <ReferralsTab notify={notify} />;
      case "settings":
        return <SettingsTab notify={notify} />;
      default:
        return <OverviewTab onOpenRequests={() => goTo("requests")} onManageRequest={setSelectedRequest} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col bg-navy-950 text-navy-100 lg:flex" aria-label="Admin navigation">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-accent-400">Research Hub</p>
            <p className="mt-1 text-lg font-semibold text-white">Admin console</p>
            {user && (
              <p className="mt-2 truncate text-xs text-navy-200">
                {user.firstName} {user.lastName} · {ROLE_LABEL[user.role] || user.role}
              </p>
            )}
          </div>
          <nav className="flex-1 space-y-5 px-3 py-5">
            {GROUPS.map((group) => {
              const items = visibleTabs.filter((t) => t.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-300">{group}</p>
                  <ul className="space-y-0.5">
                    {items.map((t) => {
                      const active = t.id === activeTab;
                      const badge = badgeFor(t.id);
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => goTo(t.id)}
                            aria-current={active ? "page" : undefined}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                              active ? "bg-white text-navy-900" : "text-navy-100 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <t.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {t.label}
                            {badge > 0 && (
                              <span
                                className={`ml-auto rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-navy-900 text-white" : "bg-accent-500 text-white"}`}
                              >
                                {badge}
                                <span className="sr-only"> need attention</span>
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={() => navigate("home")}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-navy-200 hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> View website
            </button>
          </div>
        </aside>

        {/* Mobile / tablet tab bar */}
        <div className="border-b border-slate-200 bg-white lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6">
            <div className="min-w-0">
              <p className="eyebrow">Admin console</p>
              {user && (
                <p className="truncate text-xs text-slate-500">
                  {user.firstName} {user.lastName} · {ROLE_LABEL[user.role] || user.role}
                </p>
              )}
            </div>
          </div>
          <nav className="mt-3 flex gap-5 overflow-x-auto px-4 sm:px-6" aria-label="Admin navigation">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={t.id === activeTab ? "page" : undefined}
                className={`tab ${t.id === activeTab ? "tab-active" : ""}`}
              >
                {t.label}
                {badgeFor(t.id) > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white">
                    {badgeFor(t.id)}
                    <span className="sr-only"> need attention</span>
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{renderTab()}</main>
      </div>

      {selectedRequest && (
        <RequestManageModal
          key={selectedRequest._id}
          request={selectedRequest}
          isAdmin={isAdmin}
          notify={notify}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      <FeedbackToast feedback={feedback} onDismiss={dismiss} />
    </div>
  );
};


