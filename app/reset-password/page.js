"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowserClient";
import { LockIcon, EyeIcon, EyeOffIcon, HomeIcon, CheckCircleIcon } from "@/components/Icons";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Clicking the emailed reset link redirects here with a recovery token in
  // the URL — Supabase's client picks it up automatically and briefly
  // signs the person in just enough to call updateUser({ password }).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setSessionReady(true);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) return setError(updateError.message);
    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 pt-4">
        <Link href="/" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-brand-navy" aria-label="Go to Home">
          <HomeIcon className="w-5 h-5" />
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange mx-auto mb-3">
              <LockIcon className="w-7 h-7" />
            </span>
            <h1 className="text-2xl font-bold text-brand-navy">Set a New Password</h1>
          </div>

          {!sessionReady && !success && (
            <p className="text-sm text-slate-500 text-center">
              Open this page using the reset link from your email. If you got here directly, request a
              new link from the{" "}
              <Link href="/login" className="text-brand-orange font-medium">Login page</Link>.
            </p>
          )}

          {sessionReady && !success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div>
                <label className="field-label">
                  <LockIcon className="w-4 h-4 text-brand-orange" /> New Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy"
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="field-label">
                  <LockIcon className="w-4 h-4 text-brand-orange" /> Confirm New Password
                </label>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field-input"
                />
              </div>

              <button type="submit" className="btn-orange w-full" disabled={loading}>
                {loading ? "Saving..." : "Update Password"}
              </button>
            </form>
          )}

          {success && (
            <p className="text-green-700 text-sm text-center flex items-center justify-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" /> Password updated — redirecting to login...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
