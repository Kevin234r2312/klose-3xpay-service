import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    status: "ok",
    service: "klose-3xpay-service",
    timestamp: new Date().toISOString(),
  });
}
