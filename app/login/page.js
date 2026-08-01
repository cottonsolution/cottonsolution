"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ROLE_REDIRECT = {
  admin: "/admin/dashboard",
  merchant: "/merchant/dashboard",
  driver: "/driver/dashboard",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    role: "merchant",
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function redirectByRole(userId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
    router.push(ROLE_REDIRECT[profile?.role] ?? "/");
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
        data: { full_name: form.fullName, phone: form.phone, role: form.role },
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

  return (
    <section className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="card">
        <div className="flex mb-6 rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === "login" ? "bg-white shadow text-brand-navy" : "text-slate-500"
            }`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-semibold ${
              mode === "signup" ? "bg-white shadow text-brand-navy" : "text-slate-500"
            }`}
            onClick={() => setMode("signup")}
          >
            Signup
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {info && <p className="text-green-700 text-sm mb-4">{info}</p>}

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mobile No</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">I am a</label>
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="merchant">Merchant / Trader</option>
                  <option value="driver">Truck Driver</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          <button type="submit" className="btn-orange w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        {mode === "signup" && (
          <p className="text-xs text-slate-400 mt-4">
            Registering a truck? After signup, drivers complete vehicle &amp; document details on the{" "}
            <a href="/register" className="text-brand-orange font-medium">
              Registration page
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}
