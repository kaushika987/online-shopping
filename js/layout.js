// Shared layout for customer pages: header, footer, cart drawer, toast, helpers.
// Each page has <div id="siteHeader"></div> and <div id="siteFooter"></div>
// and calls renderLayout() once.

const BRAND = "Cartora Fusion"; 

const ICONS = {
  menu:   '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  heart:  '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  user:   '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  bag:    '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  close:  '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  truck:  '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  return: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};

function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
         'stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
}

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

//Data, fetched once per page and shared
function getCategories() {
  if (!window._cats) {
    window._cats = getDocs("categories").then(c => c.sort((a, b) => a.name.localeCompare(b.name)));
  }
  return window._cats;
}

function getItems() {
  if (!window._items) {
    window._items = getDocs("inventory").then(function (list) {
      window._itemMap = {};
      list.forEach(i => window._itemMap[i.id] = i);
      return list;
    });
  }
  return window._items;
}

function findItem(id) {
  return window._itemMap ? window._itemMap[id] : undefined;
}

//Toast: the element with id="msg"
let toastTimer;
function showMsg(text, type) {
  $("#msg").removeClass("ok error").addClass("show " + (type || "")).text(text);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#msg").removeClass("show"), 2800);
}

//Fade in elements with class "reveal" as they scroll into view
let revealObserver;
function observeReveal() {
  const els = document.querySelectorAll(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)) {
    els.forEach(e => e.classList.add("in"));
    return;
  }
  revealObserver = revealObserver || new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("in"); revealObserver.unobserve(en.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(e => revealObserver.observe(e));
}

//Category navigation highlight (listing page)
function markNav(cat) {
  window.activeCat = cat || "";
  if (!/shop\.html$/.test(location.pathname)) return;
  $("#catNav a").removeClass("active")
    .filter(function () { return $(this).attr("data-cat") === window.activeCat; })
    .addClass("active");
}

//Cart drawer
function openCart() {
  $("#cartDrawer").addClass("open");
  $("#overlay").addClass("show");
  renderDrawer();
  getItems().done(renderDrawer);   // refresh with product images and current stock
}

function closeCart() {
  $("#cartDrawer").removeClass("open");
  $("#overlay").removeClass("show");
}

function renderDrawer() {
  const lines = Object.values(getCart());
  const html = lines.map(function (l) {
    const it = findItem(l.id) || {};
    return '<div class="line" data-id="' + esc(l.id) + '">' +
      imgHtml(it.imageUrl, "line-img") +
      '<div><div class="line-title">' + esc(l.title) + '</div>' +
      '<div class="muted">' + money(l.price) + '</div>' +
      '<div class="line-row"><div class="stepper">' +
        '<button class="l-minus" aria-label="Decrease">−</button>' +
        '<input class="l-qty" type="number" min="1" value="' + l.qty + '">' +
        '<button class="l-plus" aria-label="Increase">+</button></div>' +
      '<button class="link-btn l-remove">Remove</button></div></div></div>';
  }).join("");
  $("#drawerItems").html(html || '<div class="empty-cart">Your bag is empty.</div>');
  $("#drawerTotal").text(money(cartTotal()));
}

function bindDrawer() {
  $("#btnCart").click(openCart);
  $("#btnCloseCart, #overlay").click(closeCart);
  $(document).keydown(e => { if (e.key === "Escape") closeCart(); });

  $("#btnCheckout").click(function (e) {
    if (!cartCount()) { e.preventDefault(); showMsg("Your bag is empty.", "error"); }
  });

  $("#drawerItems").on("click", ".l-plus, .l-minus", function () {
    const id = $(this).closest(".line").attr("data-id");
    const line = getCart()[id];
    if (!line) return;
    const next = line.qty + ($(this).hasClass("l-plus") ? 1 : -1);
    const it = findItem(id);
    if (next < 1) return;
    if (it && next > it.qty) return showMsg("Only " + it.qty + " available.", "error");
    setLineQty(id, next);
    renderDrawer();
  });

  $("#drawerItems").on("change", ".l-qty", function () {
    const id = $(this).closest(".line").attr("data-id");
    const v = Number($(this).val());
    const it = findItem(id);
    renderDrawer();
    if (!Number.isInteger(v) || v < 1) return showMsg("Quantity must be a whole number, 1 or more.", "error");
    if (it && v > it.qty) return showMsg("Only " + it.qty + " available.", "error");
    setLineQty(id, v);
    renderDrawer();
  });

  $("#drawerItems").on("click", ".l-remove", function () {
    removeLine($(this).closest(".line").attr("data-id"));
    renderDrawer();
  });
}

//Header, footer, drawer
function renderLayout() {
  const params = new URLSearchParams(location.search);
  const email = sessionStorage.getItem("email") || "";
  window.activeCat = params.get("cat") || "";

  $("#siteHeader").html(
    '<header class="site-header"><div class="container header-row">' +
      '<button class="icon-btn menu-btn" id="btnMenu" aria-label="Menu">' + icon("menu") + '</button>' +
      '<a class="logo" href="home.html">' + esc(BRAND) + '</a>' +
      '<form class="search" id="searchForm" role="search">' +
        '<input type="text" id="search" placeholder="Search for products" autocomplete="off" value="' + esc(params.get("q") || "") + '">' +
        '<button type="submit" id="btnSearch" class="icon-btn" aria-label="Search">' + icon("search") + '</button>' +
      '</form>' +
      '<div class="header-icons">' +
        '<a class="icon-btn" href="shop.html?saved=1" aria-label="Wishlist">' + icon("heart") + '</a>' +
        '<div class="account"><button class="icon-btn" id="btnAccount" aria-label="Account">' + icon("user") + '</button>' +
          '<div class="account-menu" id="accountMenu"><div class="who">' + esc(email) + '</div>' +
          '<a href="orders.html">My orders</a><button id="btnLogout">Log out</button></div></div>' +
        '<button class="icon-btn" id="btnCart" aria-label="Open bag">' + icon("bag") +
          '<span class="count-badge" id="cartCount">0</span></button>' +
      '</div></div>' +
      '<nav class="cat-nav" id="catNav"><div class="container"><a href="shop.html" data-cat="">All</a></div></nav>' +
    '</header>');

  $("#siteFooter").html(
    '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      '<div><h4>' + esc(BRAND) + '</h4><p>Thoughtfully chosen pieces, packed with care and delivered to your door.</p></div>' +
      '<div><h4>Shop</h4><a href="shop.html">All products</a><a href="shop.html?saved=1">Saved items</a></div>' +
      '<div><h4>Account</h4><a href="orders.html">My orders</a></div>' +
    '</div><div class="copyright">© ' + new Date().getFullYear() + ' ' + esc(BRAND) + '. All rights reserved.</div></div></footer>');

  $("body").append(
    '<div class="overlay" id="overlay"></div>' +
    '<aside class="drawer" id="cartDrawer" aria-label="Shopping bag">' +
      '<div class="drawer-head"><h3>Your bag</h3>' +
        '<button class="icon-btn" id="btnCloseCart" aria-label="Close">' + icon("close") + '</button></div>' +
      '<div class="drawer-body" id="drawerItems"></div>' +
      '<div class="drawer-foot"><div class="subtotal"><span>Subtotal</span><strong id="drawerTotal">₹0</strong></div>' +
        '<a class="btn btn-block" id="btnCheckout" href="checkout.html">Checkout</a></div>' +
    '</aside>' +
    '<div class="toast" id="msg" role="status"></div>');

  $("#searchForm").on("submit", function (e) {
    e.preventDefault();
    const q = $("#search").val().trim();
    if (window.onSearch) window.onSearch(q);          // the listing page filters in place
    else location.href = "shop.html?q=" + encodeURIComponent(q);
  });
  $("#btnMenu").click(() => $("#catNav").toggleClass("open"));
  $("#btnAccount").click(function (e) { e.stopPropagation(); $("#accountMenu").toggleClass("open"); });
  $(document).click(() => $("#accountMenu").removeClass("open"));
  $("#btnLogout").click(logout);
  bindDrawer();
  showCartCount();

  getCategories().done(function (cats) {
    $("#catNav .container").append(cats.map(c =>
      '<a href="shop.html?cat=' + encodeURIComponent(c.id) + '" data-cat="' + esc(c.id) + '">' + esc(c.name) + '</a>').join(""));
    markNav(window.activeCat);
  });
}
