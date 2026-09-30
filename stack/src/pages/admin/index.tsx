import React, { useEffect, useState } from "react";
import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { MembershipBadge } from "@/components/MembershipBadge";
import { toast } from "react-toastify";
import { ShieldAlert, Users, DollarSign, CreditCard, Search, RefreshCw, UserCheck, UserX } from "lucide-react";

export default function AdminDashboardPage() {
  const { user, Logout } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/subscription/admin/all").catch((err) => {
        if (err.response?.status === 401) {
          Logout?.();
        }
        return { data: { success: false, data: null } };
      });
      if (res.data.success) {
        setAdminData(res.data.data);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasMounted && user) {
      fetchAdminData();
    }
  }, [user, hasMounted]);

  const handleModifySubscription = async (targetUserId: string, action: "revoke" | "extend", newPlanId?: string) => {
    try {
      setActionUserId(targetUserId);
      const res = await axiosInstance.post("/subscription/admin/modify", {
        targetUserId,
        action,
        days: 30,
        newPlanId,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        fetchAdminData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setActionUserId(null);
    }
  };

  const filteredSubscriptions = adminData?.subscriptions?.filter((sub: any) => {
    const userName = sub.userid?.name || "";
    const userEmail = sub.userid?.email || "";
    const plan = sub.planId || "";

    const matchesSearch =
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPlan =
      selectedPlanFilter === "all" || plan.toLowerCase() === selectedPlanFilter.toLowerCase();

    return matchesSearch && matchesPlan;
  }) || [];

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-orange-500" /> Admin Membership Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Overview of subscriptions, total revenue, and membership controls.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Metrics
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                ₹{adminData?.stats?.totalRevenue || 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscribers</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {adminData?.stats?.totalActive || 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Transactions</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {adminData?.payments?.length || 0}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {["all", "bronze", "silver", "gold"].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPlanFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    selectedPlanFilter === p
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">User</th>
                  <th className="p-3">Plan & Badge</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Renewal Date</th>
                  <th className="p-3 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSubscriptions.map((sub: any) => {
                  const targetUser = sub.userid;
                  const isProcessing = actionUserId === targetUser?._id;

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {targetUser?.name || "User"}
                        </div>
                        <div className="text-xs text-slate-500">{targetUser?.email}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-bold text-slate-800 dark:text-slate-200">
                            {sub.planId}
                          </span>
                          <MembershipBadge badge={sub.planId} />
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sub.status === "Active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {new Date(sub.renewalDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleModifySubscription(targetUser._id, "extend", "gold")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Extend (Gold)
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleModifySubscription(targetUser._id, "revoke")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" /> Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Mainlayout>
  );
}
