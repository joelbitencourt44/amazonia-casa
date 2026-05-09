let products = [];
let siteConfig = {};
let cart = JSON.parse(localStorage.getItem("amazoniaCart")) || [];
let appliedCoupon = null;
let coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];

document.addEventListener("DOMContentLoaded", () => {
  loadSiteData();
  setupNavigation();
  setupCart();
  setupFilters();
  setupImpactCalculator();
  checkLoggedUser();
  setupCheckoutModal();
});

function loadSiteData() {
  const savedProducts = localStorage.getItem("amazoniaProducts");
  const savedConfig = localStorage.getItem("amazoniaData");

  if (savedProducts)
    products = JSON.parse(savedProducts).filter((p) => p.active !== false);
  if (savedConfig) {
    siteConfig = JSON.parse(savedConfig);
    updateSiteContent();
  }

  if (products.length === 0) {
    fetch("data/products.json")
      .then((r) => r.json())
      .then((data) => {
        if (!localStorage.getItem("amazoniaProducts")) {
          localStorage.setItem(
            "amazoniaProducts",
            JSON.stringify(data.products),
          );
          localStorage.setItem(
            "amazoniaData",
            JSON.stringify(data.site_config),
          );
        }
        products = data.products.filter((p) => p.active !== false);
        siteConfig = data.site_config;
        updateSiteContent();
        loadFeaturedProducts();
      });
  } else {
    loadFeaturedProducts();
  }
}

function updateSiteContent() {
  if (!siteConfig) return;
  document.querySelector(".logo h1").textContent =
    siteConfig.store_name || "Minha Loja";
  document.title = siteConfig.store_name || "Minha Loja";
  const heroTitle = document.querySelector(".hero-content h2");
  const heroText = document.querySelector(".hero-content p");
  if (heroTitle && siteConfig.hero)
    heroTitle.textContent = siteConfig.hero.title;
  if (heroText && siteConfig.hero)
    heroText.textContent = siteConfig.hero.subtitle;

  const aboutDiv = document.getElementById("aboutContent");
  if (aboutDiv && siteConfig.about) {
    aboutDiv.innerHTML = `<p>${siteConfig.about.content}</p><br><p><strong>Missão:</strong> ${siteConfig.about.mission}</p><br><p><strong>Fundador(a):</strong> ${siteConfig.about.founder} | <strong>Desde:</strong> ${siteConfig.about.founded}</p>`;
  }

  const contactInfo = document.getElementById("contactInfo");
  if (contactInfo) {
    contactInfo.innerHTML = `
      <h3>${siteConfig.store_name || "Minha Loja"}</h3>
      <p><i class="fas fa-map-marker-alt"></i> ${siteConfig.address || ""}</p>
      <p><i class="fas fa-phone"></i> ${siteConfig.phone || ""}</p>
      <p><i class="fas fa-clock"></i> ${siteConfig.business_hours || ""}</p>
      <div class="social-links">
        <a href="${siteConfig.social?.instagram || "#"}" target="_blank"><i class="fab fa-instagram"></i></a>
        <a href="https://wa.me/${siteConfig.whatsapp || ""}" target="_blank"><i class="fab fa-whatsapp"></i></a>
      </div>    `;
  }
}

function checkLoggedUser() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  const btn = document.getElementById("btnUserArea");

  if (user && btn) {
    btn.textContent = "👤 " + user.name.split(" ")[0];
    btn.href = "#";
    btn.onclick = function (e) {
      e.preventDefault();
      const menu = document.createElement("div");
      menu.style.cssText =
        "position:fixed;top:60px;right:20px;background:white;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,0.2);z-index:2000;min-width:200px;padding:1rem;";
      menu.innerHTML = `
        <p style="font-weight:bold;margin-bottom:0.5rem;">${user.name}</p>
        <p style="font-size:0.8rem;color:#999;margin-bottom:0.5rem;">${user.email}</p>
        <hr style="margin:0.5rem 0;">
        <a href="meus-pedidos.html" style="display:block;padding:0.5rem 0;color:#2d5a27;text-decoration:none;">📋 Meus Pedidos</a>
        <hr style="margin:0.5rem 0;">
        <button onclick="logout()" style="display:block;width:100%;padding:0.5rem 0;background:none;border:none;color:red;cursor:pointer;text-align:left;font-size:1rem;">🚪 Sair</button>
      `;
      document.body.appendChild(menu);
      setTimeout(() => {
        document.addEventListener("click", function closeMenu(e) {
          if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener("click", closeMenu);
          }
        });
      }, 100);
    };
    showUserCoupons();
  }
}

function logout() {
  localStorage.removeItem("amazoniaLoggedUser");
  window.location.reload();
}

function showUserCoupons() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) return;
  const userCoupons = coupons.filter(
    (c) =>
      (c.assignedTo === "all" || c.assignedTo === user.email) &&
      !c.used &&
      new Date(c.expiresAt) > new Date(),
  );
  if (userCoupons.length > 0) {
    const banner = document.getElementById("couponBanner");
    if (banner) {
      banner.style.display = "block";
      banner.innerHTML = `🎫 <strong>Você tem ${userCoupons.length} cupom(ns)!</strong> Use: ${userCoupons.map((c) => c.code).join(", ")}`;
    }
  }
}

function loadFeaturedProducts() {
  const container = document.getElementById("featuredProducts");
  if (!container) return;
  const featured = products.filter((p) => p.featured).slice(0, 3);
  if (featured.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;color:#999;">Nenhum produto cadastrado ainda.</p>';
    return;
  }
  container.innerHTML = featured.map((p) => createProductCard(p)).join("");

  container.querySelectorAll(".btn-track").forEach((btn, i) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showSection("tracking");
      showTrackingInfo(featured[i]);
    }),
  );
}
function createProductCard(p) {
  const emoji = { mel: "🍯", oleos: "🧴", suplementos: "💊" };
  const imageHTML = p.image
    ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:200px;object-fit:cover;">`
    : `<div class="product-image">${emoji[p.category] || "🌿"}</div>`;

  return `
    <div class="product-card" data-id="${p.id}">
      ${imageHTML}
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="product-description">${p.description || ""}</p>
        <p class="product-price">R$ ${(p.price || 0).toFixed(2)}</p>
        
        <div class="quantity-selector" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;">
          <button class="qty-btn qty-minus" onclick="event.stopPropagation();changeProductQty(${p.id}, -1, this)" style="width:35px;height:35px;border:2px solid #2d5a27;background:white;color:#2d5a27;border-radius:8px;cursor:pointer;font-size:1.2rem;font-weight:bold;">−</button>
          <input type="number" class="qty-input" value="1" min="1" max="${p.stock || 99}" 
                 onchange="event.stopPropagation();setProductQty(${p.id}, this.value, this)" 
                 onclick="event.stopPropagation();this.select()"
                 style="width:50px;height:35px;text-align:center;border:2px solid #2d5a27;border-radius:8px;font-size:1rem;font-weight:bold;">
          <button class="qty-btn qty-plus" onclick="event.stopPropagation();changeProductQty(${p.id}, 1, this)" style="width:35px;height:35px;border:2px solid #2d5a27;background:#2d5a27;color:white;border-radius:8px;cursor:pointer;font-size:1.2rem;font-weight:bold;">+</button>
        </div>
        
        <div class="product-actions">
          <button class="btn-add-cart" onclick="event.stopPropagation();addToCartWithQty(${p.id}, this)">🛒 Adicionar</button>
          <button class="btn-track" onclick="event.stopPropagation();showSection('tracking');showTrackingInfo(products.find(p=>p.id===${p.id}))">📍 Origem</button>
        </div>
      </div>
    </div>`;
}

function showTrackingInfo(p) {
  document.getElementById("trackingInfo").style.display = "block";
  document.getElementById("trackingProduct").textContent = p.name;
  document.getElementById("trackingOrigin").textContent = p.origin || "-";
  document.getElementById("trackingProducer").textContent = p.producer || "-";
  document.getElementById("trackingDate").textContent = p.date || "-";
  document.getElementById("trackingArea").textContent = p.area || "-";
}

function showSection(id) {
  document
    .querySelectorAll(".section")
    .forEach((s) => (s.style.display = "none"));
  const sec = document.getElementById(id);
  if (sec) {
    sec.style.display = "block";
    if (id === "products") loadAllProducts();
    const navMenu = document.getElementById("navMenu");
    if (navMenu) navMenu.classList.remove("open");
    sec.scrollIntoView({ behavior: "smooth" });
  }
}

function loadAllProducts(cat = "all") {
  const container = document.getElementById("allProducts");
  if (!container) return;
  let filtered =
    cat === "all" ? products : products.filter((p) => p.category === cat);
  const search = document.getElementById("searchProduct")?.value?.toLowerCase();
  if (search)
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  if (filtered.length === 0) {
    container.innerHTML =
      '<p style="text-align:center;color:#999;grid-column:1/-1;">Nenhum produto.</p>';
    return;
  }
  container.innerHTML = filtered.map((p) => createProductCard(p)).join("");

  container.querySelectorAll(".btn-track").forEach((btn, i) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showSection("tracking");
      showTrackingInfo(filtered[i]);
    }),
  );
}

function setupNavigation() {
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.getAttribute("href").substring(1));
      document
        .querySelectorAll(".nav-menu a")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });
  document
    .getElementById("menuToggle")
    ?.addEventListener("click", () =>
      document.getElementById("navMenu")?.classList.toggle("open"),
    );
}

function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadAllProducts(btn.dataset.category);
    });
  });
  document.getElementById("searchProduct")?.addEventListener("input", () => {
    const cat =
      document.querySelector(".filter-btn.active")?.dataset?.category || "all";
    loadAllProducts(cat);
  });
}

function setupCart() {
  document.getElementById("cartBtn")?.addEventListener("click", openCart);
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart);
  document
    .getElementById("applyCouponBtn")
    ?.addEventListener("click", () =>
      applyCoupon(document.getElementById("couponCode").value.trim()),
    );
  document
    .getElementById("checkoutSiteBtn")
    ?.addEventListener("click", openCheckoutModal);
  document
    .getElementById("checkoutWhatsappBtn")
    ?.addEventListener("click", checkoutWhatsApp);
  updateCartCount();
}

function openCart() {
  document.getElementById("cartSidebar").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  document.getElementById("cartCouponArea").style.display = "block";
  renderCart();
}

function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

// ========== FUNÇÕES DO CARRINHO ==========
function addToCartWithQty(productId, btnElement) {
  const card = btnElement.closest(".product-card");
  if (!card) return;
  const input = card.querySelector(".qty-input");
  const qty = parseInt(input?.value) || 1;
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const existing = cart.find((i) => i.id === productId);
  if (existing) {
    existing.quantity += qty;
  } else {
    const { image, ...productWithoutImage } = product;
    cart.push({ ...productWithoutImage, quantity: qty });
  }
  saveCart();
  updateCartCount();
  renderCart();
  input.value = 1;
  const cartBtn = document.getElementById("cartBtn");
  if (cartBtn) {
    cartBtn.style.transform = "scale(1.2)";
    setTimeout(() => (cartBtn.style.transform = ""), 200);
  }
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  appliedCoupon = null;
  saveCart();
  updateCartCount();
  renderCart();
}

function changeCartQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  const product = products.find((p) => p.id === productId);
  const maxStock = product?.stock || 99;
  item.quantity += delta;
  if (item.quantity < 1) {
    if (confirm("Remover este produto do carrinho?")) {
      cart = cart.filter((i) => i.id !== productId);
    } else {
      item.quantity = 1;
    }
  }
  if (item.quantity > maxStock) {
    item.quantity = maxStock;
    alert("⚠️ Estoque disponível: " + maxStock + " unidades");
  }
  saveCart();
  updateCartCount();
  renderCart();
}

function setCartQty(productId, value) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  const product = products.find((p) => p.id === productId);
  const maxStock = product?.stock || 99;
  let qty = parseInt(value) || 1;
  if (qty < 1) qty = 1;
  if (qty > maxStock) {
    qty = maxStock;
    alert("⚠️ Estoque disponível: " + maxStock + " unidades");
  }
  item.quantity = qty;
  saveCart();
  updateCartCount();
  renderCart();
}

function changeProductQty(productId, delta, btnElement) {
  const card = btnElement.closest(".product-card");
  if (!card) return;
  const input = card.querySelector(".qty-input");
  if (!input) return;
  let currentQty = parseInt(input.value) || 1;
  const maxQty = parseInt(input.max) || 99;
  currentQty += delta;
  if (currentQty < 1) currentQty = 1;
  if (currentQty > maxQty) {
    currentQty = maxQty;
    alert("⚠️ Estoque máximo: " + maxQty + " unidades");
  }
  input.value = currentQty;
}

function setProductQty(productId, value, inputElement) {
  let qty = parseInt(value) || 1;
  const maxQty = parseInt(inputElement.max) || 99;
  if (qty < 1) qty = 1;
  if (qty > maxQty) {
    qty = maxQty;
    alert("⚠️ Estoque máximo: " + maxQty + " unidades");
  }
  inputElement.value = qty;
}

function saveCart() {
  localStorage.setItem("amazoniaCart", JSON.stringify(cart));
}

function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) {
    const total = cart.reduce((s, i) => s + (i.quantity || 0), 0);
    el.textContent = total;
  }
}

function renderCart() {
  const items = document.getElementById("cartItems");
  const footer = document.getElementById("cartFooter");
  if (!items) return;
  if (cart.length === 0) {
    items.innerHTML = '<p class="empty-cart">Carrinho vazio 🌿</p>';
    if (footer) footer.style.display = "none";
    const couponArea = document.getElementById("cartCouponArea");
    if (couponArea) couponArea.style.display = "none";
    return;
  }
  if (footer) footer.style.display = "block";
  const emojiMap = { mel: "🍯", oleos: "🧴", suplementos: "💊" };
  items.innerHTML = cart
    .map((i) => {
      const product = products.find((p) => p.id === i.id);
      const maxStock = product?.stock || 99;
      return `
      <div class="cart-item" style="display:flex;gap:1rem;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid #eee;align-items:center;">
        <span style="font-size:2rem;">${emojiMap[i.category] || "🌿"}</span>
        <div style="flex:1;">
          <strong>${i.name}</strong>
          <p style="color:#666;">R$ ${i.price.toFixed(2)} cada</p>
          <div style="display:flex;align-items:center;gap:0.3rem;margin-top:0.5rem;">
            <button onclick="changeCartQty(${i.id}, -1)" style="width:30px;height:30px;border:2px solid #2d5a27;background:white;color:#2d5a27;border-radius:5px;cursor:pointer;font-weight:bold;font-size:1rem;">−</button>
            <input type="number" value="${i.quantity}" min="1" max="${maxStock}"
                   onchange="setCartQty(${i.id}, this.value)"
                   style="width:50px;height:30px;text-align:center;border:2px solid #2d5a27;border-radius:5px;font-weight:bold;font-size:0.9rem;">
            <button onclick="changeCartQty(${i.id}, 1)" style="width:30px;height:30px;border:2px solid #2d5a27;background:#2d5a27;color:white;border-radius:5px;cursor:pointer;font-weight:bold;font-size:1rem;">+</button>
          </div>
          <p style="font-weight:bold;color:#2d5a27;margin-top:0.3rem;">Subtotal: R$ ${(i.price * i.quantity).toFixed(2)}</p>
        </div>
        <button onclick="removeFromCart(${i.id})" style="background:none;border:none;color:red;cursor:pointer;font-size:1.5rem;">🗑️</button>
      </div>
    `;
    })
    .join("");
  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  document.getElementById("cartSubtotal").textContent =
    "R$ " + subtotal.toFixed(2);
  if (discount > 0) {
    document.getElementById("cartDiscountRow").style.display = "flex";
    document.getElementById("cartDiscount").textContent =
      "-R$ " + discount.toFixed(2);
  } else {
    document.getElementById("cartDiscountRow").style.display = "none";
  }
  document.getElementById("cartTotal").textContent =
    "R$ " + (subtotal - discount).toFixed(2);
}

function applyCoupon(code) {
  if (!code) return;
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  const coupon = coupons.find(
    (c) =>
      c.code.toUpperCase() === code.toUpperCase() &&
      (c.assignedTo === "all" || c.assignedTo === user?.email) &&
      new Date(c.expiresAt) > new Date() &&
      (!c.usedBy || !c.usedBy.includes(user?.email)),
  );
  const msg = document.getElementById("couponMessage");
  if (!coupon) {
    if (msg) {
      msg.textContent = "Cupom inválido, já utilizado ou expirado.";
      msg.style.color = "red";
    }
    return;
  }
  appliedCoupon = coupon;
  if (msg) {
    msg.textContent = `✅ ${coupon.discount}% OFF aplicado!`;
    msg.style.color = "#2d5a27";
  }
  updateCartTotals();
}

function setupCheckoutModal() {
  document
    .getElementById("closeCheckoutModal")
    ?.addEventListener(
      "click",
      () => (document.getElementById("checkoutModal").style.display = "none"),
    );
  document
    .getElementById("confirmOrderBtn")
    ?.addEventListener("click", confirmOrder);
}

function setupImpactCalculator() {
  const slider = document.getElementById("impactValue");
  if (!slider) return;
  slider.addEventListener("input", () => {
    const v = parseInt(slider.value);
    document.getElementById("impactDisplay").textContent = "R$ " + v + ",00";
    document.getElementById("treesPreserved").textContent = Math.round(v / 50);
    document.getElementById("familiesHelped").textContent = Math.round(v / 75);
    document.getElementById("beesSaved").textContent = (
      v * 10
    ).toLocaleString();
  });
  slider.dispatchEvent(new Event("input"));
}
// ============ CÁLCULO DE FRETE ============
function updateShippingCost() {
  const shipping = document.querySelector(
    'input[name="shipping"]:checked',
  )?.value;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const freeShippingFrom = siteConfig?.free_shipping_from || 100;
  let shippingCost = 0;
  let shippingName = "";

  if (shipping === "same_day") {
    shippingCost = subtotal >= freeShippingFrom ? 0 : 12.9;
    shippingName = "Entrega Rápida";
  } else if (shipping === "next_day") {
    shippingCost = subtotal >= freeShippingFrom ? 0 : 8.9;
    shippingName = "Entrega Normal";
  } else if (shipping === "pickup") {
    shippingCost = 0;
    shippingName = "Retirar na Loja";
  }

  updateCheckoutSummary(shippingCost, shippingName);
}

function updateCheckoutSummary(shippingCost = 0, shippingName = "") {
  const summary = document.getElementById("checkoutSummary");
  if (!summary) return;

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const payment = document.querySelector(
    'input[name="payment"]:checked',
  )?.value;
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  if (payment === "pix") discount += subtotal * 0.05;
  const total = subtotal - discount + shippingCost;

  summary.innerHTML = `
    <h4>Resumo do Pedido</h4>
    ${cart
      .map(
        (i) => `
      <div class="summary-item" style="display:flex;justify-content:space-between;padding:0.3rem 0;font-size:0.9rem;">
        <span>${i.name} (${i.quantity}x)</span>
        <span>R$ ${(i.price * i.quantity).toFixed(2)}</span>
      </div>
    `,
      )
      .join("")}
    <hr style="margin:0.5rem 0;">
    <div class="summary-item" style="display:flex;justify-content:space-between;font-size:0.9rem;">
      <span>Subtotal</span><span>R$ ${subtotal.toFixed(2)}</span>
    </div>
    ${
      discount > 0
        ? `
    <div class="summary-item" style="display:flex;justify-content:space-between;color:#2d5a27;font-size:0.9rem;">
      <span>Desconto</span><span>-R$ ${discount.toFixed(2)}</span>
    </div>`
        : ""
    }
    <div class="summary-item" style="display:flex;justify-content:space-between;font-size:0.9rem;">
      <span>${shippingName || "Frete"}</span>
      <span>${shippingCost === 0 ? '<span style="color:#2d5a27;">Grátis</span>' : "R$ " + shippingCost.toFixed(2)}</span>
    </div>
    <hr style="margin:0.5rem 0;">
    <div class="summary-item" style="display:flex;justify-content:space-between;font-weight:bold;font-size:1.2rem;">
      <span>Total</span><span>R$ ${total.toFixed(2)}</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll('input[name="shipping"]')
    .forEach((radio) => radio.addEventListener("change", updateShippingCost));
  document
    .querySelectorAll('input[name="payment"]')
    .forEach((radio) => radio.addEventListener("change", updateShippingCost));
});

// ============ TABS DE PAGAMENTO ============
function showPaymentTab(tab) {
  document
    .querySelectorAll(".payment-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".payment-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelector(`.payment-tab[onclick*="${tab}"]`)
    ?.classList.add("active");
  document.getElementById(`paymentPanel_${tab}`)?.classList.add("active");
}

async function updateCheckoutTotal() {
  const shipping = document.querySelector(
    'input[name="shipping"]:checked',
  )?.value;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const freeFrom = siteConfig?.free_shipping_from || 100;

  document.getElementById("expressCost").textContent = "Calculando...";
  document.getElementById("normalCost").textContent = "Calculando...";
  document.getElementById("shippingMessage").textContent =
    "⏳ Consultando valor no app de entrega...";
  document.getElementById("shippingMessage").style.color = "#e65100";

  let shippingCost = 0;
  let shippingName = "";
  let estimatedTime = "";

  if (shipping === "pickup") {
    shippingCost = 0;
    shippingName = "🏪 Retirar na Loja";
    document.getElementById("shippingMessage").textContent =
      "✅ Retirada gratuita na loja";
    document.getElementById("shippingMessage").style.color = "#2d5a27";
  } else {
    const destination = {
      address: document.getElementById("checkoutAddress")?.value || "",
      city: document.getElementById("checkoutCity")?.value || "Belém",
    };
    const deliveryType = shipping === "same_day" ? "express" : "normal";

    try {
      const result = await calculateShipping(
        "Av. Rômulo Maiorana, 1234 - Marco, Belém - PA",
        destination,
        deliveryType,
      );
      shippingCost = result.price;
      estimatedTime = result.estimatedTime;

      if (shipping === "same_day") {
        document.getElementById("expressCost").textContent =
          `R$ ${shippingCost.toFixed(2)}`;
        shippingName = `🛵 Entrega Rápida (${estimatedTime})`;
      } else {
        document.getElementById("normalCost").textContent =
          `R$ ${shippingCost.toFixed(2)}`;
        shippingName = `📦 Entrega Normal (${estimatedTime})`;
      }

      document.getElementById("shippingMessage").textContent =
        `✅ Frete calculado: R$ ${shippingCost.toFixed(2)} | ⏱️ ${estimatedTime}`;
      document.getElementById("shippingMessage").style.color = "#2d5a27";
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      if (shipping === "same_day") {
        shippingCost = 12.9;
        document.getElementById("expressCost").textContent = "R$ 12,90";
        shippingName = "🛵 Entrega Rápida";
      } else {
        shippingCost = 8.9;
        document.getElementById("normalCost").textContent = "R$ 8,90";
        shippingName = "📦 Entrega Normal";
      }
      document.getElementById("shippingMessage").textContent =
        "⚠️ Não foi possível consultar o app. Valor estimado.";
      document.getElementById("shippingMessage").style.color = "#e65100";
    }
  }

  if (subtotal >= freeFrom && shipping !== "pickup") {
    shippingCost = 0;
    document.getElementById("shippingMessage").textContent =
      "🎉 Frete grátis! (Compra acima de R$ " + freeFrom.toFixed(2) + ")";
    document.getElementById("shippingMessage").style.color = "#2d5a27";
    document.getElementById("expressCost").textContent = "Grátis 🎉";
    document.getElementById("normalCost").textContent = "Grátis 🎉";
  }

  updateCheckoutSummary(shippingCost, shippingName);
}

function openCheckoutModal() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) {
    alert("Faça login!");
    window.location.href = "cadastro.html";
    return;
  }
  if (cart.length === 0) {
    alert("Carrinho vazio!");
    return;
  }

  document.getElementById("checkoutAddress").value = user.address || "";
  document.getElementById("checkoutCity").value = user.city || "Belém";
  document.getElementById("checkoutCep").value = user.cep || "";
  document.getElementById("checkoutModal").style.display = "flex";
  closeCart();
  updateCheckoutTotal();
}
// ============ FINALIZAÇÃO E PAGAMENTOS ============
function updateCombinedTotal() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const pixAmount =
    parseFloat(document.getElementById("combinedPixAmount")?.value) || 0;
  document.getElementById("combinedCardAmount").value = Math.max(
    0,
    total - pixAmount,
  ).toFixed(2);
}

function updateTwoCardsTotal() {
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const card1Amount =
    parseFloat(document.getElementById("card1Amount")?.value) || 0;
  document.getElementById("card2Amount").value = Math.max(
    0,
    total - card1Amount,
  ).toFixed(2);
}

async function confirmOrder() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) {
    alert("Faça login!");
    window.location.href = "cadastro.html";
    return;
  }
  if (cart.length === 0) {
    alert("Carrinho vazio!");
    return;
  }

  const address = document.getElementById("checkoutAddress").value;
  if (!address) {
    alert("Preencha o endereço!");
    return;
  }

  const activeTab =
    document
      .querySelector(".payment-tab.active")
      ?.getAttribute("onclick")
      ?.match(/'(\w+)'/)?.[1] || "pix";
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  if (activeTab === "pix") discount += subtotal * 0.05;

  const shipping =
    document.querySelector('input[name="shipping"]:checked')?.value ||
    "same_day";
  const freeFrom = siteConfig?.free_shipping_from || 100;
  let shippingCost = 0;
  if (shipping === "same_day") shippingCost = subtotal >= freeFrom ? 0 : 12.9;
  else if (shipping === "next_day")
    shippingCost = subtotal >= freeFrom ? 0 : 8.9;

  const total = subtotal - discount + shippingCost;

  const orderData = {
    id: Date.now(),
    customer: user,
    items: cart.map((item) => {
      const { image, ...rest } = item;
      return rest;
    }),
    subtotal,
    discount,
    shippingCost,
    total,
    date: new Date().toISOString(),
    status: "pending",
    paymentMethod: activeTab,
    shipping: {
      method: shipping,
      address,
      city: document.getElementById("checkoutCity").value,
    },
  };

  let paymentResult;

  if (activeTab === "pix") {
    paymentResult = await PaymentSystem.generatePixPayment(orderData);
    orderData.paymentId = paymentResult.paymentId;
    orderData.pixData = paymentResult;
    showPixModal(paymentResult, orderData);
    return;
  } else if (activeTab === "credit" || activeTab === "debit") {
    const cardNumber = document.querySelector(
      `#paymentPanel_${activeTab} input[placeholder="0000 0000 0000 0000"]`,
    )?.value;
    const installments =
      activeTab === "credit"
        ? parseInt(document.getElementById("creditInstallments")?.value || 1)
        : 1;
    paymentResult = await PaymentSystem.generateCardPayment(orderData, {
      number: cardNumber,
      installments,
      expiry: "",
      cvv: "",
      holderName: "",
      holderDocument: "",
    });
    orderData.paymentId = paymentResult.paymentId;
    orderData.status = "confirmed";
  } else if (activeTab === "boleto") {
    paymentResult = await PaymentSystem.generateBoletoPayment(orderData);
    orderData.paymentId = paymentResult.paymentId;
    orderData.boletoData = paymentResult;
  } else if (activeTab === "combined") {
    const pixAmount =
      parseFloat(document.getElementById("combinedPixAmount")?.value) || 0;
    const cardAmount = total - pixAmount;
    paymentResult = await PaymentSystem.generateCombinedPayment(
      orderData,
      pixAmount,
      cardAmount,
      {},
    );
    orderData.paymentId =
      paymentResult.pix.paymentId + "|" + paymentResult.card.paymentId;
    orderData.status = "confirmed";
  } else if (activeTab === "twocards") {
    const card1Amount =
      parseFloat(document.getElementById("card1Amount")?.value) || 0;
    const card2Amount = total - card1Amount;
    paymentResult = await PaymentSystem.generateTwoCardsPayment(
      orderData,
      {},
      card1Amount,
      {},
      card2Amount,
    );
    orderData.paymentId =
      paymentResult.card1.paymentId + "|" + paymentResult.card2.paymentId;
    orderData.status = "confirmed";
  }

  if (appliedCoupon) {
    const coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];
    const idx = coupons.findIndex((c) => c.code === appliedCoupon.code);
    if (idx >= 0) {
      if (!coupons[idx].usedBy) coupons[idx].usedBy = [];
      coupons[idx].usedBy.push(user.email);
      localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
    }
  }

  const orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
  orders.push(orderData);
  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

  PaymentSystem.generateReceipt(
    { method: activeTab, paymentId: orderData.paymentId, amount: total },
    orderData,
  );

  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartCount();
  document.getElementById("checkoutModal").style.display = "none";

  if (activeTab === "boleto") {
    alert(
      `✅ Pedido #${orderData.id} realizado!\n\n🔗 Boleto gerado\nVencimento: ${new Date(paymentResult.expiresAt).toLocaleDateString("pt-BR")}\nTotal: R$ ${total.toFixed(2)}`,
    );
  } else {
    alert(
      `✅ Pedido #${orderData.id} confirmado!\n\nTotal: R$ ${total.toFixed(2)}\nPagamento: ${getPaymentName(activeTab)}\n\nObrigado! 🌳`,
    );
  }
}

function showPixModal(pixData, orderData) {
  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:5000;display:flex;align-items:center;justify-content:center;";
  modal.innerHTML = `
    <div style="background:white;border-radius:15px;padding:2rem;max-width:450px;width:95%;text-align:center;">
      <h2>📱 Pagamento via Pix</h2>
      <p style="color:#2d5a27;font-weight:bold;">R$ ${pixData.amount.toFixed(2)}</p>
      <div style="background:#f5f5f5;padding:1.5rem;border-radius:10px;margin:1rem 0;">
        <div style="width:200px;height:200px;background:white;margin:0 auto;border:3px solid #2d5a27;display:flex;align-items:center;justify-content:center;font-size:5rem;">📱</div>
        <p style="margin-top:0.5rem;font-size:0.85rem;color:#666;">Escaneie o QR Code com seu app de banco</p>
      </div>
      <p style="font-size:0.85rem;color:#999;">Expira em: ${new Date(pixData.expiresAt).toLocaleTimeString("pt-BR")}</p>
      <button id="btnPixPaid" style="background:#2d5a27;color:white;border:none;padding:0.8rem 2rem;border-radius:25px;margin-top:1rem;cursor:pointer;font-size:1rem;">Já paguei ✅</button>
      <br>
      <button id="btnPixCancel" style="background:none;border:none;color:red;margin-top:0.5rem;cursor:pointer;">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("btnPixPaid").addEventListener("click", () => {
    orderData.status = "confirmed";
    orderData.paymentId = pixData.paymentId;
    const orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
    orders.push(orderData);
    localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

    cart = [];
    appliedCoupon = null;
    saveCart();
    updateCartCount();
    renderCart();
    modal.remove();
    document.getElementById("checkoutModal").style.display = "none";
    alert(
      "✅ Pagamento confirmado! Pedido #" +
        orderData.id +
        " realizado com sucesso.",
    );
  });

  document.getElementById("btnPixCancel").addEventListener("click", () => {
    modal.remove();
    document.getElementById("checkoutModal").style.display = "none";
  });
}

function getPaymentName(method) {
  const names = {
    pix: "Pix (5% OFF)",
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    boleto: "Boleto",
    combined: "Pix + Cartão",
    twocards: "2 Cartões",
  };
  return names[method] || method;
}

function checkoutWhatsApp() {
  if (cart.length === 0) {
    alert("Carrinho vazio!");
    return;
  }
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  let msg = "🌿 *PEDIDO*\n\n";
  cart.forEach(
    (i, idx) =>
      (msg += `${idx + 1}. ${i.name} (${i.quantity}x) - R$ ${(i.price * i.quantity).toFixed(2)}\n`),
  );
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  msg += `\n💰 Total: R$ ${(subtotal - discount).toFixed(2)}`;
  if (appliedCoupon) msg += `\n🎫 Cupom: ${appliedCoupon.code}`;
  if (user) msg += `\n👤 ${user.name}\n📍 ${user.address || "A informar"}`;
  const number = siteConfig?.whatsapp || "5591000000000";
  closeCart();
  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(msg)}`,
    "_blank",
  );
}

function attachProductEvents(container, productList) {
  container.querySelectorAll(".btn-track").forEach((btn, i) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showSection("tracking");
      if (productList[i]) showTrackingInfo(productList[i]);
    });
  });
}
