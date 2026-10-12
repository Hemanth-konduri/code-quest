import React, { useState, useEffect } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Trash2,
  LogOut,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/router";

interface SessionItem {
  _id: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: string;
  ip: string;
  location: string;
  loginDate: string;
  lastActive: string;
  status: string;
  isCurrent: boolean;
}

interface TrustedDeviceItem {
  _id: string;
  deviceLabel: string;
  browser?: string;
  os?: string;
  lastUsedAt: string;
  expiresAt: string;
}

export default function SecurityDevicesPage() {
  const router = useRouter();
  const { user, Logout } = useAuth();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      const [sessionsRes, devicesRes] = await Promise.all([
        axiosInstance.get("/user/sessions"),
        axiosInstance.get("/user/trusted-devices"),
      ]);
      setSessions(sessionsRes.data.sessions || []);
      setTrustedDevices(devicesRes.data.trustedDevices || []);
    } catch (error: any) {
      console.error("Error fetching security data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSecurityData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleRevokeSession = async (session: SessionItem) => {
    if (!confirm(`Revoke session for ${session.deviceName}?`)) return;

    setRevokingId(session._id);
    try {
      const res = await axiosInstance.delete(`/user/sessions/${session._id}`);
      toast.success(res.data.message || "Device session revoked successfully.");

      if (res.data.isCurrentRevoked || session.isCurrent) {
        Logout();
        router.push("/auth");
      } else {
        setSessions((prev) => prev.filter((s) => s._id !== session._id));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (
      !confirm(
        "Are you sure you want to sign out from all other devices? This will invalidate all active sessions except your current one."
      )
    )
      return;

    try {
      const res = await axiosInstance.delete("/user/sessions");
      toast.success(res.data.message || "Signed out from all other devices.");
      fetchSecurityData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to sign out other devices.");
    }
  };

  const handleRemoveTrustedDevice = async (deviceId: string) => {
    if (!confirm("Remove this trusted device? You will be asked for a verification code upon next login."))
      return;

    try {
      await axiosInstance.delete(`/user/trusted-devices/${deviceId}`);
      toast.success("Trusted device removed.");
      setTrustedDevices((prev) => prev.filter((d) => d._id !== deviceId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove trusted device.");
    }
  };

  const renderDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="w-5 h-5 text-orange-600" />;
      case "tablet":
        return <Tablet className="w-5 h-5 text-orange-600" />;
      default:
        return <Laptop className="w-5 h-5 text-orange-600" />;
    }
  };

  if (!user) {
    return (
      <Mainlayout>
        <div className="max-w-4xl mx-auto p-8 text-center text-gray-600">
          Please log in to manage your account security and active sessions.
        </div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Security & Devices</h1>
              <p className="text-xs text-gray-500">
                Manage your active logins, recognized devices, and account sessions.
              </p>
            </div>
          </div>

          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <button
              onClick={handleRevokeAllOther}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-semibold rounded-md transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out all other devices
            </button>
          )}
        </div>

        {/* Section 1: Active Sessions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>Active Sessions</span>
            <span className="text-xs font-normal text-gray-500 font-mono">({sessions.length})</span>
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white border rounded-lg p-5 h-24 animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-xs text-gray-500">
              No other active sessions were found.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session._id}
                  className={`bg-white border rounded-lg p-4 transition shadow-sm ${
                    session.isCurrent ? "border-orange-300 ring-1 ring-orange-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100 mt-0.5">
                        {renderDeviceIcon(session.deviceType)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-gray-900">{session.deviceName}</h3>
                          {session.isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3" />
                              Current device
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                              Active session
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {session.location}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            {session.ip}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Last active: {new Date(session.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session)}
                      disabled={revokingId === session._id}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition"
                      title={session.isCurrent ? "Sign out" : "Revoke session"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Trusted Devices */}
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>Recognized Trusted Devices</span>
            <span className="text-xs font-normal text-gray-500 font-mono">({trustedDevices.length})</span>
          </h2>

          {trustedDevices.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-xs text-gray-500">
              No trusted devices registered. Check "Trust this device" during login to save devices for 30 days.
            </div>
          ) : (
            <div className="space-y-2">
              {trustedDevices.map((dev) => (
                <div
                  key={dev._id}
                  className="bg-white border border-gray-200 rounded-lg p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-orange-600" />
                    <div>
                      <span className="font-bold text-gray-800">{dev.deviceLabel}</span>
                      <span className="text-gray-400 ml-2">
                        Trust valid until {new Date(dev.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveTrustedDevice(dev._id)}
                    className="text-red-600 hover:underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Mainlayout>
  );
}
