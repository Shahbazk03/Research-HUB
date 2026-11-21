import React, { useEffect, useId } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from "lucide-react";
import { Navigate, pathFor, RouteParams, RouteType } from "../router";

/** Anchor that navigates client-side but keeps a real href (middle-click, copy link, SEO). */
export const AppLink: React.FC<
  {
    to: RouteType | string;
    params?: RouteParams;
    navigate: Navigate;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
  } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">
> = ({ to, params, navigate, className, children, onClick, ...rest }) => (
  <a
    href={pathFor(to, params)}
    className={className}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      onClick?.();
      navigate(to, params);
    }}
    {...rest}
  >
    {children}
  </a>
);

export const Spinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
);

export const PageLoader: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500" role="status">
    <Spinner className="h-6 w-6 text-navy-600" />
    <p className="text-sm">{label}</p>
  </div>
);

export const ErrorState: React.FC<{ title?: string; message?: string; onRetry?: () => void }> = ({
  title = "We couldn't load this content",
  message = "Our servers may be waking up. Please try again in a few seconds.",
  onRetry,
}) => (
  <div className="card card-pad flex flex-col items-center gap-3 text-center" role="alert">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
      <AlertTriangle className="h-5 w-5" />
    </span>
    <div>
      <p className="font-semibold text-navy-900">{title}</p>
      <p className="muted mt-1">{message}</p>
    </div>
    {onRetry && (
      <button type="button" onClick={onRetry} className="btn-secondary btn-sm">
        <RefreshCw className="h-3.5 w-3.5" /> Try again
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, message, icon, action }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy-600">
      {icon ?? <Inbox className="h-5 w-5" />}
    </span>
    <div>
      <p className="font-semibold text-navy-900">{title}</p>
      {message && <p className="muted mx-auto mt-1 max-w-md">{message}</p>}
    </div>
    {action}
  </div>
);

/** Labelled form field with proper label/input association and error text. */
export const Field: React.FC<{
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy?: string) => React.ReactNode;
}> = ({ label, required, help, error, className, children }) => {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div className={className}>
      <label htmlFor={id} className={`label ${required ? "label-required" : ""}`}>
        {label}
      </label>
      {children(id, help || error ? helpId : undefined)}
      {error ? (
        <p id={helpId} className="error-text">
          {error}
        </p>
      ) : help ? (
        <p id={helpId} className="help">
          {help}
        </p>
      ) : null}
    </div>
  );
};

/** Accessible modal: Escape closes, body scroll locked, labelled dialog. */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  size?: "md" | "lg" | "xl";
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, size = "md", footer, children }) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "xl" ? "sm:max-w-5xl" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl";

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`modal-panel ${width}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-lg font-semibold text-navy-900">
              {title}
            </h2>
            {subtitle && <div className="muted mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2" aria-label="Close dialog">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
};

/** Page heading band used across interior pages. */
export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}> = ({ eyebrow, title, description, actions, breadcrumb }) => (
  <section className="border-b border-slate-200 bg-navy-50/60">
    <div className="container-page py-10 sm:py-14">
      {breadcrumb && <div className="mb-4 text-sm text-slate-500">{breadcrumb}</div>}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
          {description && <div className="lead mt-3 text-base sm:text-lg">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  </section>
);

/** Updates the document title for the current page. */
export const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} | Research Hub` : "Research Hub — Research, Publication & Patent Services";
  }, [title]);
};
