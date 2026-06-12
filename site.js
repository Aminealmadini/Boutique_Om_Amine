window.__boaSiteBooted = true;

const KEYS = {
  products: "boa_products",
  cart: "boa_cart",
  orders: "boa_orders",
  messages: "boa_messages",
  home: "boa_home",
  ratings: "boa_ratings",
  adminPass: "boa_admin_pass",
  adminSession: "boa_admin_session",
  adminRemember: "boa_admin_remember",
  seenOrders: "boa_seen_orders",
  seenMessages: "boa_seen_messages"
};

const PLACEHOLDER = "images/logo.jpg";
const ORIGINAL_ADMIN_PASS = "0610775130";
const DEFAULT_ADMIN_PASS = ORIGINAL_ADMIN_PASS;
const CATEGORIES = ["الكل", "عبائات", "فولارات", "إكسسوارات", "الخمارات و النقابات"];
const SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL", "XXXL", "آخر"];
const OZONE_CITIES = [
  "أكادير","أزرو","أسفي","أصيلة","أيت ملول","أيت أورير","ابن أحمد","ابن جرير","البئر الجديد","الدار البيضاء",
  "الحاجب","الحسيمة","الخميسات","الداخلة","الرشيدية","الرباط","الريصاني","السعيدية","الصويرة","العرائش",
  "العطاوية","العروي","العيون","الفقيه بن صالح","الفنيدق","القصر الكبير","القنيطرة","المحمدية","المضيق","الناظور",
  "النواصر","الواليدية","اليوسفية","إنزكان","باب برد","باب تازة","برشيد","بركان","بنسليمان","بني ملال",
  "بني انصار","بني بوعياش","بوسكورة","بوزنيقة","بوجدور","بوعرفة","بولمان","تارجيست","تارودانت","تازة",
  "تازناخت","تافراوت","تاهلة","تاونات","تاوريرت","تامسنا","تامنصورت","تمارة","تندرارة","تنغير",
  "تنجداد","تطوان","تزنيت","تيفلت","تيط مليل","جرادة","جرسيف","جرف الملحة","جمعة سحيم","حد السوالم",
  "خريبكة","خنيفرة","دار بوعزة","دار الكداري","دمنات","دبدو","دريوش","دشيرة الجهادية","زاكورة","زايو",
  "زومي","سيدي إفني","سيدي بنور","سيدي بوزيد","سيدي بيبي","سيدي رحال","سيدي سليمان","سيدي علال البحراوي",
  "سيدي علال التازي","سيدي قاسم","سيدي يحيى الغرب","سوق الأربعاء الغرب","سوق السبت أولاد النمة","سلا","سلا الجديدة",
  "سمارة","سطات","سبت جزولة","شفشاون","شماعية","شيشاوة","صفرو","طانطان","طاطا","طرفاية","طنجة",
  "عين العودة","عين تاوجطات","عين حرودة","عين عتيق","فاس","فم زكيد","فكيك","قلعة السراغنة","قلعة مكونة",
  "قرية با محمد","قصبة تادلة","كازا","كلميم","كرسيف","مراكش","مرتيل","مكناس","ميدلت","مديونة",
  "مشرع بلقصيري","مولاي بوسلهام","مولاي إدريس زرهون","مولاي يعقوب","ميسور","مريرت","مرزوكة","ميدار",
  "مطماطة","واد أمليل","واد زم","واد لاو","وزان","وجدة","ورزازات","ويسلان","يوسفية"
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const API_URL = "api.php";
let serverAvailable = false;
let phpAvailable = false;
const ADMIN_OPEN_MODE = false;
const ADMIN_OPEN_CLOSED_KEY = "boa_admin_open_closed";

function readStore(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage error", error);
    alert("ما قدرش الموقع يحفظ البيانات. غالبا الصور كبار بزاف، نقصي عدد الصور أو الحجم ديالهم وعاودي الحفظ.");
    return false;
  }
}

function compressImageFile(file, maxSize = 850, quality = 0.72) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function apiGet(action) {
  const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    credentials: "same-origin",
    cache: "no-store"
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    phpAvailable = false;
    throw new Error("php_unavailable");
  }
  const data = await response.json();
  phpAvailable = true;
  if (!response.ok || data.ok === false) throw new Error(data.error || action);
  return data;
}

async function apiPost(action, payload = {}) {
  const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    phpAvailable = false;
    throw new Error("php_unavailable");
  }
  const data = await response.json().catch(() => {
    phpAvailable = false;
    return null;
  });
  if (!data) throw new Error("php_unavailable");
  phpAvailable = true;
  if (!response.ok || data.ok === false) throw new Error(data.error || action);
  return data;
}

async function loadServerData(forAdmin = false) {
  try {
    const data = await apiGet(forAdmin ? "admin" : "public");
    serverAvailable = true;
    if (Array.isArray(data.products)) writeStore(KEYS.products, data.products);
    if (Array.isArray(data.home)) writeStore(KEYS.home, data.home);
    if (data.ratings) writeStore(KEYS.ratings, data.ratings);
    if (forAdmin) {
      if (Array.isArray(data.orders)) writeStore(KEYS.orders, data.orders);
      if (Array.isArray(data.messages)) writeStore(KEYS.messages, data.messages);
    }
    return true;
  } catch {
    serverAvailable = false;
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function money(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} درهم`;
}

function slugName(name) {
  return String(name || "product").trim().replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "");
}

function normalizeImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  return images.map((item, index) => {
    if (typeof item === "string") {
      return { src: item, name: (product.imageNames || [])[index] || `${slugName(product.name)}${index + 1}` };
    }
    return { src: item?.src || PLACEHOLDER, name: item?.name || `${slugName(product?.name)}${index + 1}` };
  }).filter(item => item.src);
}

function imageOf(product, index = 0) {
  const images = normalizeImages(product);
  return images[index]?.src || product?.image || PLACEHOLDER;
}

function allProducts() {
  return readStore(KEYS.products, [])
    .filter(item => item && item.name)
    .sort((a, b) => Number(b.createdAt || b.id) - Number(a.createdAt || a.id));
}

function discountOf(product) {
  const oldPrice = Number(product?.oldPrice || 0);
  const price = Number(product?.price || 0);
  return oldPrice > price && price > 0 ? Math.round(((oldPrice - price) * 100) / oldPrice) : 0;
}

function getCart() {
  return readStore(KEYS.cart, []);
}

function setCart(items) {
  writeStore(KEYS.cart, items);
  renderCartWidgets();
}

function getRating(id) {
  const ratings = readStore(KEYS.ratings, {});
  const rating = ratings[id] || { total: 0, count: 0 };
  return {
    avg: rating.count ? rating.total / rating.count : 0,
    count: rating.count || 0
  };
}

function starsText(avg) {
  if (!avg) return "بدون تقييم";
  const full = Math.round(avg);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function initShell() {
  const menu = $(".menu-toggle");
  const nav = $(".site-nav");
  const backdrop = $("[data-close-menu]");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      nav.classList.add("open");
      backdrop?.classList.add("show");
    });
    backdrop?.addEventListener("click", () => {
      nav.classList.remove("open");
      backdrop.classList.remove("show");
    });
  }

  $$("[data-cart-toggle]").forEach(button => {
    button.addEventListener("click", () => $("[data-cart-drawer]")?.classList.toggle("open"));
  });

  renderCartWidgets();
}

function cartLine(item, index) {
  const options = [
    item.color ? `اللون: ${escapeHtml(item.color)}` : "",
    item.size ? `الحجم: ${escapeHtml(item.size)}` : ""
  ].filter(Boolean).join(" - ");

  return `
    <div class="cart-line">
      <img src="${escapeHtml(item.image || PLACEHOLDER)}" alt="">
      <div>
        <b>${escapeHtml(item.name)}</b>
        <small>${options || "بدون اختيارات"}</small>
        <small>${money(item.price)}</small>
      </div>
      <button class="icon-btn" type="button" data-remove-cart="${index}" aria-label="حذف">×</button>
    </div>
  `;
}

function renderCartWidgets() {
  const items = getCart();
  $$("[data-cart-count]").forEach(el => el.textContent = items.length);
  $$("[data-cart-total]").forEach(el => el.textContent = items.reduce((sum, item) => sum + Number(item.price || 0), 0));
  $$("[data-cart-items]").forEach(box => {
    box.innerHTML = items.length ? items.map(cartLine).join("") : `<div class="empty">العربة فارغة</div>`;
  });
  $$("[data-remove-cart]").forEach(button => {
    button.addEventListener("click", () => {
      const next = getCart();
      next.splice(Number(button.dataset.removeCart), 1);
      setCart(next);
      if (document.body.dataset.page === "cart") initCartPage();
    });
  });
}

let modalProduct = null;
let modalImageIndex = 0;
let pendingChoiceProduct = null;
let selectedColor = "";
let selectedColorImage = "";

function productNeedsChoice(product) {
  return Boolean((product.colorEnabled && product.colors?.length) || (product.sizeEnabled && product.sizes?.length));
}

function addToCart(product, choice = {}) {
  const item = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: choice.image || imageOf(product),
    color: choice.color || "",
    size: choice.size || ""
  };
  setCart([...getCart(), item]);
  $("[data-cart-drawer]")?.classList.add("open");
}

function requestProductChoice(product) {
  const choiceModal = $("#choiceModal");
  if (!choiceModal) {
    location.href = `products.html?choose=${encodeURIComponent(product.id)}`;
    return;
  }

  pendingChoiceProduct = product;
  selectedColor = "";
  selectedColorImage = "";
  $("#choiceIntro").textContent = product.name;
  $("#choiceError").textContent = "";

  const colorSection = $("#colorChoiceSection");
  const sizeSection = $("#sizeChoiceSection");
  const colorCarousel = $("#colorCarousel");
  const sizeChoice = $("#sizeChoice");

  colorSection.style.display = product.colorEnabled ? "block" : "none";
  sizeSection.style.display = product.sizeEnabled ? "block" : "none";

  colorCarousel.innerHTML = (product.colors || []).map(color => {
    const index = Number.isInteger(color.imageIndex) ? color.imageIndex : -1;
    const img = index >= 0 ? imageOf(product, index) : imageOf(product);
    return `
      <button class="color-choice" type="button" data-color="${escapeHtml(color.name)}" data-image="${escapeHtml(img)}">
        <img src="${escapeHtml(img)}" alt="">
        <span>${escapeHtml(color.name)}</span>
      </button>
    `;
  }).join("");

  sizeChoice.innerHTML = `<option value="">اختاري الحجم</option>` + (product.sizes || [])
    .map(size => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`)
    .join("");

  $$(".color-choice", colorCarousel).forEach(button => {
    button.addEventListener("click", () => {
      $$(".color-choice", colorCarousel).forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      selectedColor = button.dataset.color;
      selectedColorImage = button.dataset.image;
    });
  });

  choiceModal.classList.add("open");
}

function confirmChoice() {
  if (!pendingChoiceProduct) return;
  const needsColor = pendingChoiceProduct.colorEnabled && pendingChoiceProduct.colors?.length;
  const needsSize = pendingChoiceProduct.sizeEnabled && pendingChoiceProduct.sizes?.length;
  const size = $("#sizeChoice")?.value || "";

  if (needsColor && !selectedColor) {
    $("#choiceError").textContent = "خاصك تختاري اللون";
    return;
  }
  if (needsSize && !size) {
    $("#choiceError").textContent = "خاصك تختاري الحجم";
    return;
  }

  addToCart(pendingChoiceProduct, { color: selectedColor, size, image: selectedColorImage });
  $("#choiceModal").classList.remove("open");
  pendingChoiceProduct = null;
}

function productCard(product) {
  const discount = discountOf(product);
  const rating = getRating(product.id);
  return `
    <article class="card" data-open-product="${product.id}">
      <img src="${escapeHtml(imageOf(product))}" alt="${escapeHtml(product.name)}" onerror="this.src='${PLACEHOLDER}'">
      ${discount ? `<div class="discount-badge">خصم ${discount}%</div>` : ""}
      <div class="card-body">
        <div class="meta"><span>${escapeHtml(product.category || "")}</span><span>${starsText(rating.avg)}</span></div>
        <h3>${escapeHtml(product.name)}</h3>
        <div class="price">${discount ? `<span class="old-price">${money(product.oldPrice)}</span>` : ""}${money(product.price)}</div>
        <button class="btn primary add-btn" type="button" data-add="${product.id}">إضافة للعربة</button>
      </div>
    </article>
  `;
}

function bindProductCards(root = document) {
  $$("[data-open-product]", root).forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("[data-add]")) return;
      const product = allProducts().find(item => String(item.id) === String(card.dataset.openProduct));
      if (!product) return;
      if ($("#productModal")) openProductModal(product);
      else location.href = `products.html?product=${encodeURIComponent(product.id)}`;
    });
  });

  $$("[data-add]", root).forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      const product = allProducts().find(item => String(item.id) === String(button.dataset.add));
      if (!product) return;
      productNeedsChoice(product) ? requestProductChoice(product) : addToCart(product);
    });
  });
}

function openProductModal(product) {
  modalProduct = product;
  modalImageIndex = 0;
  paintProductModal();
  $("#productModal").classList.add("open");
}

function paintProductModal() {
  if (!modalProduct) return;
  const images = normalizeImages(modalProduct);
  const rating = getRating(modalProduct.id);
  const discount = discountOf(modalProduct);

  $("#modalImage").src = images[modalImageIndex]?.src || PLACEHOLDER;
  $("#modalTitle").textContent = modalProduct.name;
  $("#modalCategory").textContent = modalProduct.category || "";
  $("#modalPrice").innerHTML = discount
    ? `<span class="old-price">${money(modalProduct.oldPrice)}</span>${money(modalProduct.price)}`
    : money(modalProduct.price);
  $("#modalDesc").textContent = modalProduct.desc || "لا يوجد وصف مفصل لهذا المنتج حاليا.";
  $("#modalColors").innerHTML = modalProduct.colors?.length
    ? modalProduct.colors.map(color => `<span class="swatch">${escapeHtml(color.name)}</span>`).join("")
    : `<span class="swatch">حسب المتوفر</span>`;
  $("#modalSizes").innerHTML = modalProduct.sizes?.length
    ? modalProduct.sizes.map(size => `<span class="swatch">${escapeHtml(size)}</span>`).join("")
    : `<span class="swatch">بدون أحجام</span>`;
  $("#ratingSummary").textContent = rating.count
    ? `${rating.avg.toFixed(1)} من 5 بناء على ${rating.count} تقييم`
    : "كوني أول من يقيم هذا المنتج";
  $("#ratingStars").innerHTML = [1, 2, 3, 4, 5]
    .map(value => `<button class="star" type="button" data-rate="${value}">${value} ★</button>`)
    .join("");

  $$("[data-rate]").forEach(button => {
    button.addEventListener("click", () => {
      const ratings = readStore(KEYS.ratings, {});
      const old = ratings[modalProduct.id] || { total: 0, count: 0 };
      ratings[modalProduct.id] = { total: old.total + Number(button.dataset.rate), count: old.count + 1 };
      writeStore(KEYS.ratings, ratings);
      if (serverAvailable) apiPost("saveRatings", { ratings }).catch(() => {});
      paintProductModal();
    });
  });
}

function initHome() {
  const selected = readStore(KEYS.home, []).map(String);
  const products = allProducts();
  const list = selected.length ? products.filter(item => selected.includes(String(item.id))) : products.slice(0, 8);
  if ($("#heroImage")) $("#heroImage").src = imageOf(list[0] || {});
  $("#homeProducts").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="empty">سيتم عرض المنتجات هنا بعد إضافتها من لوحة الإدارة.</div>`;
  bindProductCards($("#homeProducts"));
}

function initProducts() {
  const state = { category: "الكل", price: "all", sort: "newest" };
  const chips = $("#categoryChips");
  chips.innerHTML = CATEGORIES
    .map(category => `<button class="chip ${category === "الكل" ? "active" : ""}" type="button" data-category="${category}">${category}</button>`)
    .join("");

  $$("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      $$("[data-category]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      renderProducts();
    });
  });

  $("#priceFilter").addEventListener("change", event => {
    state.price = event.target.value;
    renderProducts();
  });
  $("#sortFilter").addEventListener("change", event => {
    state.sort = event.target.value;
    renderProducts();
  });

  function renderProducts() {
    let list = allProducts();
    if (state.category !== "الكل") list = list.filter(product => product.category === state.category);
    if (state.price === "lt200") list = list.filter(product => Number(product.price) < 200);
    if (state.price === "200-400") list = list.filter(product => Number(product.price) >= 200 && Number(product.price) <= 400);
    if (state.price === "400-500") list = list.filter(product => Number(product.price) >= 400 && Number(product.price) <= 500);
    if (state.price === "gt500") list = list.filter(product => Number(product.price) > 500);
    if (state.sort === "priceAsc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (state.sort === "priceDesc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (state.sort === "rating") list.sort((a, b) => getRating(b.id).avg - getRating(a.id).avg);

    $("#productsGrid").innerHTML = list.length
      ? list.map(productCard).join("")
      : `<div class="empty"><h3>لا توجد منتجات بهذه الفلاتر</h3><p>جربي تغيير النوع أو الثمن.</p></div>`;
    bindProductCards($("#productsGrid"));
  }

  renderProducts();

  $("#modalAdd").addEventListener("click", () => {
    if (!modalProduct) return;
    productNeedsChoice(modalProduct) ? requestProductChoice(modalProduct) : addToCart(modalProduct);
  });
  $("[data-close-product]").addEventListener("click", () => $("#productModal").classList.remove("open"));
  $("[data-prev-image]").addEventListener("click", () => {
    const count = Math.max(1, normalizeImages(modalProduct).length);
    modalImageIndex = (modalImageIndex - 1 + count) % count;
    paintProductModal();
  });
  $("[data-next-image]").addEventListener("click", () => {
    const count = Math.max(1, normalizeImages(modalProduct).length);
    modalImageIndex = (modalImageIndex + 1) % count;
    paintProductModal();
  });
  $("#confirmChoice").addEventListener("click", confirmChoice);
  $("#cancelChoice").addEventListener("click", () => $("#choiceModal").classList.remove("open"));

  const params = new URLSearchParams(location.search);
  const openId = params.get("product") || params.get("choose");
  if (openId) {
    const product = allProducts().find(item => String(item.id) === String(openId));
    if (product) params.get("choose") ? requestProductChoice(product) : openProductModal(product);
  }
}

function initOffers() {
  const list = allProducts().filter(product => discountOf(product) > 0);
  $("#offersGrid").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="empty"><h3>لا توجد عروض حاليا</h3><p>يمكنك إضافة العروض من لوحة الإدارة.</p></div>`;
  bindProductCards($("#offersGrid"));
}

function initCartPage() {
  const items = getCart();
  $("#cartPageItems").innerHTML = items.length ? items.map(cartLine).join("") : `<div class="empty">العربة فارغة</div>`;
  $("#finalTotal").textContent = items.reduce((sum, item) => sum + Number(item.price || 0), 0) + (items.length ? 40 : 0);
  renderCartWidgets();
  initCityPicker();

  $("#checkoutForm").onsubmit = async event => {
    event.preventDefault();
    const cartItems = getCart();
    if (!cartItems.length) {
      alert("العربة فارغة");
      return;
    }
    if (!$("#city").value) {
      alert("اختاري المدينة");
      return;
    }
    const orders = readStore(KEYS.orders, []);
    const order = {
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      status: "pending",
      items: cartItems,
      total: cartItems.reduce((sum, item) => sum + Number(item.price || 0), 0) + 40,
      customer: {
        nameAR: $("#nameAR").value,
        nameFR: $("#nameFR").value,
        phone: $("#phone").value,
        city: $("#city").value,
        address: $("#address").value
      }
    };
    writeStore(KEYS.orders, [order, ...orders]);
    if (serverAvailable) {
      try {
        await apiPost("addOrder", { order });
      } catch {
        alert("تسجل الطلب فهاذ الجهاز، ولكن ما قدرش يتسيفط للسيرفر. عاودي المحاولة من بعد.");
      }
    }
    maybeNotifyAdmin("طلبية جديدة", `وصلات طلبية من ${order.customer.nameAR || "زبونة"}`);
    setCart([]);
    alert("تسجل الطلب بنجاح");
    location.href = "history.html";
  };
}

function initCityPicker() {
  const picker = $("#cityPicker");
  const button = $("#cityButton");
  const search = $("#citySearch");
  const list = $("#cityList");
  const cityInput = $("#city");
  if (!picker) return;

  function paint(query = "") {
    const clean = query.trim();
    const cities = OZONE_CITIES.filter(city => city.includes(clean));
    list.innerHTML = cities.length
      ? cities.map(city => `<button class="city-option" type="button" data-city="${city}">${city}</button>`).join("")
      : `<div class="empty">تواصلي معنا للتأكد من التوصيل لهذه المدينة.</div>`;
    $$("[data-city]", list).forEach(option => {
      option.addEventListener("click", () => {
        cityInput.value = option.dataset.city;
        button.textContent = option.dataset.city;
        picker.classList.remove("open");
      });
    });
  }

  button.addEventListener("click", () => {
    picker.classList.toggle("open");
    paint(search.value);
    setTimeout(() => search.focus(), 40);
  });
  search.addEventListener("input", () => paint(search.value));
  paint();
}

function initHistory() {
  const orders = readStore(KEYS.orders, []);
  $("#historyPanel").innerHTML = orders.length
    ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>معلومات التوصيل</th><th>المنتجات</th><th>الثمن</th><th>الحالة</th></tr></thead>
          <tbody>
            ${orders.map(order => `
              <tr>
                <td>#${order.id}</td>
                <td>${escapeHtml(order.date)}</td>
                <td>${escapeHtml(order.customer?.nameAR || "")}<br>${escapeHtml(order.customer?.phone || "")}<br>${escapeHtml(order.customer?.city || "")}<br>${escapeHtml(order.customer?.address || "")}</td>
                <td>${(order.items || []).map(item => `${escapeHtml(item.name)}${item.color ? " - " + escapeHtml(item.color) : ""}${item.size ? " - " + escapeHtml(item.size) : ""} - ${money(item.price)}`).join("<br>")}</td>
                <td><b>${money(order.total)}</b></td>
                <td><span class="status ${order.status === "confirmed" ? "confirmed" : "pending"}">${order.status === "confirmed" ? "تم التأكيد" : "باقي ما تأكداتش"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`
    : `<div class="empty"><h2>لا توجد طلبات سابقة</h2><p>من بعد أول طلب غادي يبان هنا تلقائيا.</p><a class="btn primary" href="products.html">تصفحي المنتجات</a></div>`;
}

function initContact() {
  $("#contactForm").onsubmit = async event => {
    event.preventDefault();
    const messages = readStore(KEYS.messages, []);
    const message = {
      id: Date.now(),
      date: new Date().toLocaleString("fr-FR"),
      name: $("#contactName").value,
      phone: $("#contactPhone").value,
      subject: $("#contactSubject").value,
      message: $("#contactMessage").value
    };
    writeStore(KEYS.messages, [message, ...messages]);
    if (serverAvailable) {
      try {
        await apiPost("addMessage", { message });
      } catch {
        alert("الرسالة تسجلات فهاذ الجهاز، ولكن ما تسيفطاتش للسيرفر. عاودي المحاولة من بعد.");
        return;
      }
    }
    maybeNotifyAdmin("رسالة جديدة", message.subject || "وصلات رسالة من صفحة التواصل");
    event.target.reset();
    alert("تسيفطات الرسالة بنجاح");
  };
}

function adminPassword() {
  return localStorage.getItem(KEYS.adminPass) || DEFAULT_ADMIN_PASS;
}

function validAdminPassword(value) {
  return adminOpenAllowed() || value === adminPassword() || value === ORIGINAL_ADMIN_PASS;
}

function isStaticHosting() {
  return location.hostname.endsWith("github.io") || location.protocol === "file:";
}

function adminOpenAllowed() {
  return ADMIN_OPEN_MODE && localStorage.getItem(ADMIN_OPEN_CLOSED_KEY) !== "1";
}

function isAdminAuthenticated() {
  return adminOpenAllowed() || sessionStorage.getItem(KEYS.adminSession) === "1" || localStorage.getItem(KEYS.adminRemember) === "1";
}

function setAdminAuthenticated(remember) {
  sessionStorage.setItem(KEYS.adminSession, "1");
  if (remember) localStorage.setItem(KEYS.adminRemember, "1");
}

function clearAdminAuthenticated() {
  sessionStorage.removeItem(KEYS.adminSession);
  localStorage.removeItem(KEYS.adminRemember);
}

function maybeNotifyAdmin(title, body) {
  if (localStorage.getItem(KEYS.adminRemember) !== "1") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

let adminCurrentTab = "products";
let editingProductId = null;
let formImages = [];
let formColors = [];
let formSizes = [];
let pendingImageUploads = 0;

function initAdmin() {
  const loginCard = $("#loginCard");
  const adminApp = $("#adminApp");

  function showLogin() {
    loginCard.hidden = false;
    adminApp.hidden = true;
  }

  async function showAdmin() {
    loginCard.hidden = true;
    adminApp.hidden = false;
    tickClock();
    setInterval(tickClock, 1000);
    await loadServerData(true);
    renderAdminTab("products");
  }

  (async () => {
    if (adminOpenAllowed()) {
      await loadServerData(false);
      await showAdmin();
      return;
    }
    const publicOk = await loadServerData(false);
    if (publicOk) {
      const adminOk = await loadServerData(true);
      if (adminOk) await showAdmin();
      else showLogin();
      return;
    }
    if (isAdminAuthenticated()) await showAdmin();
    else showLogin();
  })();

  $("#loginBtn").addEventListener("click", async () => {
    $("#loginError").textContent = "";
    try {
      await apiPost("login", {
        password: $("#adminPassword").value,
        remember: $("#rememberAdmin").checked
      });
      serverAvailable = true;
      setAdminAuthenticated($("#rememberAdmin").checked);
      await showAdmin();
    } catch {
      if (validAdminPassword($("#adminPassword").value)) {
        setAdminAuthenticated($("#rememberAdmin").checked);
        await showAdmin();
      } else {
        $("#loginError").textContent = "كلمة المرور غير صحيحة";
      }
    }
  });

  $("#logoutBtn").addEventListener("click", async () => {
    if (serverAvailable) apiPost("logout").catch(() => {});
    clearAdminAuthenticated();
    location.reload();
  });

  $("#adminMenuToggle").addEventListener("click", () => {
    $("#adminSidebar").classList.add("open");
    $("#adminBackdrop").classList.add("show");
  });
  $("#adminBackdrop").addEventListener("click", closeAdminMenu);

  $$("[data-admin-tab]").forEach(button => {
    button.addEventListener("click", () => {
      renderAdminTab(button.dataset.adminTab);
      closeAdminMenu();
    });
  });

  $("#addProductBtn").addEventListener("click", () => openProductForm());
  initProductForm();
}

function closeAdminMenu() {
  $("#adminSidebar").classList.remove("open");
  $("#adminBackdrop").classList.remove("show");
}

function tickClock() {
  if ($("#adminClock")) $("#adminClock").textContent = new Date().toLocaleString("ar-MA");
}

function refreshBadges() {
  const orders = readStore(KEYS.orders, []);
  const messages = readStore(KEYS.messages, []);
  const seenOrders = readStore(KEYS.seenOrders, []);
  const seenMessages = readStore(KEYS.seenMessages, []);
  setBadge("orders", orders.filter(order => !seenOrders.includes(order.id)).length);
  setBadge("messages", messages.filter(message => !seenMessages.includes(message.id)).length);
}

function setBadge(name, count) {
  const badge = $(`[data-badge="${name}"]`);
  if (!badge) return;
  badge.textContent = count;
  badge.classList.toggle("show", count > 0);
}

function renderAdminTab(tab) {
  adminCurrentTab = tab;
  $$("[data-admin-tab]").forEach(button => button.classList.toggle("active", button.dataset.adminTab === tab));
  $("#adminTitle").textContent = {
    products: "المنتجات",
    orders: "الطلبيات",
    ordersLog: "سجل الطلبات",
    messages: "صندوق الرسائل",
    home: "تعديل الرئيسية",
    settings: "الإعدادات"
  }[tab];
  $("#addProductBtn").style.display = tab === "products" ? "inline-flex" : "none";

  if (tab === "products") renderAdminProducts();
  if (tab === "orders") renderAdminOrders();
  if (tab === "ordersLog") renderAdminOrdersLog();
  if (tab === "messages") renderAdminMessages();
  if (tab === "home") renderAdminHome();
  if (tab === "settings") renderAdminSettings();
  refreshBadges();
}

function renderAdminProducts() {
  const products = allProducts();
  $("#adminContent").innerHTML = products.length
    ? `<div class="admin-list">${products.map(product => `
        <article class="admin-item">
          <img src="${escapeHtml(imageOf(product))}" alt="">
          <div>
            <b>${escapeHtml(product.name)}</b>
            <small>${escapeHtml(product.category || "")} - ${money(product.price)}</small>
            ${discountOf(product) ? `<small>عرض خاص: خصم ${discountOf(product)}%</small>` : ""}
            ${product.colors?.length ? `<small>الألوان: ${product.colors.map(c => escapeHtml(c.name)).join(", ")}</small>` : ""}
            ${product.sizes?.length ? `<small>الأحجام: ${product.sizes.map(escapeHtml).join(", ")}</small>` : ""}
          </div>
          <div class="actions">
            <button class="btn soft" type="button" data-edit-product="${product.id}">تعديل</button>
            <button class="btn danger" type="button" data-delete-product="${product.id}">حذف</button>
          </div>
        </article>
      `).join("")}</div>`
    : `<div class="empty">لا توجد منتجات. أضيفي المنتجات الحقيقية من هنا.</div>`;

  $$("[data-edit-product]").forEach(button => {
    button.addEventListener("click", () => openProductForm(button.dataset.editProduct));
  });
  $$("[data-delete-product]").forEach(button => {
    button.addEventListener("click", () => {
      if (!confirm("واش متأكدة من حذف هذا المنتج؟")) return;
      const next = allProducts().filter(product => String(product.id) !== String(button.dataset.deleteProduct));
      writeStore(KEYS.products, next);
      if (serverAvailable) apiPost("saveProducts", { products: next }).catch(() => alert("ما تحيدش المنتج من السيرفر."));
      renderAdminProducts();
    });
  });
}

function renderAdminOrders() {
  const orders = readStore(KEYS.orders, []);
  writeStore(KEYS.seenOrders, orders.map(order => order.id));
  $("#adminContent").innerHTML = orders.length
    ? `<div class="panel table-wrap"><table>
        <thead><tr><th>التاريخ</th><th>الإسم</th><th>رقم الهاتف</th><th>المدينة</th><th>العنوان</th><th>المنتج المطلوب</th><th>الثمن الإجمالي</th><th>تأكيد</th></tr></thead>
        <tbody>${orders.map(order => `
          <tr>
            <td>${escapeHtml(order.date)}</td>
            <td>${escapeHtml(order.customer?.nameAR || order.customer?.nameFR || "")}</td>
            <td>${escapeHtml(order.customer?.phone || "")}</td>
            <td>${escapeHtml(order.customer?.city || "")}</td>
            <td>${escapeHtml(order.customer?.address || "")}</td>
            <td>${formatOrderItems(order)}</td>
            <td>${money(order.total)}</td>
            <td>${order.status === "confirmed" ? `<span class="status confirmed">مؤكد</span>` : `<button class="btn primary" type="button" data-confirm-order="${order.id}">تأكيد</button>`}</td>
          </tr>
        `).join("")}</tbody>
      </table></div>`
    : `<div class="empty">لا توجد طلبيات حاليا.</div>`;

  $$("[data-confirm-order]").forEach(button => {
    button.addEventListener("click", async () => {
      const orders = readStore(KEYS.orders, []);
      const order = orders.find(item => String(item.id) === String(button.dataset.confirmOrder));
      if (order) order.status = "confirmed";
      writeStore(KEYS.orders, orders);
      if (serverAvailable) {
        try {
          const data = await apiPost("confirmOrder", { id: button.dataset.confirmOrder });
          if (Array.isArray(data.orders)) writeStore(KEYS.orders, data.orders);
        } catch {
          alert("ما تأكداتش الطلبية فالسيرفر.");
        }
      }
      renderAdminOrders();
    });
  });
}

function formatOrderItems(order) {
  return (order.items || []).map(item => {
    const details = [
      item.color ? `اللون: ${escapeHtml(item.color)}` : "",
      item.size ? `الحجم: ${escapeHtml(item.size)}` : ""
    ].filter(Boolean).join(" - ");
    return `<div class="order-product-line"><b>${escapeHtml(item.name)}</b>${details ? `<small>${details}</small>` : ""}</div>`;
  }).join("");
}

function renderAdminOrdersLog() {
  const orders = readStore(KEYS.orders, []);
  $("#adminContent").innerHTML = orders.length
    ? `<div class="panel table-wrap"><table>
        <thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الإسم</th><th>الهاتف</th><th>المدينة</th><th>العنوان</th><th>المنتجات</th><th>المجموع</th><th>الحالة</th></tr></thead>
        <tbody>${orders.map(order => `
          <tr>
            <td>#${order.id}</td>
            <td>${escapeHtml(order.date)}</td>
            <td>${escapeHtml(order.customer?.nameAR || order.customer?.nameFR || "")}</td>
            <td>${escapeHtml(order.customer?.phone || "")}</td>
            <td>${escapeHtml(order.customer?.city || "")}</td>
            <td>${escapeHtml(order.customer?.address || "")}</td>
            <td>${formatOrderItems(order)}</td>
            <td>${money(order.total)}</td>
            <td><span class="status ${order.status === "confirmed" ? "confirmed" : "pending"}">${order.status === "confirmed" ? "مؤكد" : "باقي ما تأكداتش"}</span></td>
          </tr>
        `).join("")}</tbody>
      </table></div>`
    : `<div class="empty">سجل الطلبات فارغ حاليا.</div>`;
}

function renderAdminMessages() {
  const messages = readStore(KEYS.messages, []);
  writeStore(KEYS.seenMessages, messages.map(message => message.id));
  $("#adminContent").innerHTML = messages.length
    ? `<div class="admin-list">${messages.map(message => `
        <article class="panel message-card">
          <h3>${escapeHtml(message.subject)}</h3>
          <p>${escapeHtml(message.message)}</p>
          <small>${escapeHtml(message.name || "")} - ${escapeHtml(message.phone || "")} - ${escapeHtml(message.date)}</small>
        </article>
      `).join("")}</div>`
    : `<div class="empty">صندوق الرسائل فارغ.</div>`;
}

function renderAdminHome() {
  const products = allProducts();
  const selected = readStore(KEYS.home, []).map(String);
  $("#adminContent").innerHTML = `<div class="panel">
    <h2>منتجات الصفحة الرئيسية</h2>
    <p class="muted-note">اختاري المنتجات اللي تبان في الرئيسية. إذا ما اخترتي والو، غادي يبان آخر المنتجات.</p>
    <div class="admin-check-list">
      ${products.length ? products.map(product => `
        <label class="check-row">
          <input type="checkbox" data-home-product="${product.id}" ${selected.includes(String(product.id)) ? "checked" : ""}>
          <span>${escapeHtml(product.name)}</span>
        </label>
      `).join("") : "لا توجد منتجات بعد."}
    </div>
  </div>`;

  $$("[data-home-product]").forEach(input => {
    input.addEventListener("change", () => {
      const ids = $$("[data-home-product]:checked").map(item => item.dataset.homeProduct);
      writeStore(KEYS.home, ids);
      if (serverAvailable) apiPost("saveHome", { home: ids }).catch(() => alert("ما تحفضش اختيار الرئيسية فالسيرفر."));
    });
  });
}

function renderAdminSettings() {
  const remembered = localStorage.getItem(KEYS.adminRemember) === "1";
  $("#adminContent").innerHTML = `
    <section class="panel">
      <h2>تغيير كلمة المرور</h2>
      <div class="form-grid">
        <label>كلمة المرور الحالية<input type="password" id="oldPass"></label>
        <label>كلمة المرور الجديدة<input type="password" id="newPass"></label>
      </div>
      <button class="btn primary" type="button" id="savePass">حفظ كلمة المرور</button>
      <p class="form-error" id="passMsg"></p>
    </section>
    <section class="panel">
      <h2>الإشعارات</h2>
      <p class="muted-note">${remembered ? "هذا الجهاز محفوظ ويمكنه طلب إشعارات الإدارة." : "هذا الجهاز غير محفوظ. الإشعارات كتخدم غير في الجهاز اللي دخلتي منه ودرتي احفظ تسجيلي."}</p>
      <button class="btn soft" type="button" id="enableNotifications">تفعيل إشعارات المتصفح</button>
    </section>
  `;

  $("#savePass").addEventListener("click", async () => {
    if (!adminOpenAllowed() && !serverAvailable && !validAdminPassword($("#oldPass").value)) {
      $("#passMsg").textContent = "كلمة المرور الحالية غير صحيحة";
      return;
    }
    if (!$("#newPass").value.trim()) {
      $("#passMsg").textContent = "دخلي كلمة مرور جديدة";
      return;
    }
    if (serverAvailable) {
      try {
        await apiPost("changePassword", {
          oldPassword: $("#oldPass").value,
          newPassword: $("#newPass").value.trim()
        });
      } catch {
        $("#passMsg").textContent = "ما تبدلاتش كلمة المرور فالسيرفر";
        return;
      }
    }
    localStorage.setItem(KEYS.adminPass, $("#newPass").value.trim());
    localStorage.setItem(ADMIN_OPEN_CLOSED_KEY, "1");
    if (phpAvailable) {
      clearAdminAuthenticated();
    } else {
      setAdminAuthenticated(true);
    }
    $("#passMsg").textContent = "تم تغيير كلمة المرور";
  });

  $("#enableNotifications").addEventListener("click", () => {
    if (localStorage.getItem(KEYS.adminRemember) !== "1") {
      alert("خاصك تدخلي للإدارة وتفعلي احفظ تسجيلي على هذا الجهاز.");
      return;
    }
    if (!("Notification" in window)) {
      alert("هذا المتصفح لا يدعم الإشعارات.");
      return;
    }
    Notification.requestPermission();
  });
}

function initProductForm() {
  if (!$("#productForm")) return;

  $("#pImages").addEventListener("change", event => {
    Array.from(event.target.files || []).forEach(async file => {
      pendingImageUploads += 1;
      const src = await compressImageFile(file);
      try {
        if (!src) return;
        const nextIndex = formImages.length + 1;
        formImages.push({ src, name: `${slugName($("#pName").value)}${nextIndex}` });
        paintImagePreviews();
      } finally {
        pendingImageUploads = Math.max(0, pendingImageUploads - 1);
      }
    });
    event.target.value = "";
  });

  $("#pColorEnabled").addEventListener("change", event => {
    $("#colorEditor").hidden = !event.target.checked;
  });
  $("#pSizeEnabled").addEventListener("change", event => {
    $("#sizeEditor").hidden = !event.target.checked;
  });
  $("#autoColorsBtn").addEventListener("click", () => {
    formColors = formImages.map((_, index) => ({ name: `لون ${index + 1}`, imageIndex: index }));
    paintColorRows();
  });
  $("#addColorBtn").addEventListener("click", () => {
    formColors.push({ name: "", imageIndex: formImages.length ? Math.min(formColors.length, formImages.length - 1) : null });
    paintColorRows();
  });
  $("#addSizeBtn").addEventListener("click", () => {
    formSizes.push("S");
    paintSizeRows();
  });
  $("#closeProductForm").addEventListener("click", () => $("#adminProductModal").classList.remove("open"));
  $("#deleteProductBtn").addEventListener("click", () => {
    if (!editingProductId) return;
    if (!confirm("واش متأكدة من حذف هذا المنتج؟")) return;
    const next = allProducts().filter(product => String(product.id) !== String(editingProductId));
    writeStore(KEYS.products, next);
    if (serverAvailable) apiPost("saveProducts", { products: next }).catch(() => alert("ما تحيدش المنتج من السيرفر."));
    $("#adminProductModal").classList.remove("open");
    renderAdminProducts();
  });
  $("#productForm").addEventListener("submit", event => {
    event.preventDefault();
    saveProduct();
  });
}

function openProductForm(id = null) {
  const product = id ? allProducts().find(item => String(item.id) === String(id)) : null;
  editingProductId = id;
  $("#productFormTitle").textContent = product ? "تعديل المنتج" : "إضافة منتج";
  $("#deleteProductBtn").style.display = product ? "inline-flex" : "none";
  $("#pName").value = product?.name || "";
  $("#pCategory").value = product?.category || "عبائات";
  $("#pPrice").value = product?.price || "";
  $("#pOldPrice").value = product?.oldPrice || "";
  $("#pDesc").value = product?.desc || "";
  formImages = normalizeImages(product || {});
  formColors = (product?.colors || []).map(color => ({ ...color }));
  formSizes = [...(product?.sizes || [])];
  $("#pColorEnabled").checked = Boolean(product?.colorEnabled);
  $("#pSizeEnabled").checked = Boolean(product?.sizeEnabled);
  $("#colorEditor").hidden = !$("#pColorEnabled").checked;
  $("#sizeEditor").hidden = !$("#pSizeEnabled").checked;
  paintImagePreviews();
  paintColorRows();
  paintSizeRows();
  $("#adminProductModal").classList.add("open");
}

function paintImagePreviews() {
  const list = $("#imagePreviewList");
  list.innerHTML = formImages.length
    ? formImages.map((image, index) => `
        <div class="image-preview">
          <img src="${escapeHtml(image.src)}" alt="">
          <button type="button" data-remove-image="${index}" aria-label="حذف الصورة">×</button>
          <small>${escapeHtml(`${slugName($("#pName").value)}${index + 1}`)}</small>
        </div>
      `).join("")
    : `<small>الصورة الأولى هي الصورة الرئيسية للمنتج.</small>`;

  $$("[data-remove-image]", list).forEach(button => {
    button.addEventListener("click", () => {
      formImages.splice(Number(button.dataset.removeImage), 1);
      formColors = formColors.map(color => {
        if (!Number.isInteger(color.imageIndex)) return color;
        return { ...color, imageIndex: Math.min(color.imageIndex, Math.max(0, formImages.length - 1)) };
      });
      paintImagePreviews();
      paintColorRows();
    });
  });
}

function paintColorRows() {
  const rows = $("#colorRows");
  rows.innerHTML = formColors.length
    ? formColors.map((color, index) => `
        <div class="option-row">
          <input data-color-name="${index}" value="${escapeHtml(color.name || "")}" placeholder="اسم اللون">
          <select data-color-image="${index}">
            <option value="">لون بدون صورة</option>
            ${formImages.map((_, imgIndex) => `<option value="${imgIndex}" ${color.imageIndex === imgIndex ? "selected" : ""}>الصورة ${imgIndex + 1}</option>`).join("")}
          </select>
          <button class="btn danger" type="button" data-remove-color="${index}">حذف</button>
        </div>
      `).join("")
    : `<small>زيدي الألوان، أو استعملي زر لون لكل صورة.</small>`;

  $$("[data-color-name]", rows).forEach(input => {
    input.addEventListener("input", () => {
      formColors[Number(input.dataset.colorName)].name = input.value;
    });
  });
  $$("[data-color-image]", rows).forEach(select => {
    select.addEventListener("change", () => {
      formColors[Number(select.dataset.colorImage)].imageIndex = select.value === "" ? null : Number(select.value);
    });
  });
  $$("[data-remove-color]", rows).forEach(button => {
    button.addEventListener("click", () => {
      formColors.splice(Number(button.dataset.removeColor), 1);
      paintColorRows();
    });
  });
}

function paintSizeRows() {
  const rows = $("#sizeRows");
  rows.innerHTML = formSizes.length
    ? formSizes.map((size, index) => {
        const isPreset = SIZE_OPTIONS.includes(size);
        const selectValue = isPreset ? size : "آخر";
        const customValue = isPreset ? "" : size;
        return `
          <div class="size-row">
            <select data-size-select="${index}">
              ${SIZE_OPTIONS.map(option => `<option value="${option}" ${selectValue === option ? "selected" : ""}>${option}</option>`).join("")}
            </select>
            <input data-size-custom="${index}" value="${escapeHtml(customValue)}" placeholder="اكتبي الحجم" ${selectValue === "آخر" ? "" : "disabled"}>
            <button class="btn danger" type="button" data-remove-size="${index}">حذف</button>
          </div>
        `;
      }).join("")
    : `<small>زيدي الأحجام المتوفرة.</small>`;

  $$("[data-size-select]", rows).forEach(select => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.sizeSelect);
      formSizes[index] = select.value;
      paintSizeRows();
    });
  });
  $$("[data-size-custom]", rows).forEach(input => {
    input.addEventListener("input", () => {
      formSizes[Number(input.dataset.sizeCustom)] = input.value;
    });
  });
  $$("[data-remove-size]", rows).forEach(button => {
    button.addEventListener("click", () => {
      formSizes.splice(Number(button.dataset.removeSize), 1);
      paintSizeRows();
    });
  });
}

async function saveProduct() {
  if (pendingImageUploads > 0) {
    alert("تسنى شوية حتى تكمل الصور التحميل والمعالجة، ومن بعد ضغط حفظ.");
    return;
  }
  const name = $("#pName").value.trim();
  if (!name) return;

  const images = formImages.map((image, index) => ({
    src: image.src,
    name: `${slugName(name)}${index + 1}`
  }));

  const product = {
    id: editingProductId || Date.now(),
    createdAt: editingProductId
      ? (allProducts().find(item => String(item.id) === String(editingProductId))?.createdAt || Date.now())
      : Date.now(),
    name,
    category: $("#pCategory").value,
    price: Number($("#pPrice").value || 0),
    oldPrice: $("#pOldPrice").value ? Number($("#pOldPrice").value) : "",
    desc: $("#pDesc").value.trim(),
    images,
    colorEnabled: $("#pColorEnabled").checked,
    colors: $("#pColorEnabled").checked ? formColors.filter(color => color.name.trim()).map(color => ({
      name: color.name.trim(),
      imageIndex: Number.isInteger(color.imageIndex) ? color.imageIndex : null
    })) : [],
    sizeEnabled: $("#pSizeEnabled").checked,
    sizes: $("#pSizeEnabled").checked ? formSizes.map(size => String(size).trim()).filter(Boolean) : []
  };

  const products = allProducts();
  const next = editingProductId
    ? products.map(item => String(item.id) === String(editingProductId) ? product : item)
    : [product, ...products];

  if (!writeStore(KEYS.products, next)) return;
  if (serverAvailable) {
    try {
      const saved = await apiPost("saveProducts", { products: next });
      if (Array.isArray(saved.products)) writeStore(KEYS.products, saved.products);
    } catch {
      alert("ما قدرش يحفظ المنتج فالسيرفر. تأكدي من الاستضافة كتدعم PHP والكتابة فالمجلدات.");
      return;
    }
  }
  $("#adminProductModal").classList.remove("open");
  renderAdminProducts();
}

document.addEventListener("click", event => {
  if (event.target.classList.contains("modal")) {
    event.target.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;
  if (page !== "admin") {
    await loadServerData(false);
  }
  initShell();
  if (page === "home") initHome();
  if (page === "products") initProducts();
  if (page === "offers") initOffers();
  if (page === "cart") initCartPage();
  if (page === "history") initHistory();
  if (page === "contact") initContact();
  if (page === "admin") initAdmin();
});
