import React, { useState, useEffect } from "react";
import { Navbar } from "./components/common/Navbar";
import { Footer } from "./components/common/Footer";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { RequestWizardPage } from "./pages/RequestWizardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CustomerDashboardPage } from "./pages/CustomerDashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { useAuth } from "./context/AuthContext";

export type RouteType =
  | "home"
  | "services"
  | "service-detail"
  | "wizard"
  | "login"
  | "register"
  | "customer-dashboard"
  | "admin-dashboard";

export const App: React.FC = () => {
  const { user, isAuthenticated, isStaff, isLoading } = useAuth();

  // Route & Params state
  const [route, setRoute] = useState<RouteType>("home");
  const [params, setParams] = useState<any>({});

  // Parse URL hash to state
  const parseHash = () => {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash || hash === "") {
      setRoute("home");
      setParams({});
      return;
    }

    const [pathPart, queryPart] = hash.split("?");
    const queryParams: Record<string, string> = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((val, key) => {
        queryParams[key] = val;
      });
    }

    if (pathPart === "services") {
      setRoute("services");
      setParams(queryParams);
    } else if (pathPart.startsWith("services/")) {
      const slug = pathPart.replace("services/", "");
      setRoute("service-detail");
      setParams({ slug, ...queryParams });
    } else if (pathPart === "wizard" || pathPart === "request") {
      setRoute("wizard");
      setParams(queryParams);
    } else if (pathPart === "login") {
      setRoute("login");
      setParams(queryParams);
    } else if (pathPart === "register") {
      setRoute("register");
      setParams(queryParams);
    } else if (pathPart === "dashboard" || pathPart === "customer-dashboard") {
      setRoute("customer-dashboard");
      setParams(queryParams);
    } else if (pathPart === "admin" || pathPart === "admin-dashboard") {
      setRoute("admin-dashboard");
      setParams(queryParams);
    } else {
      setRoute("home");
      setParams({});
    }
  };

  // Sync hash on mount and popstate
  useEffect(() => {
    parseHash();
    const handleHashChange = () => parseHash();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Navigation function
  const navigate = (newRoute: string, newParams: any = {}) => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update hash for deep linking
    let targetHash = "";
    if (newRoute === "home") targetHash = "#/";
    else if (newRoute === "services") {
      const qs = newParams?.search || newParams?.domainId ? `?${new URLSearchParams(newParams).toString()}` : "";
      targetHash = `#/services${qs}`;
    } else if (newRoute === "service-detail") {
      targetHash = `#/services/${newParams?.slug || ""}`;
    } else if (newRoute === "wizard") {
      const qs = newParams?.serviceId ? `?serviceId=${newParams.serviceId}` : "";
      targetHash = `#/wizard${qs}`;
    } else if (newRoute === "login") {
      const qs = newParams?.redirect ? `?redirect=${encodeURIComponent(newParams.redirect)}` : "";
      targetHash = `#/login${qs}`;
    } else if (newRoute === "register") {
      targetHash = "#/register";
    } else if (newRoute === "customer-dashboard") {
      let activeTab = newParams?.tab;
      if (!activeTab && typeof sessionStorage !== "undefined") {
        activeTab = sessionStorage.getItem("customer_active_tab") || undefined;
      }
      const qs = activeTab ? `?tab=${encodeURIComponent(activeTab)}` : "";
      targetHash = `#/dashboard${qs}`;
    } else if (newRoute === "admin-dashboard") {
      let activeTab = newParams?.tab;
      if (!activeTab && typeof sessionStorage !== "undefined") {
        activeTab = sessionStorage.getItem("admin_active_tab") || undefined;
      }
      const qs = activeTab ? `?tab=${encodeURIComponent(activeTab)}` : "";
      targetHash = `#/admin${qs}`;
    } else {
      targetHash = `#/${newRoute}`;
    }

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      setRoute(newRoute as RouteType);
      setParams(newParams || {});
    }
  };

  // Protected route redirects
  if (!isLoading) {
    if ((route === "customer-dashboard") && !isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Navbar currentRoute={route} navigate={navigate} />
          <div className="flex-1 flex items-center justify-center py-8">
            <LoginPage navigate={navigate} redirect="customer-dashboard" />
          </div>
        </div>
      );
    }

    if ((route === "admin-dashboard") && (!isAuthenticated || !isStaff)) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Navbar currentRoute={route} navigate={navigate} />
          <div className="flex-1 max-w-xl mx-auto my-auto px-4 py-24 text-center">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">Admin Portal Authentication Required</h2>
              <p className="text-slate-400 text-sm mb-6">
                You must be authenticated with administrative privileges (ADMIN or TEAM_MEMBER) to access the research control center.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => navigate("login", { redirect: "admin-dashboard" })}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all"
                >
                  Sign In as Administrator
                </button>
                <button
                  onClick={() => navigate("home")}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-all"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
          <Footer navigate={navigate} />
        </div>
      );
    }
  }

  // Render Page Content
  const renderPage = () => {
    switch (route) {
      case "home":
        return <HomePage navigate={navigate} />;
      case "services":
        return <ServicesPage navigate={navigate} initialParams={params} />;
      case "service-detail":
        return <ServiceDetailPage slug={params.slug || ""} navigate={navigate} />;
      case "wizard":
        return <RequestWizardPage navigate={navigate} initialServiceId={params.serviceId} />;
      case "login":
        return <LoginPage navigate={navigate} redirect={params.redirect} />;
      case "register":
        return <RegisterPage navigate={navigate} />;
      case "customer-dashboard":
        return <CustomerDashboardPage navigate={navigate} initialTab={params.tab} />;
      case "admin-dashboard":
        return <AdminDashboardPage navigate={navigate} initialTab={params.tab} />;
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  const isAuthPage = route === "login" || route === "register";
  const isAdminView = route === "admin-dashboard";
  const showFooter = !isAuthPage && !isAdminView;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar currentRoute={route} navigate={navigate} />
      <main className={`flex-1 ${isAuthPage ? "flex items-center justify-center py-6 sm:py-10" : ""}`}>
        {renderPage()}
      </main>
      {showFooter && <Footer navigate={navigate} />}
    </div>
  );
};

export default App;
