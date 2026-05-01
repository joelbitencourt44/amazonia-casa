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
            </div>
        `;
  }
}

function checkLoggedUser() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  const btn = document.getElementById("btnUserArea");
  if (user && btn) {
    btn.textContent = "👤 " + user.name.split(" ")[0];
    showUserCoupons();
  }
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
  container.querySelectorAll(".btn-add-cart").forEach((btn, i) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(featured[i]);
    }),
  );
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
        <div class="product-card">
            ${imageHTML}
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="product-description">${p.description || ""}</p>
                <p class="product-price">R$ ${(p.price || 0).toFixed(2)}</p>
                <div class="product-actions">
                    <button class="btn-add-cart">🛒</button>
                    <button class="btn-track">📍</button>
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
  container.querySelectorAll(".btn-add-cart").forEach((btn, i) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(filtered[i]);
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

function addToCart(p) {
  const existing = cart.find((i) => i.id === p.id);
  if (existing) existing.quantity++;
  else cart.push({ ...p, quantity: 1 });
  saveCart();
  updateCartCount();
  alert("✅ " + p.name + " adicionado!");
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  appliedCoupon = null;
  saveCart();
  updateCartCount();
  renderCart();
}

function saveCart() {
  localStorage.setItem("amazoniaCart", JSON.stringify(cart));
}
function updateCartCount() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cart.reduce((s, i) => s + i.quantity, 0);
}

function renderCart() {
  const items = document.getElementById("cartItems");
  const footer = document.getElementById("cartFooter");
  if (!items) return;
  if (cart.length === 0) {
    items.innerHTML = '<p class="empty-cart">Carrinho vazio 🌿</p>';
    if (footer) footer.style.display = "none";
    return;
  }
  if (footer) footer.style.display = "block";
  items.innerHTML = cart
    .map(
      (i) => `
        <div class="cart-item">
            <span style="font-size:2rem;">${{ mel: "🍯", oleos: "🧴", suplementos: "💊" }[i.category] || "🌿"}</span>
            <div style="flex:1;"><strong>${i.name}</strong><p>R$ ${i.price.toFixed(2)} x ${i.quantity}</p></div>
            <button onclick="removeFromCart(${i.id})" style="background:none;border:none;color:red;cursor:pointer;font-size:1.2rem;">🗑️</button>
        </div>
    `,
    )
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
      !c.used &&
      (c.assignedTo === "all" || c.assignedTo === user?.email) &&
      new Date(c.expiresAt) > new Date(),
  );
  const msg = document.getElementById("couponMessage");
  if (!coupon) {
    if (msg) {
      msg.textContent = "Cupom inválido ou expirado.";
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
  const summary = document.getElementById("checkoutSummary");
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  summary.innerHTML =
    cart
      .map(
        (i) =>
          `<p>${i.name} (${i.quantity}x) - R$ ${(i.price * i.quantity).toFixed(2)}</p>`,
      )
      .join("") +
    `<hr><strong>Total: R$ ${(subtotal - discount).toFixed(2)}</strong>`;
  document.getElementById("checkoutModal").style.display = "flex";
  closeCart();
}

function confirmOrder() {
  const user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  const payment = document.querySelector(
    'input[name="payment"]:checked',
  )?.value;
  const address = document.getElementById("checkoutAddress").value;
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = appliedCoupon ? subtotal * (appliedCoupon.discount / 100) : 0;
  if (payment === "pix") discount += subtotal * 0.05;
  const order = {
    id: Date.now(),
    customer: user,
    items: [...cart],
    subtotal,
    discount,
    total: subtotal - discount,
    date: new Date().toISOString(),
    status: "pending",
    payment: { method: payment },
    shipping: { address },
    couponUsed: appliedCoupon?.code || null,
  };
  if (appliedCoupon) {
    const idx = coupons.findIndex((c) => c.code === appliedCoupon.code);
    if (idx >= 0) {
      coupons[idx].used = true;
      localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
    }
  }
  const orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
  orders.push(order);
  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartCount();
  document.getElementById("checkoutModal").style.display = "none";
  alert(
    "✅ Pedido #" +
      order.id +
      " confirmado! Total: R$ " +
      order.total.toFixed(2),
  );
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
