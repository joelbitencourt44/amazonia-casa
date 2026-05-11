const express = require('express');
const { criarPedidoPix, criarPedidoCartao } = require('./pagbank');

const app = express();
app.use(express.json());

app.post('/checkout/pix', async (req, res) => {
  const pedido = await criarPedidoPix(req.body);
  res.json(pedido);
});

app.post('/checkout/cartao', async (req, res) => {
  const pedido = await criarPedidoCartao(req.body);
  res.json(pedido);
});

app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
