var products = [];
var siteConfig = {};
var cart = JSON.parse(localStorage.getItem("amazoniaCart")) || [];
var appliedCoupon = null;
var coupons = [];

// ============ INICIALIZAÇÃO ============
document.addEventListener("DOMContentLoaded", async function () {
  setupNavigation();
  await loadSiteData(); // ← Carrega os cupons PRIMEIRO
  setupCart();
  setupFilters();
  setupImpactCalculator();
  checkLoggedUser(); // ← Depois verifica o usuário e mostra cupons
  setupCheckoutModal();
  setupCartButtons();
});

// ============ NAVEGAÇÃO ============
function setupNavigation() {
  document.querySelectorAll(".nav-menu a").forEach(function (link) {
    link.onclick = function (e) {
      e.preventDefault();
      var id = this.getAttribute("href").substring(1);
      document.querySelectorAll(".section").forEach(function (s) {
        s.style.display = "none";
      });
      var section = document.getElementById(id);
      if (section) {
        section.style.display = "block";
        if (id === "products") {
          try {
            loadAllProducts();
          } catch (e) {}
        }
      }
      document.querySelectorAll(".nav-menu a").forEach(function (l) {
        l.classList.remove("active");
      });
      this.classList.add("active");
      document.getElementById("navMenu")?.classList.remove("open");
      return false;
    };
  });

  document.querySelectorAll(".footer a[href^='#']").forEach(function (link) {
    link.onclick = function (e) {
      e.preventDefault();
      var id = this.getAttribute("href").substring(1);
      document.querySelectorAll(".section").forEach(function (s) {
        s.style.display = "none";
      });
      var section = document.getElementById(id);
      if (section) {
        section.style.display = "block";
        if (id === "products") {
          try {
            loadAllProducts();
          } catch (e) {}
        }
      }
      return false;
    };
  });

  document.getElementById("menuToggle")?.addEventListener("click", function () {
    document.getElementById("navMenu")?.classList.toggle("open");
  });

  document
    .querySelector('.hero-cta a[href="#products"]')
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll(".section").forEach(function (s) {
        s.style.display = "none";
      });
      var section = document.getElementById("products");
      if (section) {
        section.style.display = "block";
        loadAllProducts();
      }
    });

  document
    .querySelector('.hero-cta a[href="#impact"]')
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll(".section").forEach(function (s) {
        s.style.display = "none";
      });
      var section = document.getElementById("impact");
      if (section) {
        section.style.display = "block";
      }
    });
}

// ============ DADOS ============
async function loadSiteData() {
  try {
    var snap = await db
      .collection("products")
      .where("active", "==", true)
      .get();
    products = [];
    snap.forEach(function (doc) {
      products.push({ id: doc.id, ...doc.data() });
    });

    var configDoc = await db.collection("siteConfig").doc("config").get();
    if (configDoc.exists) {
      siteConfig = configDoc.data();
      updateSiteContent();
    }

    var coupSnap = await db.collection("coupons").get();
    coupons = [];
    coupSnap.forEach(function (doc) {
      coupons.push({ id: doc.id, ...doc.data() });
    });

    loadFeaturedProducts();
  } catch (e) {
    var savedProducts = localStorage.getItem("amazoniaProducts");
    var savedConfig = localStorage.getItem("amazoniaData");
    if (savedProducts)
      products = JSON.parse(savedProducts).filter(function (p) {
        return p.active !== false;
      });
    if (savedConfig) {
      siteConfig = JSON.parse(savedConfig);
      updateSiteContent();
    }
    coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];
    if (products.length === 0) {
      fetch("data/products.json")
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          products = data.products.filter(function (p) {
            return p.active !== false;
          });
          siteConfig = data.site_config;
          updateSiteContent();
          loadFeaturedProducts();
        });
    } else {
      loadFeaturedProducts();
    }
  }
}

function updateSiteContent() {
  if (!siteConfig) return;
  document.querySelector(".logo h1").textContent =
    siteConfig.store_name || "Amazônia em Casa";
  document.title = siteConfig.store_name || "Amazônia em Casa";
  var ht = document.querySelector(".hero-content h2");
  var hp = document.querySelector(".hero-content p");
  if (ht && siteConfig.hero) ht.textContent = siteConfig.hero.title;
  if (hp && siteConfig.hero) hp.textContent = siteConfig.hero.subtitle;
  var aboutDiv = document.getElementById("aboutContent");
  if (aboutDiv && siteConfig.about)
    aboutDiv.innerHTML =
      "<p>" +
      siteConfig.about.content +
      "</p><br><p><strong>Missão:</strong> " +
      siteConfig.about.mission +
      "</p><br><p><strong>Fundador(a):</strong> " +
      siteConfig.about.founder +
      " | <strong>Desde:</strong> " +
      siteConfig.about.founded +
      "</p>";
  var ci = document.getElementById("contactInfo");
  if (ci)
    ci.innerHTML =
      "<h3>" +
      (siteConfig.store_name || "Amazônia em Casa") +
      '</h3><p><i class="fas fa-map-marker-alt"></i> ' +
      (siteConfig.address || "") +
      '</p><p><i class="fas fa-phone"></i> ' +
      (siteConfig.phone || "") +
      '</p><p><i class="fas fa-clock"></i> ' +
      (siteConfig.business_hours || "") +
      '</p><div class="social-links"><a href="' +
      (siteConfig.social?.instagram || "#") +
      '" target="_blank"><i class="fab fa-instagram"></i></a><a href="' +
      (siteConfig.social?.facebook || "#") +
      '" target="_blank"><i class="fab fa-facebook-f"></i></a><a href="https://wa.me/' +
      (siteConfig.whatsapp || "") +
      '" target="_blank"><i class="fab fa-whatsapp"></i></a></div>';
}

function checkLoggedUser() {
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  var btn = document.getElementById("btnUserArea");
  if (user && btn) {
    btn.textContent = "👤 " + user.name.split(" ")[0];
    btn.href = "#";
    btn.onclick = function (e) {
      e.preventDefault();
      var menu = document.createElement("div");
      menu.style.cssText =
        "position:fixed;top:60px;right:20px;background:white;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,0.2);z-index:2000;min-width:200px;padding:1rem;";
      menu.innerHTML =
        '<p style="font-weight:bold;">' +
        user.name +
        '</p><p style="font-size:0.8rem;color:#999;">' +
        user.email +
        '</p><hr><a href="meu-perfil.html" style="display:block;padding:0.5rem 0;color:#2d5a27;text-decoration:none;">👤 Meu Perfil</a><a href="meus-pedidos.html" style="display:block;padding:0.5rem 0;color:#2d5a27;text-decoration:none;">📋 Meus Pedidos</a><a href="minhas-recompensas.html" style="display:block;padding:0.5rem 0;color:#2d5a27;text-decoration:none;">🏆 Minhas Recompensas</a><hr><button onclick="logout()" style="display:block;width:100%;padding:0.5rem 0;background:none;border:none;color:red;cursor:pointer;text-align:left;font-size:1rem;">🚪 Sair</button>';
      document.body.appendChild(menu);
      setTimeout(function () {
        document.addEventListener("click", function close(e) {
          if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener("click", close);
          }
        });
      }, 100);
    };
    showUserCoupons();
  }
}
function logout() {
  localStorage.removeItem("amazoniaLoggedUser");
  location.reload();
}
function showUserCoupons() {
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) return;
  var uc = coupons.filter(function (c) {
    return (
      (c.assignedTo === "all" || c.assignedTo === user.email) &&
      !c.used &&
      new Date(c.expiresAt) > new Date()
    );
  });
  if (uc.length > 0) {
    var b = document.getElementById("couponBanner");
    if (b) {
      b.style.display = "block";
      b.innerHTML =
        "🎫 <strong>Você tem " +
        uc.length +
        " cupom(ns)!</strong> Use: " +
        uc
          .map(function (c) {
            return c.code;
          })
          .join(", ");
    }
  }
}

function loadFeaturedProducts() {
  var c = document.getElementById("featuredProducts");
  if (!c) return;
  var f = products
    .filter(function (p) {
      return p.featured;
    })
    .slice(0, 3);
  if (f.length === 0) {
    c.innerHTML =
      '<p style="text-align:center;color:#999;">Nenhum produto cadastrado ainda.</p>';
    return;
  }
  c.innerHTML = f
    .map(function (p) {
      return createProductCard(p);
    })
    .join("");
  setTimeout(fixProductButtons, 500);
}

function createProductCard(p) {
  var em = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
  var img = p.image
    ? '<img src="' +
      p.image +
      '" alt="' +
      p.name +
      '" style="width:100%;height:200px;object-fit:cover;">'
    : '<div class="product-image">' + (em[p.category] || "🌿") + "</div>";
  return (
    '<div class="product-card" data-id="' +
    p.id +
    '">' +
    img +
    '<div class="product-info"><h3>' +
    p.name +
    '</h3><p class="product-description">' +
    (p.description || "") +
    '</p><p class="product-price">R$ ' +
    (p.price || 0).toFixed(2) +
    '</p><div class="quantity-selector" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem;"><button class="qty-minus" onclick="event.stopPropagation();changeQty(this,-1)" style="width:35px;height:35px;border:2px solid #2d5a27;background:white;color:#2d5a27;border-radius:8px;cursor:pointer;font-weight:bold;">−</button><input type="number" class="qty-input" value="1" min="1" max="' +
    (p.stock || 99) +
    '" onclick="event.stopPropagation();this.select()" style="width:50px;height:35px;text-align:center;border:2px solid #2d5a27;border-radius:8px;font-weight:bold;"><button class="qty-plus" onclick="event.stopPropagation();changeQty(this,1)" style="width:35px;height:35px;border:2px solid #2d5a27;background:#2d5a27;color:white;border-radius:8px;cursor:pointer;font-weight:bold;">+</button></div><div class="product-actions"><button class="btn-add-cart" onclick="event.stopPropagation();addToCartFromCard(this)">🛒 Adicionar</button><button class="btn-track" onclick="event.stopPropagation();showSection(\'tracking\');showTrackingInfo(products.find(function(p){return p.id==' +
    p.id +
    ';}))">📍 Origem</button></div></div></div>'
  );
}

function showTrackingInfo(p) {
  var m = document.getElementById("trackingDetailModal"),
    c = document.getElementById("trackingDetailContent");
  if (!m || !c || !p) return;
  var em = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
  c.innerHTML =
    (p.image
      ? '<img src="' +
        p.image +
        '" style="width:100%;max-height:300px;object-fit:cover;border-radius:10px;margin-bottom:1rem;">'
      : '<div style="width:100%;height:200px;background:linear-gradient(135deg,#2d5a27,#4a7c3f);display:flex;align-items:center;justify-content:center;font-size:5rem;border-radius:10px;margin-bottom:1rem;">' +
        (em[p.category] || "🌿") +
        "</div>") +
    '<h2 style="color:#2d5a27;">' +
    p.name +
    '</h2><div style="background:#f9f9f9;border-radius:10px;padding:1.5rem;"><p><strong>📍 Origem:</strong> ' +
    (p.origin || "Não informado") +
    "</p><p><strong>👤 Extrativista:</strong> " +
    (p.producer || "Não informado") +
    "</p><p><strong>📅 Data:</strong> " +
    (p.date || "Não informado") +
    "</p><p><strong>🌳 Área:</strong> " +
    (p.area || "Não informado") +
    "</p></div><button onclick=\"document.getElementById('trackingDetailModal').style.display='none'\" style=\"display:block;width:100%;margin-top:1rem;padding:0.8rem;background:#2d5a27;color:white;border:none;border-radius:25px;cursor:pointer;\">Fechar</button>";
  m.style.display = "flex";
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(function (s) {
    s.style.display = "none";
  });
  var sec = document.getElementById(id);
  if (sec) {
    sec.style.display = "block";
    if (id === "products") loadAllProducts();
    var h = document.querySelector(".header")?.offsetHeight || 70;
    window.scrollTo({
      top: sec.getBoundingClientRect().top + window.pageYOffset - h - 20,
      behavior: "smooth",
    });
  }
}

function loadAllProducts(cat) {
  cat = cat || "all";
  var c = document.getElementById("allProducts");
  if (!c) return;
  var f =
    cat === "all"
      ? products
      : products.filter(function (p) {
          return p.category === cat;
        });
  var s = document.getElementById("searchProduct")?.value?.toLowerCase();
  if (s)
    f = f.filter(function (p) {
      return p.name.toLowerCase().includes(s);
    });
  c.innerHTML =
    f.length === 0
      ? '<p style="text-align:center;color:#999;">Nenhum produto.</p>'
      : f
          .map(function (p) {
            return createProductCard(p);
          })
          .join("");
  setTimeout(fixProductButtons, 500);
}
// ============ FILTROS ============
function setupFilters() {
  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      loadAllProducts(btn.dataset.category);
    });
  });
  document
    .getElementById("searchProduct")
    ?.addEventListener("input", function () {
      var cat =
        document.querySelector(".filter-btn.active")?.dataset?.category ||
        "all";
      loadAllProducts(cat);
    });
}

// ============ CARRINHO ============
function setupCart() {
  document.getElementById("cartBtn")?.addEventListener("click", openCart);
  document.getElementById("cartClose")?.addEventListener("click", closeCart);
  document.getElementById("cartOverlay")?.addEventListener("click", closeCart);
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
  renderCart();
}
function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

function changeQty(btn, delta) {
  var card = btn.closest(".product-card");
  var input = card.querySelector(".qty-input");
  var val = parseInt(input.value) || 1;
  var max = parseInt(input.max) || 99;
  val += delta;
  if (val < 1) val = 1;
  if (val > max) val = max;
  input.value = val;
}

function addToCartFromCard(btn) {
  var card = btn.closest(".product-card");
  if (!card) return;
  var id = parseInt(card.dataset.id);
  var input = card.querySelector(".qty-input");
  var qty = input ? parseInt(input.value) || 1 : 1;
  var product = products.find(function (p) {
    return p.id == id;
  });
  if (!product) {
    alert("Produto não encontrado. Recarregue a página.");
    return;
  }
  var existing = cart.find(function (i) {
    return i.id == id;
  });
  var maxStock = product.stock || 99;
  var current = existing ? existing.quantity : 0;
  if (current + qty > maxStock) {
    alert("⚠️ Estoque máximo: " + maxStock);
    return;
  }
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      quantity: qty,
    });
  }
  saveCart();
  updateCartCount();
  renderCart();
  if (input) input.value = 1;
}

function saveCart() {
  localStorage.setItem("amazoniaCart", JSON.stringify(cart));
}
function updateCartCount() {
  var el = document.getElementById("cartCount");
  if (el)
    el.textContent = cart.reduce(function (s, i) {
      return s + i.quantity;
    }, 0);
}

// ============ RENDERIZAR CARRINHO (COM EVENTOS VIA onmousedown) ============
function renderCart() {
  var items = document.getElementById("cartItems");
  var footer = document.getElementById("cartFooter");
  if (!items) return;

  if (cart.length === 0) {
    items.innerHTML = '<p class="empty-cart">Carrinho vazio 🌿</p>';
    if (footer) footer.style.display = "none";
    return;
  }

  if (footer) footer.style.display = "block";

  var emoji = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
  var total = 0;
  var html = "";

  cart.forEach(function (i) {
    var sub = i.price * i.quantity;
    total += sub;
    html +=
      '<div class="cart-item-row" data-id="' +
      i.id +
      '" style="display:flex;gap:1rem;padding:1rem;border-bottom:1px solid #eee;align-items:center;">' +
      '<span style="font-size:2rem;">' +
      (emoji[i.category] || "🌿") +
      "</span>" +
      '<div style="flex:1;"><strong>' +
      i.name +
      '</strong><p style="color:#666;">R$ ' +
      i.price.toFixed(2) +
      " cada</p>" +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;">' +
      '<button data-id="' +
      i.id +
      '" style="width:30px;height:30px;border:2px solid #2d5a27;background:white;color:#2d5a27;border-radius:5px;cursor:pointer;font-weight:bold;font-size:1rem;" onmousedown="window._cartMinus(' +
      i.id +
      ');return false;">−</button>' +
      '<input type="number" class="cart-qty-input" value="' +
      i.quantity +
      '" min="1" data-id="' +
      i.id +
      '" style="width:50px;height:30px;text-align:center;border:2px solid #2d5a27;border-radius:5px;font-weight:bold;font-size:0.9rem;" onchange="window._cartQty(this);">' +
      '<button data-id="' +
      i.id +
      '" style="width:30px;height:30px;border:2px solid #2d5a27;background:#2d5a27;color:white;border-radius:5px;cursor:pointer;font-weight:bold;font-size:1rem;" onmousedown="window._cartPlus(' +
      i.id +
      ');return false;">+</button>' +
      '</div><p style="font-weight:bold;color:#2d5a27;">R$ ' +
      sub.toFixed(2) +
      "</p></div>" +
      '<button data-id="' +
      i.id +
      '" style="background:none;border:none;color:red;cursor:pointer;font-size:1.5rem;" onmousedown="window._cartRemove(' +
      i.id +
      ');return false;">🗑️</button></div>';
  });

  items.innerHTML = html;
  document.getElementById("cartTotal").textContent = "R$ " + total.toFixed(2);
}

// ============ FUNÇÕES GLOBAIS DO CARRINHO ============
// ============ FUNÇÕES GLOBAIS DO CARRINHO (CORRIGIDAS) ============
window._cartPlus = function (id) {
  id = parseInt(id);
  var item = cart.find(function (i) {
    return parseInt(i.id) === id;
  });
  if (!item) return;
  var product = products.find(function (p) {
    return parseInt(p.id) === id;
  });
  var max = product?.stock || 99;
  if (item.quantity >= max) {
    alert("⚠️ Estoque máximo: " + max);
    return;
  }
  item.quantity++;
  saveCart();
  updateCartCount();
  renderCart();
};

window._cartMinus = function (id) {
  id = parseInt(id);
  var item = cart.find(function (i) {
    return parseInt(i.id) === id;
  });
  if (!item) return;
  item.quantity--;
  if (item.quantity < 1) {
    if (confirm("Remover este produto?")) {
      cart = cart.filter(function (i) {
        return parseInt(i.id) !== id;
      });
    } else {
      item.quantity = 1;
    }
  }
  saveCart();
  updateCartCount();
  renderCart();
};

window._cartRemove = function (id) {
  id = parseInt(id);
  cart = cart.filter(function (i) {
    return parseInt(i.id) !== id;
  });
  saveCart();
  updateCartCount();
  renderCart();
};

window._cartQty = function (input) {
  var id = parseInt(input.getAttribute("data-id"));
  var item = cart.find(function (i) {
    return parseInt(i.id) === id;
  });
  if (!item) return;
  var qty = parseInt(input.value) || 1;
  var product = products.find(function (p) {
    return parseInt(p.id) === id;
  });
  var max = product?.stock || 99;
  if (qty < 1) qty = 1;
  if (qty > max) {
    qty = max;
    alert("⚠️ Estoque máximo: " + max);
  }
  item.quantity = qty;
  saveCart();
  updateCartCount();
  renderCart();
};
// ============ CORREÇÃO BOTÕES PRODUTOS ============
function setupCartButtons() {
  setTimeout(fixProductButtons, 1000);
}

function fixProductButtons() {
  // Esta função agora NÃO FAZ NADA com os botões de adicionar
  // porque o onclick já está no HTML e funciona perfeitamente.
  // Apenas mantemos os eventos de + e - que precisam de tratamento especial.

  document.querySelectorAll(".qty-plus").forEach(function (btn) {
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      changeQty(this, 1);
    });
  });

  document.querySelectorAll(".qty-minus").forEach(function (btn) {
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      changeQty(this, -1);
    });
  });

  console.log("✅ Botões + e - corrigidos!");
}
// ============ CHECKOUT ============
function setupCheckoutModal() {
  document
    .getElementById("closeCheckoutModal")
    ?.addEventListener("click", function () {
      document.getElementById("checkoutModal").style.display = "none";
    });
}

function openCheckoutModal() {
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) {
    alert("Faça login!");
    location.href = "cadastro.html";
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
  updateCheckoutTotal();
  closeCart();
}

function updateCheckoutTotal() {
  var subtotal = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  var shipping = document.querySelector(
    'input[name="shipping"]:checked',
  )?.value;
  var shippingCost = 0;
  if (shipping === "same_day")
    shippingCost =
      subtotal >= (siteConfig?.free_shipping_from || 100) ? 0 : 12.9;
  else if (shipping === "next_day")
    shippingCost =
      subtotal >= (siteConfig?.free_shipping_from || 100) ? 0 : 8.9;
  var total = subtotal + shippingCost;
  var summary = document.getElementById("checkoutSummary");
  if (summary)
    summary.innerHTML =
      "<h4>Resumo</h4>" +
      cart
        .map(function (i) {
          return (
            "<p>" +
            i.name +
            " (" +
            i.quantity +
            "x) - R$ " +
            (i.price * i.quantity).toFixed(2) +
            "</p>"
          );
        })
        .join("") +
      "<hr><p><strong>Subtotal:</strong> R$ " +
      subtotal.toFixed(2) +
      "</p><p><strong>Frete:</strong> " +
      (shippingCost === 0 ? "Grátis" : "R$ " + shippingCost.toFixed(2)) +
      '</p><p style="font-size:1.2rem;"><strong>Total:</strong> R$ ' +
      total.toFixed(2) +
      "</p>";
}

function showPaymentTab(tab) {
  document.querySelectorAll(".payment-tab").forEach(function (t) {
    t.classList.remove("active");
  });
  document.querySelectorAll(".payment-panel").forEach(function (p) {
    p.style.display = "none";
  });
  var activeTab = document.querySelector(
    '.payment-tab[onclick*="' + tab + '"]',
  );
  if (activeTab) activeTab.classList.add("active");
  var panel = document.getElementById("paymentPanel_" + tab);
  if (panel) panel.style.display = "block";
}
window.showPaymentTab = showPaymentTab;

function updateCombinedTotal() {
  var total = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  var pix =
    parseFloat(document.getElementById("combinedPixAmount")?.value) || 0;
  document.getElementById("combinedCardAmount").value = Math.max(
    0,
    total - pix,
  ).toFixed(2);
}

function updateTwoCardsTotal() {
  var total = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  var c1 = parseFloat(document.getElementById("card1Amount")?.value) || 0;
  document.getElementById("card2Amount").value = Math.max(
    0,
    total - c1,
  ).toFixed(2);
}

// ============ FINALIZAR PEDIDO ============
async function confirmOrder() {
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  if (!user) {
    alert("Faça login!");
    location.href = "cadastro.html";
    return;
  }
  if (cart.length === 0) {
    alert("Carrinho vazio!");
    return;
  }

  var activeTab =
    (document
      .querySelector(".payment-tab.active")
      ?.getAttribute("onclick")
      ?.match(/'(\w+)'/) || [])[1] || "pix";

  if (activeTab === "pix") {
    showPixModal();
    return;
  }
  finalizeOrder();
}

function showPixModal() {
  var subtotal = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  var shipping =
    document.querySelector('input[name="shipping"]:checked')?.value ||
    "same_day";
  var freeFrom = siteConfig?.free_shipping_from || 100;
  var shippingCost = 0;
  if (shipping === "same_day") shippingCost = subtotal >= freeFrom ? 0 : 12.9;
  else if (shipping === "next_day")
    shippingCost = subtotal >= freeFrom ? 0 : 8.9;
  var total = subtotal + shippingCost;

  var modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:5000;display:flex;align-items:center;justify-content:center;";
  modal.innerHTML =
    '<div style="background:white;border-radius:15px;padding:2rem;max-width:450px;width:95%;text-align:center;">' +
    '<h2>📱 Pagamento via Pix</h2><p style="color:#2d5a27;font-weight:bold;font-size:1.5rem;">R$ ' +
    total.toFixed(2) +
    "</p>" +
    '<div style="background:#f5f5f5;padding:1.5rem;border-radius:10px;margin:1rem 0;"><div style="width:200px;height:200px;background:white;margin:0 auto;border:3px solid #2d5a27;display:flex;align-items:center;justify-content:center;font-size:5rem;">📱</div><p style="margin-top:0.5rem;color:#666;">Escaneie o QR Code</p></div>' +
    '<p style="font-size:0.85rem;color:#999;">Pagamento simulado (API pendente)</p>' +
    '<button id="btnPixPaid" style="background:#2d5a27;color:white;border:none;padding:0.8rem 2rem;border-radius:25px;margin-top:1rem;cursor:pointer;font-size:1rem;">Já paguei ✅</button>' +
    '<br><button id="btnPixCancel" style="background:none;border:none;color:red;margin-top:0.5rem;cursor:pointer;">Cancelar</button></div>';
  document.body.appendChild(modal);

  document.getElementById("btnPixPaid").addEventListener("click", function () {
    modal.remove();
    finalizeOrder();
  });
  document
    .getElementById("btnPixCancel")
    .addEventListener("click", function () {
      modal.remove();
      document.getElementById("checkoutModal").style.display = "none";
    });
}

function finalizeOrder() {
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  var address = document.getElementById("checkoutAddress").value;
  if (!address) {
    alert("Preencha o endereço!");
    return;
  }

  var subtotal = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  var shipping =
    document.querySelector('input[name="shipping"]:checked')?.value ||
    "same_day";
  var freeFrom = siteConfig?.free_shipping_from || 100;
  var shippingCost = 0;
  if (shipping === "same_day") shippingCost = subtotal >= freeFrom ? 0 : 12.9;
  else if (shipping === "next_day")
    shippingCost = subtotal >= freeFrom ? 0 : 8.9;
  var total = subtotal + shippingCost;
  var activeTab =
    (document
      .querySelector(".payment-tab.active")
      ?.getAttribute("onclick")
      ?.match(/'(\w+)'/) || [])[1] || "pix";

  var orderData = {
    orderNumber: Date.now(),
    customer: {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
    },
    items: cart.map(function (i) {
      return { id: i.id, name: i.name, price: i.price, quantity: i.quantity };
    }),
    subtotal: subtotal,
    shippingCost: shippingCost,
    total: total,
    shipping: {
      method: shipping,
      address: address,
      city: document.getElementById("checkoutCity").value,
    },
    paymentMethod: activeTab,
    status: "pending",
    date: new Date().toISOString(),
  };

  try {
    db.collection("orders").add(orderData);
  } catch (e) {}
  var orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
  orders.push(orderData);
  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

  if (appliedCoupon) {
    var coupon = coupons.find(function (c) {
      return c.code === appliedCoupon.code;
    });
    if (coupon) {
      if (!coupon.usedBy) coupon.usedBy = [];
      coupon.usedBy.push(user.email);
      localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
    }
  }

  cart = [];
  appliedCoupon = null;
  saveCart();
  updateCartCount();
  renderCart();
  document.getElementById("checkoutModal").style.display = "none";
  alert(
    "✅ Pedido #" +
      orderData.orderNumber +
      " realizado!\nTotal: R$ " +
      total.toFixed(2) +
      "\nObrigado! 🌿",
  );
}
// ============ WHATSAPP ============
function checkoutWhatsApp() {
  if (cart.length === 0) {
    alert("Carrinho vazio!");
    return;
  }
  var user = JSON.parse(localStorage.getItem("amazoniaLoggedUser"));
  var msg = "🌿 *PEDIDO*\n\n";
  cart.forEach(function (i, idx) {
    msg +=
      idx +
      1 +
      ". " +
      i.name +
      " (" +
      i.quantity +
      "x) - R$ " +
      (i.price * i.quantity).toFixed(2) +
      "\n";
  });
  var total = cart.reduce(function (s, i) {
    return s + i.price * i.quantity;
  }, 0);
  msg += "\n💰 Total: R$ " + total.toFixed(2);
  if (user)
    msg += "\n👤 " + user.name + "\n📍 " + (user.address || "A informar");
  closeCart();
  window.open(
    "https://wa.me/" +
      (siteConfig?.whatsapp || "5591000000000") +
      "?text=" +
      encodeURIComponent(msg),
    "_blank",
  );
}

// ============ IMPACTO ============
function setupImpactCalculator() {
  var slider = document.getElementById("impactValue");
  if (!slider) return;
  slider.addEventListener("input", function () {
    var v = parseInt(slider.value);
    document.getElementById("impactDisplay").textContent = "R$ " + v + ",00";
    document.getElementById("treesPreserved").textContent = (v / 100).toFixed(
      2,
    );
    document.getElementById("familiesHelped").textContent = Math.max(
      1,
      Math.round(v / 150),
    );
    document.getElementById("beesSaved").textContent = Math.round(
      v * 20,
    ).toLocaleString("pt-BR");
  });
  slider.dispatchEvent(new Event("input"));
}

// ============ FEEDBACK ============
document
  .getElementById("contactForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("contactName").value.trim();
    var email = document.getElementById("contactEmail").value.trim();
    var message = document.getElementById("contactMessage").value.trim();
    if (!name || !email || !message) {
      alert("Preencha todos os campos!");
      return;
    }
    var fb = {
      name: name,
      email: email,
      message: message,
      date: new Date().toISOString(),
      read: false,
    };
    try {
      db.collection("feedbacks").add(fb);
    } catch (e) {}
    var fbs = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
    fbs.push({
      id: Date.now(),
      name: name,
      email: email,
      message: message,
      date: new Date().toISOString(),
      read: false,
    });
    localStorage.setItem("amazoniaFeedbacks", JSON.stringify(fbs));
    document.getElementById("contactForm").reset();
    alert("✅ Mensagem enviada! Obrigado pelo feedback! 🌿");
  });

// ============ GLOBAIS ============
window.addToCartFromCard = addToCartFromCard;
window.changeQty = changeQty;
window.showSection = showSection;
window.showTrackingInfo = showTrackingInfo;
window.confirmOrder = confirmOrder;
window.openCheckoutModal = openCheckoutModal;
window.checkoutWhatsApp = checkoutWhatsApp;
window.updateCheckoutTotal = updateCheckoutTotal;
window.showPaymentTab = showPaymentTab;
window.logout = logout;
window.loadAllProducts = loadAllProducts;
window.renderCart = renderCart;
window.updateCartCount = updateCartCount;
window.saveCart = saveCart;
