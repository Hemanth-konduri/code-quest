export const PLANS = {
  free: {
    planId: "free",
    name: "Free",
    price: 0,
    dailyLimit: 1,
    badge: "Free",
    features: ["1 question/day", "Basic search only"],
  },
  bronze: {
    planId: "bronze",
    name: "Bronze",
    price: 99,
    dailyLimit: 5,
    badge: "Bronze",
    features: ["5 questions/day", "Bronze badge", "Advanced search filters"],
  },
  silver: {
    planId: "silver",
    name: "Silver",
    price: 299,
    dailyLimit: 15,
    badge: "Silver",
    features: [
      "15 questions/day",
      "Silver badge",
      "Priority support",
      "Enhanced profile visibility",
      "Unlimited bookmarks",
    ],
  },
  gold: {
    planId: "gold",
    name: "Gold",
    price: 999,
    dailyLimit: -1, // Unlimited
    badge: "Gold",
    features: [
      "Unlimited questions",
      "Gold badge",
      "Highest search priority",
      "Featured profile",
      "Priority support",
      "Exclusive community access",
    ],
  },
};
