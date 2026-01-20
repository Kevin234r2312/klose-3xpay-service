const THREEXPAY_URL = "https://api.3xpay.co";

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "payment id is required" });
  }

  try {
    const response = await fetch(`${THREEXPAY_URL}/pix/${id}`, {
      headers: {
        Authorization: `Bearer ${process.env.THREEXPAY_API_KEY}`,
      },
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      status: data,
    });
  } catch (error) {
    console.error("PIX STATUS ERROR:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
