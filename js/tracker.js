document.addEventListener("DOMContentLoaded", () => {
  // Carregar lista de produtos rastreáveis quando a seção for aberta
  const trackingSection = document.getElementById("tracking");
  if (trackingSection) {
    // Observer para carregar quando a seção ficar visível
    const observer = new MutationObserver(() => {
      if (trackingSection.style.display !== "none") {
        loadTrackingProducts();
      }
    });
    observer.observe(trackingSection, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  // Simulação de leitura do QR Code agora mostra o primeiro produto
  document.getElementById("simulateScan")?.addEventListener("click", () => {
    const products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
    const product = products.find((p) => p.active && (p.origin || p.producer));
    if (product) {
      showTrackingDetail(product);
    } else {
      alert("Nenhum produto com rastreabilidade cadastrado.");
    }
  });

  // Fechar modal ao clicar fora
  document
    .getElementById("trackingDetailModal")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        this.style.display = "none";
      }
    });
});

function loadTrackingProducts() {
  const container = document.getElementById("trackingProductsList");
  if (!container) return;

  const products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
  const activeProducts = products.filter((p) => p.active !== false);

  if (activeProducts.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;color:#999;grid-column:1/-1;">Nenhum produto cadastrado.</p>';
    return;
  }

  const emoji = { mel: "🍯", oleos: "🧴", suplementos: "💊" };

  container.innerHTML = activeProducts
    .map((p) => {
      const imageHTML = p.image
        ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:200px;object-fit:cover;border-radius:15px 15px 0 0;">`
        : `<div style="width:100%;height:200px;background:linear-gradient(135deg, #2d5a27, #4a7c3f);display:flex;align-items:center;justify-content:center;font-size:4rem;border-radius:15px 15px 0 0;">${emoji[p.category] || "🌿"}</div>`;

      return `
            <div class="product-card" onclick="showTrackingDetailById(${p.id})" style="cursor:pointer;">
                ${imageHTML}
                <div class="product-info" style="text-align:center;">
                    <h3>${p.name}</h3>
                    <p style="color:#2d5a27;font-weight:bold;">📍 Ver Origem</p>
                </div>
            </div>
        `;
    })
    .join("");
}

function showTrackingDetailById(id) {
  const products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
  const product = products.find((p) => p.id === id);
  if (product) {
    showTrackingDetail(product);
  }
}

function showTrackingDetail(product) {
  const modal = document.getElementById("trackingDetailModal");
  const content = document.getElementById("trackingDetailContent");
  const emoji = { mel: "🍯", oleos: "🧴", suplementos: "💊" };

  const imageHTML = product.image
    ? `<img src="${product.image}" alt="${product.name}" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;margin-bottom:1rem;">`
    : `<div style="width:100%;height:200px;background:linear-gradient(135deg, #2d5a27, #4a7c3f);display:flex;align-items:center;justify-content:center;font-size:5rem;border-radius:10px;margin-bottom:1rem;">${emoji[product.category] || "🌿"}</div>`;

  content.innerHTML = `
        ${imageHTML}
        <h2 style="color:#2d5a27;margin-bottom:1rem;">${product.name}</h2>
        <div style="background:#f9f9f9;border-radius:10px;padding:1.5rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-size:1.5rem;">📍</span>
                <div>
                    <strong>Origem:</strong>
                    <p style="margin:0;color:#666;">${product.origin || "Não informado"}</p>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-size:1.5rem;">👤</span>
                <div>
                    <strong>Extrativista:</strong>
                    <p style="margin:0;color:#666;">${product.producer || "Não informado"}</p>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-size:1.5rem;">📅</span>
                <div>
                    <strong>Data da Coleta:</strong>
                    <p style="margin:0;color:#666;">${product.date || "Não informado"}</p>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-size:1.5rem;">🌳</span>
                <div>
                    <strong>Área Preservada:</strong>
                    <p style="margin:0;color:#666;">${product.area || "Não informado"}</p>
                </div>
            </div>
            ${
              product.benefits
                ? `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
                <span style="font-size:1.5rem;">✨</span>
                <div>
                    <strong>Benefícios:</strong>
                    <p style="margin:0;color:#666;">${product.benefits}</p>
                </div>
            </div>
            `
                : ""
            }
        </div>
        <button onclick="document.getElementById('trackingDetailModal').style.display='none'" style="display:block;width:100%;margin-top:1rem;padding:0.8rem;background:#2d5a27;color:white;border:none;border-radius:25px;cursor:pointer;font-size:1rem;">Fechar</button>
    `;

  modal.style.display = "flex";
}

// Mantém a função original de tracking info para o botão "📍 Origem" nos cards
function showTrackingInfo(p) {
  showTrackingDetail(p);
}

// Compatibilidade com o botão de simulação antigo
function showRealTrackingInfo(p) {
  showTrackingDetail(p);
}
