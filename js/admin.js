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
  if (id) {
    const p = products.find((p) => p.id === id);
    if (p) {
      document.getElementById("modalTitle").textContent = "Editar Produto";
      document.getElementById("productId").value = p.id;
      document.getElementById("productName").value = p.name;
      document.getElementById("productCategory").value = p.category;
      document.getElementById("productPrice").value = p.price;
      document.getElementById("productStock").value = p.stock;
      document.getElementById("productCost").value = p.cost || "";
      document.getElementById("productDescription").value = p.description || "";
      document.getElementById("productBenefits").value = p.benefits || "";
      document.getElementById("productOrigin").value = p.origin || "";
      document.getElementById("productProducer").value = p.producer || "";
      document.getElementById("productActive").checked = p.active;
      document.getElementById("productFeatured").checked = p.featured;
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

  // Pegar a imagem
  const imageInput = document.getElementById("productImage");
  let imageData = "";

  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      imageData = e.target.result;
      finalizarSave(id, imageData);
    };
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    // Manter imagem existente se estiver editando
    const existing = products.find((p) => p.id === id);
    imageData = existing?.image || "";
    finalizarSave(id, imageData);
  }
}

function finalizarSave(id, imageData) {
  const data = {
    id,
    name: document.getElementById("productName").value,
    category: document.getElementById("productCategory").value,
    price: parseFloat(document.getElementById("productPrice").value),
    stock: parseInt(document.getElementById("productStock").value),
    cost: parseFloat(document.getElementById("productCost")?.value) || 0,
    description: document.getElementById("productDescription").value,
    benefits: document.getElementById("productBenefits").value,
    origin: document.getElementById("productOrigin").value,
    producer: document.getElementById("productProducer").value,
    active: document.getElementById("productActive").checked,
    featured: document.getElementById("productFeatured").checked,
    image: imageData,
    date: "",
    area: "",
  };

  const idx = products.findIndex((p) => p.id === id);
  if (idx >= 0) products[idx] = data;
  else products.push(data);

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
  if (coupons.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">Nenhum cupom.</td></tr>';
    return;
  }
  tbody.innerHTML = coupons
    .map(
      (c) => `
        <tr>
            <td><strong>${c.code}</strong></td><td>${c.discount}%</td><td>${c.assignedTo === "all" ? "Todos" : c.assignedTo}</td>
            <td>${new Date(c.expiresAt).toLocaleDateString("pt-BR")}</td>
            <td><span class="status-badge ${c.used || new Date(c.expiresAt) < new Date() ? "inactive" : "active"}">${c.used ? "Usado" : new Date(c.expiresAt) < new Date() ? "Expirado" : "Ativo"}</span></td>
            <td><button class="btn-sm btn-delete" onclick="deleteCoupon('${c.code}')">🗑️</button></td>
        </tr>
    `,
    )
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
  coupons.push({
    code: document.getElementById("couponCode").value.toUpperCase(),
    discount: parseInt(document.getElementById("couponDiscount").value),
    assignedTo: document.getElementById("couponAssignedTo").value,
    expiresAt: document.getElementById("couponExpiresAt").value,
    used: false,
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
