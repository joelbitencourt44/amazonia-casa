require('dotenv').config();
const axios = require('axios');

const api = axios.create({
  baseURL: process.env.PAGBANK_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAGBANK_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

require('dotenv').config();
const axios = require('axios');

const api = axios.create({
  baseURL: process.env.PAGBANK_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAGBANK_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function criarPedidoPix(dados) {
  const pedido = {
    reference_id: "pedido001",
    customer: { name: dados.nome, email: dados.email },
    items: [{ name: dados.produto, quantity: 1, unit_amount: dados.valor }],
    charges: [{ payment_method: { type: "PIX" } }]
  };
  const response = await api.post("/orders", pedido);
  return response.data;
}

async function criarPedidoCartao(dados) {
  const pedido = {
    reference_id: "pedido002",
    customer: { name: dados.nome, email: dados.email },
    items: [{ name: dados.produto, quantity: 1, unit_amount: dados.valor }],
    charges: [{
      payment_method: {
        type: "CREDIT_CARD",
        installments: 1,
        capture: true,
        card: {
          number: dados.numero,
          exp_month: dados.mes,
          exp_year: dados.ano,
          security_code: dados.cvv,
          holder: { name: dados.nome }
        }
      }
    }]
  };
  const response = await api.post("/orders", pedido);
  return response.data;
}

module.exports = { criarPedidoPix, criarPedidoCartao };
