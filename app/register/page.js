"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";

// The old standalone "/register" form has been replaced by the multi-step
// onboarding wizard that now runs automatically right after a driver logs
// in for the first time. This route is kept alive (rather than deleted
// outright) purely so any old links — the homepage CTA, the footer's
// "Driver Registration" link, bookmarks — still go somewhere useful.
export default function RegisterRedirectPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile?.role === "driver" && !profile.is_profile_completed) {
      router.replace("/onboarding/driver");
    } else {
      router.replace("/driver/dashboard");
    }
  }, [loading, user, profile, router]);

  return null;
}
