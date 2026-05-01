document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("chatbotToggle");
  const win = document.getElementById("chatbotWindow");
  if (!toggle) return;
  toggle.addEventListener(
    "click",
    () => (win.style.display = win.style.display === "none" ? "flex" : "none"),
  );
  document
    .getElementById("chatbotClose")
    ?.addEventListener("click", () => (win.style.display = "none"));
  function send() {
    const input = document.getElementById("chatbotInput");
    const text = input.value.trim();
    if (!text) return;
    const msgs = document.getElementById("chatbotMessages");
    msgs.innerHTML += `<div class="message user"><p>${text}</p></div>`;
    input.value = "";
    setTimeout(() => {
      let resp = "🤔 Como posso ajudar?";
      if (text.toLowerCase().includes("mel"))
        resp = "🍯 Temos mel puro da Amazônia!";
      if (text.toLowerCase().includes("preço"))
        resp = "💰 A partir de R$ 39,90.";
      msgs.innerHTML += `<div class="message bot"><p>${resp}</p></div>`;
      msgs.scrollTop = msgs.scrollHeight;
    }, 500);
  }
  document.getElementById("chatbotSend")?.addEventListener("click", send);
  document.getElementById("chatbotInput")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") send();
  });
});
