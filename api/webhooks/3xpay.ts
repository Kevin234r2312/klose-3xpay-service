import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const event = req.body;

    /*
      Exemplos de eventos esperados:
      - PIX_PAID
      - PIX_EXPIRED
    */

    console.log("3XPAY WEBHOOK RECEIVED:", event);

    if (event.status === "PAID") {
      // Aqui você:
      // 1. Atualiza pagamento no banco
      // 2. Libera PPV ou assinatura
      // 3. Credita creator
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
