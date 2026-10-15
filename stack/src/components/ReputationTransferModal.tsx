import React, { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosinstance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "react-toastify";
import { Coins, Send, AlertCircle, CheckCircle, ArrowRight, ShieldAlert } from "lucide-react";

interface ReputationTransferModalProps {
  recipientId?: string;
  recipientName?: string;
  onSuccess?: () => void;
  triggerButton?: React.ReactElement;
}

export default function ReputationTransferModal({
  recipientId: initialRecipientId,
  recipientName: initialRecipientName,
  onSuccess,
  triggerButton,
}: ReputationTransferModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [recipientId, setRecipientId] = useState(initialRecipientId || "");
  const [recipientName, setRecipientName] = useState(initialRecipientName || "");
  const [points, setPoints] = useState<number>(10);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Fetch transfer eligibility when opening modal
  const fetchEligibility = async () => {
    try {
      const res = await axiosInstance.get("/reputation/transfer-eligibility");
      setEligibility(res.data.data);
    } catch (err) {
      console.error("Failed to fetch transfer eligibility:", err);
    }
  };

  // If no recipient provided, load users to select
  const fetchUsers = async () => {
    if (initialRecipientId) return;
    try {
      const res = await axiosInstance.get("/user/getalluser");
      setUsersList(res.data.data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      fetchEligibility();
      fetchUsers();
      if (initialRecipientId) {
        setRecipientId(initialRecipientId);
        setRecipientName(initialRecipientName || "User");
      }
    }
  }, [isOpen, initialRecipientId, initialRecipientName]);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId) {
      toast.error("Please select a recipient");
      return;
    }
    if (points < 1 || points > 50) {
      toast.error("Transfer amount must be between 1 and 50 points");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for the transfer");
      return;
    }
    if (eligibility && points > eligibility.remainingDailyLimit) {
      toast.error(`Exceeds remaining daily limit of ${eligibility.remainingDailyLimit} points`);
      return;
    }
    if (eligibility && points > eligibility.currentPoints) {
      toast.error("Insufficient reputation balance");
      return;
    }
    setStep("confirm");
  };

  const handleConfirmTransfer = async () => {
    setLoading(true);
    try {
      const idempotencyKey = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await axiosInstance.post("/reputation/transfer", {
        recipientId,
        points,
        reason: reason.trim(),
        idempotencyKey,
      });

      toast.success(res.data.message || `Transferred ${points} reputation points!`);
      setStep("success");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to complete transfer";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          triggerButton ? (
            triggerButton
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 font-medium"
            >
              <Coins className="w-4 h-4 text-orange-500" />
              Transfer Points
            </Button>
          )
        }
      />

      <DialogContent className="max-w-md bg-white text-gray-900 rounded-xl shadow-xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Coins className="w-5 h-5 text-amber-500" />
            Transfer Reputation Points
          </DialogTitle>
        </DialogHeader>

        {eligibility && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1 mb-2">
            <div className="flex justify-between font-semibold">
              <span>Your Balance: {eligibility.currentPoints} pts</span>
              <span>24h Remaining: {eligibility.remainingDailyLimit} / 100 pts</span>
            </div>
            {!eligibility.canTransfer && (
              <p className="text-red-600 font-medium flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Must have more than 50 points to transfer (Current: {eligibility.currentPoints}).
              </p>
            )}
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleProceedToConfirm} className="space-y-4 pt-1">
            {/* Recipient Selection */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Recipient</Label>
              {initialRecipientId ? (
                <div className="mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800">
                  {recipientName}
                </div>
              ) : (
                <select
                  value={recipientId}
                  onChange={(e) => {
                    setRecipientId(e.target.value);
                    const found = usersList.find((u) => u._id === e.target.value);
                    if (found) setRecipientName(found.name);
                  }}
                  className="w-full mt-1 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none"
                  required
                >
                  <option value="">Select a community member...</option>
                  {usersList.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Points Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-semibold text-gray-700">Points to Transfer (1 - 50)</Label>
                <div className="flex gap-1">
                  {[5, 10, 25, 50].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setPoints(quick)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                        points === quick
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      +{quick}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                min={1}
                max={50}
                value={points}
                onChange={(e) => setPoints(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full"
                required
              />
            </div>

            {/* Reason */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Reason for Transfer</Label>
              <Textarea
                placeholder="e.g. Helpful debugging assistance on my question"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full text-xs mt-1"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={eligibility && !eligibility.canTransfer}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Review Transfer <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-4 pt-1">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center space-y-2">
              <p className="text-xs text-orange-800 uppercase font-bold tracking-wider">Confirm Transaction</p>
              <div className="text-2xl font-black text-orange-600">
                {points} Points
              </div>
              <p className="text-sm text-gray-700">
                To: <span className="font-bold text-gray-900">{recipientName}</span>
              </p>
              <p className="text-xs text-gray-600 italic">"{reason}"</p>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Transfers are atomic and will be recorded in both users' reputation ledgers.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => setStep("form")}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleConfirmTransfer}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? "Processing..." : "Confirm & Send Points"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-gray-900">Transfer Successful!</h4>
            <p className="text-xs text-gray-600">
              You sent <span className="font-semibold">{points} points</span> to {recipientName}. Both reputation balances and transaction ledgers have been updated.
            </p>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-orange-600 hover:bg-orange-700 text-white mt-2"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
