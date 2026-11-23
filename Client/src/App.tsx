import React, { Suspense, lazy, useEffect, useState } from "react";
import { Navbar } from "./components/common/Navbar";
import { Footer } from "./components/common/Footer";
import { WhatsAppButton } from "./components/common/WhatsAppButton";
import { SlowConnectionNotice } from "./components/common/SlowConnectionNotice";
import { HomePage } from "./pages/HomePage";
import { ExpertsPage, JoinExpertsPage } from "./pages/ExpertsPages";
import { PageLoader } from "./components/ui";

/*
| Only the home page ships in the first download. Other public pages are fetched
| in the background once the home page is on screen, so moving around still
| feels instant. Account areas load only after sign-in.
*/
const loadServicesPage = () => import("./pages/ServicesPage");
const loadServiceDetailPage = () => import("./pages/ServiceDetailPage");
const loadPatentsPage = () => import("./pages/PatentsPage");
const loadRequestWizardPage = () => import("./pages/RequestWizardPage");
const loadLoginPage = () => import("./pages/LoginPage");
const loadRegisterPage = () => import("./pages/RegisterPage");
const loadInfoPages = () => import("./pages/InfoPages");

const ServicesPage = lazy(() => loadServicesPage().then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => loadServiceDetailPage().then((m) => ({ default: m.ServiceDetailPage })));
const PatentsPage = lazy(() => loadPatentsPage().then((m) => ({ default: m.PatentsPage })));
const RequestWizardPage = lazy(() => loadRequestWizardPage().then((m) => ({ default: m.RequestWizardPage })));
const LoginPage = lazy(() => loadLoginPage().then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => loadRegisterPage().then((m) => ({ default: m.RegisterPage })));
const AboutPage = lazy(() => loadInfoPages().then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => loadInfoPages().then((m) => ({ default: m.ContactPage })));
const LegalPage = lazy(() => loadInfoPages().then((m) => ({ default: m.LegalPage })));
const NotFoundPage = lazy(() => loadInfoPages().then((m) => ({ default: m.NotFoundPage })));

const CustomerDashboardPage = lazy(() =>
  import("./pages/CustomerDashboardPage").then((m) => ({ default: m.CustomerDashboardPage }))
);
const WriterPortalPage = lazy(() =>
  import("./pages/WriterPortalPage").then((m) => ({ default: m.WriterPortalPage }))
);
const AdminDashboardPage = lazy(() =>
  import("./pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
);

const prefetchPublicPages = () => {
  [
    loadServicesPage,
    loadServiceDetailPage,
    loadRequestWizardPage,
    loadLoginPage,
    loadPatentsPage,
    loadRegisterPage,
    loadInfoPages,
  ].forEach((load) => load().catch(() => undefined));
};

/** Run once the browser is idle after the first page is on screen. */
const whenIdle = (task: () => void): (() => void) => {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(task, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 2500);
  return () => window.clearTimeout(id);
};
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

  useEffect(() => whenIdle(prefetchPublicPages), []);

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
      <SlowConnectionNotice />
    </div>
  );
};

export default App;
