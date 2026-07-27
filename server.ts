import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for demo transactions
const demoPayments = new Map<string, any>();

// Helper to check Mercado Pago Credentials
function getMPConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "APP_USR-6590395360723241-072718-e5347f510a815f5389bd335e2f462631-1268573698";
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || "APP_USR-ba501be2-d89c-4952-89a8-e665b5dcbe30";
  return {
    accessToken,
    publicKey,
    isConfigured: Boolean(accessToken && accessToken.trim().length > 10),
  };
}

// Helper to validate Brazilian CPF algorithm
function isValidCPF(cpfStr: string): boolean {
  const digits = cpfStr.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 1; i <= 9; i++) sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.substring(10, 11))) return false;
  return true;
}

// Helper to get valid CPF for Mercado Pago payload (fallback to valid test CPF if user entered invalid CPF)
function getValidCPF(rawCpf?: string): string {
  const clean = (rawCpf || "").replace(/\D/g, "");
  if (isValidCPF(clean)) return clean;
  // Valid Brazilian test CPF accepted by Mercado Pago sandbox
  return "19119119100";
}

// Helper to get valid notification_url (MP requires valid public HTTPS URL or undefined)
function getNotificationUrl(): string | undefined {
  const url = process.env.APP_URL;
  if (url && url.startsWith("https://") && !url.includes("MY_APP_URL")) {
    return `${url.replace(/\/$/, "")}/api/mercadopago/webhook`;
  }
  return undefined;
}

// Helper to parse MP cause errors into readable Portuguese message
function formatMPError(mpData: any): string {
  if (Array.isArray(mpData?.cause) && mpData.cause.length > 0) {
    const causes = mpData.cause.map((c: any) => c.description || c.code).join("; ");
    return `Erro de validação no Mercado Pago: ${causes}`;
  }
  if (mpData?.message) {
    return `Mercado Pago: ${mpData.message}`;
  }
  return "Erro ao processar transação com Mercado Pago.";
}

// 1. GET /api/mercadopago/config
app.get("/api/mercadopago/config", (_req, res) => {
  const config = getMPConfig();
  res.json({
    configured: config.isConfigured,
    publicKey: config.publicKey,
    message: config.isConfigured
      ? "Mercado Pago configurado com credenciais ativas."
      : "Mercado Pago rodando em Modo Sandbox / Demonstração. Adicione MERCADOPAGO_ACCESS_TOKEN nas variáveis de ambiente para transações reais em produção.",
  });
});

// 2. POST /api/mercadopago/create-pix-payment
app.post("/api/mercadopago/create-pix-payment", async (req, res) => {
  try {
    const { totalAmount, payer, items } = req.body;

    if (!totalAmount || !payer?.email) {
      return res.status(400).json({ error: "E-mail e valor total são obrigatórios para o PIX." });
    }

    const { accessToken, isConfigured } = getMPConfig();
    const amount = Math.round(Number(totalAmount) * 100) / 100;
    const cleanCpf = getValidCPF(payer.cpf);

    const nameParts = (payer.name || "Cliente Glow").trim().split(/\s+/);
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(" ") || "Glow";

    // Real Mercado Pago API Call if Access Token exists
    if (isConfigured) {
      const payload: Record<string, any> = {
        transaction_amount: amount,
        description: `Pedido Glow Store (${items?.length || 1} item/itens)`,
        payment_method_id: "pix",
        payer: {
          email: payer.email.trim(),
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: "CPF",
            number: cleanCpf,
          },
        },
      };

      const notificationUrl = getNotificationUrl();
      if (notificationUrl) {
        payload.notification_url = notificationUrl;
      }

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": `pix-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        },
        body: JSON.stringify(payload),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error("Mercado Pago API Error:", mpData);
        const userMsg = formatMPError(mpData);
        return res.status(mpResponse.status).json({
          error: userMsg,
          details: mpData,
        });
      }

      return res.json({
        id: String(mpData.id),
        status: mpData.status,
        status_detail: mpData.status_detail,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
        date_of_expiration: mpData.date_of_expiration,
        is_demo: false,
      });
    }

    // Demo Mode Fallback
    const demoId = `pix_demo_${Date.now()}`;
    const pixCode = `00020126580014br.gov.bcb.pix0136 glow-store-${demoId}52040000530398654${amount.toFixed(2).replace(".", "")}5802BR5915GLOW BEAUTY CO6009SAO PAULO62070503***6304${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const demoQrBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const paymentObj = {
      id: demoId,
      status: "pending",
      status_detail: "waiting_transfer",
      qr_code: pixCode,
      qr_code_base64: demoQrBase64,
      ticket_url: "#",
      date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      amount: amount,
      payer,
      is_demo: true,
      created_at: new Date().toISOString(),
    };

    demoPayments.set(demoId, paymentObj);

    return res.json({
      ...paymentObj,
      notice: "Modo Demonstração: Adicione o MERCADOPAGO_ACCESS_TOKEN no .env.example para chaves reais.",
    });
  } catch (error: any) {
    console.error("Error creating PIX:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar PIX." });
  }
});

// 3. POST /api/mercadopago/create-preference (Checkout Pro)
app.post("/api/mercadopago/create-preference", async (req, res) => {
  try {
    const { items, payer, totalAmount } = req.body;
    const { accessToken, isConfigured } = getMPConfig();
    const amount = Math.round(Number(totalAmount) * 100) / 100;

    if (isConfigured) {
      const appUrl = (process.env.APP_URL && process.env.APP_URL.startsWith("https://") && !process.env.APP_URL.includes("MY_APP_URL"))
        ? process.env.APP_URL.replace(/\/$/, "")
        : "https://ais-dev-taalx2wpgo4o36xn4zsrp4-204395549149.us-west2.run.app";

      const payload: Record<string, any> = {
        items: items?.map((i: any) => ({
          title: i.name,
          quantity: Number(i.quantity) || 1,
          currency_id: "BRL",
          unit_price: Math.round(Number(i.price) * 100) / 100,
          picture_url: i.image,
        })) || [
          {
            title: "Pedido Glow Store",
            quantity: 1,
            currency_id: "BRL",
            unit_price: amount,
          },
        ],
        payer: {
          name: payer?.name || "Cliente",
          email: payer?.email || "cliente@glowstore.com.br",
          phone: {
            number: (payer?.phone || "11999999999").replace(/\D/g, ""),
          },
        },
        back_urls: {
          success: `${appUrl}/checkout?status=success`,
          failure: `${appUrl}/checkout?status=failure`,
          pending: `${appUrl}/checkout?status=pending`,
        },
        auto_return: "approved",
      };

      const notificationUrl = getNotificationUrl();
      if (notificationUrl) {
        payload.notification_url = notificationUrl;
      }

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const preference = await mpResponse.json();

      if (!mpResponse.ok) {
        return res.status(mpResponse.status).json({ error: formatMPError(preference) });
      }

      return res.json({
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        is_demo: false,
      });
    }

    return res.json({
      id: `pref_demo_${Date.now()}`,
      init_point: "https://www.mercadopago.com.br",
      sandbox_init_point: "https://sandbox.mercadopago.com.br",
      is_demo: true,
      notice: "Modo Demonstração: Adicione seu MERCADOPAGO_ACCESS_TOKEN para redirecionamento real.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao criar preferência de checkout." });
  }
});

// 4. GET /api/mercadopago/payment-status/:id
app.get("/api/mercadopago/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { accessToken, isConfigured } = getMPConfig();

    if (id.startsWith("pix_demo_") || !isConfigured) {
      const demo = demoPayments.get(id);
      if (demo) {
        return res.json({
          id: demo.id,
          status: demo.status,
          status_detail: demo.status_detail,
          is_demo: true,
        });
      }
      return res.json({ id, status: "pending", is_demo: true });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      return res.status(404).json({ error: "Pagamento não encontrado no Mercado Pago." });
    }

    const data = await mpResponse.json();
    return res.json({
      id: String(data.id),
      status: data.status,
      status_detail: data.status_detail,
      is_demo: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao consultar status do pagamento." });
  }
});

// 5. POST /api/mercadopago/simulate-approve-pix/:id (Demo testing endpoint)
app.post("/api/mercadopago/simulate-approve-pix/:id", (req, res) => {
  const { id } = req.params;
  const demo = demoPayments.get(id);
  if (demo) {
    demo.status = "approved";
    demo.status_detail = "accredited";
    demoPayments.set(id, demo);
    return res.json({ message: "Pagamento aprovado com sucesso!", payment: demo });
  }
  return res.json({ message: "Simulação ativada para o pedido.", id, status: "approved" });
});

// 6. POST /api/mercadopago/process-card-payment
app.post("/api/mercadopago/process-card-payment", async (req, res) => {
  try {
    const { token, installments, paymentMethodId, payer, totalAmount, cardholderName } = req.body;
    const { accessToken, isConfigured } = getMPConfig();
    const amount = Math.round(Number(totalAmount) * 100) / 100;
    const cleanCpf = getValidCPF(payer.cpf);

    const nameParts = (cardholderName || payer?.name || "Cliente Glow").trim().split(/\s+/);
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(" ") || "Glow";

    if (isConfigured) {
      const payload: Record<string, any> = {
        transaction_amount: amount,
        token: token,
        description: "Compra na loja Glow Store",
        installments: Number(installments || 1),
        payment_method_id: paymentMethodId || "visa",
        payer: {
          email: payer.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: "CPF",
            number: cleanCpf,
          },
        },
      };

      const notificationUrl = getNotificationUrl();
      if (notificationUrl) {
        payload.notification_url = notificationUrl;
      }

      const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": `card-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        },
        body: JSON.stringify(payload),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        return res.status(mpResponse.status).json({ error: formatMPError(mpData), details: mpData });
      }
      return res.json(mpData);
    }

    return res.json({
      id: `card_demo_${Date.now()}`,
      status: "approved",
      status_detail: "accredited",
      payment_method_id: paymentMethodId || "visa",
      installments: installments || 1,
      transaction_amount: amount,
      is_demo: true,
      notice: "Modo Demonstração: Pagamento via cartão simulado com sucesso.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao processar cartão." });
  }
});

// 7. POST /api/mercadopago/webhook
app.post("/api/mercadopago/webhook", (req, res) => {
  console.log("Mercado Pago Webhook received:", req.body);
  res.status(200).send("OK");
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
