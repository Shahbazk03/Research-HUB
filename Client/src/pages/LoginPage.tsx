import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppLink, Field, Spinner, useDocumentTitle } from "../components/ui";
import { AuthLayout, resolveRedirect } from "./AuthLayout";
import { Navigate, RouteParams } from "../router";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC<{ navigate: Navigate; redirect?: string; redirectParams?: RouteParams }> = ({
  navigate,
  redirect,
}) => {
  useDocumentTitle("Sign in");
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter the email address you registered with.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setError(null);
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.message || "Sign in failed. Please check your email and password.");
      return;
    }
    const target = resolveRedirect(redirect, result.user?.role);
    navigate(target.route, target.params);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track your requests, quotations and deliverables."
      footer={
        <p className="text-center text-sm text-slate-600">
          New to Research Hub?{" "}
          <AppLink to="register" params={{ redirect }} navigate={navigate} className="link">
            Create a free account
          </AppLink>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="alert-error" role="alert">
            {error}
          </div>
        )}

        <Field label="Email address" error={errors.email}>
          {(id, d) => (
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id={id}
                aria-describedby={d}
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                className={`input pl-10 ${errors.email ? "input-error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((x) => ({ ...x, email: undefined }));
                }}
              />
            </div>
          )}
        </Field>

        <Field label="Password" error={errors.password}>
          {(id, d) => (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id={id}
                aria-describedby={d}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                className={`input pl-10 pr-11 ${errors.password ? "input-error" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((x) => ({ ...x, password: undefined }));
                }}
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

        <div className="flex justify-end">
          <AppLink to="contact" navigate={navigate} className="text-sm font-medium text-navy-700 hover:text-navy-900 hover:underline">
            Forgot password?
          </AppLink>
        </div>

        <button type="submit" className="btn-primary btn-lg w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
};
