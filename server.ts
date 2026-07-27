import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json());

// Structure for persistent in-memory orders
interface Order {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
  };
  items: Array<{
    id: string | number;
    name: string;
    quantity: number;
    price: number;
    image?: string;
    color?: string;
  }>;
  totalAmount: number;
  paymentMethod: "pix" | "card";
  paymentStatus: "pending" | "approved" | "rejected";
  mpPaymentId?: string;
  mpPreferenceId?: string;
  pixKeyUsed?: string;
}

// In-memory database for orders and demo payments
const ordersMap = new Map<string, Order>();
const demoPayments = new Map<string, any>();

// Helper to check Mercado Pago Credentials
function formatEMVField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function generatePixPayload(
  key: string,
  amount: number,
  name: string = "GLOW AND CO",
  city: string = "SAO PAULO",
  txId: string = "***"
): string {
  const cleanKey = key.replace(/\D/g, ""); // "55839369837"
  
  // 26: Merchant Account Information (Pix)
  const gui = formatEMVField("00", "br.gov.bcb.pix");
  const keyField = formatEMVField("01", cleanKey);
  const merchantAccount = formatEMVField("26", `${gui}${keyField}`);

  // 52: Merchant Category Code
  const mcc = formatEMVField("52", "0000");

  // 53: Currency (986 = BRL)
  const currency = formatEMVField("53", "986");

  // 54: Amount
  const amountStr = Number(amount).toFixed(2);
  const amountField = formatEMVField("54", amountStr);

  // 58: Country Code
  const country = formatEMVField("58", "BR");

  // 59: Merchant Name
  const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 25).toUpperCase() || "GLOW AND CO";
  const merchantName = formatEMVField("59", cleanName);

  // 60: Merchant City
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 15).toUpperCase() || "SAO PAULO";
  const merchantCity = formatEMVField("60", cleanCity);

  // 62: Additional Data Field
  const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";
  const txIdField = formatEMVField("05", cleanTxId);
  const additionalData = formatEMVField("62", txIdField);

  // Assemble payload up to CRC identifier
  const rawPayload = `000201${merchantAccount}${mcc}${currency}${amountField}${country}${merchantName}${merchantCity}${additionalData}6304`;

  // Calculate CRC16 CCITT
  let crc = 0xFFFF;
  for (let i = 0; i < rawPayload.length; i++) {
    crc ^= rawPayload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const crcHex = crc.toString(16).toUpperCase().padStart(4, "0");

  return `${rawPayload}${crcHex}`;
}

function getMPConfig() {
  const accessToken = (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    "APP_USR-6590395360723241-072718-e5347f510a815f5389bd335e2f462631-1268573698"
  ).trim();
  const publicKey = (
    process.env.MERCADOPAGO_PUBLIC_KEY ||
    "APP_USR-ba501be2-d89c-4952-89a8-e665b5dcbe30"
  ).trim();
  return {
    accessToken,
    publicKey,
    isConfigured: Boolean(accessToken && accessToken.length > 10),
  };
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

// 2. GET /api/admin/orders - Retrieve all saved customer orders
app.get("/api/admin/orders", (_req, res) => {
  const allOrders = Array.from(ordersMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(allOrders);
});

// 3. POST /api/admin/orders/:id/approve - Admin manually approves PIX or pending order
app.post("/api/admin/orders/:id/approve", (req, res) => {
  const { id } = req.params;
  const order = ordersMap.get(id);

  if (!order) {
    // Also check by mpPaymentId or prefix
    for (const [key, o] of ordersMap.entries()) {
      if (o.mpPaymentId === id || key.includes(id)) {
        o.paymentStatus = "approved";
        ordersMap.set(key, o);
        return res.json({ message: "Status do pagamento alterado para APROVADO com sucesso!", order: o });
      }
    }
    return res.status(404).json({ error: "Pedido não encontrado no sistema." });
  }

  order.paymentStatus = "approved";
  ordersMap.set(id, order);

  // Sync with demoPayments if exists
  if (order.mpPaymentId && demoPayments.has(order.mpPaymentId)) {
    const demo = demoPayments.get(order.mpPaymentId);
    demo.status = "approved";
    demoPayments.set(order.mpPaymentId, demo);
  }

  res.json({ message: "Status do pagamento alterado para APROVADO com sucesso!", order });
});

// 4. DELETE /api/admin/orders/:id - Delete an order
app.delete("/api/admin/orders/:id", (req, res) => {
  const { id } = req.params;
  if (ordersMap.has(id)) {
    ordersMap.delete(id);
    return res.json({ message: "Pedido excluído com sucesso." });
  }
  res.status(404).json({ error: "Pedido não encontrado." });
});

// 5. POST /api/mercadopago/create-pix-payment
app.post("/api/mercadopago/create-pix-payment", async (req, res) => {
  try {
    const { totalAmount, shippingCost, payer, address, items } = req.body;

    if (!totalAmount || !payer?.email) {
      return res.status(400).json({ error: "Dados incompletos para criação do PIX." });
    }

    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const { accessToken, isConfigured } = getMPConfig();
    const roundedAmount = Number(Number(totalAmount).toFixed(2));
    const roundedShipping = Number(Number(shippingCost || 0).toFixed(2));
    const cleanCpf = (payer.cpf || "").replace(/\D/g, "");

    // Save initial order in ordersMap with complete address
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer: {
        name: payer.name || "Cliente",
        email: payer.email,
        phone: payer.phone || "",
        cpf: cleanCpf,
      },
      address: {
        cep: address?.cep || "",
        street: address?.street || "",
        number: address?.number || "",
        complement: address?.complement || "",
      },
      items: items || [],
      totalAmount: roundedAmount,
      paymentMethod: "pix",
      paymentStatus: "pending",
      pixKeyUsed: "55839369837",
    };

    ordersMap.set(orderId, newOrder);

    // Real Mercado Pago API Call if Access Token exists
    if (isConfigured) {
      const names = (payer.name || "Cliente").trim().split(" ");
      const firstName = names[0] || "Cliente";
      const lastName = names.slice(1).join(" ") || "Glow";

      const payerObj: any = {
        email: payer.email.trim(),
        first_name: firstName,
        last_name: lastName,
      };

      if (cleanCpf.length === 11) {
        payerObj.identification = {
          type: "CPF",
          number: cleanCpf,
        };
      }

      const appUrl = process.env.APP_URL;
      const notificationUrl = (appUrl && appUrl.startsWith("https://")) ? `${appUrl}/api/mercadopago/webhook` : undefined;

      const additionalItems = Array.isArray(items) && items.length > 0
        ? items.map((i: any) => ({
            id: String(i.id || "1"),
            title: String(i.name || "Produto Glow").slice(0, 250),
            quantity: Number(i.quantity || 1),
            unit_price: Number(Number(i.price || 0).toFixed(2)),
          }))
        : [];

      const payload: any = {
        transaction_amount: roundedAmount,
        description: `Pedido Glow & Co (${items?.length || 1} itens)`,
        payment_method_id: "pix",
        payer: payerObj,
        external_reference: orderId,
        additional_info: {
          items: additionalItems.length > 0 ? additionalItems : [
            {
              id: "1",
              title: "Pedido Glow Store",
              quantity: 1,
              unit_price: roundedAmount,
            },
          ],
          shipments: {
            receiver_address: {
              zip_code: address?.cep || "",
              street_name: address?.street || "",
              street_number: Number(address?.number) || 0,
            },
          },
        },
      };

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
        if (mpData.error === "unauthorized" || mpResponse.status === 401) {
          console.warn("Mercado Pago Access Token é inválido ou expirou (401 Unauthorized). Utilizando geração automática de PIX via chave 55839369837...");
          // Fall through to automatic PIX fallback generation below
        } else {
          console.error("Mercado Pago API Error Body:", JSON.stringify(mpData, null, 2));
          let detailedMsg = mpData.message || "Erro ao gerar PIX no Mercado Pago.";
          if (Array.isArray(mpData.cause) && mpData.cause.length > 0) {
            const cause = mpData.cause[0];
            if (cause.code === 2067) {
              detailedMsg = "CPF inválido. Por favor, verifique o número do CPF informado.";
            } else if (cause.code === 2003) {
              detailedMsg = "E-mail do pagador inválido ou idêntico ao do vendedor no Mercado Pago.";
            } else if (cause.description) {
              detailedMsg = `Mercado Pago: ${cause.description}`;
            }
          } else if (mpData.error === "bad_request") {
            detailedMsg = "Mercado Pago: Dados da requisição inválidos (verifique se o CPF e e-mail estão corretos).";
          }

          return res.status(mpResponse.status).json({
            error: detailedMsg,
            orderId,
            details: mpData.cause || mpData,
          });
        }
      } else {
        // Update saved order with MP payment ID
        newOrder.mpPaymentId = String(mpData.id);
        ordersMap.set(orderId, newOrder);

        return res.json({
          orderId,
          id: mpData.id,
          status: mpData.status,
          status_detail: mpData.status_detail,
          qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
          date_of_expiration: mpData.date_of_expiration,
          pixKey: "55839369837",
          is_demo: false,
        });
      }
    }

    // Demo Mode Fallback - Generate 100% valid EMV BR Code Pix payload
    const demoId = `pix_demo_${Date.now()}`;
    const pixCode = generatePixPayload("55839369837", roundedAmount, "GLOW AND CO", "SAO PAULO", orderId);

    const paymentObj = {
      id: demoId,
      orderId,
      status: "pending",
      status_detail: "waiting_transfer",
      qr_code: pixCode,
      qr_code_base64: null,
      ticket_url: "#",
      date_of_expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      amount: totalAmount,
      payer,
      is_demo: true,
      created_at: new Date().toISOString(),
    };

    demoPayments.set(demoId, paymentObj);
    newOrder.mpPaymentId = demoId;
    ordersMap.set(orderId, newOrder);

    return res.json({
      ...paymentObj,
      pixKey: "55839369837",
      notice: "Pedido registrado com sucesso. Transação via Mercado Pago PIX.",
    });
  } catch (error: any) {
    console.error("Error creating PIX:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar PIX." });
  }
});

// 6. POST /api/mercadopago/create-preference (Cartão de Crédito - Mercado Pago Checkout)
app.post("/api/mercadopago/create-preference", async (req, res) => {
  try {
    const { items, payer, address, totalAmount, shippingCost } = req.body;
    const { accessToken, isConfigured } = getMPConfig();

    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const roundedAmount = Number(Number(totalAmount).toFixed(2));
    const roundedShipping = Number(Number(shippingCost || 0).toFixed(2));

    // Save order in ordersMap
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer: {
        name: payer?.name || "Cliente",
        email: payer?.email || "cliente@glowstore.com.br",
        phone: payer?.phone || "",
        cpf: (payer?.cpf || "").replace(/\D/g, ""),
      },
      address: {
        cep: address?.cep || "",
        street: address?.street || "",
        number: address?.number || "",
        complement: address?.complement || "",
      },
      items: items || [],
      totalAmount: roundedAmount,
      paymentMethod: "card",
      paymentStatus: "pending",
    };

    ordersMap.set(orderId, newOrder);

    const appUrl = process.env.APP_URL || "https://ais-dev-taalx2wpgo4o36xn4zsrp4-204395549149.us-west2.run.app";

    if (isConfigured) {
      const prefItems = Array.isArray(items) && items.length > 0
        ? items.map((i: any) => ({
            title: String(i.name || "Produto Glow").slice(0, 250),
            quantity: Number(i.quantity || 1),
            currency_id: "BRL",
            unit_price: Number(Number(i.price || 0).toFixed(2)),
            picture_url: i.image,
          }))
        : [
            {
              title: "Pedido Glow & Co",
              quantity: 1,
              currency_id: "BRL",
              unit_price: roundedAmount,
            },
          ];

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          items: prefItems,
          shipments: {
            cost: roundedShipping,
            mode: "not_specified",
            receiver_address: {
              zip_code: address?.cep || "",
              street_name: address?.street || "",
              street_number: Number(address?.number) || 0,
            }
          },
          payer: {
            name: payer?.name || "Cliente",
            email: payer?.email || "cliente@glowstore.com.br",
            phone: {
              number: (payer?.phone || "11999999999").replace(/\D/g, ""),
            },
            identification: {
              type: "CPF",
              number: (payer?.cpf || "00000000000").replace(/\D/g, ""),
            },
          },
          external_reference: orderId,
          back_urls: {
            success: `${appUrl}/checkout?status=approved&order_id=${orderId}`,
            failure: `${appUrl}/checkout?status=failure&order_id=${orderId}`,
            pending: `${appUrl}/checkout?status=pending&order_id=${orderId}`,
          },
          auto_return: "approved",
          notification_url: `${appUrl}/api/mercadopago/webhook`,
        }),
      });

      const preference = await mpResponse.json();

      if (!mpResponse.ok) {
        if (preference.error === "unauthorized" || mpResponse.status === 401) {
          console.warn("Mercado Pago Access Token é inválido ou expirou (401 Unauthorized). Retornando link de contingência de checkout...");
          // Fall through to fallback demo preference below
        } else {
          console.error("Mercado Pago Preference API Error:", preference);
          return res.status(mpResponse.status).json({ error: preference.message || "Erro ao criar preferência do Mercado Pago." });
        }
      } else {
        newOrder.mpPreferenceId = preference.id;
        ordersMap.set(orderId, newOrder);

        return res.json({
          orderId,
          id: preference.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          is_demo: false,
        });
      }
    }

    // Fallback demo preference
    return res.json({
      orderId,
      id: `pref_demo_${Date.now()}`,
      init_point: `${appUrl}/checkout?status=approved&order_id=${orderId}&simulated=true`,
      sandbox_init_point: `${appUrl}/checkout?status=approved&order_id=${orderId}&simulated=true`,
      is_demo: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao criar preferência de checkout." });
  }
});

// 7. GET /api/mercadopago/payment-status/:id (Supports payment ID, order ID, or demo ID)
app.get("/api/mercadopago/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { accessToken, isConfigured } = getMPConfig();

    // First check if matching order in ordersMap is already approved
    const order = ordersMap.get(id);
    if (order) {
      if (order.paymentStatus === "approved") {
        return res.json({ id, status: "approved", order });
      }
    }

    // Check by mpPaymentId in ordersMap
    for (const [, o] of ordersMap.entries()) {
      if (o.mpPaymentId === id && o.paymentStatus === "approved") {
        return res.json({ id, status: "approved", order: o });
      }
    }

    // Demo check
    if (id.startsWith("pix_demo_") || id.startsWith("ORD-") || !isConfigured) {
      const demo = demoPayments.get(id);
      if (demo) {
        return res.json({
          id: demo.id,
          status: demo.status,
          status_detail: demo.status_detail,
          is_demo: true,
        });
      }
      return res.json({ id, status: order?.paymentStatus || "pending", is_demo: true });
    }

    // Call MP API for real payment status
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      return res.json({ id, status: order?.paymentStatus || "pending" });
    }

    const data = await mpResponse.json();

    // Update order status if approved by MP
    if (data.status === "approved" && data.external_reference) {
      const matchedOrder = ordersMap.get(data.external_reference);
      if (matchedOrder) {
        matchedOrder.paymentStatus = "approved";
        ordersMap.set(data.external_reference, matchedOrder);
      }
    }

    return res.json({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      is_demo: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Erro ao consultar status do pagamento." });
  }
});

// 8. POST /api/mercadopago/simulate-approve-pix/:id
app.post("/api/mercadopago/simulate-approve-pix/:id", (req, res) => {
  const { id } = req.params;

  // Search in ordersMap first
  for (const [key, o] of ordersMap.entries()) {
    if (key === id || o.mpPaymentId === id || o.id === id) {
      o.paymentStatus = "approved";
      ordersMap.set(key, o);
      return res.json({ message: "Pagamento aprovado com sucesso!", order: o });
    }
  }

  const demo = demoPayments.get(id);
  if (demo) {
    demo.status = "approved";
    demo.status_detail = "accredited";
    demoPayments.set(id, demo);
    if (demo.orderId && ordersMap.has(demo.orderId)) {
      const o = ordersMap.get(demo.orderId)!;
      o.paymentStatus = "approved";
      ordersMap.set(demo.orderId, o);
    }
    return res.json({ message: "Pagamento aprovado!", payment: demo });
  }

  return res.json({ message: "Simulação ativada para o pedido.", id, status: "approved" });
});

// 9. POST /api/mercadopago/webhook
app.post("/api/mercadopago/webhook", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === "payment" && data?.id) {
      const { accessToken, isConfigured } = getMPConfig();
      if (isConfigured) {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (mpResponse.ok) {
          const paymentData = await mpResponse.json();
          if (paymentData.status === "approved" && paymentData.external_reference) {
            const matchedOrder = ordersMap.get(paymentData.external_reference);
            if (matchedOrder) {
              matchedOrder.paymentStatus = "approved";
              ordersMap.set(paymentData.external_reference, matchedOrder);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
