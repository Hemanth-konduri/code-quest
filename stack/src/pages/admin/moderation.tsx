import React, { useState, useEffect } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import { Shield, CheckCircle, XCircle, AlertTriangle, Ban } from "lucide-react";

interface ReportItem {
  _id: string;
  reporterId: { _id: string; name: string; email: string };
  reason: string;
  details?: string;
  status: "pending" | "resolved" | "rejected";
  actionTaken?: string;
  postid?: {
    _id: string;
    content: string;
    userid: { _id: string; name: string; email: string };
  };
  createdAt: string;
}

export default function AdminModerationPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "rejected">("pending");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/community/admin/reports?status=${statusFilter}`);
      setReports(res.data.reports || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchReports();
    } else {
      setLoading(false);
    }
  }, [user, statusFilter]);

  const handleAction = async (reportId: string, status: "resolved" | "rejected", actionTaken: string) => {
    try {
      await axiosInstance.patch(`/community/admin/reports/${reportId}`, {
        status,
        actionTaken,
      });
      toast.success("Report action recorded.");
      fetchReports();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Action failed.");
    }
  };

  const handleSuspendUser = async (targetUserId: string) => {
    const reason = prompt("Enter suspension reason:");
    if (!reason) return;

    try {
      await axiosInstance.post(`/community/admin/users/${targetUserId}/suspend`, {
        action: "suspend",
        reason,
        isPermanent: true,
      });
      toast.success("User account suspended.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Suspension failed.");
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <Mainlayout>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-8 text-center text-sm font-semibold">
          Forbidden: Admin access required for moderation dashboard.
        </div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-700 font-black text-lg">
            <Shield className="w-6 h-6" />
            <h1>Admin Content Moderation Dashboard</h1>
          </div>
          <div className="flex gap-1 text-xs">
            {(["pending", "resolved", "rejected"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded capitalize font-medium ${
                  statusFilter === st ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8 text-sm">Loading moderation reports...</p>
        ) : reports.length === 0 ? (
          <div className="bg-white border rounded-lg p-10 text-center text-gray-500 text-sm">
            No {statusFilter} reports found.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r._id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded">
                      {r.reason}
                    </span>
                    <span className="text-gray-500">Reported by {r.reporterId?.name}</span>
                  </div>
                  <span className="text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                </div>

                {r.postid ? (
                  <div className="bg-gray-50 p-3 rounded border text-xs space-y-1">
                    <span className="font-semibold text-gray-700">Author: {r.postid.userid?.name}</span>
                    <p className="text-gray-900">{r.postid.content}</p>
                  </div>
                ) : (
                  <p className="text-xs text-red-500 italic">Target post has already been removed.</p>
                )}

                {r.details && (
                  <p className="text-xs text-gray-600">
                    <strong>Details:</strong> {r.details}
                  </p>
                )}

                {statusFilter === "pending" && r.postid && (
                  <div className="flex items-center gap-2 pt-2 text-xs">
                    <button
                      onClick={() => handleAction(r._id, "resolved", "remove_post")}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Remove Post
                    </button>
                    <button
                      onClick={() => handleAction(r._id, "rejected", "none")}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-medium flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-gray-600" />
                      Reject Report
                    </button>
                    <button
                      onClick={() => handleSuspendUser(r.postid!.userid._id)}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-medium flex items-center gap-1 ml-auto"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Suspend Author
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Mainlayout>
  );
}
