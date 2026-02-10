"use client";

import { useState, useEffect, useMemo } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const callbackUrl = useMemo(() => searchParams?.get("callbackUrl"), [searchParams]);
  const oauthError = useMemo(() => searchParams?.get("error"), [searchParams]);
  const reset = useMemo(() => searchParams?.get("reset") === "1", [searchParams]);
  const prefillEmail = useMemo(() => searchParams?.get("email"), [searchParams]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const destination =
      callbackUrl || (session?.user?.role === "ADMIN" ? "/admin" : "/my-account/personal-details");

    router.replace(destination);
  }, [status, session?.user?.role, callbackUrl, router]);

  useEffect(() => {
    if (oauthError === "OAuthAccountNotLinked") {
      setError(
        "This email already has a password account. Please sign in with email+password."
      );
    }
  }, [oauthError]);

  useEffect(() => {
    if (prefillEmail && !email) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else {
        // Successful sign-in; useSession hook will update automatically
        // Redirect effect will handle navigation when status becomes "authenticated"
        setIsLoading(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      // Use callbackUrl so browser actually redirects to Google
      await signIn("google", { callbackUrl: "/my-account/personal-details" });
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
      setIsLoading(false);
    }
  };

  const isResolvingSession = status === "loading" || status === "authenticated";

  if (isResolvingSession) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {status === "authenticated" ? "Redirecting..." : "Checking session..."}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-gray-600">
            Please wait while we redirect you to your dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Sign In
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Google Sign In */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full mb-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          >
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {reset && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                Password reset successful. Please log in.
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 space-y-3 border-t pt-4">
            <div className="text-center text-sm text-gray-600">
              <Link href="/forgot-password" className="text-[#41a59b] font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            {/* Vendor Login Link */}
            <div className="text-center text-sm text-gray-600">
              Are you a vendor?{" "}
              <button
                type="button"
                className="text-[#41a59b] font-medium hover:underline"
                onClick={() => router.push("/vendor/login")}
              >
                Vendor login
              </button>
            </div>

            {/* Customer Registration Link */}
            <div className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#41a59b] hover:underline">
                Create one
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
