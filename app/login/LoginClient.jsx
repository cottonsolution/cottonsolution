"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowserClient";
import {
  LoginIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  LockIcon,
  TruckIcon,
  WalletIcon,
  BuildingIcon,
  MapPinIcon,
  IdCardIcon,
  HomeIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowLeftIcon,
} from "@/components/Icons";
import PwaSetup from "@/components/PwaSetup";

const ROLE_REDIRECT = {
  admin: "/admin/dashboard",
  merchant: "/merchant/dashboard",
  driver: "/driver/dashboard",
};

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    role: "merchant",
    companyName: "",
    businessCity: "",
    ntnNumber: "",
    warehouseAddress: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  // Same logo the Admin Dashboard's "Hero & Branding" uploader controls —
  // shown here instead of a hardcoded mark, so it always matches the header.
  useEffect(() => {
    supabase
      .from("site_content")
      .select("logo_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => data?.logo_url && setLogoUrl(data.logo_url))
      .catch(() => {});
  }, []);

  function handleBack() {
    setError("");
    setInfo("");
    if (mode === "signup" || mode === "forgot") {
      setMode("login");
    } else {
      router.back();
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function redirectByRole(userId) {
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (!profile) {
      await new Promise((r) => setTimeout(r, 600));
      const retry = await supabase.from("profiles").select("role").eq("id", userId).single();
      profile = retry.data;
      profileError = retry.error;
    }

    if (!profile) {
      setError(
        profileError
          ? `Could not load your profile: ${profileError.message}`
          : "Your account is missing a profile row. Please contact support or check the Supabase 'profiles' table."
      );
      return;
    }

    const destination = ROLE_REDIRECT[profile.role];
    if (!destination) {
      setError(`Unrecognised account role "${profile.role}". Please contact support.`);
      return;
    }
    router.push(destination);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (authError) return setError(authError.message);
    await redirectByRole(data.user.id);
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
          role: form.role,
          ...(form.role === "merchant" && {
            company_name: form.companyName,
            business_city: form.businessCity,
            ntn_number: form.ntnNumber,
            warehouse_address: form.warehouseAddress,
          }),
        },
      },
    });
    setLoading(false);
    if (authError) return setError(authError.message);

    if (data.session) {
      await redirectByRole(data.user.id);
    } else {
      setInfo("Account created — check your email to confirm before logging in.");
      setMode("login");
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.email.trim()) return setError("Enter the email on your account first.");
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) return setError(resetError.message);
    setInfo("Password reset link sent — check your email inbox (and spam folder).");
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <PwaSetup />

      {/* Always-visible top bar — Home + Back never scroll away, and use the
          same "semi-realistic 3D" icon-tile style as the dashboards, since
          drivers/merchants often can't read well and rely on recognisable
          icons rather than text. */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2">
        <Link
          href="/"
          className="icon-tile w-11 h-11"
          style={{ "--tile-from": "#38bdf8", "--tile-to": "#0369a1" }}
          aria-label="Go to Home"
        >
          <HomeIcon className="w-5 h-5 text-white" />
        </Link>
        <button
          onClick={handleBack}
          className="icon-tile w-11 h-11"
          style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}
          aria-label="Go Back"
        >
          <ArrowLeftIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Only this area scrolls — the header above never moves */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Smart Goods Transport Company" className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border border-slate-100" />
            ) : (
              <span className="icon-badge bg-brand-orange/10 text-brand-orange mx-auto mb-3">
                <LoginIcon className="w-7 h-7" />
              </span>
            )}
            <h1 className="text-2xl font-bold text-brand-navy">
              {mode === "forgot" ? "Reset Password" : "Welcome"}
            </h1>
            {mode === "forgot" && (
              <p className="text-sm text-slate-500 mt-1">Enter your email and we'll send you a reset link.</p>
            )}
          </div>

          {mode !== "forgot" && (
            <div className="flex mb-6 rounded-full bg-slate-100 p-1">
              <button
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  mode === "login" ? "bg-white shadow text-brand-navy" : "text-slate-500"
                }`}
                onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              >
                Login
              </button>
              <button
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  mode === "signup" ? "bg-white shadow text-brand-navy" : "text-slate-500"
                }`}
                onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
              >
                Signup
              </button>
            </div>
          )}

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          {info && <p className="text-green-700 text-sm mb-4">{info}</p>}

          {mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="field-label">
                  <MailIcon className="w-4 h-4 text-brand-orange" /> Email
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="field-input"
                />
              </div>
              <button type="submit" className="btn-orange w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-5">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="field-label">
                      <UserIcon className="w-4 h-4 text-brand-orange" /> Full Name
                    </label>
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">
                      <PhoneIcon className="w-4 h-4 text-brand-orange" /> Mobile No
                    </label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      className="field-input"
                    />
                  </div>

                  <div>
                    <p className="field-label">I am a</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => update("role", "merchant")}
                        className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                          form.role === "merchant"
                            ? "border-brand-orange bg-brand-orangeSoft text-brand-navy"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <WalletIcon className="w-7 h-7" />
                        <span className="text-sm font-semibold">Merchant / Trader</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => update("role", "driver")}
                        className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                          form.role === "driver"
                            ? "border-brand-orange bg-brand-orangeSoft text-brand-navy"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <TruckIcon className="w-7 h-7" />
                        <span className="text-sm font-semibold">Truck Driver</span>
                      </button>
                    </div>
                  </div>

                  {form.role === "merchant" && (
                    <div className="space-y-5 border-t border-slate-100 pt-5">
                      <div>
                        <label className="field-label">
                          <BuildingIcon className="w-4 h-4 text-brand-orange" /> Merchant / Company Name
                        </label>
                        <input
                          required
                          placeholder="e.g. Hasnain Corporation"
                          value={form.companyName}
                          onChange={(e) => update("companyName", e.target.value)}
                          className="field-input"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          <MapPinIcon className="w-4 h-4 text-brand-orange" /> Business City / Location
                        </label>
                        <input
                          required
                          placeholder="e.g. Bahawalpur"
                          value={form.businessCity}
                          onChange={(e) => update("businessCity", e.target.value)}
                          className="field-input"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          <IdCardIcon className="w-4 h-4 text-brand-orange" /> Business / NTN Number
                        </label>
                        <input
                          placeholder="Optional"
                          value={form.ntnNumber}
                          onChange={(e) => update("ntnNumber", e.target.value)}
                          className="field-input"
                        />
                      </div>
                      <div>
                        <label className="field-label">
                          <BuildingIcon className="w-4 h-4 text-brand-orange" /> Address / Warehouse Location
                        </label>
                        <input
                          required
                          placeholder="Godown / office address for pickup"
                          value={form.warehouseAddress}
                          onChange={(e) => update("warehouseAddress", e.target.value)}
                          className="field-input"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="field-label">
                  <MailIcon className="w-4 h-4 text-brand-orange" /> Email
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="field-label">
                  <LockIcon className="w-4 h-4 text-brand-orange" /> Password
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="field-input pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-navy"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                    className="text-xs font-semibold text-brand-orange mt-2"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              <button type="submit" className="btn-orange w-full" disabled={loading}>
                <LoginIcon className="w-4 h-4" />
                {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          )}

          {mode === "signup" && (
            <p className="text-xs text-slate-400 mt-4 flex items-start gap-1.5">
              <TruckIcon className="w-4 h-4 shrink-0 mt-0.5" />
              Registering a truck? After signup, drivers complete vehicle &amp; document details on the{" "}
              <a href="/register" className="text-brand-orange font-medium">
                Registration page
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
