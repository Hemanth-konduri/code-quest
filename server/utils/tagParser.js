export const extractHashtags = (text = "") => {
  if (!text) return [];
  const regex = /#([a-zA-Z0-9_]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  const tags = matches.map((tag) => tag.substring(1).toLowerCase());
  return Array.from(new Set(tags));
};

export const extractMentions = (text = "") => {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9_.-]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  const mentions = matches.map((m) => m.substring(1));
  return Array.from(new Set(mentions));
};

export const calculateTrendingScore = (likesCount = 0, commentsCount = 0, sharesCount = 0, createdAt = new Date()) => {
  const ageInHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  const engagement = likesCount * 3 + commentsCount * 5 + sharesCount * 4;
  const score = engagement / Math.pow(ageInHours + 2, 1.5);
  return Number(score.toFixed(4));
};
