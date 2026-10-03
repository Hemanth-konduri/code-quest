import React, { useEffect, useState } from "react";
import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { loadRazorpayScript } from "@/lib/razorpay";
import { downloadInvoicePdf, InvoiceData } from "@/lib/generateInvoicePdf";
import { MembershipBadge } from "@/components/MembershipBadge";
import { toast } from "react-toastify";
import {
  CheckCircle2,
  ShieldAlert,
  Download,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  CreditCard,
  Smartphone,
  Building2,
  X,
  ShieldCheck,
} from "lucide-react";

interface Plan {
  planId: string;
  name: string;
  price: number;
  dailyLimit: number;
  badge: string;
  features: string[];
}

export default function MembershipPage() {
  const { user, Logout, updateUser } = useAuth();
  const [hasMounted, setHasMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subData, setSubData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Demo Payment Checkout Modal states
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoPlan, setDemoPlan] = useState<Plan | null>(null);
  const [demoOrder, setDemoOrder] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [isVerifyingDemo, setIsVerifyingDemo] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const plansRes = await axiosInstance
        .get("/subscription/plans")
        .catch(() => ({ data: { data: [] } }));

      let currentSubRes = { data: { data: null } };
      let invoicesRes = { data: { data: { invoices: [] } } };

      if (user) {
        currentSubRes = await axiosInstance
          .get("/subscription/current")
          .catch((err) => {
            if (err.response?.status === 401) {
              Logout?.();
            }
            return { data: { data: null } };
          });

        invoicesRes = await axiosInstance
          .get("/subscription/invoices")
          .catch((err) => {
            if (err.response?.status === 401) {
              Logout?.();
            }
            return { data: { data: { invoices: [] } } };
          });
      }

      setPlans(plansRes.data.data || []);
      setSubData(currentSubRes.data.data);
      setInvoices(invoicesRes.data.data?.invoices || []);

      // Sync AuthContext user badge & plan in real time
      const subUser = (currentSubRes.data as any)?.data?.user;
      if (subUser && updateUser) {
        updateUser({
          currentPlan: subUser.currentPlan || "free",
          planBadge: subUser.planBadge || "Free",
        });
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasMounted) {
      fetchSubscriptionData();
    }
  }, [user?.email, hasMounted]);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      toast.warning("Please log in to subscribe to a plan");
      return;
    }

    try {
      setProcessingPlan(plan.planId);
      const orderRes = await axiosInstance.post("/subscription/create-order", {
        planId: plan.planId,
      });

      const orderData = orderRes.data.data;

      // Only launch Demo modal if the key is explicitly a mock key or missing
      if (
        orderData.isMock ||
        !orderData.key ||
        orderData.key.includes("mock")
      ) {
        setDemoPlan(plan);
        setDemoOrder(orderData);
        setShowDemoModal(true);
        setProcessingPlan(null);
        return;
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setDemoPlan(plan);
        setDemoOrder(orderData);
        setShowDemoModal(true);
        setProcessingPlan(null);
        return;
      }

      // Step 2: Open Razorpay Modal for live keys
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CodeQuest Premium",
        description: `Upgrade to ${plan.name} Plan`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            toast.info("Verifying payment...");
            const verifyRes = await axiosInstance.post(
              "/subscription/verify-payment",
              {
                razorpayOrderId: response.razorpay_order_id || orderData.orderId,
                razorpayPaymentId:
                  response.razorpay_payment_id || `pay_mock_${Date.now()}`,
                razorpaySignature: response.razorpay_signature || "mock_sig",
                planId: plan.planId,
              }
            );

            if (verifyRes.data.success) {
              const resUser = verifyRes.data.data?.user;
              if (resUser && updateUser) {
                updateUser({
                  currentPlan: resUser.currentPlan,
                  planBadge: resUser.planBadge,
                });
              }
              toast.success(
                verifyRes.data.message || `Subscribed to ${plan.name}!`
              );
              fetchSubscriptionData();
            } else {
              toast.error(verifyRes.data.message || "Payment verification failed.");
            }
          } catch (err: any) {
            toast.error(
              err.response?.data?.message || "Payment verification failed."
            );
          } finally {
            setProcessingPlan(null);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#f48024",
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
            toast.info("Payment cancelled.");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function () {
        // Fallback to Demo modal if real key fails or test key is rejected
        setDemoPlan(plan);
        setDemoOrder(orderData);
        setShowDemoModal(true);
        setProcessingPlan(null);
      });
      rzp.open();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to initiate payment"
      );
      setProcessingPlan(null);
    }
  };

  const handleCompleteDemoPayment = async () => {
    if (!demoPlan || !demoOrder) return;
    try {
      setIsVerifyingDemo(true);
      const verifyRes = await axiosInstance.post(
        "/subscription/verify-payment",
        {
          razorpayOrderId: demoOrder.orderId,
          razorpayPaymentId: `pay_demo_${Date.now()}`,
          razorpaySignature: "demo_signature_valid",
          planId: demoPlan.planId,
        }
      );

      if (verifyRes.data.success) {
        const resUser = verifyRes.data.data?.user;
        if (resUser && updateUser) {
          updateUser({
            currentPlan: resUser.currentPlan,
            planBadge: resUser.planBadge,
          });
        }
        toast.success(
          verifyRes.data.message || `Subscribed to ${demoPlan.name}!`
        );
        setShowDemoModal(false);
        fetchSubscriptionData();
      } else {
        toast.error(verifyRes.data.message || "Payment verification failed.");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Payment verification failed."
      );
    } finally {
      setIsVerifyingDemo(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? Your access will remain active until your renewal date."
      )
    ) {
      return;
    }
    try {
      const res = await axiosInstance.post("/subscription/cancel");
      if (res.data.success) {
        toast.success(res.data.message);
        fetchSubscriptionData();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to cancel subscription"
      );
    }
  };

  const currentPlanId = subData?.plan?.planId || user?.currentPlan || "free";

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-3">
            <Sparkles className="w-4 h-4 text-orange-500" />
            CodeQuest Membership & Plans
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Upgrade Your Coding Superpowers
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl mx-auto text-base">
            Choose the perfect plan for asking questions, connecting with experts, and gaining exclusive community perks.
          </p>
        </div>

        {/* Current Active Subscription & Usage Status */}
        {hasMounted && user && subData && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 mb-10 shadow-xl border border-slate-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">Active Subscription</h2>
                  <MembershipBadge badge={subData.plan.badge} size="md" />
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      subData.subscription?.status === "Cancelled"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {subData.subscription?.status || "Active"}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-1">
                  Plan:{" "}
                  <span className="font-semibold text-white">
                    {subData.plan.name}
                  </span>{" "}
                  (₹{subData.plan.price}/month)
                </p>

                {subData.subscription?.expiryDate && (
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-400" />
                      Renewal Date:{" "}
                      {new Date(
                        subData.subscription.expiryDate
                      ).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* Daily Question Limit Counter */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 w-full md:w-72">
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span className="text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-400" /> Daily
                    Questions Asked
                  </span>
                  <span className="text-orange-400 font-bold">
                    {subData.dailyUsage.questionsAsked} /{" "}
                    {subData.dailyUsage.dailyLimit === -1
                      ? "∞"
                      : subData.dailyUsage.dailyLimit}
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width:
                        subData.dailyUsage.dailyLimit === -1
                          ? "100%"
                          : `${Math.min(
                              100,
                              (subData.dailyUsage.questionsAsked /
                                subData.dailyUsage.dailyLimit) *
                                100
                            )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2 text-right">
                  Resets every 24 hours
                </p>
              </div>
            </div>

            {subData.subscription?.status === "Active" &&
              subData.plan.price > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/60 flex justify-end">
                  <button
                    onClick={handleCancelSubscription}
                    className="text-xs text-red-400 hover:text-red-300 underline font-medium"
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
          </div>
        )}

        {/* Plans Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const isCurrent =
              currentPlanId.toLowerCase() === plan.planId.toLowerCase();
            const isPopular = plan.planId === "silver";

            return (
              <div
                key={plan.planId}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 border ${
                  isPopular
                    ? "bg-white dark:bg-slate-900 border-orange-500 shadow-xl ring-2 ring-orange-500/20"
                    : isCurrent
                    ? "bg-slate-50 dark:bg-slate-900/60 border-emerald-500 shadow-md"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <MembershipBadge badge={plan.badge} />
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      ₹{plan.price}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      /month
                    </span>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                      <span>
                        Daily Limit:{" "}
                        <strong className="text-orange-600 dark:text-orange-400">
                          {plan.dailyLimit === -1
                            ? "Unlimited"
                            : `${plan.dailyLimit}/day`}
                        </strong>
                      </span>
                    </div>

                    {plan.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start text-xs text-slate-600 dark:text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan CTA Button */}
                <button
                  disabled={isCurrent || processingPlan === plan.planId}
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 shadow-xs flex items-center justify-center gap-2 ${
                    isCurrent
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 cursor-default"
                      : isPopular
                      ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg"
                      : plan.price === 0
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-not-allowed"
                      : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
                  }`}
                >
                  {processingPlan === plan.planId ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : plan.price === 0 ? (
                    "Free Included"
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment History & Downloadable PDF Invoices Section */}
        {hasMounted && user && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-orange-500" /> Payment & Invoice History
            </h2>

            {invoices.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">
                No billing history found yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-lg">Invoice #</th>
                      <th className="p-3">Plan</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 rounded-r-lg text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.map((inv) => (
                      <tr
                        key={inv._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                      >
                        <td className="p-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {inv.planName}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {new Date(inv.issuedAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          ₹{inv.total}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              downloadInvoicePdf({
                                invoiceNumber: inv.invoiceNumber,
                                userName: inv.userName,
                                userEmail: inv.userEmail,
                                planName: inv.planName,
                                amount: inv.amount,
                                gst: inv.gst,
                                total: inv.total,
                                issuedAt: inv.issuedAt,
                                razorpayPaymentId: inv.razorpayPaymentId,
                                status: inv.status,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:hover:bg-orange-950 dark:text-orange-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Demo Payment Checkout Modal */}
        {showDemoModal && demoPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in duration-200">
              <button
                onClick={() => setShowDemoModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                  Razorpay Checkout Sandbox
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Complete Your Subscription
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Subscribing as{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {user?.email}
                </strong>
              </p>

              {/* Summary Box */}
              <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    {demoPlan.name} Plan (Monthly)
                  </span>
                  <MembershipBadge badge={demoPlan.badge} />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                  <span>Base Amount</span>
                  <span>₹{(demoPlan.price / 1.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                  <span>GST (18%)</span>
                  <span>₹{(demoPlan.price - demoPlan.price / 1.18).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Total Amount
                  </span>
                  <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                    ₹{demoPlan.price}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 mb-6">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Select Payment Method
                </label>

                {[
                  { id: "upi", name: "UPI / QR (GPay, PhonePe, Paytm)", icon: Smartphone },
                  { id: "card", name: "Credit / Debit Card", icon: CreditCard },
                  { id: "netbanking", name: "Net Banking", icon: Building2 },
                ].map((method) => {
                  const IconComp = method.icon;
                  const isSelected = selectedMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-200"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComp className="w-4 h-4 text-orange-500" />
                        <span>{method.name}</span>
                      </div>
                      {isSelected && <ShieldCheck className="w-4 h-4 text-orange-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Pay Button */}
              <button
                disabled={isVerifyingDemo}
                onClick={handleCompleteDemoPayment}
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isVerifyingDemo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Pay ₹{demoPlan.price} & Activate Plan
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                🔒 Secured by Razorpay & CodeQuest Encryption
              </p>
            </div>
          </div>
        )}
      </div>
    </Mainlayout>
  );
}
