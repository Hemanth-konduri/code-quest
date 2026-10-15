import React, { useState, useEffect } from "react";
import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "react-toastify";
import {
  Trophy,
  Search,
  Filter,
  Coins,
  Shield,
  RotateCcw,
  Sliders,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Edit2,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminReputationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "ledger" | "transfers" | "rules">("users");
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [rules, setRules] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchUser, setSearchUser] = useState("");
  const [ledgerActivityFilter, setLedgerActivityFilter] = useState("");
  const [transfersStatusFilter, setTransfersStatusFilter] = useState("");

  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Reversal Modal State
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reverseLoading, setReverseLoading] = useState(false);

  // Rule Edit Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [rulePoints, setRulePoints] = useState<number>(0);
  const [ruleLoading, setRuleLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      const res = await axiosInstance.get("/reputation/admin/overview");
      setOverview(res.data.data);
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const res = await axiosInstance.get(`/reputation/admin/users?search=${encodeURIComponent(searchUser)}&limit=25`);
        setUsersList(res.data.data || []);
      } else if (activeTab === "ledger") {
        const url = ledgerActivityFilter
          ? `/reputation/admin/ledger?activityType=${ledgerActivityFilter}&limit=30`
          : "/reputation/admin/ledger?limit=30";
        const res = await axiosInstance.get(url);
        setLedger(res.data.data || []);
      } else if (activeTab === "transfers") {
        const url = transfersStatusFilter
          ? `/reputation/admin/transfers?status=${transfersStatusFilter}&limit=25`
          : "/reputation/admin/transfers?limit=25";
        const res = await axiosInstance.get(url);
        setTransfers(res.data.data || []);
      } else if (activeTab === "rules") {
        const res = await axiosInstance.get("/reputation/rules");
        setRules(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load reputation monitoring data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchOverview();
      fetchData();
    }
  }, [user, activeTab, ledgerActivityFilter, transfersStatusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  // Handle Manual Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !adjustReason.trim()) {
      toast.error("Please fill in all adjustment fields");
      return;
    }
    setAdjustLoading(true);
    try {
      await axiosInstance.post("/reputation/admin/adjust", {
        targetUserId: targetUser.userId?._id || targetUser.userId,
        pointsChange: Number(adjustPoints),
        reason: adjustReason.trim(),
      });
      toast.success("Reputation adjustment applied successfully");
      setAdjustModalOpen(false);
      setAdjustReason("");
      fetchOverview();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to apply adjustment");
    } finally {
      setAdjustLoading(false);
    }
  };

  // Handle Transfer Reversal
  const handleReverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer || !reverseReason.trim()) {
      toast.error("Please specify a reason for reversing this transfer");
      return;
    }
    setReverseLoading(true);
    try {
      await axiosInstance.post(`/reputation/admin/transfer/${selectedTransfer._id}/reverse`, {
        reason: reverseReason.trim(),
      });
      toast.success("Transfer reversed successfully");
      setReverseModalOpen(false);
      setReverseReason("");
      fetchOverview();
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reverse transfer");
    } finally {
      setReverseLoading(false);
    }
  };

  // Handle Rule Update
  const handleRuleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    setRuleLoading(true);
    try {
      await axiosInstance.patch("/reputation/admin/rules", {
        key: selectedRule.key,
        category: selectedRule.category || "reward",
        points: Number(rulePoints),
        description: selectedRule.description,
      });
      toast.success(`Rule "${selectedRule.key}" updated to ${rulePoints} points`);
      setRuleModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update rule");
    } finally {
      setRuleLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    return (
      <Mainlayout>
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800">Administrator Access Required</h2>
          <p className="text-sm text-gray-500 mt-1">
            You must be an authorized platform administrator to inspect or manage the reputation system.
          </p>
        </div>
      </Mainlayout>
    );
  }

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" />
            Reputation & Community Rewards Audit
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">
            System-wide reputation monitoring, authoritative ledger inspection, transfer auditing, and rule management.
          </p>
        </div>

        {/* 1. Overview Metric Cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <span className="text-xs text-gray-500 font-medium">Total Reputation Pool</span>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {(overview.totalPoints || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">active community points</span>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <span className="text-xs text-gray-500 font-medium">Total Ledger Events</span>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {(overview.totalTransactions || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">authoritative ledger logs</span>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <span className="text-xs text-gray-500 font-medium">Peer Transfers</span>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {(overview.totalTransfers || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">
                  {(overview.totalTransferred || 0).toLocaleString()} points transferred
                </span>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardContent className="p-4">
                <span className="text-xs text-gray-500 font-medium">Active Participants</span>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {(overview.totalUsers || 0).toLocaleString()}
                </p>
                <span className="text-[11px] text-gray-400">users with reputation records</span>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2. Navigation Tabs */}
        <div className="flex border-b border-gray-200 gap-6 text-sm mb-6">
          {[
            { id: "users", label: "Users & Balances" },
            { id: "ledger", label: "Authoritative Ledger" },
            { id: "transfers", label: "Peer Transfers" },
            { id: "rules", label: "Rules & Thresholds" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 font-semibold transition border-b-2 ${
                activeTab === tab.id
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: USERS & BALANCES */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
              <Input
                placeholder="Search user by name or email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                <Search className="w-4 h-4 mr-1" /> Search
              </Button>
            </form>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Points & Tier</th>
                    <th className="p-3">Total Earned</th>
                    <th className="p-3">Total Deducted</th>
                    <th className="p-3">Transferred</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Loading user balances...</td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">No user reputation records found.</td>
                    </tr>
                  ) : (
                    usersList.map((row) => (
                      <tr key={row._id} className="hover:bg-gray-50/70 transition">
                        <td className="p-3 font-medium text-gray-900">
                          <div>{row.userId?.name || "Unknown"}</div>
                          <div className="text-[10px] text-gray-400">{row.userId?.email}</div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-gray-900 text-sm mr-2">{row.points}</span>
                          <Badge className="bg-amber-100 text-amber-900 text-[10px] font-bold">
                            {row.badge?.name || "Bronze"}
                          </Badge>
                        </td>
                        <td className="p-3 text-emerald-600 font-semibold">+{row.totalEarned || 0}</td>
                        <td className="p-3 text-red-600 font-semibold">-{row.totalDeducted || 0}</td>
                        <td className="p-3 text-gray-700">
                          Sent: {row.totalTransferred || 0} / Recv: {row.totalReceived || 0}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTargetUser(row);
                              setAdjustPoints(10);
                              setAdjustModalOpen(true);
                            }}
                            className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50 font-medium"
                          >
                            <Sliders className="w-3.5 h-3.5 mr-1" /> Adjust Points
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT LEDGER */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            <div className="flex gap-2 max-w-xs">
              <select
                value={ledgerActivityFilter}
                onChange={(e) => setLedgerActivityFilter(e.target.value)}
                className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none"
              >
                <option value="">All Activity Types</option>
                <option value="answer_posted">Answer Posted (+5)</option>
                <option value="answer_accepted">Answer Accepted (+10)</option>
                <option value="answer_milestone_5_upvotes">Answer 5-Upvotes Milestone (+5)</option>
                <option value="question_milestone_10_upvotes">Question 10-Upvotes Milestone (+2)</option>
                <option value="profile_completed">Profile Completed (+10)</option>
                <option value="downvote_received">Downvote Received (-2)</option>
                <option value="answer_deleted">Answer Deleted (-5)</option>
                <option value="admin_content_removal">Admin Content Removal (-10)</option>
                <option value="reputation_transfer_sent">Transfer Sent</option>
                <option value="reputation_transfer_received">Transfer Received</option>
                <option value="reputation_transfer_reversed">Transfer Reversed</option>
                <option value="admin_adjustment">Admin Manual Adjustment</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Event / Description</th>
                    <th className="p-3">Change</th>
                    <th className="p-3">Balance Trail</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Loading authoritative ledger...</td>
                    </tr>
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">No ledger transactions found.</td>
                    </tr>
                  ) : (
                    ledger.map((entry) => {
                      const isPositive = entry.pointsChange > 0;
                      const isNegative = entry.pointsChange < 0;

                      return (
                        <tr key={entry._id} className="hover:bg-gray-50/70 transition">
                          <td className="p-3 font-medium text-gray-900">
                            <div>{entry.userId?.name || "User"}</div>
                            <div className="text-[10px] text-gray-400">{entry.userId?.email}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-gray-900">{entry.description}</span>
                            <span className="block text-[10px] text-gray-400 capitalize">
                              {entry.activityType?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-black px-2 py-0.5 rounded text-xs ${
                                isPositive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isNegative
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {isPositive ? `+${entry.pointsChange}` : entry.pointsChange}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">
                            {entry.previousBalance} → <strong className="text-gray-900">{entry.newBalance}</strong>
                          </td>
                          <td className="p-3 text-gray-400">
                            {new Date(entry.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSFERS MONITOR */}
        {activeTab === "transfers" && (
          <div className="space-y-4">
            <div className="flex gap-2 max-w-xs">
              <select
                value={transfersStatusFilter}
                onChange={(e) => setTransfersStatusFilter(e.target.value)}
                className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none"
              >
                <option value="">All Transfer Statuses</option>
                <option value="completed">Completed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Sender</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Points</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">Loading transfers...</td>
                    </tr>
                  ) : transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">No transfers recorded.</td>
                    </tr>
                  ) : (
                    transfers.map((tx) => (
                      <tr key={tx._id} className="hover:bg-gray-50/70 transition">
                        <td className="p-3 font-medium text-gray-900">
                          {tx.senderId?.name || "Sender"}
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          {tx.recipientId?.name || "Recipient"}
                        </td>
                        <td className="p-3 font-bold text-orange-600 text-sm">
                          {tx.points} pts
                        </td>
                        <td className="p-3 text-gray-600 italic max-w-xs truncate">
                          "{tx.reason}"
                        </td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] uppercase font-bold ${
                              tx.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {tx.status}
                          </Badge>
                          {tx.status === "reversed" && (
                            <span className="block text-[10px] text-gray-400 italic mt-0.5">
                              {tx.reversalReason}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-gray-400">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          {tx.status === "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransfer(tx);
                                setReverseReason("");
                                setReverseModalOpen(true);
                              }}
                              className="text-xs text-red-600 border-red-200 hover:bg-red-50 font-medium"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reverse
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RULES & THRESHOLDS */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  Reputation Reward & Deduction Rules
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold border-b">
                      <tr>
                        <th className="p-3">Rule Name</th>
                        <th className="p-3">Points</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rules?.rules &&
                        Object.values(rules.rules).map((rule: any) => (
                          <tr key={rule.key} className="hover:bg-gray-50/70 transition">
                            <td className="p-3 font-bold text-gray-900">{rule.key}</td>
                            <td className="p-3 font-black text-sm">
                              <span className={rule.points > 0 ? "text-emerald-600" : "text-red-600"}>
                                {rule.points > 0 ? `+${rule.points}` : rule.points} pts
                              </span>
                            </td>
                            <td className="p-3 text-gray-600">{rule.description}</td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRule(rule);
                                  setRulePoints(rule.points);
                                  setRuleModalOpen(true);
                                }}
                                className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Privilege Unlock Thresholds
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {rules?.privileges &&
                    rules.privileges.map((p: any) => (
                      <div key={p.key} className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 text-xs">{p.name}</span>
                          <Badge className="bg-orange-100 text-orange-900 text-[10px] font-bold">
                            {p.points} pts
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-tight">{p.description}</p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL 1: MANUAL ADJUSTMENT */}
        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent className="max-w-md bg-white text-gray-900 p-6 rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Sliders className="w-5 h-5 text-orange-600" />
                Manual Reputation Adjustment
              </DialogTitle>
            </DialogHeader>
            {targetUser && (
              <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                  <div>User: <strong className="text-gray-900">{targetUser.userId?.name}</strong></div>
                  <div>Current Balance: <strong className="text-orange-600">{targetUser.points} points</strong></div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Points Change (+ or -)</Label>
                  <Input
                    type="number"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 25 or -10"
                    className="w-full mt-1 text-sm font-bold"
                    required
                  />
                  <span className="text-[10px] text-gray-500">
                    Use positive numbers to grant points, negative numbers to deduct points.
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Audit Reason (Required)</Label>
                  <Textarea
                    placeholder="e.g. Correction for confirmed system glitch or community bonus"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    rows={2}
                    className="w-full text-xs mt-1"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={adjustLoading}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {adjustLoading ? "Applying..." : "Apply Adjustment"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL 2: TRANSFER REVERSAL */}
        <Dialog open={reverseModalOpen} onOpenChange={setReverseModalOpen}>
          <DialogContent className="max-w-md bg-white text-gray-900 p-6 rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-600">
                <RotateCcw className="w-5 h-5 text-red-600" />
                Reverse Peer Reputation Transfer
              </DialogTitle>
            </DialogHeader>
            {selectedTransfer && (
              <form onSubmit={handleReverseSubmit} className="space-y-4 pt-2">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1 text-red-900">
                  <div>Transfer Amount: <strong>{selectedTransfer.points} points</strong></div>
                  <div>Sender: <strong>{selectedTransfer.senderId?.name}</strong></div>
                  <div>Recipient: <strong>{selectedTransfer.recipientId?.name}</strong></div>
                  <div className="italic mt-1">Reason: "{selectedTransfer.reason}"</div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Reversal Reason (Mandatory Audit Trail)</Label>
                  <Textarea
                    placeholder="e.g. Circular farming collusion or fraudulent account transfer"
                    value={reverseReason}
                    onChange={(e) => setReverseReason(e.target.value)}
                    rows={2}
                    className="w-full text-xs mt-1"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReverseModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={reverseLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {reverseLoading ? "Reversing..." : "Confirm Reversal"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL 3: RULE EDIT */}
        <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
          <DialogContent className="max-w-md bg-white text-gray-900 p-6 rounded-xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Edit2 className="w-5 h-5 text-blue-600" />
                Update Reputation Rule Point Value
              </DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <form onSubmit={handleRuleUpdateSubmit} className="space-y-4 pt-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1 text-blue-900">
                  <div>Rule: <strong>{selectedRule.key}</strong></div>
                  <div>Description: {selectedRule.description}</div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Point Value</Label>
                  <Input
                    type="number"
                    value={rulePoints}
                    onChange={(e) => setRulePoints(parseInt(e.target.value) || 0)}
                    className="w-full mt-1 text-sm font-bold"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRuleModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={ruleLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {ruleLoading ? "Saving..." : "Save Rule"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Mainlayout>
  );
}
