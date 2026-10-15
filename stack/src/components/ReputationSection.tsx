import React, { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosinstance";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import ReputationTransferModal from "./ReputationTransferModal";
import {
  Trophy,
  Award,
  TrendingUp,
  TrendingDown,
  Coins,
  Shield,
  Lock,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";

interface ReputationSectionProps {
  userId: string;
  isOwnProfile: boolean;
  userName?: string;
}

export default function ReputationSection({
  userId,
  isOwnProfile,
  userName = "User",
}: ReputationSectionProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "transfers">("overview");
  const [repData, setRepData] = useState<any>(null);
  const [rulesData, setRulesData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPagination, setHistoryPagination] = useState<any>({ page: 1, totalPages: 1 });
  const [historyFilter, setHistoryFilter] = useState("all");
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transfersType, setTransfersType] = useState<"all" | "sent" | "received">("all");
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  // Fetch reputation overview
  const fetchReputation = async () => {
    try {
      if (isOwnProfile) {
        const res = await axiosInstance.get("/reputation/me");
        setRepData(res.data.data);
      } else {
        const res = await axiosInstance.get(`/reputation/user/${userId}`);
        setRepData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load reputation data:", err);
    }
  };

  // Fetch rules & thresholds
  const fetchRules = async () => {
    try {
      const res = await axiosInstance.get("/reputation/rules");
      setRulesData(res.data.data);
    } catch (err) {
      console.error("Failed to load reputation rules:", err);
    }
  };

  // Fetch transaction history
  const fetchHistory = async (page = 1, filter = historyFilter) => {
    if (!isOwnProfile) return;
    try {
      const res = await axiosInstance.get(
        `/reputation/history?page=${page}&limit=10&filter=${filter}`
      );
      setHistory(res.data.data || []);
      setHistoryPagination(res.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  // Fetch transfers list
  const fetchTransfers = async (type = transfersType) => {
    if (!isOwnProfile) return;
    try {
      const res = await axiosInstance.get(`/reputation/transfers?type=${type}&limit=10`);
      setTransfers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load transfers:", err);
    }
  };

  useEffect(() => {
    if (userId) {
      setLoading(true);
      Promise.all([fetchReputation(), fetchRules()])
        .then(() => {
          if (isOwnProfile) {
            fetchHistory(1, "all");
            fetchTransfers("all");
          }
        })
        .finally(() => setLoading(false));
    }
  }, [userId, isOwnProfile]);

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const res = await axiosInstance.post("/reputation/reconcile");
      toast.success(res.data.message || "Ledger reconciled successfully!");
      fetchReputation();
      fetchHistory(historyPagination.page, historyFilter);
    } catch (err) {
      toast.error("Failed to reconcile reputation ledger");
    } finally {
      setReconciling(false);
    }
  };

  if (loading && !repData) {
    return (
      <div className="py-8 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto mb-2"></div>
        <p className="text-xs">Loading reputation profile...</p>
      </div>
    );
  }

  const points = repData?.points || 0;
  const badge = repData?.badge || { name: "Bronze", icon: "🥉", color: "#cd7f32" };
  const privilegesList = rulesData?.privileges || [
    { key: "comment_unrestricted", points: 50, name: "Comment Without Restriction", description: "Comment without reputation restrictions" },
    { key: "edit_posts", points: 100, name: "Edit Community Posts", description: "Edit eligible community posts" },
    { key: "vote_close", points: 250, name: "Vote to Close Questions", description: "Vote to close off-topic or duplicate questions" },
    { key: "inappropriate_reporting", points: 500, name: "Enhanced Moderation Reporting", description: "Designated priority abuse & content reporting" },
  ];

  const nextPriv = repData?.nextPrivilege;
  const progressPercent = nextPriv
    ? Math.min(100, Math.round((points / nextPriv.points) * 100))
    : 100;

  return (
    <div className="space-y-6">
      {/* 1. Header Reputation Card */}
      <Card className="border-orange-100 shadow-sm bg-gradient-to-r from-orange-50/50 via-white to-amber-50/40">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-3xl shadow-md text-white">
                {badge.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-black text-gray-900">{points.toLocaleString()}</h2>
                  <span className="text-sm font-semibold text-gray-500">Reputation Points</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 text-xs">
                    {badge.name} Tier
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {(repData?.unlockedPrivileges || []).length} of {privilegesList.length} Privileges Unlocked
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Transfer Points Button / Modal */}
              <ReputationTransferModal
                recipientId={!isOwnProfile ? userId : undefined}
                recipientName={!isOwnProfile ? userName : undefined}
                onSuccess={() => {
                  fetchReputation();
                  if (isOwnProfile) {
                    fetchHistory(1, historyFilter);
                    fetchTransfers(transfersType);
                  }
                }}
                triggerButton={
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Coins className="w-4 h-4" />
                    {!isOwnProfile ? `Transfer to ${userName}` : "Transfer Points"}
                  </Button>
                }
              />

              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reconciling}
                  onClick={handleReconcile}
                  className="text-gray-700 border-gray-200 hover:bg-gray-50 text-xs flex items-center gap-1"
                  title="Audit and sync balance with transaction ledger"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} />
                  Sync Ledger
                </Button>
              )}
            </div>
          </div>

          {/* Next Privilege Progress Bar */}
          {nextPriv ? (
            <div className="mt-6 pt-5 border-t border-orange-100/80">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-gray-700">
                  You're <span className="text-orange-600 font-bold">{nextPriv.pointsNeeded} points</span> away from unlocking{" "}
                  <span className="font-bold text-gray-900">{nextPriv.name}</span> ({nextPriv.points} pts)
                </span>
                <span className="font-bold text-orange-600">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-orange-100/80 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Outstanding! You have unlocked all community privileges across the platform!
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 font-semibold transition border-b-2 ${
            activeTab === "overview"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Community Privileges
        </button>

        {isOwnProfile && (
          <>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-3 font-semibold transition border-b-2 ${
                activeTab === "history"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Activity Ledger
            </button>
            <button
              onClick={() => setActiveTab("transfers")}
              className={`pb-3 font-semibold transition border-b-2 ${
                activeTab === "transfers"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Transfers History
            </button>
          </>
        )}
      </div>

      {/* TAB 1: PRIVILEGES GRID */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {privilegesList.map((priv: any) => {
              const isUnlocked = points >= priv.points;
              const pointsNeeded = priv.points - points;

              return (
                <Card
                  key={priv.key}
                  className={`border transition shadow-sm ${
                    isUnlocked
                      ? "bg-white border-emerald-200"
                      : "bg-gray-50/70 border-gray-200 opacity-90"
                  }`}
                >
                  <CardContent className="p-4 flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isUnlocked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isUnlocked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-gray-900">{priv.name}</h4>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            isUnlocked
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {priv.points} pts
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {priv.description}
                      </p>
                      {!isUnlocked && (
                        <p className="text-[11px] text-orange-600 font-semibold mt-2">
                          Requires {pointsNeeded} more reputation points
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Rules Legend */}
          <Card className="border-gray-100 bg-gray-50/60">
            <CardContent className="p-4">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-600" />
                How to Earn Community Reputation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <span className="font-bold text-emerald-600 block text-sm">+5 pts</span>
                  Publish an answer
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <span className="font-bold text-emerald-600 block text-sm">+10 pts</span>
                  Answer accepted
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <span className="font-bold text-emerald-600 block text-sm">+5 pts</span>
                  5 Upvotes on answer
                </div>
                <div className="bg-white p-2.5 rounded border border-gray-200">
                  <span className="font-bold text-emerald-600 block text-sm">+10 pts</span>
                  Complete profile bonus
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ACTIVITY LEDGER */}
      {activeTab === "history" && isOwnProfile && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[
                { label: "All Activity", value: "all" },
                { label: "Earned (+)", value: "earned" },
                { label: "Deductions (-)", value: "deducted" },
                { label: "Transfers", value: "transfers" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => {
                    setHistoryFilter(pill.value);
                    fetchHistory(1, pill.value);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                    historyFilter === pill.value
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              Total events: {historyPagination.total || history.length}
            </span>
          </div>

          {/* Ledger Table / List */}
          {history.length === 0 ? (
            <div className="py-12 text-center text-gray-400 border rounded-lg bg-gray-50/50">
              <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No reputation transactions found for this filter.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm divide-y divide-gray-100">
              {history.map((tx) => {
                const isPositive = tx.pointsChange > 0;
                const isNegative = tx.pointsChange < 0;

                return (
                  <div key={tx._id} className="p-3.5 hover:bg-gray-50/70 transition flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-black text-sm px-2.5 py-1 rounded-md min-w-[50px] text-center ${
                          isPositive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isNegative
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {isPositive ? `+${tx.pointsChange}` : tx.pointsChange}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{tx.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>
                            Balance: {tx.previousBalance} → <strong className="text-gray-800">{tx.newBalance}</strong>
                          </span>
                          <span>•</span>
                          <span className="capitalize">{tx.activityType.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(tx.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {historyPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={historyPagination.page <= 1}
                onClick={() => fetchHistory(historyPagination.page - 1)}
                className="text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {historyPagination.page} of {historyPagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPagination.page >= historyPagination.totalPages}
                onClick={() => fetchHistory(historyPagination.page + 1)}
                className="text-xs flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRANSFERS */}
      {activeTab === "transfers" && isOwnProfile && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {(["all", "sent", "received"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTransfersType(t);
                    fetchTransfers(t);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition ${
                    transfersType === t
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t} Transfers
                </button>
              ))}
            </div>

            <ReputationTransferModal
              onSuccess={() => {
                fetchReputation();
                fetchTransfers(transfersType);
              }}
            />
          </div>

          {transfers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 border rounded-lg bg-gray-50/50">
              <Coins className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No peer reputation transfers recorded yet.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm divide-y divide-gray-100">
              {transfers.map((tx) => {
                const isSender = tx.senderId?._id === userId || tx.senderId === userId;
                return (
                  <div key={tx._id} className="p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isSender ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {isSender ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {isSender ? (
                            <>Sent {tx.points} pts to <span className="font-bold">{tx.recipientId?.name || "User"}</span></>
                          ) : (
                            <>Received {tx.points} pts from <span className="font-bold">{tx.senderId?.name || "User"}</span></>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 italic mt-0.5">"{tx.reason}"</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold ${
                          tx.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.status}
                      </Badge>
                      <span className="text-[10px] text-gray-400 block mt-1">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
