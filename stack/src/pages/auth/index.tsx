import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { ShieldAlert, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

const LoginPage = () => {
  const router = useRouter();
  const { Login, verifyLoginOtp, loading } = useAuth();
  const [form, setform] = useState({ email: "", password: "" });

  // Unrecognized Device OTP Challenge State
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpUserId, setOtpUserId] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [otp, setOtp] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (requiresOtp && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [requiresOtp, resendCooldown]);

  const handleChange = (e: any) => {
    setform({ ...form, [e.target.id]: e.target.value });
  };

  const handlesubmit = async (e: any) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("All fields are required");
      return;
    }
    try {
      const res = await Login(form);
      if (res && res.requiresOtp) {
        setRequiresOtp(true);
        setOtpUserId(res.userId);
        setMaskedContact(res.maskedContact);
        setResendCooldown(30);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    setOtpSubmitting(true);
    try {
      await verifyLoginOtp({
        userId: otpUserId,
        otp: otp.trim(),
        trustDevice,
      });
      router.push("/");
    } catch (error) {
      console.log(error);
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await axiosInstance.post("/user/login", {
        email: form.email,
        password: form.password,
      });
      toast.info("A new verification code has been sent to your email.");
      setResendCooldown(30);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend code.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <Link href="/" className="flex items-center justify-center mb-4">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-500 rounded mr-2 flex items-center justify-center">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-white rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-orange-500 rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg lg:text-xl font-bold text-gray-800">
              stack<span className="font-normal">overflow</span>
            </span>
          </Link>
        </div>

        {requiresOtp ? (
          /* OTP Verification Form for Unrecognized Device */
          <form onSubmit={handleVerifyOtp}>
            <Card className="shadow-lg border-orange-100">
              <CardHeader className="space-y-1 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  New Device Detected
                </CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  We've sent a 6-digit verification code to{" "}
                  <strong className="text-gray-800">{maskedContact}</strong> to verify this unrecognized login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-xs font-semibold">
                    Verification Code (OTP)
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="text-center tracking-[0.5em] font-mono text-2xl font-bold py-2"
                  />
                </div>

                {/* Trust Device Option */}
                <div className="flex items-start gap-2 bg-orange-50/60 p-3 rounded-md border border-orange-200 text-xs">
                  <input
                    type="checkbox"
                    id="trustDevice"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="trustDevice" className="cursor-pointer text-gray-800">
                    <span className="font-semibold block text-gray-900">
                      Trust this device for 30 days
                    </span>
                    You won't be prompted for security codes on this browser during this period.
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={otpSubmitting || otp.length !== 6}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-sm font-semibold"
                >
                  {otpSubmitting ? "Verifying..." : "Verify & Log in"}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="text-orange-600 hover:underline font-semibold disabled:text-gray-400 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequiresOtp(false);
                      setOtp("");
                    }}
                    className="text-gray-500 hover:text-gray-800 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to login
                  </button>
                </div>
              </CardContent>
            </Card>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handlesubmit}>
            <Card>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-xl lg:text-2xl">
                  Log in to your account
                </CardTitle>
                <CardDescription>
                  Enter your email and password to access Stack Overflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    onChange={handleChange}
                    value={form.email}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    onChange={handleChange}
                    value={form.password}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                >
                  {loading ? "Logging in..." : "Log in"}
                </Button>
                <div className="text-center text-sm">
                  <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                    Forgot your password?
                  </Link>
                </div>
                <div className="text-center text-sm">
                  Don't have an account?{" "}
                  <Link href="/signup" className="text-blue-600 hover:underline">
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
