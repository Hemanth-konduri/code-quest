import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.query;
  if (!code) {
    return res.redirect("/auth");
  }
  // Redirect back to home page after successful GitHub OAuth login
  return res.redirect("/");
}
