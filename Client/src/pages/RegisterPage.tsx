import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppLink, Field, Spinner, useDocumentTitle } from "../components/ui";
import { AuthLayout, resolveRedirect } from "./AuthLayout";
import { Navigate, RouteParams } from "../router";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage: React.FC<{ navigate: Navigate; redirect?: string; redirectParams?: RouteParams }> = ({
  navigate,
  redirect,
}) => {
  useDocumentTitle("Create an account");
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", institution: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "Please enter your first name.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setError(null);
    setLoading(true);
    const result = await register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      institution: form.institution.trim() || undefined,
      password: form.password,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.message || "We couldn't create your account. Please try again.");
      return;
    }
    const target = resolveRedirect(redirect, "CUSTOMER");
    navigate(target.route, target.params);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have an account?{" "}
          <AppLink to="login" params={{ redirect }} navigate={navigate} className="link">
            Sign in
          </AppLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName}>
            {(id, d) => <input id={id} aria-describedby={d} autoComplete="given-name" className={`input ${errors.firstName ? "input-error" : ""}`} value={form.firstName} onChange={set("firstName")} />}
          </Field>
          <Field label="Last name">
            {(id) => <input id={id} autoComplete="family-name" className="input" value={form.lastName} onChange={set("lastName")} />}
          </Field>
        </div>
        <Field label="Email address" required error={errors.email}>
          {(id, d) => <input id={id} aria-describedby={d} type="email" autoComplete="email" className={`input ${errors.email ? "input-error" : ""}`} value={form.email} onChange={set("email")} />}
        </Field>
        <Field label="WhatsApp / phone" help="Optional. Include the country code.">
          {(id, d) => <input id={id} aria-describedby={d} type="tel" autoComplete="tel" className="input" value={form.phone} onChange={set("phone")} />}
        </Field>
        <Field label="Institution or organisation">
          {(id) => <input id={id} autoComplete="organization" className="input" value={form.institution} onChange={set("institution")} />}
        </Field>
        <Field label="Password" required error={errors.password} help="At least 8 characters.">
          {(id, d) => (
            <div className="relative">
              <input
                id={id}
                aria-describedby={d}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                className={`input pr-11 ${errors.password ? "input-error" : ""}`}
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </Field>
        <button type="submit" className="btn-primary btn-lg w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
        <p className="text-center text-xs text-slate-500">
          By creating an account you agree to our{" "}
          <AppLink to="terms" navigate={navigate} className="link">
            terms
          </AppLink>{" "}
          and{" "}
          <AppLink to="privacy" navigate={navigate} className="link">
            privacy policy
          </AppLink>
          .
        </p>
      </form>
    </AuthLayout>
  );
};
