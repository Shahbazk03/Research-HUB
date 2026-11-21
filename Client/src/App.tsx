import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navbar } from "./components/common/Navbar";
import { Footer } from "./components/common/Footer";
import { WhatsAppButton } from "./components/common/WhatsAppButton";
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { PatentsPage } from "./pages/PatentsPage";
import { RequestWizardPage } from "./pages/RequestWizardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
// Account areas are loaded on demand so public visitors don't download them
const CustomerDashboardPage = lazy(() =>
  import("./pages/CustomerDashboardPage").then((m) => ({ default: m.CustomerDashboardPage }))
);
const WriterPortalPage = lazy(() =>
  import("./pages/WriterPortalPage").then((m) => ({ default: m.WriterPortalPage }))
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
);
import { AboutPage, ContactPage, LegalPage, NotFoundPage } from "./pages/InfoPages";
import { ExpertsPage, JoinExpertsPage } from "./pages/ExpertsPages";
import { PageLoader } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import { migrateHashUrl, navigateTo, NAVIGATION_EVENT, parseLocation, RouteParams, RouteType } from "./router";

export type { RouteType } from "./router";

const readLocation = () => parseLocation(window.location.pathname, window.location.search);

export const App: React.FC = () => {
  const { isAuthenticated, isStaff, isWriter, isLoading } = useAuth();

  const [{ route, params }, setLocation] = useState<{ route: RouteType; params: RouteParams }>(() => {
    migrateHashUrl();
    return readLocation();
  });

  useEffect(() => {
    const sync = () => setLocation(readLocation());
    window.addEventListener("popstate", sync);
    window.addEventListener(NAVIGATION_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(NAVIGATION_EVENT, sync);
    };
  }, []);

  const navigate = navigateTo;
  const isAdminView = route === "admin-dashboard";
  // Sign-in screens (including the sign-in shown for protected pages) are full-height and have no footer
  const isAuthPage =
    route === "login" ||
    route === "register" ||
    (!isLoading && (route === "customer-dashboard" || route === "writer") && !isAuthenticated) ||
    (!isLoading && route === "admin-dashboard" && !isAuthenticated);

  const renderPage = () => {
    // Account areas wait for the session check so we never flash the sign-in page
    if ((route === "customer-dashboard" || route === "admin-dashboard" || route === "writer") && isLoading) {
      return <PageLoader label="Checking your session…" />;
    }

    if ((route === "customer-dashboard" || route === "writer") && !isAuthenticated) {
      return <LoginPage navigate={navigate} redirect={route} />;
    }

    // Writers have their own portal instead of the customer dashboard
    if (route === "customer-dashboard" && isWriter) {
      return <WriterPortalPage navigate={navigate} initialTab={params.tab === "profile" ? "profile" : undefined} />;
    }

    if (route === "admin-dashboard" && (!isAuthenticated || !isStaff)) {
      return isAuthenticated ? (
        <div className="container-page section">
          <div className="card card-pad mx-auto max-w-lg text-center">
            <h1 className="h-card">Staff access only</h1>
            <p className="muted mt-2">
              Your account does not have access to the administration console. If you think this is a mistake, contact
              your administrator.
            </p>
            <button type="button" className="btn-primary mt-6" onClick={() => navigate("customer-dashboard")}>
              Go to my requests
            </button>
          </div>
        </div>
      ) : (
        <LoginPage navigate={navigate} redirect="admin-dashboard" />
      );
    }

    switch (route) {
      case "home":
        return <HomePage navigate={navigate} />;
      case "services":
        return <ServicesPage navigate={navigate} params={params} />;
      case "service-detail":
        return <ServiceDetailPage slug={params.slug || ""} navigate={navigate} />;
      case "patents":
        return <PatentsPage navigate={navigate} />;
      case "wizard":
        return <RequestWizardPage navigate={navigate} initialService={params.service || params.serviceId} />;
      case "login":
        return <LoginPage navigate={navigate} redirect={params.redirect} redirectParams={params} />;
      case "register":
        return <RegisterPage navigate={navigate} redirect={params.redirect} redirectParams={params} />;
      case "customer-dashboard":
        return <CustomerDashboardPage navigate={navigate} initialTab={params.tab} />;
      case "admin-dashboard":
        return <AdminDashboardPage navigate={navigate} initialTab={params.tab} />;
      case "about":
        return <AboutPage navigate={navigate} />;
      case "contact":
        return <ContactPage navigate={navigate} />;
      case "privacy":
        return <LegalPage kind="privacy" navigate={navigate} />;
      case "terms":
        return <LegalPage kind="terms" navigate={navigate} />;
      case "writer":
        return <WriterPortalPage navigate={navigate} initialTab={params.tab} />;
      case "experts":
        return <ExpertsPage navigate={navigate} />;
      case "join-experts":
        return <JoinExpertsPage navigate={navigate} />;
      default:
        return <NotFoundPage navigate={navigate} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift"
      >
        Skip to content
      </a>
      {(!isAdminView || !isStaff) && <Navbar currentRoute={route} navigate={navigate} />}
      <main id="main" className={`flex-1 ${isAuthPage ? "bg-slate-50" : ""}`}>
        <Suspense fallback={<PageLoader />}>{renderPage()}</Suspense>
      </main>
      {!isAdminView && !isAuthPage && <Footer navigate={navigate} />}
      {!isAdminView && route !== "wizard" && <WhatsAppButton />}
    </div>
  );
};

export default App;
