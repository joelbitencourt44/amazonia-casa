let products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
let siteData = JSON.parse(localStorage.getItem("amazoniaData")) || {};
let orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
let customers = JSON.parse(localStorage.getItem("amazoniaCustomers")) || [];
let coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];

function saveAll() {
  localStorage.setItem("amazoniaProducts", JSON.stringify(products));
  localStorage.setItem("amazoniaData", JSON.stringify(siteData));
  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
  localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
}

document.addEventListener("DOMContentLoaded", () => {
  if (products.length === 0) {
    fetch("data/products.json")
      .then((r) => r.json())
      .then((d) => {
        products = d.products;
        siteData = d.site_config;
        saveAll();
        loadAll();
      });
  } else {
    loadAll();
  }

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      document
        .querySelectorAll(".admin-section")
        .forEach((s) => s.classList.remove("active"));
      document.getElementById(item.dataset.section).classList.add("active");
      if (item.dataset.section === "products") loadProductsTable();
      if (item.dataset.section === "orders") loadOrdersTable();
      if (item.dataset.section === "customers") loadCustomersTable();
      if (item.dataset.section === "coupons") loadCouponsTable();
      if (item.dataset.section === "content") loadContentForms();
      if (item.dataset.section === "settings") loadSettingsForm();
      loadDashboard();
    });
  });

  document
    .getElementById("menuToggleAdmin")
    ?.addEventListener("click", () =>
      document.getElementById("adminSidebar").classList.toggle("open"),
    );

  document.getElementById("productForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveProduct();
  });
  document.getElementById("couponForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveCoupon();
  });
  document.getElementById("settingsForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSettings();
  });
  document.getElementById("heroForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveHero();
  });
  document.getElementById("aboutForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveAbout();
  });
});

function loadAll() {
  loadDashboard();
  loadProductsTable();
  loadCouponsTable();
  loadSettingsForm();
  loadContentForms();
}

function loadDashboard() {
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  // Vendas hoje
  const todayOrders = orders.filter(
    (o) =>
      o.status === "delivered" && new Date(o.date).toDateString() === today,
  );
  document.getElementById("salesToday").textContent =
    "R$ " + todayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2);

  // Pedidos pendentes
  document.getElementById("pendingOrders").textContent = orders.filter(
    (o) => o.status === "pending",
  ).length;

  // Clientes
  document.getElementById("activeCustomers").textContent = customers.length;

  // Faturamento mês
  const monthOrders = orders.filter(
    (o) =>
      o.status !== "cancelled" &&
      new Date(o.date).getMonth() === thisMonth &&
      new Date(o.date).getFullYear() === thisYear,
  );
  document.getElementById("monthlyRevenue").textContent =
    "R$ " + monthOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2);

  // Produto mais vendido
  loadTopProduct(monthOrders);

  // Horário de pico
  loadPeakHours(monthOrders);

  // Custos e lucros
  loadCostsAndProfits(monthOrders);

  // Tabela de produtos com custos
  loadProductCostTable(monthOrders);
}

function loadTopProduct(monthOrders) {
  const container = document.getElementById("topProduct");
  const productSales = {};

  monthOrders.forEach((o) => {
    o.items?.forEach((item) => {
      if (!productSales[item.name]) productSales[item.name] = 0;
      productSales[item.name] += item.quantity || 0;
    });
  });

  const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;">Nenhuma venda ainda</p>';
    return;
  }

  const top = sorted[0];
  const emoji = { mel: "🍯", oleos: "🧴", suplementos: "💊" };
  const cat = products.find((p) => p.name === top[0])?.category || "";

  container.innerHTML = `
        <div style="font-size:3rem;">${emoji[cat] || "🏆"}</div>
        <p style="font-size:1.3rem; font-weight:bold; color:#2d5a27;">${top[0]}</p>
        <p style="font-size:2rem; font-weight:bold;">${top[1]} vendidos</p>
    `;
}

function loadPeakHours(monthOrders) {
  const container = document.getElementById("peakHours");
  const hourCount = {};

  monthOrders.forEach((o) => {
    const hour = new Date(o.date).getHours();
    if (!hourCount[hour]) hourCount[hour] = 0;
    hourCount[hour]++;
  });

  const sorted = Object.entries(hourCount).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;">Nenhum pedido ainda</p>';
    return;
  }

  const peak = sorted[0];
  const hourLabel = `${peak[0]}h - ${parseInt(peak[0]) + 2}h`;

  container.innerHTML = `
        <div style="font-size:3rem;">⏰</div>
        <p style="font-size:1.3rem; font-weight:bold; color:#e65100;">Horário de Pico</p>
        <p style="font-size:2rem; font-weight:bold;">${hourLabel}</p>
        <p style="color:#999;">${peak[1]} pedidos neste horário</p>
    `;
}

function loadCostsAndProfits(monthOrders) {
  const totalRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);

  // Calcular custos (se os produtos tiverem campo "cost")
  let totalCost = 0;
  monthOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const product = products.find((p) => p.name === item.name);
      const cost = product?.cost || item.price * 0.4; // Se não tiver custo, estima 40% do preço
      totalCost += cost * (item.quantity || 0);
    });
  });

  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  document.getElementById("totalRevenue").textContent =
    "R$ " + totalRevenue.toFixed(2);
  document.getElementById("totalCost").textContent =
    "R$ " + totalCost.toFixed(2);
  document.getElementById("totalProfit").textContent =
    "R$ " + totalProfit.toFixed(2);
  document.getElementById("profitMargin").textContent = margin.toFixed(1) + "%";
}

function loadProductCostTable(monthOrders) {
  const tbody = document.getElementById("productCostTable");

  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum produto cadastrado</td></tr>';
    return;
  }

  // Calcular vendas por produto no mês
  const productSales = {};
  monthOrders.forEach((o) => {
    o.items?.forEach((item) => {
      if (!productSales[item.name]) productSales[item.name] = 0;
      productSales[item.name] += item.quantity || 0;
    });
  });

  tbody.innerHTML = products
    .map((p) => {
      const sold = productSales[p.name] || 0;
      const cost = p.cost || p.price * 0.4;
      const profit = p.price - cost;
      const margin = p.price > 0 ? (profit / p.price) * 100 : 0;
      const totalProfit = profit * sold;

      return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>R$ ${(p.price || 0).toFixed(2)}</td>
                <td>R$ ${cost.toFixed(2)}</td>
                <td style="color:#2d5a27;">R$ ${profit.toFixed(2)}</td>
                <td><span style="background:#e8f5e9;color:#2d5a27;padding:0.2rem 0.5rem;border-radius:10px;">${margin.toFixed(0)}%</span></td>
                <td>${sold}</td>
                <td style="font-weight:bold;color:#2d5a27;">R$ ${totalProfit.toFixed(2)}</td>
            </tr>
        `;
    })
    .join("");
}

function loadProductsTable() {
  const tbody = document.getElementById("productsTable");
  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">Nenhum produto. Clique em + Novo Produto.</td></tr>';
    return;
  }
  tbody.innerHTML = products
    .map(
      (p) => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>R$ ${(p.price || 0).toFixed(2)}</td>
            <td>${p.stock || 0}</td>
            <td><span class="status-badge ${p.active ? "active" : "inactive"}">${p.active ? "Ativo" : "Inativo"}</span></td>
            <td><button class="btn-sm btn-edit" onclick="editProduct(${p.id})">✏️</button> <button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})">🗑️</button></td>
        </tr>
    `,
    )
    .join("");
}

function openProductModal(id = null) {
  const modal = document.getElementById("productModal");
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("modalTitle").textContent = "Novo Produto";
  // Limpa preview de imagem
  const preview = document.getElementById("imagePreview");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }

  if (id) {
    const p = products.find((p) => p.id === id);
    if (p) {
      document.getElementById("modalTitle").textContent = "Editar Produto";
      document.getElementById("productId").value = p.id;
      document.getElementById("productName").value = p.name || "";
      document.getElementById("productCategory").value = p.category || "mel";
      document.getElementById("productPrice").value = p.price || 0;
      document.getElementById("productStock").value = p.stock || 0;
      document.getElementById("productDescription").value = p.description || "";
      document.getElementById("productBenefits").value = p.benefits || "";
      document.getElementById("productOrigin").value = p.origin || "";
      document.getElementById("productProducer").value = p.producer || "";
      document.getElementById("productArea").value = p.area || "";
      document.getElementById("productDate").value = p.date || "";
      document.getElementById("productCost").value = p.cost || "";
      document.getElementById("productActive").checked = p.active !== false;
      document.getElementById("productFeatured").checked = p.featured === true;
      if (p.image && preview) {
        preview.src = p.image;
        preview.style.display = "block";
      }
    }
  }
  modal.style.display = "flex";
}

function closeProductModal() {
  document.getElementById("productModal").style.display = "none";
}
function editProduct(id) {
  openProductModal(id);

  const p = products.find((p) => p.id === id);
  if (p && p.image) {
    const preview = document.getElementById("imagePreview");
    preview.src = p.image;
    preview.style.display = "block";
  }
}

function deleteProduct(id) {
  if (confirm("Excluir este produto?")) {
    products = products.filter((p) => p.id !== id);
    saveAll();
    loadProductsTable();
  }
}

function saveProduct() {
  const id = document.getElementById("productId").value
    ? parseInt(document.getElementById("productId").value)
    : Date.now();

  const imageInput = document.getElementById("productImage");
  if (imageInput && imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageData = e.target.result;
      finalizarSave(id, imageData);
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    const existing = products.find((p) => p.id === id);
    const imageData = existing?.image || "";
    finalizarSave(id, imageData);
  }
}

function finalizarSave(id, imageData) {
  const name = document.getElementById("productName").value;
  const category = document.getElementById("productCategory").value;
  const price = parseFloat(document.getElementById("productPrice").value);
  const stock = parseInt(document.getElementById("productStock").value);
  const description = document.getElementById("productDescription").value;
  const benefits = document.getElementById("productBenefits").value;
  const origin = document.getElementById("productOrigin").value;
  const producer = document.getElementById("productProducer").value;
  const area = document.getElementById("productArea").value;
  const date = document.getElementById("productDate").value;
  const cost = parseFloat(document.getElementById("productCost")?.value) || 0;
  const active = document.getElementById("productActive").checked;
  const featured = document.getElementById("productFeatured").checked;

  // 🔍 LOGS PARA DEPURAÇÃO – verifique o console (F12) após salvar
  console.log("Dados capturados:");
  console.log("Origem:", origin);
  console.log("Extrativista:", producer);
  console.log("Área:", area);
  console.log("Data:", date);

  const productData = {
    id,
    name,
    category,
    price,
    stock,
    description,
    benefits,
    origin,
    producer,
    area,
    date,
    cost,
    image: imageData,
    active,
    featured,
  };

  const idx = products.findIndex((p) => p.id === id);
  if (idx >= 0) {
    products[idx] = productData;
  } else {
    products.push(productData);
  }

  saveAll();
  loadProductsTable();
  loadDashboard();
  closeProductModal();
  alert("✅ Produto salvo!");
}

function loadOrdersTable() {
  const tbody = document.getElementById("ordersTable");
  if (orders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;">Nenhum pedido.</td></tr>';
    return;
  }
  tbody.innerHTML = orders
    .map(
      (o) => `
        <tr>
            <td>#${o.id}</td><td>${o.customer?.name || "N/A"}</td>
            <td>${new Date(o.date).toLocaleDateString("pt-BR")}</td><td>R$ ${o.total?.toFixed(2)}</td>
            <td><span class="status-badge ${o.status === "delivered" ? "active" : "inactive"}">${o.status}</span></td>
        </tr>
    `,
    )
    .join("");
}

function loadCustomersTable() {
  const tbody = document.getElementById("customersTable");
  if (customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">Nenhum cliente.</td></tr>';
    return;
  }
  tbody.innerHTML = customers
    .map((c) => {
      const phone = c.phone ? c.phone.replace(/\D/g, "") : "";
      const whatsappLink = phone
        ? `https://wa.me/55${phone}?text=Olá%20${encodeURIComponent(c.name)}!%20Aqui%20é%20da%20Amazônia%20em%20Casa.%20🌿`
        : "#";
      const customerOrders = orders.filter(
        (o) => o.customer?.email === c.email,
      );
      const totalSpent = customerOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + (o.total || 0), 0);

      return `
            <tr>
                <td>
                    <strong>${c.name}</strong>
                    ${customerOrders.length > 0 ? `<br><small style="color:#999;">${customerOrders.length} pedido(s) • R$ ${totalSpent.toFixed(2)}</small>` : ""}
                </td>
                <td>${c.email}</td>
                <td>${c.phone || "-"}</td>
                <td>${c.city || "-"}</td>
                <td>
                    ${phone ? `<a href="${whatsappLink}" target="_blank" style="background:#25D366;color:white;padding:0.4rem 0.8rem;border-radius:20px;text-decoration:none;font-size:0.9rem;">💬 WhatsApp</a>` : '<span style="color:#999;">-</span>'}
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="viewCustomerOrders('${c.email}')">📋 Pedidos</button>
                </td>
                <td>
                    <button class="btn-sm btn-delete" onclick="deleteCustomer('${c.email}')">🗑️</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function loadCouponsTable() {
  const tbody = document.getElementById("couponsTable");
  if (!tbody) return;

  if (coupons.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">Nenhum cupom.</td></tr>';
    return;
  }

  tbody.innerHTML = coupons
    .map((c) => {
      const isUsed = c.usedBy && c.usedBy.length > 0;
      const isExpired = new Date(c.expiresAt) < new Date();
      const statusClass = isUsed || isExpired ? "inactive" : "active";
      const statusText = isUsed ? "Usado" : isExpired ? "Expirado" : "Ativo";

      return `
            <tr>
                <td><strong>${c.code}</strong></td>
                <td>${c.discount}%</td>
                <td>${c.assignedTo === "all" ? "Todos" : c.assignedTo}</td>
                <td>${new Date(c.expiresAt).toLocaleDateString("pt-BR")}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td><button class="btn-sm btn-delete" onclick="deleteCoupon('${c.code}')">🗑️</button></td>
            </tr>
        `;
    })
    .join("");
}
function openCouponModal() {
  document.getElementById("couponModal").style.display = "flex";
  document.getElementById("couponForm").reset();
  const sel = document.getElementById("couponAssignedTo");
  sel.innerHTML = '<option value="all">Todos</option>';
  customers.forEach(
    (c) => (sel.innerHTML += `<option value="${c.email}">${c.name}</option>`),
  );
  const d = new Date();
  d.setDate(d.getDate() + 30);
  document.getElementById("couponExpiresAt").value = d
    .toISOString()
    .split("T")[0];
}

function closeCouponModal() {
  document.getElementById("couponModal").style.display = "none";
}

function deleteCoupon(code) {
  if (confirm("Excluir cupom " + code + "?")) {
    coupons = coupons.filter((c) => c.code !== code);
    saveAll();
    loadCouponsTable();
  }
}

function saveCoupon() {
  const code = document.getElementById("couponCode").value.toUpperCase();
  const discount = parseInt(document.getElementById("couponDiscount").value);
  const assignedTo = document.getElementById("couponAssignedTo").value;
  const expiresAt = document.getElementById("couponExpiresAt").value;

  if (!code || !discount || !expiresAt) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }

  coupons.push({
    code,
    discount,
    assignedTo,
    expiresAt,
    usedBy: [], // ← lista de e-mails que já usaram
    createdAt: new Date().toISOString(),
  });

  saveAll();
  loadCouponsTable();
  closeCouponModal();
  alert("✅ Cupom criado!");
}

function loadSettingsForm() {
  if (!siteData) return;
  document.getElementById("storeName").value = siteData.store_name || "";
  document.getElementById("storePhone").value = siteData.phone || "";
  document.getElementById("storeWhatsapp").value = siteData.whatsapp || "";
  document.getElementById("storeEmail").value = siteData.email || "";
  document.getElementById("storeAddress").value = siteData.address || "";
  document.getElementById("storeHours").value = siteData.business_hours || "";
  document.getElementById("freeShipping").value =
    siteData.free_shipping_from || 100;
  document.getElementById("socialInstagram").value =
    siteData.social?.instagram || "";
  document.getElementById("socialFacebook").value =
    siteData.social?.facebook || "";
}

function saveSettings() {
  siteData = {
    ...siteData,
    store_name: document.getElementById("storeName").value,
    phone: document.getElementById("storePhone").value,
    whatsapp: document.getElementById("storeWhatsapp").value,
    email: document.getElementById("storeEmail").value,
    address: document.getElementById("storeAddress").value,
    business_hours: document.getElementById("storeHours").value,
    free_shipping_from: parseFloat(
      document.getElementById("freeShipping").value,
    ),
    social: {
      instagram: document.getElementById("socialInstagram").value,
      facebook: document.getElementById("socialFacebook").value,
      youtube: "",
    },
  };
  saveAll();
  alert("✅ Configurações salvas! O site será atualizado.");
}

function saveHero() {
  siteData.hero = {
    title: document.getElementById("heroTitle").value,
    subtitle: document.getElementById("heroSubtitle").value,
  };
  saveAll();
  alert("✅ Página inicial atualizada!");
}

function saveAbout() {
  siteData.about = {
    content: document.getElementById("aboutContent").value,
    mission: document.getElementById("aboutMission").value,
    founder: document.getElementById("aboutFounder").value,
    founded: document.getElementById("aboutFounded").value,
  };
  saveAll();
  alert("✅ História atualizada!");
}

function loadContentForms() {
  if (!siteData) return;
  document.getElementById("heroTitle").value = siteData.hero?.title || "";
  document.getElementById("heroSubtitle").value = siteData.hero?.subtitle || "";
  document.getElementById("aboutContent").value = siteData.about?.content || "";
  document.getElementById("aboutMission").value = siteData.about?.mission || "";
  document.getElementById("aboutFounder").value = siteData.about?.founder || "";
  document.getElementById("aboutFounded").value = siteData.about?.founded || "";
}
function previewImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById("imagePreview");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = "none";
  }
}
function deleteCustomer(email) {
  const customer = customers.find((c) => c.email === email);
  if (!customer) return;

  if (
    confirm(
      `Tem certeza que deseja excluir o cliente "${customer.name}"?\n\nEsta ação removerá todos os dados deste cliente.`,
    )
  ) {
    // Remover cliente
    customers = customers.filter((c) => c.email !== email);
    localStorage.setItem("amazoniaCustomers", JSON.stringify(customers));

    // Remover pedidos deste cliente
    orders = orders.filter((o) => o.customer?.email !== email);
    localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

    // Recarregar tabelas
    loadCustomersTable();
    loadOrdersTable();
    loadDashboard();

    alert("✅ Cliente excluído com sucesso!");
  }
}
function loadCustomersTable() {
  const tbody = document.getElementById("customersTable");
  if (customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;">Nenhum cliente.</td></tr>';
    return;
  }
  tbody.innerHTML = customers
    .map((c) => {
      const phone = c.phone ? c.phone.replace(/\D/g, "") : "";
      const whatsappLink = phone
        ? `https://wa.me/55${phone}?text=Olá%20${encodeURIComponent(c.name)}!%20Aqui%20é%20da%20Amazônia%20em%20Casa.%20🌿`
        : "#";
      const customerOrders = orders.filter(
        (o) => o.customer?.email === c.email,
      );
      const totalSpent = customerOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + (o.total || 0), 0);

      return `
            <tr>
                <td>
                    <strong>${c.name}</strong>
                    ${customerOrders.length > 0 ? `<br><small style="color:#999;">${customerOrders.length} pedido(s) • R$ ${totalSpent.toFixed(2)}</small>` : ""}
                </td>
                <td>${c.email}</td>
                <td>${c.phone || "-"}</td>
                <td>${c.city || "-"}</td>
                <td>
                    ${phone ? `<a href="${whatsappLink}" target="_blank" style="background:#25D366;color:white;padding:0.4rem 0.8rem;border-radius:20px;text-decoration:none;font-size:0.9rem;">💬 WhatsApp</a>` : '<span style="color:#999;">-</span>'}
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="viewCustomerOrders('${c.email}')">📋 Pedidos</button>
                </td>
                <td>
                    <button class="btn-sm btn-delete" onclick="deleteCustomer('${c.email}')">🗑️</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// ============================================
// SISTEMA DE ENTREGAS
// ============================================

/* ============================================
   API DE ENTREGA - CONFIGURAÇÃO
   ============================================
   Substitua quando receber as credenciais:
   
   API_PROVIDER: 'ifood', 'loggi', 'uber', '99', 'custom'
   API_KEY: sua chave secreta
   API_URL: endpoint da API
   ============================================ */
const DELIVERY_API = {
  provider: "custom", // ⚠️ MUDAR AQUI
  apiKey: "SUA_CHAVE_API_AQUI", // ⚠️ MUDAR AQUI
  apiUrl: "https://api.exemplo.com/v1/", // ⚠️ MUDAR AQUI
  mapProvider: "google", // ⚠️ MUDAR: 'google', 'mapbox', 'leaflet'
  mapApiKey: "AIzaSyA_cW-oB9st9HFhWLPxbRG8rMvUTDNkVCU", // ⚠️ MUDAR AQUI
};

// Carregar tabela de entregas
function loadDeliveriesTable() {
  const tbody = document.getElementById("deliveriesTable");
  const filter =
    document.getElementById("deliveryStatusFilter")?.value || "all";

  if (!tbody) return;

  let filteredOrders = [...orders];

  if (filter !== "all") {
    filteredOrders = filteredOrders.filter((o) => o.status === filter);
  }

  filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filteredOrders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:#999;">Nenhuma entrega encontrada</td></tr>';
    return;
  }

  tbody.innerHTML = filteredOrders
    .map((order) => {
      const trackingCode = order.trackingCode || "-";
      const trackingLink = order.trackingLink || "";
      const canCancel =
        order.status === "pending" || order.status === "confirmed";

      return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${order.customer?.name || "N/A"}<br><small>${order.customer?.phone || ""}</small></td>
                <td>${order.shipping?.address || "N/A"}<br><small>${order.shipping?.city || ""}</small></td>
                <td><span class="status-badge ${getDeliveryStatusClass(order.status)}">${getDeliveryStatusName(order.status)}</span></td>
                <td>
                    ${
                      trackingCode !== "-"
                        ? `<span style="background:#2d5a27;color:white;padding:0.2rem 0.5rem;border-radius:5px;font-family:monospace;">${trackingCode}</span>`
                        : '<span style="color:#999;">-</span>'
                    }
                </td>
                <td>
                    ${
                      trackingLink
                        ? `<a href="${trackingLink}" target="_blank" style="background:#1565c0;color:white;padding:0.3rem 0.8rem;border-radius:15px;text-decoration:none;font-size:0.85rem;">📍 Ver Mapa</a>`
                        : order.status === "shipped"
                          ? '<span style="color:#e65100;">Aguardando...</span>'
                          : '<span style="color:#999;">-</span>'
                    }
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="openTrackingModal(${order.id})">📝 Rastreio</button>
                    ${order.status === "confirmed" ? `<button class="btn-sm" style="background:#25D366;color:white;border:none;cursor:pointer;margin-top:0.3rem;" onclick="callDeliveryAPI(${order.id})">🚀 Chamar Entregador</button>` : ""}
                </td>
                <td>
                    ${
                      canCancel
                        ? `<button class="btn-sm btn-delete" onclick="cancelOrderAdmin(${order.id})" title="Cancelar pedido">❌ Cancelar</button>`
                        : order.status === "cancelled"
                          ? '<span style="color:#c62828;font-size:0.85rem;">Cancelado</span>'
                          : '<span style="color:#999;font-size:0.8rem;">Não pode<br>cancelar</span>'
                    }
                </td>
            </tr>
        `;
    })
    .join("");

  updateDeliveryMetrics();
}

function updateDeliveryMetrics() {
  const today = new Date().toDateString();

  document.getElementById("awaitingDelivery").textContent = orders.filter(
    (o) => o.status === "confirmed",
  ).length;
  document.getElementById("inTransit").textContent = orders.filter(
    (o) => o.status === "shipped",
  ).length;
  document.getElementById("deliveredToday").textContent = orders.filter(
    (o) =>
      o.status === "delivered" && new Date(o.date).toDateString() === today,
  ).length;
}

function getDeliveryStatusName(status) {
  const names = {
    pending: "⏳ Pendente",
    confirmed: "✅ Pronto para Envio",
    shipped: "🚚 Em Entrega",
    delivered: "📦 Entregue",
    cancelled: "❌ Cancelado",
  };
  return names[status] || status;
}

function getDeliveryStatusClass(status) {
  const classes = {
    pending: "inactive",
    confirmed: "inactive",
    shipped: "active",
    delivered: "active",
    cancelled: "inactive",
  };
  return classes[status] || "";
}

// Modal de rastreio
function openTrackingModal(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  document.getElementById("trackingOrderId").value = orderId;
  document.getElementById("trackingCode").value = order.trackingCode || "";
  document.getElementById("trackingLink").value = order.trackingLink || "";
  document.getElementById("trackingStatus").value = order.status;

  document.getElementById("trackingModal").style.display = "flex";
}

function closeTrackingModal() {
  document.getElementById("trackingModal").style.display = "none";
}

// Salvar rastreamento
document
  .getElementById("trackingForm")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();

    const orderId = parseInt(document.getElementById("trackingOrderId").value);
    const trackingCode = document.getElementById("trackingCode").value;
    const trackingLink = document.getElementById("trackingLink").value;
    const newStatus = document.getElementById("trackingStatus").value;

    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex >= 0) {
      orders[orderIndex].trackingCode = trackingCode;
      orders[orderIndex].trackingLink = trackingLink;
      orders[orderIndex].status = newStatus;
      orders[orderIndex].statusUpdatedAt = new Date().toISOString();

      localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
      loadDeliveriesTable();
      loadOrdersTable();
      loadDashboard();
      closeTrackingModal();

      alert("✅ Rastreamento atualizado com sucesso!");
    }
  });

/* ============================================
   FUNÇÃO QUE CHAMA A API DE ENTREGA
   ============================================
   Esta função será ativada quando você
   tiver a chave da API.
   
   Por enquanto, apenas simula a chamada.
   ============================================ */
function callDeliveryAPI(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  /* 
    ⚠️ QUANDO TIVER A API DO IFOOD/LOGGI:
    Substitua o código abaixo por:
    
    fetch(DELIVERY_API.apiUrl + 'create-delivery', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + DELIVERY_API.apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            orderId: order.id,
            pickupAddress: 'Av. Rômulo Maiorana, 1234 - Marco, Belém - PA',
            deliveryAddress: order.shipping?.address,
            customerName: order.customer?.name,
            customerPhone: order.customer?.phone
        })
    })
    .then(response => response.json())
    .then(data => {
        order.trackingCode = data.trackingCode;
        order.trackingLink = data.trackingUrl;
        order.status = 'shipped';
        localStorage.setItem('amazoniaOrders', JSON.stringify(orders));
        loadDeliveriesTable();
        alert('🚀 Entregador acionado! Código: ' + data.trackingCode);
    })
    .catch(error => {
        alert('❌ Erro ao chamar entregador: ' + error.message);
    });
    */

  // SIMULAÇÃO (remover quando tiver API real)
  if (
    confirm(
      `🚀 Simular chamada de entregador para o pedido #${order.id}?\n\nCliente: ${order.customer?.name}\nEndereço: ${order.shipping?.address}\n\n(Na versão real, isso acionará a API do iFood/Loggi)`,
    )
  ) {
    order.trackingCode = "SIM-" + Date.now().toString().slice(-8);
    order.trackingLink = "https://rastreio.exemplo.com/" + order.trackingCode;
    order.status = "shipped";
    order.statusUpdatedAt = new Date().toISOString();

    localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
    loadDeliveriesTable();
    loadOrdersTable();

    alert(
      `✅ Entregador simulado acionado!\n\nCódigo de rastreio: ${order.trackingCode}\n\nNa versão real, o entregador receberá o pedido automaticamente.`,
    );
  }
}

// Inicializar entregas
function initDeliveries() {
  loadDeliveriesTable();

  // Fechar modal de rastreio ao clicar fora
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("trackingModal")) {
      closeTrackingModal();
    }
  });

  // Evento do filtro
  document
    .getElementById("deliveryStatusFilter")
    ?.addEventListener("change", loadDeliveriesTable);
}

// Adicionar à inicialização
document.addEventListener("DOMContentLoaded", () => {
  // ... (código existente)
  initDeliveries();
});
// ============ CANCELAR PEDIDO (ADMIN) ============
function cancelOrderAdmin(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const motivo = prompt(
    `❌ CANCELAR PEDIDO #${orderId}\n\n` +
      `Cliente: ${order.customer?.name || "N/A"}\n` +
      `Total: R$ ${(order.total || 0).toFixed(2)}\n\n` +
      `Motivo do cancelamento:`,
  );

  if (motivo === null) return; // Clicou em Cancelar

  if (
    confirm(
      `Confirma o cancelamento do pedido #${orderId}?\n\nMotivo: ${motivo}\n\nO cliente será notificado.`,
    )
  ) {
    order.status = "cancelled";
    order.cancelledAt = new Date().toISOString();
    order.cancelledBy = "admin";
    order.cancelledReason = motivo;

    localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
    loadDeliveriesTable();
    loadOrdersTable();
    loadDashboard();

    alert("✅ Pedido #" + orderId + " cancelado com sucesso!");
  }
}

// ============ CARREGAR MAPA ============
function loadDeliveryMap() {
  const mapDiv = document.getElementById("deliveryMap");
  if (!mapDiv) return;

  // Verificar se tem chave do mapa
  const mapKey = DELIVERY_API.mapApiKey;

  if (mapKey && mapKey !== "SUA_CHAVE_MAPA_AQUI") {
    // Carregar Google Maps
    if (!window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapKey}&callback=initDeliveryMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      initDeliveryMap();
    }
  } else {
    // Mapa simples sem API (fallback)
    mapDiv.innerHTML = `
            <div style="width:100%;height:100%;background:#e8f5e9;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;">
                <span style="font-size:4rem;">📍</span>
                <p style="font-size:1.2rem;font-weight:bold;color:#2d5a27;">Amazônia em Casa</p>
                <p style="color:#666;">Av. Rômulo Maiorana, 1234 - Marco, Belém - PA</p>
                <p style="color:#999;font-size:0.9rem;">🗺️ Configure a chave do Google Maps para ver o mapa interativo</p>
            </div>
        `;
  }
}

function initDeliveryMap() {
  const mapDiv = document.getElementById("deliveryMap");
  if (!mapDiv || !window.google) return;

  // Coordenadas da loja (Av. Rômulo Maiorana, Belém)
  const storeLocation = { lat: -1.455, lng: -48.4626 };

  const map = new google.maps.Map(mapDiv, {
    center: storeLocation,
    zoom: 15,
    styles: [
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
    ],
  });

  // Marcador da loja
  const marker = new google.maps.Marker({
    position: storeLocation,
    map: map,
    title: "Amazônia em Casa",
    animation: google.maps.Animation.DROP,
    icon: {
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="%232d5a27"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18">🌿</text></svg>',
      scaledSize: new google.maps.Size(40, 40),
    },
  });

  // InfoWindow
  const infoWindow = new google.maps.InfoWindow({
    content: `
            <div style="font-family:sans-serif;min-width:200px;">
                <strong style="color:#2d5a27;">🌿 Amazônia em Casa</strong>
                <p style="margin:5px 0;">Av. Rômulo Maiorana, 1234</p>
                <p style="margin:5px 0;">Marco, Belém - PA</p>
                <p style="margin:5px 0;color:#666;">📍 Ponto de retirada e entregas</p>
            </div>
        `,
  });

  marker.addListener("click", () => {
    infoWindow.open(map, marker);
  });

  // Abrir infoWindow automaticamente
  setTimeout(() => infoWindow.open(map, marker), 1000);
}

// Carregar mapa ao inicializar
function initDeliveries() {
  loadDeliveriesTable();
  loadDeliveryMap();

  // Fechar modal ao clicar fora
  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("trackingModal")) {
      closeTrackingModal();
    }
  });

  document
    .getElementById("deliveryStatusFilter")
    ?.addEventListener("change", loadDeliveriesTable);
}
