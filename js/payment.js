// ============================================
// SISTEMA DE PAGAMENTO COMPLETO
// AMAZÔNIA EM CASA
// ============================================

/* ============================================
   ⚠️ CONFIGURAÇÃO DA API DE PAGAMENTO
   ============================================
   Preencha quando receber as credenciais:
   
   Opções de provider:
   - 'mercadopago'  → Mercado Pago (recomendado para BR)
   - 'pagseguro'    → PagSeguro
   - 'stripe'       → Stripe (internacional)
   - 'picpay'       → PicPay
   - 'efi'          → Efí Bank
   - 'custom'       → Modo simulação (testes)
   ============================================ */
const PAYMENT_CONFIG = {
  provider: "custom", // ⚠️ MUDAR AQUI
  apiKey: "SUA_CHAVE_API_AQUI", // ⚠️ MUDAR AQUI
  apiSecret: "SUA_CHAVE_SECRETA_AQUI", // ⚠️ MUDAR AQUI
  apiUrl: "https://api.exemplo.com/v1/", // ⚠️ MUDAR AQUI
  webhookUrl: "https://seusite.com.br/webhook", // ⚠️ MUDAR AQUI
  sandbox: true, // true = testes, false = produção
  pixKey: "seu-pix@email.com", // ⚠️ MUDAR: Sua chave Pix
  pixKeyType: "email", // ⚠️ MUDAR: 'cpf', 'cnpj', 'email', 'phone', 'random'
  pixName: "Amazônia em Casa", // Nome que aparece no Pix
  pixCity: "Belém - PA",
};

// Histórico de pagamentos
let paymentHistory = JSON.parse(localStorage.getItem("amazoniaPayments")) || [];

// ============================================
// GERAR PAGAMENTO PIX
// ============================================
async function generatePixPayment(orderData) {
  const amount = orderData.total;
  const orderId = orderData.id;

  /* 
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'pix', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + PAYMENT_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount,
            description: 'Pedido #' + orderId + ' - Amazônia em Casa',
            payer: {
                name: orderData.customer?.name,
                email: orderData.customer?.email,
                phone: orderData.customer?.phone
            },
            pixKey: PAYMENT_CONFIG.pixKey,
            expirationMinutes: 30
        })
    });
    const data = await response.json();
    return {
        qrCode: data.qr_code,
        qrCodeBase64: data.qr_code_base64,
        pixKey: data.pix_key,
        expiresAt: data.expires_at
    };
    */

  // SIMULAÇÃO (remover quando tiver API)
  return simulatePixPayment(orderData);
}

function simulatePixPayment(orderData) {
  const paymentId = "PIX-" + Date.now();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  // Gerar QR Code simulado
  const qrCodeText = `00020126580014br.gov.bcb.pix0136${PAYMENT_CONFIG.pixKey}0206Pedido${orderData.id}520400005303986540${orderData.total.toFixed(2)}5802BR5925${PAYMENT_CONFIG.pixName}6009${PAYMENT_CONFIG.pixCity}62070503***6304`;

  return {
    paymentId,
    qrCode: qrCodeText,
    pixKey: PAYMENT_CONFIG.pixKey,
    pixName: PAYMENT_CONFIG.pixName,
    pixCity: PAYMENT_CONFIG.pixCity,
    amount: orderData.total,
    expiresAt,
    status: "pending",
  };
}

// ============================================
// GERAR PAGAMENTO CARTÃO DE CRÉDITO
// ============================================
async function generateCardPayment(orderData, cardData) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'card', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + PAYMENT_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: orderData.total,
            installments: cardData.installments,
            card: {
                number: cardData.number,
                expiry: cardData.expiry,
                cvv: cardData.cvv,
                holderName: cardData.holderName,
                holderDocument: cardData.holderDocument
            },
            payer: {
                name: orderData.customer?.name,
                email: orderData.customer?.email
            },
            description: 'Pedido #' + orderData.id
        })
    });
    const data = await response.json();
    return {
        paymentId: data.id,
        status: data.status,
        receipt: data.receipt_url
    };
    */

  return simulateCardPayment(orderData, cardData);
}

function simulateCardPayment(orderData, cardData) {
  const paymentId = "CARD-" + Date.now();
  const installments = cardData.installments || 1;
  const installmentValue = orderData.total / installments;

  return {
    paymentId,
    status: "approved",
    amount: orderData.total,
    installments,
    installmentValue,
    cardBrand: detectCardBrand(cardData.number),
    cardLast4: cardData.number.slice(-4),
    receipt: "https://comprovante.exemplo.com/" + paymentId,
  };
}

// ============================================
// GERAR BOLETO
// ============================================
async function generateBoletoPayment(orderData) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'boleto', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + PAYMENT_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: orderData.total,
            description: 'Pedido #' + orderData.id,
            payer: {
                name: orderData.customer?.name,
                email: orderData.customer?.email,
                document: orderData.customer?.document
            },
            expirationDays: 3
        })
    });
    const data = await response.json();
    return {
        paymentId: data.id,
        boletoUrl: data.boleto_url,
        barcode: data.barcode,
        expiresAt: data.expires_at
    };
    */

  return simulateBoletoPayment(orderData);
}

function simulateBoletoPayment(orderData) {
  const paymentId = "BOLETO-" + Date.now();
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return {
    paymentId,
    boletoUrl: "https://boleto.exemplo.com/" + paymentId,
    barcode:
      "34191.79001 01043.510047 91020.150008 1 " +
      Date.now().toString().slice(-6),
    amount: orderData.total,
    expiresAt,
  };
}

// ============================================
// PAGAMENTO COMBINADO (PIX + CARTÃO)
// ============================================
async function generateCombinedPayment(
  orderData,
  pixAmount,
  cardAmount,
  cardData,
) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    // Gera Pix para parte do valor
    const pixResult = await generatePixPayment({...orderData, total: pixAmount});
    // Gera cartão para o restante
    const cardResult = await generateCardPayment({...orderData, total: cardAmount}, cardData);
    
    return {
        pix: pixResult,
        card: cardResult,
        totalPaid: pixAmount + cardAmount
    };
    */

  return simulateCombinedPayment(orderData, pixAmount, cardAmount, cardData);
}

function simulateCombinedPayment(orderData, pixAmount, cardAmount, cardData) {
  return {
    pix: {
      paymentId: "PIX-" + Date.now(),
      qrCode: "simulado",
      amount: pixAmount,
      status: "pending",
    },
    card: {
      paymentId: "CARD-" + Date.now(),
      status: "approved",
      amount: cardAmount,
      installments: cardData.installments || 1,
      cardBrand: detectCardBrand(cardData.number),
      cardLast4: cardData.number.slice(-4),
    },
    totalPaid: pixAmount + cardAmount,
  };
}

// ============================================
// PAGAMENTO COM DOIS CARTÕES
// ============================================
async function generateTwoCardsPayment(
  orderData,
  card1Data,
  card1Amount,
  card2Data,
  card2Amount,
) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const card1Result = await generateCardPayment({...orderData, total: card1Amount}, card1Data);
    const card2Result = await generateCardPayment({...orderData, total: card2Amount}, card2Data);
    
    return {
        card1: card1Result,
        card2: card2Result,
        totalPaid: card1Amount + card2Amount
    };
    */

  return simulateTwoCardsPayment(
    card1Data,
    card1Amount,
    card2Data,
    card2Amount,
  );
}

function simulateTwoCardsPayment(
  card1Data,
  card1Amount,
  card2Data,
  card2Amount,
) {
  return {
    card1: {
      paymentId: "CARD1-" + Date.now(),
      status: "approved",
      amount: card1Amount,
      cardBrand: detectCardBrand(card1Data.number),
      cardLast4: card1Data.number.slice(-4),
    },
    card2: {
      paymentId: "CARD2-" + Date.now(),
      status: "approved",
      amount: card2Amount,
      cardBrand: detectCardBrand(card2Data.number),
      cardLast4: card2Data.number.slice(-4),
    },
    totalPaid: card1Amount + card2Amount,
  };
}

// ============================================
// VERIFICAR STATUS DO PAGAMENTO
// ============================================
async function checkPaymentStatus(paymentId) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'payments/' + paymentId, {
        headers: { 'Authorization': 'Bearer ' + PAYMENT_CONFIG.apiKey }
    });
    const data = await response.json();
    return data.status;
    */

  return "approved"; // Simulação
}

// ============================================
// CANCELAR / ESTORNAR PAGAMENTO
// ============================================
async function refundPayment(paymentId, amount, reason) {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'refund', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + PAYMENT_CONFIG.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            paymentId: paymentId,
            amount: amount,
            reason: reason
        })
    });
    const data = await response.json();
    return {
        refundId: data.id,
        status: data.status,
        amount: data.amount
    };
    */

  return {
    refundId: "REFUND-" + Date.now(),
    status: "completed",
    amount: amount,
    reason: reason,
    refundedAt: new Date().toISOString(),
  };
}

// ============================================
// WEBHOOK - Receber notificações de pagamento
// ============================================
function setupPaymentWebhook() {
  /*
    ⚠️ QUANDO TIVER API REAL:
    ============================================
    // Este código rodaria no seu servidor backend
    app.post('/webhook', async (req, res) => {
        const event = req.body;
        
        if (event.type === 'payment.approved') {
            const order = await findOrder(event.orderId);
            order.status = 'confirmed';
            order.paymentStatus = 'paid';
            order.paidAt = new Date().toISOString();
            await saveOrder(order);
        }
        
        if (event.type === 'payment.refunded') {
            const order = await findOrder(event.orderId);
            order.status = 'cancelled';
            order.paymentStatus = 'refunded';
            await saveOrder(order);
        }
        
        res.status(200).send('OK');
    });
    */

  console.log("🔄 Webhook configurado para: " + PAYMENT_CONFIG.webhookUrl);
}

// ============================================
// GERAR COMPROVANTE
// ============================================
function generateReceipt(paymentData, orderData) {
  const receipt = {
    receiptId: "REC-" + Date.now(),
    date: new Date().toISOString(),
    order: {
      id: orderData.id,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      total: orderData.total,
    },
    payment: {
      method: paymentData.method,
      id: paymentData.paymentId,
      amount: paymentData.amount,
      status: "approved",
      installments: paymentData.installments || 1,
    },
    store: {
      name: PAYMENT_CONFIG.pixName,
      document: "CNPJ da loja",
      address: "Endereço da loja",
    },
  };

  // Salvar no histórico
  paymentHistory.push(receipt);
  localStorage.setItem("amazoniaPayments", JSON.stringify(paymentHistory));

  return receipt;
}

// ============================================
// UTILITÁRIOS
// ============================================
function detectCardBrand(number) {
  const cleaned = number.replace(/\D/g, "");
  if (/^4/.test(cleaned)) return "Visa";
  if (/^5[1-5]/.test(cleaned)) return "Mastercard";
  if (/^3[47]/.test(cleaned)) return "American Express";
  if (/^6(?:011|5)/.test(cleaned)) return "Discover";
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return "Diners Club";
  if (/^(?:2131|1800|35)/.test(cleaned)) return "JCB";
  if (/^6062/.test(cleaned)) return "Hipercard";
  if (/^50/.test(cleaned)) return "Elo";
  return "Desconhecida";
}

function formatCardNumber(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .slice(0, 19);
}

function formatExpiry(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{2})(?=\d)/, "$1/")
    .slice(0, 5);
}

function formatCVV(value) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function maskCardNumber(number) {
  const cleaned = number.replace(/\D/g, "");
  return "**** **** **** " + cleaned.slice(-4);
}

// ============================================
// EXPORTAR PARA APP.JS
// ============================================
window.PaymentSystem = {
  PAYMENT_CONFIG,
  generatePixPayment,
  generateCardPayment,
  generateBoletoPayment,
  generateCombinedPayment,
  generateTwoCardsPayment,
  checkPaymentStatus,
  refundPayment,
  generateReceipt,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  formatCVV,
  maskCardNumber,
  paymentHistory,
};

console.log("💳 Sistema de Pagamento carregado!");
console.log("📦 Provider:", PAYMENT_CONFIG.provider);
console.log(
  "🔑 Sandbox:",
  PAYMENT_CONFIG.sandbox ? "ATIVADO (testes)" : "DESATIVADO (produção)",
);
console.log("⚠️ Lembre-se de configurar as chaves da API!");

// ============================================
// CALCULAR FRETE VIA API DE ENTREGA
// ============================================
async function calculateShipping(origin, destination, deliveryType) {
  /*
    ⚠️ QUANDO TIVER API DO IFOOD/LOGGI:
    ============================================
    const response = await fetch(PAYMENT_CONFIG.apiUrl + 'shipping/calculate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + DELIVERY_API.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            origin: {
                address: 'Av. Rômulo Maiorana, 1234 - Marco',
                city: 'Belém',
                state: 'PA',
                zipCode: '66000-000'
            },
            destination: {
                address: destination.address,
                city: destination.city,
                state: 'PA'
            },
            deliveryType: deliveryType, // 'express' ou 'normal'
            packageInfo: {
                weight: 1, // kg
                dimensions: { length: 20, width: 15, height: 10 } // cm
            }
        })
    });
    
    const data = await response.json();
    return {
        price: data.price,
        estimatedTime: data.estimated_time, // em minutos
        distance: data.distance, // em km
        available: data.available
    };
    */

  // SIMULAÇÃO (remover quando tiver API real)
  return simulateShippingCalculation(destination, deliveryType);
}

function simulateShippingCalculation(destination, deliveryType) {
  // Valores de exemplo (serão substituídos pela API)
  const prices = {
    express: { price: 12.9, time: "30-60 minutos" },
    normal: { price: 8.9, time: "1-3 horas" },
  };

  const result = prices[deliveryType] || prices["normal"];

  return {
    price: result.price,
    estimatedTime: result.time,
    distance: "5-10 km",
    available: true,
    provider: "iFood", // ⚠️ MUDAR para o nome do app que você usar
  };
}

// Exportar
window.calculateShipping = calculateShipping;
