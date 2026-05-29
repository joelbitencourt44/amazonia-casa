document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("chatbotToggle");
  var win = document.getElementById("chatbotWindow");
  if (!toggle) return;

  toggle.addEventListener("click", function () {
    win.style.display = win.style.display === "none" ? "flex" : "none";
  });

  document
    .getElementById("chatbotClose")
    ?.addEventListener("click", function () {
      win.style.display = "none";
    });

  // Carregar mensagens anteriores do cliente
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  var chatKey = "chatbot_" + (user?.email || "anon");
  var chatHistory = JSON.parse(localStorage.getItem(chatKey)) || [];

  // Mostrar histórico
  var msgs = document.getElementById("chatbotMessages");
  chatHistory.forEach(function (m) {
    msgs.innerHTML +=
      '<div class="message ' + m.type + '"><p>' + m.text + "</p></div>";
  });
  msgs.scrollTop = msgs.scrollHeight;

  function send() {
    var input = document.getElementById("chatbotInput");
    var text = input.value.trim();
    if (!text) return;

    // Adicionar mensagem do usuário
    msgs.innerHTML += '<div class="message user"><p>' + text + "</p></div>";
    chatHistory.push({ type: "user", text: text });
    input.value = "";
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(function () {
      var resp = getResponse(text);

      if (resp.includes("ENCAMINHAR")) {
        // Enviar para o admin
        var userName = user?.name || "Cliente Anônimo";
        var userEmail = user?.email || "anon@cliente.com";

        var ticket = {
          id: "TICKET-" + Date.now(),
          name: userName,
          email: userEmail,
          message: text,
          date: new Date().toISOString(),
          read: false,
          type: "chatbot",
          status: "pending",
          repliedBy: "",
          reply: "",
          repliedAt: "",
        };

        // Salvar no localStorage
        var tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
        tickets.push(ticket);
        localStorage.setItem("chatbotTickets", JSON.stringify(tickets));

        // Salvar no Firebase
        try {
          db.collection("chatbotTickets").add(ticket);
        } catch (e) {}

        resp =
          "📩 Sua pergunta foi enviada para nossa equipe! Um atendente responderá em breve.\n\n✅ Para ver a resposta, acesse a aba 📬 Mensagens no menu do seu perfil.";
      }

      // Adicionar resposta
      msgs.innerHTML += '<div class="message bot"><p>' + resp + "</p></div>";
      chatHistory.push({ type: "bot", text: resp });
      localStorage.setItem(chatKey, JSON.stringify(chatHistory));
      msgs.scrollTop = msgs.scrollHeight;
    }, 500);
  }

  function getResponse(msg) {
    msg = msg.toLowerCase();
    if (msg.includes("mel"))
      return "🍯 Temos mel puro de abelhas nativas da Ilha do Marajó! A partir de R$ 49,90.";
    if (msg.includes("própolis") || msg.includes("propolis"))
      return "🐝 Temos Própolis Verde! A partir de R$ 39,90.";
    if (
      msg.includes("óleo") ||
      msg.includes("andiroba") ||
      msg.includes("copaíba")
    )
      return "🧴 Temos Óleos Naturais 100% puros! A partir de R$ 59,90.";
    if (msg.includes("preço") || msg.includes("valor"))
      return "💰 Produtos de R$ 25,00 a R$ 79,90. Consulte a loja!";
    if (msg.includes("frete") || msg.includes("entrega"))
      return "🚚 Entregamos em Belém. Frete grátis acima de R$ 100!";
    if (msg.includes("pagamento") || msg.includes("pix"))
      return "💳 Aceitamos Pix (5% OFF), Cartão, Débito e Boleto!";
    if (msg.includes("oi") || msg.includes("olá") || msg.includes("bom dia"))
      return "🌿 Olá! Bem-vindo à Amazônia em Casa! Como posso ajudar?";
    if (msg.includes("obrigado")) return "😊 Por nada! Volte sempre! 🌿";

    return "🤔 ENCAMINHAR";
  }

  document.getElementById("chatbotSend")?.addEventListener("click", send);
  document
    .getElementById("chatbotInput")
    ?.addEventListener("keypress", function (e) {
      if (e.key === "Enter") send();
    });
});
