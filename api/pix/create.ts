import { VercelRequest, VercelResponse } from "@vercel/node";

const THREEXPAY_URL = "https://gateway.3xpay.co";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, referenceId } = req.body;

    if (!amount || !referenceId) {
      return res.status(400).json({
        error: "amount and referenceId are required",
      });
    }

    const response = await fetch(`${THREEXPAY_URL}/transaction/cash-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: process.env.THREEXPAY_API_KEY as string,
        api_secret: process.env.THREEXPAY_API_SECRET as string,
      },
      body: JSON.stringify({
        transaction: {
          amount,
          external_id: referenceId,
          callback_url:
            "https://klose-3xpay-service.vercel.app/api/webhooks/3xpay",
          expiration: 3600,
          custom_message: "PIX Klose",
          debtor: {
            name: "Cliente Teste",
            document: "12345678901",
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("3XPAY ERROR:", data);
      return res.status(response.status).json(data);
    }

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PIX CREATE ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
