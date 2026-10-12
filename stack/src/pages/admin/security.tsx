import React, { useState, useEffect } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Laptop,
  Users,
} from "lucide-react";

export default function AdminSecurityPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"logins" | "sessions" | "events">("logins");
  const [activities, setActivities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterResult, setFilterResult] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "logins") {
        const params: any = {};
        if (search) params.search = search;
        if (filterResult) params.loginResult = filterResult;
        const res = await axiosInstance.get("/admin/security/login-activity", { params });
        setActivities(res.data.activities || []);
      } else if (activeTab === "sessions") {
        const res = await axiosInstance.get("/admin/security/sessions");
        setSessions(res.data.sessions || []);
      } else if (activeTab === "events") {
        const res = await axiosInstance.get("/admin/security/events");
        setEvents(res.data.events || []);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch security monitoring data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, activeTab, filterResult]);

  const handleAdminRevoke = async (sessionId: string) => {
    if (!confirm("Remotely revoke this session as administrator?")) return;
    try {
      await axiosInstance.delete(`/admin/security/sessions/${sessionId}`);
      toast.success("Session revoked successfully.");
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to revoke session.");
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <Mainlayout>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-8 text-center text-sm font-semibold max-w-4xl mx-auto">
          Forbidden: Administrator access required to view security monitoring logs.
        </div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Security & Login Activity Monitoring
              </h1>
              <p className="text-xs text-gray-500">
                Administrator audit logs, device recognition tracking, and active sessions.
              </p>
            </div>
          </div>

          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setActiveTab("logins")}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === "logins" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Login Activities
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === "sessions" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Active Sessions
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === "events" ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Security Events
            </button>
          </div>
        </div>

        {/* Tab 1: Login Activity */}
        {activeTab === "logins" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by user email or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData()}
                  className="w-full text-xs pl-8 pr-3 py-2 border rounded-md focus:ring-1 focus:ring-purple-400 focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="text-xs border rounded-md px-3 py-2 bg-white text-gray-700 focus:outline-none"
              >
                <option value="">All Results</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="otp_required">OTP Required</option>
              </select>
            </div>

            {loading ? (
              <p className="text-center text-xs text-gray-400 py-8">Loading login activity...</p>
            ) : activities.length === 0 ? (
              <div className="bg-white border rounded-lg p-8 text-center text-xs text-gray-500">
                No login activities found.
              </div>
            ) : (
              <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b text-[10px]">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Device / Browser</th>
                      <th className="p-3">IP Address</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Device Recognition</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activities.map((a) => (
                      <tr key={a._id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-semibold text-gray-800">
                          {a.userid?.name || "Anonymous"}{" "}
                          <span className="text-[10px] text-gray-400 font-normal block">
                            {a.userid?.email}
                          </span>
                        </td>
                        <td className="p-3">
                          {a.os} — {a.browser}
                        </td>
                        <td className="p-3 font-mono text-[11px]">{a.ip}</td>
                        <td className="p-3">
                          {a.loginResult === "success" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                              Success
                            </span>
                          )}
                          {a.loginResult === "failed" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              Failed
                            </span>
                          )}
                          {a.loginResult === "otp_required" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                              OTP Required
                            </span>
                          )}
                        </td>
                        <td className="p-3 capitalize font-medium text-gray-700">
                          {a.recognitionStatus}
                        </td>
                        <td className="p-3 text-gray-400">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Active Sessions */}
        {activeTab === "sessions" && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-xs text-gray-400 py-8">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <div className="bg-white border rounded-lg p-8 text-center text-xs text-gray-500">
                No active sessions.
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s._id}
                    className="bg-white border rounded-lg p-4 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-gray-900">
                        {s.userid?.name} ({s.userid?.email})
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {s.deviceName} • {s.ip} • Last active:{" "}
                        {new Date(s.lastActivityAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdminRevoke(s._id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded border border-red-200"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Security Events */}
        {activeTab === "events" && (
          <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b text-[10px]">
                <tr>
                  <th className="p-3">Event Type</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-purple-700">{e.eventType}</td>
                    <td className="p-3 font-semibold text-gray-800">{e.userid?.name || "System"}</td>
                    <td className="p-3 text-gray-700">{e.details}</td>
                    <td className="p-3 text-gray-400">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Mainlayout>
  );
}
