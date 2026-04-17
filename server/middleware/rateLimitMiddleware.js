import rateLimit from "express-rate-limit";

const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

export default rateLimitMiddleware;
