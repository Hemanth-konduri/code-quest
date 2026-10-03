import jwt from "jsonwebtoken";

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const decodedata = jwt.verify(token, process.env.JWT_SECRET);
        req.userid = decodedata?.id;
      }
    }
  } catch (error) {
    // If token invalid/expired, continue silently as guest
    req.userid = null;
  }
  next();
};

export default optionalAuth;
