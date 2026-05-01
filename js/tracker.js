document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("simulateScan")?.addEventListener("click", () => {
    document.getElementById("trackingInfo").style.display = "block";
    document.getElementById("trackingProduct").textContent =
      "Mel de Abelhas Nativas";
    document.getElementById("trackingOrigin").textContent =
      "Ilha do Marajó - PA";
    document.getElementById("trackingProducer").textContent = "João Ribeiro";
    document.getElementById("trackingDate").textContent = "Março 2026";
    document.getElementById("trackingArea").textContent = "12 hectares";
  });
});
