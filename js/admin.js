var products = [];
var siteData = {};
var orders = [];
var customers = [];
var coupons = [];
var rewards = [];

// ============ INICIALIZAÇÃO ============
document.addEventListener("DOMContentLoaded", async function () {
  checkAdminAccess();
  await loadAllData();

  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelectorAll(".nav-item").forEach(function (i) {
        i.classList.remove("active");
      });
      item.classList.add("active");
      document.querySelectorAll(".admin-section").forEach(function (s) {
        s.classList.remove("active");
      });
      document.getElementById(item.dataset.section).classList.add("active");

      if (item.dataset.section === "products") loadProductsTable();
      if (item.dataset.section === "orders") loadOrdersTable();
      if (item.dataset.section === "customers") loadCustomersTable();
      if (item.dataset.section === "coupons") loadCouponsTable();
      if (item.dataset.section === "content") loadContentForms();
      if (item.dataset.section === "settings") loadSettingsForm();
      if (item.dataset.section === "messages") loadMessagesTable();
      if (item.dataset.section === "chatbot") loadChatbotTable();
      if (item.dataset.section === "rewards") loadRewardsTable();
      if (item.dataset.section === "deliveries") loadDeliveriesTable();
      if (item.dataset.section === "admins") loadAdminsTable();
      loadDashboard();
    });
  });

  document
    .getElementById("menuToggleAdmin")
    ?.addEventListener("click", function () {
      var sidebar = document.getElementById("adminSidebar");
      sidebar.classList.toggle("open");

      // Mostrar/Esconder botão X
      var closeBtn = document.getElementById("sidebarClose");
      if (closeBtn) {
        closeBtn.style.display = sidebar.classList.contains("open")
          ? "block"
          : "none";
      }
    });

  // Botão X para fechar sidebar no mobile
  document
    .getElementById("sidebarClose")
    ?.addEventListener("click", function () {
      document.getElementById("adminSidebar").classList.remove("open");
    });

  document
    .getElementById("productForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      saveProduct();
    });
  document
    .getElementById("couponForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      saveCoupon();
    });
  document
    .getElementById("settingsForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      saveSettings();
    });
  document.getElementById("heroForm")?.addEventListener("submit", function (e) {
    e.preventDefault();
    saveHero();
  });
  document
    .getElementById("aboutForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      saveAbout();
    });
  document
    .getElementById("rewardForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      saveReward();
    });
  window.saveTracking = function (e) {
    e.preventDefault();

    var orderId = parseInt(document.getElementById("trackingOrderId").value);
    var trackingCode = document.getElementById("trackingCode").value;
    var trackingLink = document.getElementById("trackingLink").value;
    var newStatus = document.getElementById("trackingStatus").value;

    updateOrderStatus(orderId, trackingCode, trackingLink, newStatus);
  };
  document
    .getElementById("adminForm")
    ?.addEventListener("submit", function (e) {
      e.preventDefault();
      var id =
        document.getElementById("adminId").value || "admin-" + Date.now();
      var photoInput = document.getElementById("adminPhoto");
      if (photoInput.files && photoInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function (e) {
          saveAdminData(id, e.target.result);
        };
        reader.readAsDataURL(photoInput.files[0]);
      } else {
        saveAdminData(id, "");
      }
    });

  updateUnreadBadge();
  if (typeof initDeliveries === "function") initDeliveries();
});
// ============ CARREGAR DADOS DO FIREBASE ============
async function loadAllData() {
  try {
    var prodSnap = await db.collection("products").get();
    products = [];
    prodSnap.forEach(function (doc) {
      products.push({ id: doc.id, ...doc.data() });
    });

    var orderSnap = await db.collection("orders").orderBy("date", "desc").get();
    orders = [];
    orderSnap.forEach(function (doc) {
      orders.push({ id: doc.id, ...doc.data() });
    });

    var custSnap = await db.collection("customers").get();
    customers = [];
    custSnap.forEach(function (doc) {
      customers.push({ id: doc.id, ...doc.data() });
    });

    var coupSnap = await db.collection("coupons").get();
    coupons = [];
    coupSnap.forEach(function (doc) {
      coupons.push({ id: doc.id, ...doc.data() });
    });

    var configDoc = await db.collection("siteConfig").doc("config").get();
    if (configDoc.exists) siteData = configDoc.data();

    var rewSnap = await db.collection("rewards").get();
    rewards = [];
    rewSnap.forEach(function (doc) {
      rewards.push({ id: doc.id, ...doc.data() });
    });

    loadAll();
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    loadAllLocal();
  }
}

function loadAllLocal() {
  products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
  siteData = JSON.parse(localStorage.getItem("amazoniaData")) || {};
  orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
  customers = JSON.parse(localStorage.getItem("amazoniaCustomers")) || [];
  coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];
  rewards = JSON.parse(localStorage.getItem("amazoniaRewards")) || [];
  loadAll();
}

function loadAll() {
  loadDashboard();
  loadProductsTable();
  loadOrdersTable();
  loadCustomersTable();
  loadCouponsTable();
  loadSettingsForm();
  loadContentForms();
  loadRewardsTable();
  loadMessagesTable();
  loadAdminsTable();
}

function loadDashboard() {
  var today = new Date();
  var todayStr = today.toDateString();
  var todayOrders = orders.filter(function (o) {
    return (
      new Date(o.date).toDateString() === todayStr && o.status !== "cancelled"
    );
  });
  document.getElementById("salesToday").textContent =
    "R$ " +
    todayOrders
      .reduce(function (s, o) {
        return s + (o.total || 0);
      }, 0)
      .toFixed(2);
  document.getElementById("pendingOrders").textContent = orders.filter(
    function (o) {
      return o.status === "pending";
    },
  ).length;
  document.getElementById("activeCustomers").textContent = customers.length;
  var monthOrders = orders.filter(function (o) {
    return (
      new Date(o.date).getMonth() === today.getMonth() &&
      new Date(o.date).getFullYear() === today.getFullYear() &&
      o.status !== "cancelled"
    );
  });
  document.getElementById("monthlyRevenue").textContent =
    "R$ " +
    monthOrders
      .reduce(function (s, o) {
        return s + (o.total || 0);
      }, 0)
      .toFixed(2);
  loadSalesChart();
  loadTopProduct(monthOrders);
  loadPeakHours(monthOrders);
  loadCostsAndProfits(monthOrders);
  loadProductCostTable(monthOrders);
  updatePeriodSearch();
}

function loadSalesChart() {
  var chart = document.getElementById("salesChart");
  if (!chart) return;
  var today = new Date();
  var sales = {};
  for (var i = 29; i >= 0; i--) {
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    sales[d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })] =
      0;
  }
  orders.forEach(function (o) {
    if (o.status === "cancelled") return;
    var ds = new Date(o.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    if (sales[ds] !== undefined) sales[ds] += o.total || 0;
  });
  var arr = Object.entries(sales);
  var max =
    Math.max.apply(
      null,
      arr.map(function (a) {
        return a[1];
      }),
    ) || 1;
  chart.innerHTML = arr
    .map(function (a) {
      var d = a[0],
        v = a[1];
      return (
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;min-width:25px;"><span style="font-size:0.7rem;color:#999;">' +
        (v > 0 ? "R$" + v.toFixed(0) : "") +
        '</span><div style="width:100%;height:' +
        Math.max((v / max) * 100, 2) +
        "%;background:" +
        (v > 0 ? "#2d5a27" : "#e0e0e0") +
        ';border-radius:4px 4px 0 0;"></div><span style="font-size:0.65rem;color:#999;">' +
        d.split("/")[0] +
        "</span></div>"
      );
    })
    .join("");
}
function searchByPeriod() {
  var s = new Date(
    document.getElementById("searchDateStart").value + "T00:00:00",
  );
  var e = new Date(
    document.getElementById("searchDateEnd").value + "T23:59:59",
  );
  var filtered = orders.filter(function (o) {
    return (
      o.status !== "cancelled" && new Date(o.date) >= s && new Date(o.date) <= e
    );
  });
  document.getElementById("periodResult").style.display = "block";
  document.getElementById("periodRevenue").textContent =
    "R$ " +
    filtered
      .reduce(function (s, o) {
        return s + (o.total || 0);
      }, 0)
      .toFixed(2);
  document.getElementById("periodOrders").textContent = filtered.length;
}

function quickPeriodSelect() {
  var v = document.getElementById("quickPeriod").value;
  if (!v) return;
  var today = new Date(),
    start,
    end;
  switch (v) {
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
  var today = new Date();
  document.getElementById("searchDateStart").value = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  document.getElementById("searchDateEnd").value = today
    .toISOString()
    .split("T")[0];
  searchByPeriod();
}

function loadTopProduct(monthOrders) {
  var container = document.getElementById("topProduct");
  var sales = {};
  monthOrders.forEach(function (o) {
    o.items?.forEach(function (i) {
      if (!sales[i.name]) sales[i.name] = 0;
      sales[i.name] += i.quantity || 0;
    });
  });
  var sorted = Object.entries(sales).sort(function (a, b) {
    return b[1] - a[1];
  });
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;">Nenhuma venda ainda</p>';
    return;
  }
  var top = sorted[0];
  var emoji = { meis: "🍯", propolis: "🐝", oleos: "🧴", suplementos: "💊" };
  container.innerHTML =
    '<div style="font-size:3rem;">' +
    (emoji[
      products.find(function (p) {
        return p.name === top[0];
      })?.category
    ] || "🏆") +
    '</div><p style="font-size:1.3rem;font-weight:bold;color:#2d5a27;">' +
    top[0] +
    '</p><p style="font-size:2rem;font-weight:bold;">' +
    top[1] +
    " vendidos</p>";
}

function loadPeakHours(monthOrders) {
  var container = document.getElementById("peakHours");
  var hours = {};
  monthOrders.forEach(function (o) {
    var h = new Date(o.date).getHours();
    if (!hours[h]) hours[h] = 0;
    hours[h]++;
  });
  var sorted = Object.entries(hours).sort(function (a, b) {
    return b[1] - a[1];
  });
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;">Nenhum pedido ainda</p>';
    return;
  }
  var peak = sorted[0];
  container.innerHTML =
    '<div style="font-size:3rem;">⏰</div><p style="font-size:1.3rem;font-weight:bold;color:#e65100;">Horário de Pico</p><p style="font-size:2rem;font-weight:bold;">' +
    peak[0] +
    "h - " +
    (parseInt(peak[0]) + 2) +
    'h</p><p style="color:#999;">' +
    peak[1] +
    " pedidos</p>";
}

function loadCostsAndProfits(monthOrders) {
  var rev = monthOrders.reduce(function (s, o) {
    return s + (o.total || 0);
  }, 0);
  var cost = 0;
  monthOrders.forEach(function (o) {
    o.items?.forEach(function (i) {
      var p = products.find(function (p) {
        return p.name === i.name;
      });
      cost += (p?.cost || i.price * 0.4) * (i.quantity || 0);
    });
  });
  var profit = rev - cost;
  var margin = rev > 0 ? (profit / rev) * 100 : 0;
  document.getElementById("totalRevenue").textContent = "R$ " + rev.toFixed(2);
  document.getElementById("totalCost").textContent = "R$ " + cost.toFixed(2);
  document.getElementById("totalProfit").textContent =
    "R$ " + profit.toFixed(2);
  document.getElementById("profitMargin").textContent = margin.toFixed(1) + "%";
}

function loadProductCostTable(monthOrders) {
  var tbody = document.getElementById("productCostTable");
  if (!products.length) return;
  var sales = {};
  monthOrders.forEach(function (o) {
    o.items?.forEach(function (i) {
      if (!sales[i.name]) sales[i.name] = 0;
      sales[i.name] += i.quantity || 0;
    });
  });
  tbody.innerHTML = products
    .map(function (p) {
      var sold = sales[p.name] || 0;
      var cost = p.cost || p.price * 0.4;
      var profit = p.price - cost;
      return (
        "<tr><td><strong>" +
        p.name +
        "</strong></td><td>R$ " +
        p.price.toFixed(2) +
        "</td><td>R$ " +
        cost.toFixed(2) +
        '</td><td style="color:#2d5a27;">R$ ' +
        profit.toFixed(2) +
        "</td><td>" +
        ((profit / p.price) * 100).toFixed(0) +
        "%</td><td>" +
        sold +
        '</td><td style="font-weight:bold;">R$ ' +
        (profit * sold).toFixed(2) +
        "</td></tr>"
      );
    })
    .join("");
}

// ============ PRODUTOS ============
async function loadProductsTable() {
  var tbody = document.getElementById("productsTable");
  if (!tbody) return;
  try {
    var snap = await db.collection("products").get();
    products = [];
    snap.forEach(function (d) {
      products.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    products = JSON.parse(localStorage.getItem("amazoniaProducts")) || [];
  }
  if (!products.length) return;
  setupPagination("productsTable", products, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (p) {
        return (
          "<tr><td><strong>" +
          p.name +
          "</strong></td><td>" +
          getCategoryName(p.category) +
          "</td><td>R$ " +
          (p.price || 0).toFixed(2) +
          "</td><td>" +
          (p.stock || 0) +
          '</td><td><span class="status-badge ' +
          (p.active ? "active" : "inactive") +
          '">' +
          (p.active ? "Ativo" : "Inativo") +
          '</span></td><td><button class="btn-sm btn-edit" onclick="editProduct(\'' +
          p.id +
          '\')">✏️</button><button class="btn-sm btn-delete" onclick="deleteProduct(\'' +
          p.id +
          "')\">🗑️</button></td></tr>"
        );
      })
      .join("");
  });
}

function openProductModal(id) {
  var modal = document.getElementById("productModal");
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("modalTitle").textContent = "Novo Produto";
  document.getElementById("productActive").checked = true;
  document.getElementById("productFeatured").checked = false;
  var preview = document.getElementById("imagePreview");
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  if (id) {
    var p = products.find(function (p) {
      return p.id === id;
    });
    if (p) {
      document.getElementById("modalTitle").textContent = "Editar Produto";
      document.getElementById("productId").value = p.id;
      document.getElementById("productName").value = p.name || "";
      document.getElementById("productCategory").value = p.category || "meis";
      document.getElementById("productPrice").value = p.price || 0;
      document.getElementById("productStock").value = p.stock || 0;
      document.getElementById("productCost").value = p.cost || "";
      document.getElementById("productDescription").value = p.description || "";
      document.getElementById("productBenefits").value = p.benefits || "";
      document.getElementById("productOrigin").value = p.origin || "";
      document.getElementById("productProducer").value = p.producer || "";
      document.getElementById("productArea").value = p.area || "";
      document.getElementById("productDate").value = p.date || "";
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
}

async function deleteProduct(id) {
  if (confirm("Excluir este produto?")) {
    try {
      await db.collection("products").doc(id.toString()).delete();
    } catch (e) {
      products = products.filter(function (p) {
        return p.id !== id;
      });
      localStorage.setItem("amazoniaProducts", JSON.stringify(products));
    }
    loadProductsTable();
    loadDashboard();
    alert("✅ Excluído!");
  }
}

function saveProduct() {
  var id = document.getElementById("productId").value || Date.now().toString();
  var imgInput = document.getElementById("productImage");
  if (imgInput?.files?.[0]) {
    var r = new FileReader();
    r.onload = function (e) {
      finalizarSaveProduto(id, e.target.result);
    };
    r.readAsDataURL(imgInput.files[0]);
  } else {
    var existing = products.find(function (p) {
      return p.id === id;
    });
    finalizarSaveProduto(id, existing?.image || "");
  }
}

async function finalizarSaveProduto(id, imageData) {
  var data = {
    name: document.getElementById("productName").value,
    category: document.getElementById("productCategory").value,
    price: parseFloat(document.getElementById("productPrice").value) || 0,
    stock: parseInt(document.getElementById("productStock").value) || 0,
    cost: parseFloat(document.getElementById("productCost")?.value) || 0,
    description: document.getElementById("productDescription").value,
    benefits: document.getElementById("productBenefits").value,
    origin: document.getElementById("productOrigin").value,
    producer: document.getElementById("productProducer").value,
    area: document.getElementById("productArea").value,
    date: document.getElementById("productDate").value,
    active: document.getElementById("productActive").checked,
    featured: document.getElementById("productFeatured").checked,
    image: imageData,
    updatedAt: new Date().toISOString(),
  };
  try {
    var existingDoc = await db.collection("products").doc(id.toString()).get();
    if (existingDoc.exists) {
      await db.collection("products").doc(id.toString()).update(data);
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection("products").doc(id.toString()).set(data);
    }
  } catch (e) {
    var idx = products.findIndex(function (p) {
      return p.id === id;
    });
    if (idx >= 0) products[idx] = data;
    else products.push({ id: id, ...data });
    localStorage.setItem("amazoniaProducts", JSON.stringify(products));
  }
  loadProductsTable();
  loadDashboard();
  closeProductModal();
  alert("✅ Produto salvo!");
}
// ============ PEDIDOS ============
async function loadOrdersTable() {
  var tbody = document.getElementById("ordersTable");
  if (!tbody) return;
  try {
    var snap = await db.collection("orders").orderBy("date", "desc").get();
    orders = [];
    snap.forEach(function (d) {
      orders.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    orders = JSON.parse(localStorage.getItem("amazoniaOrders")) || [];
  }
  if (!orders.length) return;
  setupPagination("ordersTable", orders, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (o) {
        return (
          "<tr><td>#" +
          (o.orderNumber || o.id) +
          "</td><td>" +
          (o.customer?.name || "N/A") +
          "</td><td>" +
          new Date(o.date).toLocaleDateString("pt-BR") +
          "</td><td>R$ " +
          (o.total || 0).toFixed(2) +
          '</td><td><span class="status-badge">' +
          getStatusName(o.status) +
          "</span></td></tr>"
        );
      })
      .join("");
  });
}

// ============ CLIENTES ============
async function loadCustomersTable() {
  var tbody = document.getElementById("customersTable");
  if (!tbody) return;
  try {
    var snap = await db.collection("customers").get();
    customers = [];
    snap.forEach(function (d) {
      customers.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    customers = JSON.parse(localStorage.getItem("amazoniaCustomers")) || [];
  }
  if (!customers.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum cliente</td></tr>';
    return;
  }
  setupPagination("customersTable", customers, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (c) {
        var phone = c.phone ? c.phone.replace(/\D/g, "") : "";
        return (
          "<tr><td><strong>" +
          c.name +
          "</strong></td><td>" +
          c.email +
          "</td><td>" +
          (c.phone || "-") +
          "</td><td>" +
          (c.city || "-") +
          "</td><td>" +
          (phone
            ? '<a href="https://wa.me/55' +
              phone +
              '" target="_blank" style="background:#25D366;color:white;padding:0.4rem 0.8rem;border-radius:20px;text-decoration:none;">💬 WhatsApp</a>'
            : "-") +
          '</td><td><button class="btn-sm btn-edit" onclick="viewCustomerOrders(\'' +
          c.email +
          '\')">📋 Pedidos</button></td><td><button class="btn-sm btn-delete" onclick="deleteCustomer(\'' +
          c.id +
          "')\">🗑️ Excluir</button></td></tr>"
        );
      })
      .join("");
  });
}

async function deleteCustomer(id) {
  if (confirm("Excluir este cliente?")) {
    try {
      await db.collection("customers").doc(id.toString()).delete();
    } catch (e) {
      var c = JSON.parse(localStorage.getItem("amazoniaCustomers")) || [];
      c = c.filter(function (x) {
        return x.id !== id;
      });
      localStorage.setItem("amazoniaCustomers", JSON.stringify(c));
    }
    loadCustomersTable();
    alert("✅ Cliente excluído!");
  }
}

function viewCustomerOrders(email) {
  var custOrders = orders.filter(function (o) {
    return o.customer?.email === email;
  });
  if (custOrders.length === 0) {
    alert("Nenhum pedido.");
    return;
  }
  alert(
    custOrders
      .map(function (o) {
        return (
          "#" +
          (o.orderNumber || o.id) +
          " | " +
          new Date(o.date).toLocaleDateString("pt-BR") +
          " | R$ " +
          (o.total || 0).toFixed(2) +
          " | " +
          getStatusName(o.status)
        );
      })
      .join("\n"),
  );
}

// ============ CUPONS ============
async function loadCouponsTable() {
  var tbody = document.getElementById("couponsTable");
  if (!tbody) return;
  try {
    var snap = await db.collection("coupons").get();
    coupons = [];
    snap.forEach(function (d) {
      coupons.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    coupons = JSON.parse(localStorage.getItem("amazoniaCoupons")) || [];
  }
  if (!coupons.length) return;
  setupPagination("couponsTable", coupons, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (c) {
        return (
          "<tr><td><strong>" +
          c.code +
          "</strong></td><td>" +
          c.discount +
          "%</td><td>" +
          (c.assignedTo === "all" ? "Todos" : c.assignedTo) +
          "</td><td>" +
          new Date(c.expiresAt).toLocaleDateString("pt-BR") +
          '</td><td><span class="status-badge">Ativo</span></td><td><button class="btn-sm btn-delete" onclick="deleteCoupon(\'' +
          c.id +
          "')\">🗑️</button></td></tr>"
        );
      })
      .join("");
  });
}

function openCouponModal() {
  document.getElementById("couponModal").style.display = "flex";
  document.getElementById("couponForm").reset();
  var sel = document.getElementById("couponAssignedTo");
  sel.innerHTML = '<option value="all">Todos</option>';
  customers.forEach(function (c) {
    sel.innerHTML += '<option value="' + c.email + '">' + c.name + "</option>";
  });
  var d = new Date();
  d.setDate(d.getDate() + 30);
  document.getElementById("couponExpiresAt").value = d
    .toISOString()
    .split("T")[0];
}
function closeCouponModal() {
  document.getElementById("couponModal").style.display = "none";
}

async function deleteCoupon(id) {
  if (confirm("Excluir?")) {
    try {
      await db.collection("coupons").doc(id.toString()).delete();
    } catch (e) {
      coupons = coupons.filter(function (c) {
        return c.id !== id;
      });
      localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
    }
    loadCouponsTable();
  }
}

async function saveCoupon() {
  var code = document.getElementById("couponCode").value.toUpperCase(),
    discount = parseInt(document.getElementById("couponDiscount").value),
    assignedTo = document.getElementById("couponAssignedTo").value,
    expiresAt = document.getElementById("couponExpiresAt").value;
  if (!code || !discount || !expiresAt) {
    alert("Preencha todos!");
    return;
  }
  var data = {
    code: code,
    discount: discount,
    assignedTo: assignedTo,
    expiresAt: expiresAt,
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
  try {
    await db.collection("coupons").add(data);
  } catch (e) {
    coupons.push(data);
    localStorage.setItem("amazoniaCoupons", JSON.stringify(coupons));
  }
  loadCouponsTable();
  closeCouponModal();
  alert("✅ Cupom criado!");
}

// ============ CONFIGURAÇÕES ============
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
async function saveSettings() {
  var d = {
    store_name: document.getElementById("storeName").value,
    phone: document.getElementById("storePhone").value,
    whatsapp: document.getElementById("storeWhatsapp").value,
    email: document.getElementById("storeEmail").value,
    address: document.getElementById("storeAddress").value,
    business_hours: document.getElementById("storeHours").value,
    free_shipping_from:
      parseFloat(document.getElementById("freeShipping").value) || 100,
    social: {
      instagram: document.getElementById("socialInstagram").value,
      facebook: document.getElementById("socialFacebook").value,
    },
    updatedAt: new Date().toISOString(),
  };
  try {
    await db.collection("siteConfig").doc("config").set(d, { merge: true });
  } catch (e) {
    localStorage.setItem("amazoniaData", JSON.stringify(d));
  }
  alert("✅ Configurações salvas!");
}
async function saveHero() {
  try {
    await db
      .collection("siteConfig")
      .doc("config")
      .update({
        hero: {
          title: document.getElementById("heroTitle").value,
          subtitle: document.getElementById("heroSubtitle").value,
        },
      });
  } catch (e) {
    siteData.hero = {
      title: document.getElementById("heroTitle").value,
      subtitle: document.getElementById("heroSubtitle").value,
    };
    localStorage.setItem("amazoniaData", JSON.stringify(siteData));
  }
  alert("✅ Salvo!");
}
async function saveAbout() {
  try {
    await db
      .collection("siteConfig")
      .doc("config")
      .update({
        about: {
          content: document.getElementById("aboutContent").value,
          mission: document.getElementById("aboutMission").value,
          founder: document.getElementById("aboutFounder").value,
          founded: document.getElementById("aboutFounded").value,
        },
      });
  } catch (e) {
    siteData.about = {
      content: document.getElementById("aboutContent").value,
      mission: document.getElementById("aboutMission").value,
      founder: document.getElementById("aboutFounder").value,
      founded: document.getElementById("aboutFounded").value,
    };
    localStorage.setItem("amazoniaData", JSON.stringify(siteData));
  }
  alert("✅ Salvo!");
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
  var f = event.target.files[0],
    p = document.getElementById("imagePreview");
  if (f) {
    var r = new FileReader();
    r.onload = function (e) {
      p.src = e.target.result;
      p.style.display = "block";
    };
    r.readAsDataURL(f);
  }
}

// ============ ENTREGAS ============
var DELIVERY_API = {
  provider: "custom",
  apiKey: "SUA_CHAVE_API_AQUI",
  apiUrl: "https://api.exemplo.com/v1/",
  mapProvider: "google",
  mapApiKey: "AIzaSyCIzYgRuTo94sm2-we2aYBk3On9vCIj6ug",
};

function loadDeliveriesTable() {
  var tbody = document.getElementById("deliveriesTable");
  if (!tbody) return;

  var filter = document.getElementById("deliveryStatusFilter")?.value || "all";
  var filtered =
    filter === "all"
      ? orders.slice()
      : orders.filter(function (o) {
          return o.status === filter;
        });
  filtered.sort(function (a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align:center;color:#999;">Nenhuma entrega encontrada</td></tr>';
    updateDeliveryMetrics();
    return;
  }

  tbody.innerHTML = filtered
    .map(function (o) {
      // USAR O ID ORIGINAL DO FIREBASE (string)
      var orderIdNum = o.id;

      var canCall = o.status === "confirmed";
      var canCancel = o.status === "pending" || o.status === "confirmed";
      var trackingDisplay = o.trackingCode
        ? '<span style="background:#2d5a27;color:white;padding:0.2rem 0.5rem;border-radius:5px;font-size:0.85rem;">' +
          o.trackingCode +
          "</span>"
        : "-";
      var mapDisplay = o.trackingLink
        ? '<a href="' +
          o.trackingLink +
          '" target="_blank" style="background:#1565c0;color:white;padding:0.3rem 0.8rem;border-radius:15px;text-decoration:none;font-size:0.85rem;">📍 Mapa</a>'
        : "-";

      var actionsHtml =
        '<button class="btn-sm btn-edit btn-action-track" data-id="' +
        orderIdNum +
        '" title="Editar rastreio">📝</button>';
      if (canCall) {
        actionsHtml +=
          ' <button class="btn-sm btn-action-moto" data-id="' +
          orderIdNum +
          '" style="background:#25D366;color:white;border:none;cursor:pointer;" title="Chamar entregador">🚀</button>';
      }

      var cancelHtml = "";
      if (canCancel) {
        cancelHtml =
          '<button class="btn-sm btn-delete btn-action-cancel" data-id="' +
          orderIdNum +
          '" title="Cancelar pedido">❌</button>';
      } else if (o.status === "cancelled") {
        cancelHtml = '<span style="color:#c62828;">Cancelado</span>';
      } else if (o.status === "delivered") {
        cancelHtml = '<span style="color:#2d5a27;">✅ Entregue</span>';
      } else if (o.status === "shipped") {
        cancelHtml = '<span style="color:#1565c0;">🚚 Em rota</span>';
      } else {
        cancelHtml = "-";
      }

      return (
        "<tr>" +
        "<td><strong>#" +
        (o.orderNumber || orderIdNum) +
        "</strong></td>" +
        "<td>" +
        (o.customer?.name || "N/A") +
        "<br><small>" +
        (o.customer?.phone || "") +
        "</small></td>" +
        "<td>" +
        (o.shipping?.address || "N/A") +
        "<br><small>" +
        (o.shipping?.city || "") +
        "</small></td>" +
        '<td><span class="status-badge">' +
        getStatusName(o.status) +
        "</span></td>" +
        "<td>" +
        trackingDisplay +
        "</td>" +
        "<td>" +
        mapDisplay +
        "</td>" +
        "<td>" +
        actionsHtml +
        "</td>" +
        "<td>" +
        cancelHtml +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  updateDeliveryMetrics();
}

function updateDeliveryMetrics() {
  var t = new Date().toDateString();
  document.getElementById("awaitingDelivery").textContent = orders.filter(
    function (o) {
      return o.status === "confirmed";
    },
  ).length;
  document.getElementById("inTransit").textContent = orders.filter(
    function (o) {
      return o.status === "shipped";
    },
  ).length;
  document.getElementById("deliveredToday").textContent = orders.filter(
    function (o) {
      return o.status === "delivered" && new Date(o.date).toDateString() === t;
    },
  ).length;
}
function getStatusName(s) {
  var n = {
    pending: "⏳ Pendente",
    confirmed: "✅ Confirmado",
    shipped: "🚚 Em Entrega",
    delivered: "📦 Entregue",
    cancelled: "❌ Cancelado",
  };
  return n[s] || s;
}

function closeTrackingModal() {
  document.getElementById("trackingModal").style.display = "none";
}

// ============ FUNÇÕES DE ENTREGA CORRIGIDAS (ID COMO STRING) ============

function openTrackingModal(orderId) {
  // Buscar pelo ID como string
  var o = orders.find(function (o) {
    return o.id == orderId || o.id === orderId;
  });
  if (!o) {
    console.log("Pedido não encontrado. ID:", orderId);
    return;
  }
  document.getElementById("trackingOrderId").value = orderId;
  document.getElementById("trackingCode").value = o.trackingCode || "";
  document.getElementById("trackingLink").value = o.trackingLink || "";
  document.getElementById("trackingStatus").value = o.status || "shipped";
  document.getElementById("trackingModal").style.display = "flex";
}

function cancelOrderAdmin(orderId) {
  console.log("cancelOrderAdmin chamado! ID:", orderId);

  var motivo = prompt("Motivo do cancelamento:");
  if (!motivo) return;

  var o = orders.find(function (o) {
    return o.id === orderId || String(o.id) === String(orderId);
  });

  if (!o) {
    alert("❌ Pedido não encontrado!");
    return;
  }

  // Atualizar o pedido
  o.status = "cancelled";
  o.cancelledAt = new Date().toISOString();
  o.cancelledBy = "admin";
  o.cancelledReason = motivo;

  // SALVAR NO LOCALSTORAGE (OBRIGATÓRIO)
  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

  // Tentar atualizar no Firebase (não bloqueia se falhar)
  try {
    db.collection("orders").doc(String(orderId)).update({
      status: "cancelled",
      cancelledAt: o.cancelledAt,
      cancelledBy: "admin",
      cancelledReason: motivo,
    });
  } catch (e) {
    console.log("Firebase offline, salvo localmente");
  }

  // RECARREGAR AS TABELAS
  loadDeliveriesTable();
  loadOrdersTable();
  loadDashboard();

  alert("✅ Pedido #" + (o.orderNumber || orderId) + " cancelado!");
}

function callDeliveryAPI(orderId) {
  var o = orders.find(function (o) {
    return o.id == orderId || String(o.id) === String(orderId);
  });
  if (!o) return;

  if (
    confirm(
      "🚀 Chamar entregador?\n\nCliente: " +
        (o.customer?.name || "N/A") +
        "\nEndereço: " +
        (o.shipping?.address || "N/A"),
    )
  ) {
    o.trackingCode = "SIM-" + Date.now().toString().slice(-8);
    o.trackingLink = "https://rastreio.exemplo.com/" + o.trackingCode;
    o.status = "shipped";
    o.statusUpdatedAt = new Date().toISOString();

    try {
      db.collection("orders").doc(String(orderId)).update({
        trackingCode: o.trackingCode,
        trackingLink: o.trackingLink,
        status: "shipped",
      });
    } catch (e) {
      localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
    }

    loadDeliveriesTable();
    loadOrdersTable();
    alert("✅ Entregador acionado!");
  }
}

async function updateOrderStatus(
  orderId,
  trackingCode,
  trackingLink,
  newStatus,
) {
  var o = orders.find(function (o) {
    return o.id == orderId || String(o.id) === String(orderId);
  });
  if (!o) {
    alert("❌ Pedido não encontrado!");
    return;
  }

  o.trackingCode = trackingCode;
  o.trackingLink = trackingLink;
  o.status = newStatus;
  o.statusUpdatedAt = new Date().toISOString();

  try {
    await db.collection("orders").doc(String(orderId)).update({
      trackingCode: trackingCode,
      trackingLink: trackingLink,
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
    });
  } catch (e) {
    localStorage.setItem("amazoniaOrders", JSON.stringify(orders));
  }

  loadDeliveriesTable();
  loadOrdersTable();
  loadDashboard();
  closeTrackingModal();
  alert("✅ Atualizado!");
}

function loadDeliveryMap() {
  var mapDiv = document.getElementById("deliveryMap");
  if (!mapDiv || mapDiv.dataset.loaded) return;
  mapDiv.dataset.loaded = "true";
  var key = DELIVERY_API.mapApiKey;
  if (key && key !== "SUA_CHAVE_MAPA_AQUI") {
    if (window.google?.maps) initDeliveryMap();
    else {
      var s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        key +
        "&callback=initDeliveryMap&loading=async";
      s.async = true;
      document.head.appendChild(s);
    }
  } else {
    mapDiv.innerHTML =
      '<div style="width:100%;height:100%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;border-radius:12px;"><span style="font-size:4rem;">📍</span><p style="font-weight:bold;color:#2d5a27;">Amazônia em Casa</p><p style="color:#666;">Av. Rômulo Maiorana, 891 - São Brás, Belém - PA</p></div>';
  }
}
function initDeliveryMap() {
  var mapDiv = document.getElementById("deliveryMap");
  if (!mapDiv || !window.google) return;
  var loc = { lat: -1.4391101141553917, lng: -48.46443666281786 };
  var map = new google.maps.Map(mapDiv, { center: loc, zoom: 17 });
  var m = new google.maps.Marker({
    position: loc,
    map: map,
    title: "Amazônia em Casa",
  });
  var info = new google.maps.InfoWindow({
    content:
      "<div><strong>🌿 Amazônia em Casa</strong><p>Av. Rômulo Maiorana, 891</p><p>São Brás, Belém - PA</p></div>",
  });
  m.addListener("click", function () {
    info.open(map, m);
  });
  setTimeout(function () {
    info.open(map, m);
  }, 1000);
}
function initDeliveries() {
  loadDeliveriesTable();
  loadDeliveryMap();
}

// ============ RECOMPENSAS ============
async function loadRewardsTable() {
  var tbody = document.getElementById("rewardsTable");
  if (!tbody) return;
  try {
    var snap = await db.collection("rewards").get();
    rewards = [];
    snap.forEach(function (d) {
      rewards.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    rewards = JSON.parse(localStorage.getItem("amazoniaRewards")) || [];
  }
  if (!rewards.length) return;
  rewards.sort(function (a, b) {
    return a.minValue - b.minValue;
  });
  setupPagination("rewardsTable", rewards, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (r) {
        return (
          '<tr><td><strong style="color:' +
          r.color +
          ';">' +
          r.icon +
          " " +
          r.name +
          "</strong></td><td>R$ " +
          r.minValue.toFixed(2) +
          "</td><td>" +
          r.description +
          '</td><td style="font-size:2rem;">' +
          r.icon +
          '</td><td>-</td><td><span class="status-badge ' +
          (r.active ? "active" : "inactive") +
          '">' +
          (r.active ? "Ativo" : "Inativo") +
          '</span></td><td><button class="btn-sm btn-edit" onclick="editReward(\'' +
          r.id +
          '\')">✏️</button><button class="btn-sm btn-delete" onclick="deleteReward(\'' +
          r.id +
          "')\">🗑️</button></td></tr>"
        );
      })
      .join("");
  });
}
function openRewardModal(id) {
  document.getElementById("rewardForm").reset();
  document.getElementById("rewardId").value = "";
  document.getElementById("rewardModalTitle").textContent = "Novo Nível";
  if (id) {
    var r = rewards.find(function (r) {
      return r.id === id;
    });
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
  document.getElementById("rewardModal").style.display = "flex";
}
function closeRewardModal() {
  document.getElementById("rewardModal").style.display = "none";
}
function editReward(id) {
  openRewardModal(id);
}
async function deleteReward(id) {
  if (confirm("Excluir?")) {
    try {
      await db.collection("rewards").doc(id.toString()).delete();
    } catch (e) {
      rewards = rewards.filter(function (r) {
        return r.id !== id;
      });
      localStorage.setItem("amazoniaRewards", JSON.stringify(rewards));
    }
    loadRewardsTable();
  }
}
async function saveReward() {
  var id = document.getElementById("rewardId").value || Date.now().toString();
  var data = {
    name: document.getElementById("rewardName").value,
    minValue: parseFloat(document.getElementById("rewardMinValue").value),
    description: document.getElementById("rewardDescription").value,
    icon: document.getElementById("rewardIcon").value || "⭐",
    color: document.getElementById("rewardColor").value,
    active: document.getElementById("rewardActive").checked,
  };
  try {
    var d = await db.collection("rewards").doc(id.toString()).get();
    if (d.exists) {
      await db.collection("rewards").doc(id.toString()).update(data);
    } else {
      data.createdAt = new Date().toISOString();
      await db.collection("rewards").doc(id.toString()).set(data);
    }
  } catch (e) {
    var idx = rewards.findIndex(function (r) {
      return r.id === id;
    });
    if (idx >= 0) rewards[idx] = data;
    else rewards.push({ id: id, ...data });
    localStorage.setItem("amazoniaRewards", JSON.stringify(rewards));
  }
  loadRewardsTable();
  closeRewardModal();
  alert("✅ Salvo!");
}

// ============ MENSAGENS ============
async function loadMessagesTable() {
  var tbody = document.getElementById("messagesTable");
  if (!tbody) return;
  var feedbacks = [];
  try {
    var snap = await db.collection("feedbacks").orderBy("date", "desc").get();
    snap.forEach(function (d) {
      feedbacks.push({ id: d.id, ...d.data() });
    });
  } catch (e) {
    feedbacks = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
  }
  if (!feedbacks.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhuma mensagem</td></tr>';
    updateUnreadBadge();
    return;
  }
  setupPagination("messagesTable", feedbacks, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (f) {
        return (
          '<tr style="' +
          (f.read ? "" : "background:#f0f7ee;font-weight:bold;") +
          '"><td>' +
          new Date(f.date).toLocaleString("pt-BR") +
          "</td><td>" +
          f.name +
          '</td><td class="email-column">' +
          (emailsVisible ? f.email : "***") +
          "</td><td>" +
          (f.message.length > 50
            ? f.message.substring(0, 50) + "..."
            : f.message) +
          '</td><td><span class="status-badge ' +
          (f.read ? "active" : "inactive") +
          '">' +
          (f.read ? "✅ Lida" : "🔵 Nova") +
          '</span></td><td><button class="btn-sm btn-edit" onclick="viewMessage(\'' +
          f.id +
          '\')">👁️</button><button class="btn-sm btn-delete" onclick="deleteMessage(\'' +
          f.id +
          "')\">🗑️</button></td></tr>"
        );
      })
      .join("");
  });
  updateUnreadBadge();
}
async function updateUnreadBadge() {
  var badge = document.getElementById("unreadBadge");
  if (!badge) return;
  var count = 0;
  try {
    var snap = await db
      .collection("feedbacks")
      .where("read", "==", false)
      .get();
    count = snap.size;
  } catch (e) {
    var fb = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
    count = fb.filter(function (f) {
      return !f.read;
    }).length;
  }
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}
async function viewMessage(id) {
  try {
    var d = await db.collection("feedbacks").doc(id.toString()).get();
    if (!d.exists) return;
    await db.collection("feedbacks").doc(id.toString()).update({ read: true });
    var f = d.data();
    loadMessagesTable();
    updateUnreadBadge();
    alert("📬 " + f.name + "\n\n📧 " + f.email + "\n📝 " + f.message);
  } catch (e) {
    var fb = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
    var f = fb.find(function (x) {
      return x.id === id;
    });
    if (f) {
      f.read = true;
      localStorage.setItem("amazoniaFeedbacks", JSON.stringify(fb));
      loadMessagesTable();
      updateUnreadBadge();
      alert("📬 " + f.name + "\n\n📧 " + f.email + "\n📝 " + f.message);
    }
  }
}
async function deleteMessage(id) {
  if (confirm("Excluir?")) {
    try {
      await db.collection("feedbacks").doc(id.toString()).delete();
    } catch (e) {
      var fb = JSON.parse(localStorage.getItem("amazoniaFeedbacks")) || [];
      fb = fb.filter(function (f) {
        return f.id !== id;
      });
      localStorage.setItem("amazoniaFeedbacks", JSON.stringify(fb));
    }
    loadMessagesTable();
    updateUnreadBadge();
    alert("✅ Excluída!");
  }
}
var emailsVisible = true;
function toggleEmails() {
  emailsVisible = !emailsVisible;
  document.getElementById("toggleEmailsBtn").innerHTML = emailsVisible
    ? "👁️ Mostrar E-mails"
    : "🔒 Esconder E-mails";
  loadMessagesTable();
}

// ============ ADMINISTRADORES ============
function checkAdminAccess() {
  var session = JSON.parse(localStorage.getItem("amazoniaAdminSession"));
  if (!session) {
    window.location.href = "admin-login.html";
    return;
  }
  document.getElementById("adminNameDisplay").textContent =
    "👤 " + session.name;
  if (session.role === "master") {
    var nav = document.getElementById("navAdmins");
    if (nav) nav.style.display = "flex";
  }
  var logoutBtn = document.querySelector(".sidebar-footer .btn-logout");
  if (logoutBtn)
    logoutBtn.onclick = function () {
      localStorage.removeItem("amazoniaAdminSession");
      window.location.href = "admin-login.html";
    };
}

function loadAdminsTable() {
  var tbody = document.getElementById("adminsTable");
  if (!tbody) return;
  var admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
  var session = JSON.parse(localStorage.getItem("amazoniaAdminSession"));
  if (!admins.length) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#999;">Nenhum admin</td></tr>';
    return;
  }
  tbody.innerHTML = admins
    .map(function (a) {
      var isMe = a.id === session?.id;
      return (
        "<tr><td>" +
        (a.photo
          ? '<img src="' +
            a.photo +
            '" style="width:45px;height:45px;border-radius:50%;object-fit:cover;">'
          : "👤") +
        "</td><td><strong>" +
        a.name +
        "</strong></td><td>" +
        a.email +
        "</td><td>" +
        (a.cpf || "-") +
        "</td><td>" +
        (a.birthDate || "-") +
        '</td><td><span class="status-badge ' +
        (a.role === "master" ? "active" : "inactive") +
        '">' +
        (a.role === "master" ? "👑 Master" : "👤 Admin") +
        "</span></td><td>" +
        // Botão Editar SEMPRE aparece
        '<button class="btn-sm btn-edit" onclick="editAdmin(\'' +
        a.id +
        "')\">✏️</button>" +
        // Botão Excluir só aparece para OUTROS admins
        (!isMe
          ? '<button class="btn-sm btn-delete" onclick="deleteAdmin(\'' +
            a.id +
            "')\">🗑️</button>"
          : ' <span style="color:#999;font-size:0.85rem;">Você</span>') +
        "</td></tr>"
      );
    })
    .join("");
}

function openAdminModal(id) {
  var modal = document.getElementById("adminModal");
  document.getElementById("adminForm").reset();
  document.getElementById("adminId").value = "";
  document.getElementById("adminModalTitle").textContent = "Novo Administrador";
  document.getElementById("adminPhotoPreview").innerHTML =
    '<span style="font-size:3rem;">👤</span>';
  if (id) {
    var admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
    var a = admins.find(function (a) {
      return a.id === id;
    });
    if (a) {
      document.getElementById("adminModalTitle").textContent =
        "Editar Administrador";
      document.getElementById("adminId").value = a.id;
      document.getElementById("adminName").value = a.name;
      document.getElementById("adminEmail").value = a.email;
      document.getElementById("adminCpf").value = a.cpf || "";
      document.getElementById("adminBirthDate").value = a.birthDate || "";
      document.getElementById("adminPassword").value = a.password;
      document.getElementById("adminRole").value = a.role;
      if (a.photo)
        document.getElementById("adminPhotoPreview").innerHTML =
          '<img src="' +
          a.photo +
          '" style="width:100%;height:100%;object-fit:cover;">';
    }
  }
  modal.style.display = "flex";
}
function closeAdminModal() {
  document.getElementById("adminModal").style.display = "none";
}
function editAdmin(id) {
  openAdminModal(id);
}
function deleteAdmin(id) {
  if (confirm("Excluir?")) {
    var admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
    admins = admins.filter(function (a) {
      return a.id !== id;
    });
    localStorage.setItem("amazoniaAdmins", JSON.stringify(admins));
    loadAdminsTable();
    alert("✅ Excluído!");
  }
}
function saveAdminData(id, photoData) {
  var admins = JSON.parse(localStorage.getItem("amazoniaAdmins")) || [];
  var data = {
    id: id,
    name: document.getElementById("adminName").value,
    email: document.getElementById("adminEmail").value.trim(),
    cpf: document.getElementById("adminCpf").value.replace(/\D/g, ""),
    birthDate: document.getElementById("adminBirthDate").value,
    password: document.getElementById("adminPassword").value,
    photo: photoData,
    role: document.getElementById("adminRole").value,
  };
  var idx = admins.findIndex(function (a) {
    return a.id === id;
  });
  if (idx >= 0) admins[idx] = data;
  else admins.push({ ...data, createdAt: new Date().toISOString() });
  localStorage.setItem("amazoniaAdmins", JSON.stringify(admins));
  loadAdminsTable();
  closeAdminModal();
  alert("✅ Salvo!");
}

// ============ PAGINAÇÃO ============
var ITEMS_PER_PAGE = 10,
  currentPages = {};
function setupPagination(tableId, dataArray, renderFunction) {
  var container = document.getElementById(tableId)?.closest(".admin-section");
  if (!container) return;
  var totalPages = Math.ceil(dataArray.length / ITEMS_PER_PAGE),
    currentPage = currentPages[tableId] || 1,
    start = (currentPage - 1) * ITEMS_PER_PAGE;
  renderFunction(dataArray.slice(start, start + ITEMS_PER_PAGE), start);
  var html = '<div class="pagination-container">';
  html +=
    '<button class="pagination-btn" onclick="changePage(\'' +
    tableId +
    "'," +
    (currentPage - 1) +
    ')" ' +
    (currentPage === 1 ? "disabled" : "") +
    ">←</button>";
  for (var i = 1; i <= totalPages; i++) {
    html +=
      '<button class="pagination-btn ' +
      (i === currentPage ? "active" : "") +
      '" onclick="changePage(\'' +
      tableId +
      "'," +
      i +
      ')">' +
      i +
      "</button>";
  }
  html +=
    '<button class="pagination-btn" onclick="changePage(\'' +
    tableId +
    "'," +
    (currentPage + 1) +
    ')" ' +
    (currentPage === totalPages ? "disabled" : "") +
    '>→</button></div><p class="pagination-info">' +
    (start + 1) +
    "-" +
    Math.min(start + ITEMS_PER_PAGE, dataArray.length) +
    " de " +
    dataArray.length +
    "</p>";
  container.querySelector(".pagination-container")?.remove();
  container.querySelector(".pagination-info")?.remove();
  container.insertAdjacentHTML("beforeend", html);
}
function changePage(tableId, page) {
  currentPages[tableId] = page;
  var funcs = {
    productsTable: loadProductsTable,
    ordersTable: loadOrdersTable,
    customersTable: loadCustomersTable,
    couponsTable: loadCouponsTable,
    deliveriesTable: loadDeliveriesTable,
    rewardsTable: loadRewardsTable,
    messagesTable: loadMessagesTable,
  };
  if (funcs[tableId]) funcs[tableId]();
}
function getCategoryName(cat) {
  var n = {
    meis: "🍯 Méis",
    propolis: "🐝 Própolis e Pólen",
    oleos: "🧴 Óleos Naturais",
    suplementos: "💊 Suplementos Naturais",
  };
  return n[cat] || cat;
}
function previewAdminPhoto(event) {
  var f = event.target.files[0];
  if (f) {
    var r = new FileReader();
    r.onload = function (e) {
      document.getElementById("adminPhotoPreview").innerHTML =
        '<img src="' +
        e.target.result +
        '" style="width:100%;height:100%;object-fit:cover;">';
    };
    r.readAsDataURL(f);
  }
}
function formatCPFAdmin(input) {
  var v = input.value.replace(/\D/g, "").slice(0, 11);
  v = v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  input.value = v;
}

// ============ EVENTOS GLOBAIS DA TABELA DE ENTREGAS (CORRIGIDO) ============
document.addEventListener("mousedown", function (e) {
  var target = e.target;

  // Verificar se o clique foi em um botão da tabela de entregas
  var row = target.closest("#deliveriesTable");
  if (!row) return;

  var btn = target.closest("button");
  if (!btn) return;

  var id = btn.getAttribute("data-id");
  if (!id) return;

  // Botão 📝 (rastreio)
  if (
    btn.classList.contains("btn-action-track") ||
    btn.classList.contains("btn-edit")
  ) {
    e.preventDefault();
    e.stopPropagation();
    openTrackingModal(id);
    return;
  }

  // Botão 🚀 (chamar moto)
  if (btn.classList.contains("btn-action-moto")) {
    e.preventDefault();
    e.stopPropagation();
    callDeliveryAPI(id);
    return;
  }

  // Botão ❌ (cancelar)
  if (
    btn.classList.contains("btn-action-cancel") ||
    btn.classList.contains("btn-delete")
  ) {
    e.preventDefault();
    e.stopPropagation();
    cancelOrderAdmin(id);
    return;
  }
});

// ============ FUNÇÃO CANCELAR PEDIDO (ADMIN) ============
function cancelOrderAdmin(orderId) {
  var motivo = prompt("Motivo do cancelamento:");
  if (!motivo) return;

  var o = orders.find(function (o) {
    return o.id === orderId || String(o.id) === String(orderId);
  });

  if (!o) {
    alert("❌ Pedido não encontrado!");
    return;
  }

  o.status = "cancelled";
  o.cancelledAt = new Date().toISOString();
  o.cancelledBy = "admin";
  o.cancelledReason = motivo;

  localStorage.setItem("amazoniaOrders", JSON.stringify(orders));

  try {
    db.collection("orders").doc(String(orderId)).update({
      status: "cancelled",
      cancelledAt: o.cancelledAt,
      cancelledBy: "admin",
      cancelledReason: motivo,
    });
  } catch (e) {
    console.log("Firebase offline, salvo localmente");
  }

  loadDeliveriesTable();
  loadOrdersTable();
  loadDashboard();

  alert("✅ Pedido cancelado!");
}

// ============ CHATBOT ============
var chatbotEmailsVisible = true;

function toggleChatbotEmails() {
  chatbotEmailsVisible = !chatbotEmailsVisible;
  document.getElementById("toggleChatbotEmailsBtn").innerHTML =
    chatbotEmailsVisible ? "👁️ Mostrar E-mails" : "🔒 Esconder E-mails";
  loadChatbotTable();
}

function loadChatbotTable() {
  var tbody = document.getElementById("chatbotTable");
  if (!tbody) return;

  var tickets = [];

  // Carregar do Firebase
  if (typeof db !== "undefined") {
    db.collection("chatbotTickets")
      .orderBy("date", "desc")
      .get()
      .then(function (snap) {
        tickets = [];
        snap.forEach(function (doc) {
          tickets.push({ id: doc.id, ...doc.data() });
        });
        renderChatbotTable(tickets);
      })
      .catch(function () {
        // Fallback localStorage
        tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
        renderChatbotTable(tickets);
      });
  } else {
    tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
    renderChatbotTable(tickets);
  }
}

function renderChatbotTable(tickets) {
  var tbody = document.getElementById("chatbotTable");
  if (!tbody) return;

  if (tickets.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;color:#999;">Nenhuma pergunta recebida</td></tr>';
    updateChatbotBadge();
    return;
  }

  setupPagination("chatbotTable", tickets, function (pageData) {
    tbody.innerHTML = pageData
      .map(function (t) {
        return (
          '<tr style="' +
          (t.status === "pending"
            ? "background:#f0f7ee;font-weight:bold;"
            : "") +
          '">' +
          "<td>" +
          new Date(t.date).toLocaleString("pt-BR") +
          "</td>" +
          "<td>" +
          t.name +
          "</td>" +
          '<td class="email-column-chatbot">' +
          (chatbotEmailsVisible ? t.email : "***") +
          "</td>" +
          "<td>" +
          (t.message.length > 50
            ? t.message.substring(0, 50) + "..."
            : t.message) +
          "</td>" +
          '<td><span class="status-badge ' +
          (t.status === "pending" ? "inactive" : "active") +
          '">' +
          (t.status === "pending" ? "🔵 Pendente" : "✅ Respondido") +
          "</span></td>" +
          "<td>" +
          '<button class="btn-sm btn-edit" onclick="openChatbotReply(\'' +
          t.id +
          "')\">✏️ Responder</button> " +
          '<button class="btn-sm btn-delete" onclick="deleteChatbotTicket(\'' +
          t.id +
          "')\">🗑️</button>" +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  });

  updateChatbotBadge();
}

function updateChatbotBadge() {
  var badge = document.getElementById("chatbotBadge");
  if (!badge) return;

  var tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
  var count = tickets.filter(function (t) {
    return t.status === "pending";
  }).length;

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function openChatbotReply(ticketId) {
  var tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
  var t = tickets.find(function (t) {
    return t.id === ticketId;
  });
  if (!t) return;

  document.getElementById("chatbotReplyTicketId").value = ticketId;
  document.getElementById("chatbotReplyContent").innerHTML =
    '<div class="ticket-question" style="background:#f5f5f5;padding:1rem;border-radius:10px;margin-bottom:1rem;">' +
    "<strong>👤 " +
    t.name +
    "</strong> (" +
    t.email +
    ")<br>" +
    "<strong>📅 " +
    new Date(t.date).toLocaleString("pt-BR") +
    "</strong><br><br>" +
    "<strong>💬 Pergunta:</strong><br>" +
    t.message +
    "</div>";
  document.getElementById("chatbotReplyMessage").value = t.reply || "";
  document.getElementById("chatbotReplyModal").style.display = "flex";
}

function closeChatbotReplyModal() {
  document.getElementById("chatbotReplyModal").style.display = "none";
}

function sendChatbotReply(e) {
  e.preventDefault();

  var ticketId = document.getElementById("chatbotReplyTicketId").value;
  var replyMessage = document.getElementById("chatbotReplyMessage").value;
  var session = JSON.parse(localStorage.getItem("amazoniaAdminSession"));
  var repliedBy = session ? session.name : "Admin";

  // Atualizar no localStorage
  var tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
  var idx = tickets.findIndex(function (t) {
    return t.id === ticketId;
  });
  if (idx >= 0) {
    tickets[idx].reply = replyMessage;
    tickets[idx].repliedBy = repliedBy;
    tickets[idx].repliedAt = new Date().toISOString();
    tickets[idx].status = "answered";
    localStorage.setItem("chatbotTickets", JSON.stringify(tickets));
  }

  // Atualizar no Firebase
  if (typeof db !== "undefined") {
    db.collection("chatbotTickets")
      .where("id", "==", ticketId)
      .get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          doc.ref.update({
            reply: replyMessage,
            repliedBy: repliedBy,
            repliedAt: new Date().toISOString(),
            status: "answered",
          });
        });
      })
      .catch(function () {});
  }

  loadChatbotTable();
  closeChatbotReplyModal();
  alert("✅ Resposta enviada com sucesso!");
}

function deleteChatbotTicket(ticketId) {
  if (confirm("Excluir esta mensagem?")) {
    var tickets = JSON.parse(localStorage.getItem("chatbotTickets")) || [];
    tickets = tickets.filter(function (t) {
      return t.id !== ticketId;
    });
    localStorage.setItem("chatbotTickets", JSON.stringify(tickets));

    if (typeof db !== "undefined") {
      db.collection("chatbotTickets")
        .where("id", "==", ticketId)
        .get()
        .then(function (snap) {
          snap.forEach(function (doc) {
            doc.ref.delete();
          });
        })
        .catch(function () {});
    }

    loadChatbotTable();
    alert("✅ Excluída!");
  }
}
