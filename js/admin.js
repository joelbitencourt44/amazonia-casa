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
      if (item.dataset.section === "messages") loadMessagesTable();
      if (item.dataset.section === "rewards") loadRewardsTable();
      if (item.dataset.section === "deliveries") loadDeliveriesTable();
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
  document.getElementById("rewardForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    saveReward();
  });
  document.getElementById("trackingForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    // A função de salvar rastreamento já está no evento do formulário
  });

  // Inicializar badge de mensagens não lidas
  updateUnreadBadge();

  // Inicializar entregas
  if (typeof initDeliveries === "function") initDeliveries();
});

function loadAll() {
  loadDashboard();
  loadProductsTable();
  loadCouponsTable();
  loadSettingsForm();
  loadContentForms();
}

function loadDashboard() {
  const today = new Date();
  const todayStr = today.toDateString();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // VENDAS HOJE - apenas pedidos de hoje (qualquer status exceto cancelado)
  const todayOrders = orders.filter((o) => {
    const orderDate = new Date(o.date);
    return orderDate.toDateString() === todayStr && o.status !== "cancelled";
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById("salesToday").textContent =
    "R$ " + todayRevenue.toFixed(2);
  document.getElementById("salesTodayCount").textContent =
    todayOrders.length + " pedido(s) hoje";

  // PEDIDOS PENDENTES
  document.getElementById("pendingOrders").textContent = orders.filter(
    (o) => o.status === "pending",
  ).length;

  // CLIENTES
  document.getElementById("activeCustomers").textContent = customers.length;

  // FATURAMENTO MÊS - pedidos do mês atual (não cancelados)
  const monthOrders = orders.filter((o) => {
    const orderDate = new Date(o.date);
    return (
      orderDate.getMonth() === thisMonth &&
      orderDate.getFullYear() === thisYear &&
      o.status !== "cancelled"
    );
  });
  const monthRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  document.getElementById("monthlyRevenue").textContent =
    "R$ " + monthRevenue.toFixed(2);
  document.getElementById("monthlyRevenueCount").textContent =
    monthOrders.length + " pedido(s) no mês";

  // Gráfico 30 dias
  loadSalesChart();

  // Produto mais vendido
  loadTopProduct(monthOrders);

  // Horário de pico
  loadPeakHours(monthOrders);

  // Custos e lucros
  loadCostsAndProfits(monthOrders);

  // Tabela de produtos
  loadProductCostTable(monthOrders);

  // Pesquisa por período
  updatePeriodSearch();
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
  const emoji = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
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
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhum produto cadastrado</td></tr>';
    return;
  }

  setupPagination("productsTable", products, (pageData, start) => {
    tbody.innerHTML = pageData
      .map(
        (p, i) => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>R$ ${(p.price || 0).toFixed(2)}</td>
                <td>${p.stock || 0}</td>
                <td><span class="status-badge ${p.active ? "active" : "inactive"}">${p.active ? "Ativo" : "Inativo"}</span></td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn-sm btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
                </td>
            </tr>
        `,
      )
      .join("");
  });
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
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:#999;">Nenhum pedido</td></tr>';
    return;
  }

  setupPagination(
    "ordersTable",
    orders.slice().reverse(),
    (pageData, start) => {
      tbody.innerHTML = pageData
        .map(
          (o) => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.customer?.name || "N/A"}</td>
                <td>${new Date(o.date).toLocaleDateString("pt-BR")}</td>
                <td>R$ ${(o.total || 0).toFixed(2)}</td>
                <td><span class="status-badge ${o.status === "delivered" ? "active" : "inactive"}">${o.status}</span></td>
            </tr>
        `,
        )
        .join("");
    },
  );
}

function loadCustomersTable() {
  const tbody = document.getElementById("customersTable");
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum cliente</td></tr>';
    return;
  }

  setupPagination("customersTable", customers, (pageData, start) => {
    tbody.innerHTML = pageData
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
                    <td><button class="btn-sm btn-edit" onclick="viewCustomerOrders('${c.email}')">📋 Pedidos</button></td>
                    <td><button class="btn-sm btn-delete" onclick="deleteCustomer('${c.email}')">🗑️</button></td>
                </tr>
            `;
      })
      .join("");
  });
}

function loadCouponsTable() {
  const tbody = document.getElementById("couponsTable");
  if (!tbody) return;

  if (coupons.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhum cupom</td></tr>';
    return;
  }

  setupPagination("couponsTable", coupons, (pageData, start) => {
    tbody.innerHTML = pageData
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
  });
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
  mapApiKey: "AIzaSyCIzYgRuTo94sm2-we2aYBk3On9vCIj6ug", // ⚠️ MUDAR AQUI
};

// Carregar tabela de entregas
function loadDeliveriesTable() {
  const tbody = document.getElementById("deliveriesTable");
  if (!tbody) return;

  const filter =
    document.getElementById("deliveryStatusFilter")?.value || "all";
  let filteredOrders =
    filter === "all" ? [...orders] : orders.filter((o) => o.status === filter);
  filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filteredOrders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:#999;">Nenhuma entrega encontrada</td></tr>';
    return;
  }

  setupPagination("deliveriesTable", filteredOrders, (pageData, start) => {
    tbody.innerHTML = pageData
      .map((order) => {
        const trackingCode = order.trackingCode || "-";
        const canCancel =
          order.status === "pending" || order.status === "confirmed";

        return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>${order.customer?.name || "N/A"}<br><small>${order.customer?.phone || ""}</small></td>
                    <td>${order.shipping?.address || "N/A"}<br><small>${order.shipping?.city || ""}</small></td>
                    <td><span class="status-badge ${getDeliveryStatusClass(order.status)}">${getDeliveryStatusName(order.status)}</span></td>
                    <td>${trackingCode !== "-" ? `<span style="background:#2d5a27;color:white;padding:0.2rem 0.5rem;border-radius:5px;">${trackingCode}</span>` : "-"}</td>
                    <td>${order.trackingLink ? `<a href="${order.trackingLink}" target="_blank" style="background:#1565c0;color:white;padding:0.3rem 0.8rem;border-radius:15px;text-decoration:none;font-size:0.85rem;">📍 Mapa</a>` : "-"}</td>
                    <td><button class="btn-sm btn-edit" onclick="openTrackingModal(${order.id})">📝</button></td>
                    <td>${canCancel ? `<button class="btn-sm btn-delete" onclick="cancelOrderAdmin(${order.id})">❌</button>` : order.status === "cancelled" ? "Cancelado" : "-"}</td>
                </tr>
            `;
      })
      .join("");
  });

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
    // Fallback sem API
    mapDiv.innerHTML = `
            <div style="width:100%;height:100%;background:#e8f5e9;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;">
                <span style="font-size:4rem;">📍</span>
                <p style="font-size:1.2rem;font-weight:bold;color:#2d5a27;">Amazônia em Casa</p>
                <p style="color:#666;">Av. Rômulo Maiorana, 891 - São Brás, Belém - PA</p>
                <p style="color:#666;">CEP: 66093-672</p>
                <p style="color:#999;font-size:0.9rem;">🗺️ Configure a chave do Google Maps para ver o mapa interativo</p>
            </div>
        `;
  }
}
function initDeliveryMap() {
  const mapDiv = document.getElementById("deliveryMap");
  if (!mapDiv || !window.google) return;

  // Coordenadas exatas: Av. Rômulo Maiorana, 891 - São Brás, Belém - PA
  const storeLocation = { lat: -1.4391101141553917, lng: -48.46443666281786 };

  const map = new google.maps.Map(mapDiv, {
    center: storeLocation,
    zoom: 17,
    styles: [
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
    ],
  });

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

  const infoWindow = new google.maps.InfoWindow({
    content: `
            <div style="font-family:sans-serif;min-width:220px;">
                <strong style="color:#2d5a27;">🌿 Amazônia em Casa</strong>
                <p style="margin:5px 0;">Av. Rômulo Maiorana, 891</p>
                <p style="margin:5px 0;">São Brás, Belém - PA</p>
                <p style="margin:5px 0;">CEP: 66093-672</p>
                <p style="margin:5px 0;color:#666;">📍 Ponto de retirada e entregas</p>
            </div>
        `,
  });

  marker.addListener("click", () => {
    infoWindow.open(map, marker);
  });

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

// ============ GRÁFICO DE VENDAS 30 DIAS ============
function loadSalesChart() {
  const chartDiv = document.getElementById("salesChart");
  if (!chartDiv) return;

  const today = new Date();
  const dailySales = {};

  // Inicializar últimos 30 dias com zero
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    dailySales[dateStr] = 0;
  }

  // Somar vendas por dia (apenas confirmados/entregues)
  orders.forEach((o) => {
    if (o.status === "cancelled") return;
    const orderDate = new Date(o.date);
    const dateStr = orderDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    if (dailySales[dateStr] !== undefined) {
      dailySales[dateStr] += o.total || 0;
    }
  });

  const salesArray = Object.entries(dailySales);
  const maxSale = Math.max(...salesArray.map(([, v]) => v), 1);

  chartDiv.innerHTML = salesArray
    .map(([date, value]) => {
      const heightPercent = (value / maxSale) * 100;
      const day = date.split("/")[0];
      return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;min-width:25px;">
                <span style="font-size:0.7rem;color:#999;margin-bottom:4px;">${value > 0 ? "R$" + value.toFixed(0) : ""}</span>
                <div style="width:100%;height:${Math.max(heightPercent, 2)}%;background:${value > 0 ? "#2d5a27" : "#e0e0e0"};border-radius:4px 4px 0 0;min-height:2px;transition:all 0.3s;" title="${date}: R$ ${value.toFixed(2)}"></div>
                <span style="font-size:0.65rem;color:#999;margin-top:4px;">${day}</span>
            </div>
        `;
    })
    .join("");
}

// ============ PESQUISA POR PERÍODO ============
function searchByPeriod() {
  const startDate = document.getElementById("searchDateStart").value;
  const endDate = document.getElementById("searchDateEnd").value;

  if (!startDate || !endDate) return;

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");

  const filteredOrders = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    const orderDate = new Date(o.date);
    return orderDate >= start && orderDate <= end;
  });

  const revenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById("periodResult").style.display = "block";
  document.getElementById("periodRevenue").textContent =
    "R$ " + revenue.toFixed(2);
  document.getElementById("periodOrders").textContent = filteredOrders.length;
}

function quickPeriodSelect() {
  const value = document.getElementById("quickPeriod").value;
  if (!value) return;

  const today = new Date();
  let start = new Date();
  let end = new Date();

  switch (value) {
    case "today":
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
      );
      break;
    case "yesterday":
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
      );
      end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
        23,
        59,
        59,
      );
      break;
    case "last7":
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 7,
      );
      end = today;
      break;
    case "last30":
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 30,
      );
      end = today;
      break;
    case "thisMonth":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = today;
      break;
    case "lastMonth":
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      break;
    case "thisYear":
      start = new Date(today.getFullYear(), 0, 1);
      end = today;
      break;
  }

  document.getElementById("searchDateStart").value = start
    .toISOString()
    .split("T")[0];
  document.getElementById("searchDateEnd").value = end
    .toISOString()
    .split("T")[0];
  searchByPeriod();
}

function updatePeriodSearch() {
  // Define as datas padrão como este mês
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById("searchDateStart").value = start
    .toISOString()
    .split("T")[0];
  document.getElementById("searchDateEnd").value = today
    .toISOString()
    .split("T")[0];
  searchByPeriod();
}

// ============ TOP PRODUCT ============
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
  const emoji = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
  const cat = products.find((p) => p.name === top[0])?.category || "";

  container.innerHTML = `
        <div style="font-size:3rem;">${emoji[cat] || "🏆"}</div>
        <p style="font-size:1.3rem; font-weight:bold; color:#2d5a27;">${top[0]}</p>
        <p style="font-size:2rem; font-weight:bold;">${top[1]} vendidos</p>
    `;
}

// ============ PEAK HOURS ============
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

// ============ COSTS AND PROFITS ============
function loadCostsAndProfits(monthOrders) {
  const totalRevenue = monthOrders.reduce((s, o) => s + (o.total || 0), 0);

  let totalCost = 0;
  monthOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const product = products.find((p) => p.name === item.name);
      const cost = product?.cost || item.price * 0.4;
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

// ============ PRODUCT COST TABLE ============
function loadProductCostTable(monthOrders) {
  const tbody = document.getElementById("productCostTable");

  if (products.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum produto cadastrado</td></tr>';
    return;
  }

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

// ============ RECOMPENSAS ============
let rewards = JSON.parse(localStorage.getItem("amazoniaRewards")) || [];

// Salvar recompensas
function saveRewards() {
  localStorage.setItem("amazoniaRewards", JSON.stringify(rewards));
}

// Carregar tabela
function loadRewardsTable() {
  const tbody = document.getElementById("rewardsTable");
  if (!tbody) return;

  if (rewards.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum nível cadastrado</td></tr>';
    return;
  }

  rewards.sort((a, b) => a.minValue - b.minValue);

  setupPagination("rewardsTable", rewards, (pageData, start) => {
    tbody.innerHTML = pageData
      .map((r) => {
        const customersReached = customers.filter((c) => {
          const customerOrders = orders.filter(
            (o) => o.customer?.email === c.email && o.status !== "cancelled",
          );
          const totalSpent = customerOrders.reduce(
            (s, o) => s + (o.total || 0),
            0,
          );
          return totalSpent >= r.minValue;
        }).length;

        return `
                <tr>
                    <td><strong style="color:${r.color};">${r.icon} ${r.name}</strong></td>
                    <td>R$ ${r.minValue.toFixed(2)}</td>
                    <td>${r.description}</td>
                    <td style="font-size:2rem;">${r.icon}</td>
                    <td>${customersReached} cliente(s)</td>
                    <td><span class="status-badge ${r.active ? "active" : "inactive"}">${r.active ? "Ativo" : "Inativo"}</span></td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="editReward('${r.id}')">✏️</button>
                        <button class="btn-sm btn-delete" onclick="deleteReward('${r.id}')">🗑️</button>
                    </td>
                </tr>
            `;
      })
      .join("");
  });
}

// Abrir modal
function openRewardModal(id = null) {
  const modal = document.getElementById("rewardModal");
  document.getElementById("rewardForm").reset();
  document.getElementById("rewardId").value = "";
  document.getElementById("rewardModalTitle").textContent =
    "Novo Nível de Recompensa";

  if (id) {
    const r = rewards.find((r) => r.id === id);
    if (r) {
      document.getElementById("rewardModalTitle").textContent = "Editar Nível";
      document.getElementById("rewardId").value = r.id;
      document.getElementById("rewardName").value = r.name;
      document.getElementById("rewardMinValue").value = r.minValue;
      document.getElementById("rewardDescription").value = r.description;
      document.getElementById("rewardIcon").value = r.icon;
      document.getElementById("rewardColor").value = r.color;
      document.getElementById("rewardActive").checked = r.active;
    }
  }

  modal.style.display = "flex";
}

function closeRewardModal() {
  document.getElementById("rewardModal").style.display = "none";
}

function editReward(id) {
  openRewardModal(id);
}

function deleteReward(id) {
  if (confirm("Excluir este nível de recompensa?")) {
    rewards = rewards.filter((r) => r.id !== id);
    saveRewards();

    // Também remove os resgates deste nível
    const redeemedRewards =
      JSON.parse(localStorage.getItem("amazoniaRedeemedRewards")) || [];
    const filtered = redeemedRewards.filter((r) => r.rewardId !== id);
    localStorage.setItem("amazoniaRedeemedRewards", JSON.stringify(filtered));

    loadRewardsTable();
    alert("✅ Nível excluído!");
  }
}

// Salvar recompensa
document.getElementById("rewardForm")?.addEventListener("submit", function (e) {
  e.preventDefault();

  const id = document.getElementById("rewardId").value || Date.now().toString();
  const rewardData = {
    id,
    name: document.getElementById("rewardName").value,
    minValue: parseFloat(document.getElementById("rewardMinValue").value),
    description: document.getElementById("rewardDescription").value,
    icon: document.getElementById("rewardIcon").value || "⭐",
    color: document.getElementById("rewardColor").value,
    active: document.getElementById("rewardActive").checked,
    createdAt: new Date().toISOString(),
  };

  const idx = rewards.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rewards[idx] = rewardData;
  } else {
    rewards.push(rewardData);
  }

  saveRewards();
  loadRewardsTable();
  closeRewardModal();
  alert("✅ Nível salvo!");
});

// Inicializar
function initRewards() {
  loadRewardsTable();

  window.addEventListener("click", (e) => {
    if (e.target === document.getElementById("rewardModal")) {
      closeRewardModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // ... outras inicializações ...
  initRewards();
});

// ============ MENSAGENS ============
function loadMessagesTable() {
  const tbody = document.getElementById("messagesTable");
  if (!tbody) return;

  const feedbacks = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];

  if (feedbacks.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhuma mensagem recebida</td></tr>';
    updateUnreadBadge();
    return;
  }

  setupPagination(
    "messagesTable",
    feedbacks.slice().reverse(),
    (pageData, start) => {
      tbody.innerHTML = pageData
        .map(
          (f) => `
            <tr style="${f.read ? "" : "background:#f0f7ee;font-weight:bold;"}">
                <td>${new Date(f.date).toLocaleString("pt-BR")}</td>
                <td>${f.name}</td>
                <td class="email-column" style="${emailsVisible ? "" : "display:none;"}">${f.email}</td>
                <td>${f.message.length > 50 ? f.message.substring(0, 50) + "..." : f.message}</td>
                <td><span class="status-badge ${f.read ? "active" : "inactive"}">${f.read ? "✅ Lida" : "🔵 Nova"}</span></td>
                <td>
                    <button class="btn-sm btn-edit" onclick="viewMessage(${f.id})">👁️ Ver</button>
                    <button class="btn-sm btn-delete" onclick="deleteMessage(${f.id})">🗑️</button>
                </td>
            </tr>
        `,
        )
        .join("");
    },
  );

  updateUnreadBadge();
}

function updateUnreadBadge() {
  const badge = document.getElementById("unreadBadge");
  if (!badge) return;

  const feedbacks = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
  const unreadCount = feedbacks.filter((f) => !f.read).length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function viewMessage(id) {
  const feedbacks = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
  const f = feedbacks.find((fb) => fb.id === id);
  if (!f) return;

  f.read = true;
  localStorage.setItem("amazoniaFeedbacks", JSON.stringify(feedbacks));
  loadMessagesTable();
  updateUnreadBadge();

  alert(
    `📬 Mensagem de ${f.name}\n\n📧 E-mail: ${f.email}\n📅 Data: ${new Date(f.date).toLocaleString("pt-BR")}\n\n📝 Mensagem:\n${f.message}`,
  );
}

function deleteMessage(id) {
  if (confirm("Excluir esta mensagem?")) {
    let feedbacks = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
    feedbacks = feedbacks.filter((f) => f.id !== id);
    localStorage.setItem("amazoniaFeedbacks", JSON.stringify(feedbacks));
    loadMessagesTable();
    updateUnreadBadge();
    alert("✅ Mensagem excluída!");
  }
}

// ============ PAGINAÇÃO ============
const ITEMS_PER_PAGE = 10;
let currentPages = {};

function setupPagination(tableId, dataArray, renderFunction, containerId) {
  const container = document.getElementById(containerId || tableId);
  if (!container) return;

  const totalPages = Math.ceil(dataArray.length / ITEMS_PER_PAGE);
  const currentPage = currentPages[tableId] || 1;

  // Renderizar itens da página atual
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageData = dataArray.slice(start, end);

  // Chamar a função de renderização com os dados paginados
  renderFunction(pageData, start);

  // Criar controles de paginação
  let paginationHTML = '<div class="pagination-container">';

  // Botão Anterior
  paginationHTML += `<button class="pagination-btn" onclick="changePage('${tableId}', ${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>← Anterior</button>`;

  // Números das páginas
  for (let i = 1; i <= totalPages; i++) {
    if (
      totalPages <= 7 ||
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      paginationHTML += `<button class="pagination-btn ${i === currentPage ? "active" : ""}" onclick="changePage('${tableId}', ${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      paginationHTML += `<span style="color:#999;">...</span>`;
    }
  }

  // Botão Próximo
  paginationHTML += `<button class="pagination-btn" onclick="changePage('${tableId}', ${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>Próximo →</button>`;

  paginationHTML += "</div>";
  paginationHTML += `<p class="pagination-info">Mostrando ${start + 1}-${Math.min(end, dataArray.length)} de ${dataArray.length} itens</p>`;

  // Remover paginação antiga se existir
  const oldPagination = container.querySelector(".pagination-container");
  if (oldPagination) oldPagination.remove();
  const oldInfo = container.querySelector(".pagination-info");
  if (oldInfo) oldInfo.remove();

  // Adicionar nova paginação
  container.insertAdjacentHTML("beforeend", paginationHTML);
}

function changePage(tableId, page) {
  currentPages[tableId] = page;

  // Recarregar a tabela correspondente
  const loadFunctions = {
    productsTable: loadProductsTable,
    ordersTable: loadOrdersTable,
    customersTable: loadCustomersTable,
    couponsTable: loadCouponsTable,
    deliveriesTable: loadDeliveriesTable,
    rewardsTable: loadRewardsTable,
    messagesTable: loadMessagesTable,
  };

  if (loadFunctions[tableId]) {
    loadFunctions[tableId]();
  }
}

// ============ MOSTRAR/ESCONDER E-MAILS ============
let emailsVisible = true;

function toggleEmails() {
  emailsVisible = !emailsVisible;

  const btn = document.getElementById("toggleEmailsBtn");
  const emailColumns = document.querySelectorAll(".email-column");

  if (emailsVisible) {
    btn.innerHTML = "👁️ Mostrar E-mails";
    btn.style.background = "transparent";
    btn.style.color = "#2d5a27";
    emailColumns.forEach((col) => (col.style.display = ""));
  } else {
    btn.innerHTML = "🔒 Esconder E-mails";
    btn.style.background = "#e0e0e0";
    btn.style.color = "#999";
    emailColumns.forEach((col) => (col.style.display = "none"));
  }

  // Recarregar tabela para aplicar a mudança
  loadMessagesTable();
}

// ============ SISTEMA DE ADMINISTRADORES ============

function checkAdminAccess() {
  const session = JSON.parse(localStorage.getItem("amazoniaAdminSession"));
  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("adminNameDisplay").textContent =
    "👤 " + session.name;

  if (session.role === "master") {
    const navAdmins = document.getElementById("navAdmins");
    if (navAdmins) navAdmins.style.display = "flex";
  }

  // Logout
  const logoutBtn = document.querySelector(".sidebar-footer .btn-logout");
  if (logoutBtn) {
    logoutBtn.onclick = function () {
      localStorage.removeItem("amazoniaAdminSession");
      window.location.href = "admin-login.html";
    };
  }
}

function formatCPFAdmin(input) {
  let value = input.value.replace(/\D/g, "").slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  input.value = value;
}

function previewAdminPhoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("adminPhotoPreview");
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
  }
}

function loadAdminsTable() {
  const tbody = document.getElementById("adminsTable");
  if (!tbody) return;
  const admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
  const session = JSON.parse(localStorage.getItem("amazoniaAdminSession"));

  if (admins.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum admin cadastrado</td></tr>';
    return;
  }

  tbody.innerHTML = admins
    .map(
      (a) => `
        <tr>
            <td>
                <div style="width:45px;height:45px;border-radius:50%;overflow:hidden;background:#e0e0e0;display:flex;align-items:center;justify-content:center;">
                    ${a.photo ? `<img src="${a.photo}" style="width:100%;height:100%;object-fit:cover;">` : "<span>👤</span>"}
                </div>
            </td>
            <td><strong>${a.name}</strong></td>
            <td>${a.email}</td>
            <td>${a.cpf || "-"}</td>
            <td>${a.birthDate ? new Date(a.birthDate + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</td>
            <td><span class="status-badge ${a.role === "master" ? "active" : "inactive"}">${a.role === "master" ? "👑 Master" : "👤 Admin"}</span></td>
            <td>
                <button class="btn-sm btn-edit" onclick="editAdmin('${a.id}')">✏️</button>
                ${a.id !== session?.id ? `<button class="btn-sm btn-delete" onclick="deleteAdmin('${a.id}')">🗑️</button>` : '<span style="color:#999;">Você</span>'}
            </td>
        </tr>
    `,
    )
    .join("");
}

function openAdminModal(id = null) {
  const modal = document.getElementById("adminModal");
  document.getElementById("adminForm").reset();
  document.getElementById("adminId").value = "";
  document.getElementById("adminModalTitle").textContent = "Novo Administrador";
  document.getElementById("adminPhotoPreview").innerHTML =
    '<span style="font-size:3rem;">👤</span>';

  if (id) {
    const admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
    const a = admins.find((a) => a.id === id);
    if (a) {
      document.getElementById("adminModalTitle").textContent =
        "Editar Administrador";
      document.getElementById("adminId").value = a.id;
      document.getElementById("adminName").value = a.name;
      document.getElementById("adminEmail").value = a.email;
      document.getElementById("adminCpf").value = a.cpf
        ? formatCPFDisplay(a.cpf)
        : "";
      document.getElementById("adminBirthDate").value = a.birthDate || "";
      document.getElementById("adminPassword").value = a.password;
      document.getElementById("adminRole").value = a.role;
      if (a.photo) {
        document.getElementById("adminPhotoPreview").innerHTML =
          `<img src="${a.photo}" style="width:100%;height:100%;object-fit:cover;">`;
      }
    }
  }
  modal.style.display = "flex";
}

function formatCPFDisplay(cpf) {
  if (!cpf) return "";
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length === 11)
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return cpf;
}

function closeAdminModal() {
  document.getElementById("adminModal").style.display = "none";
}
function editAdmin(id) {
  openAdminModal(id);
}

function deleteAdmin(id) {
  if (confirm("Excluir este administrador?")) {
    let admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
    admins = admins.filter((a) => a.id !== id);
    localStorage.setItem("amazoniaAdmins", JSON.stringify(admins));
    loadAdminsTable();
    alert("✅ Administrador excluído!");
  }
}

document.getElementById("adminForm")?.addEventListener("submit", function (e) {
  e.preventDefault();
  const admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
  const id = document.getElementById("adminId").value || "admin-" + Date.now();

  const photoInput = document.getElementById("adminPhoto");
  const existingAdmin = admins.find((a) => a.id === id);
  let photoData = existingAdmin?.photo || "";

  if (photoInput.files && photoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      photoData = e.target.result;
      saveAdminData(id, photoData);
    };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    saveAdminData(id, photoData);
  }
});

function saveAdminData(id, photoData) {
  const admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
  const adminData = {
    id: id,
    name: document.getElementById("adminName").value,
    email: document.getElementById("adminEmail").value.trim(),
    cpf: document.getElementById("adminCpf").value.replace(/\D/g, ""),
    birthDate: document.getElementById("adminBirthDate").value,
    password: document.getElementById("adminPassword").value,
    photo: photoData,
    role: document.getElementById("adminRole").value,
    createdAt: new Date().toISOString(),
  };

  console.log("Salvando admin:", adminData);

  const idx = admins.findIndex((a) => a.id === id);
  if (idx >= 0) {
    admins[idx] = adminData;
  } else {
    admins.push(adminData);
  }

  localStorage.setItem("amazoniaAdmins", JSON.stringify(admins));
  loadAdminsTable();
  closeAdminModal();
  alert("✅ Administrador salvo!");

  console.log("Total de admins após salvar:", admins.length);
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  checkAdminAccess();
  loadAdminsTable();
});
