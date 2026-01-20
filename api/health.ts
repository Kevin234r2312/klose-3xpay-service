export default function handler(
  req: any,
  res: any
) {
  return res.status(200).json({
    status: "ok",
    service: "klose-3xpay-service",
    timestamp: new Date().toISOString(),
  });
}
