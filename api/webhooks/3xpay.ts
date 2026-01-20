// Vercel Serverless Function handler (we keep types as any to avoid runtime/type deps)
function isPaidStatus(status: unknown): boolean {
  const s = String(status ?? "").toUpperCase();
  return (
    s === "PAID" ||
    s === "PIX_PAID" ||
    s === "CONFIRMED" ||
    s === "COMPLETED" ||
    s === "SUCCESS"
  );
}

function extractReferenceId(event: any): string | null {
  const candidates = [
    event?.referenceId,
    event?.reference_id,
    event?.externalId,
    event?.external_id,
    event?.transaction?.external_id,
    event?.transaction?.externalId,
    event?.data?.external_id,
    event?.data?.transaction?.external_id,
    event?.data?.transaction?.externalId,
    event?.data?.payment?.external_id,
    event?.data?.payment?.externalId,
  ].filter(Boolean);
  return candidates.length > 0 ? String(candidates[0]) : null;
}

function extractTransactionId(event: any): string | null {
  const candidates = [
    event?.transaction_id,
    event?.transactionId,
    event?.id,
    event?.transaction?.id,
    event?.data?.transaction_id,
    event?.data?.transactionId,
    event?.data?.transaction?.id,
    event?.data?.payment?.transaction_id,
    event?.data?.payment?.transactionId,
  ].filter(Boolean);
  return candidates.length > 0 ? String(candidates[0]) : null;
}

function extractStatus(event: any): string | null {
  const candidates = [
    event?.status,
    event?.event,
    event?.type,
    event?.event_type,
    event?.payment_status,
    event?.transaction?.status,
    event?.data?.status,
    event?.data?.payment?.status,
    event?.data?.event,
    event?.data?.type,
  ].filter(Boolean);
  return candidates.length > 0 ? String(candidates[0]) : null;
}

async function postToKlose(params: {
  referenceId: string;
  transactionId?: string | null;
  status: string;
  rawEvent: any;
}) {
  const url =
    process.env.KLOSE_POSTBACK_URL ||
    "https://sgdzggbpcodevxwkypne.functions.supabase.co/payment-postback-3xpay";
  const secret = process.env.KLOSE_POSTBACK_SECRET || process.env.THREEXPAY_SERVICE_SECRET;

  if (!secret) {
    throw new Error("Missing KLOSE_POSTBACK_SECRET (or THREEXPAY_SERVICE_SECRET)");
  }

  const payload = {
    referenceId: params.referenceId,
    transaction_id: params.transactionId ?? undefined,
    status: params.status,
    // Keep raw event for troubleshooting (Klose stores it into payments.metadata.postback_payload)
    raw: params.rawEvent,
  };

  // Retry to handle transient network errors (and allow 3xPay retries if we still fail)
  let lastErr: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 10_000);
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-3xPay-Service-Secret": secret,
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      }).finally(() => clearTimeout(t));

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Klose postback failed (${resp.status}): ${txt}`);
      }

      return;
    } catch (e) {
      lastErr = e;
      // simple backoff
      await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }

  throw lastErr ?? new Error("Klose postback failed");
}

export default async function handler(
  req: any,
  res: any
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

    const referenceId = extractReferenceId(event);
    const transactionId = extractTransactionId(event);
    const status = extractStatus(event);

    if (!referenceId) {
      console.warn("Webhook missing referenceId/external_id", { event });
      // Respond 200 so 3xPay doesn't hammer us forever for malformed events
      return res.status(200).json({ received: true, ignored: true, reason: "missing_referenceId" });
    }

    if (!status) {
      console.warn("Webhook missing status", { referenceId, event });
      return res.status(200).json({ received: true, ignored: true, reason: "missing_status" });
    }

    if (!isPaidStatus(status)) {
      return res.status(200).json({ received: true, ignored: true, status });
    }

    await postToKlose({ referenceId, transactionId, status, rawEvent: event });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    // Return 500 so 3xPay retries this webhook if we couldn't forward to Klose
    return res.status(500).json({ error: "Internal server error", detail: String(error) });
  }
}
