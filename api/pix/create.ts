import { VercelRequest, VercelResponse } from "@vercel/node";

const THREEXPAY_URL = "https://api.3xpay.co";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, referenceId, metadata } = req.body;

    if (!amount || !referenceId) {
      return res.status(400).json({
        error: "amount and referenceId are required",
      });
    }

    const response = await fetch(`${THREEXPAY_URL}/pix`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.THREEXPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        reference_id: referenceId,
        metadata,
      }),
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      pix: data,
    });
  } catch (error) {
    console.error("PIX CREATE ERROR:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
