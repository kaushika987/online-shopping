requireLogin("customer");
renderLayout();

const uid = sessionStorage.getItem("uid");
const email = sessionStorage.getItem("email");
let customer = null, payType = "cash", placing = false, loaded = false, orderError = "";

const lines = () => Object.values(getCart());
const total = () => round2(lines().reduce((sum, l) => sum + l.qty * l.price, 0));
const available = () => customer ? (customer.creditLimit || 0) - (customer.creditUsed || 0) : 0;

// Anything in the bag that can no longer be bought as it is
function problems() {
  return lines().reduce(function (out, l) {
    const it = findItem(l.id);
    if (!it || it.active === false || it.qty <= 0) out.push(l.title + " is no longer available.");
    else if (l.qty > it.qty) out.push("Only " + it.qty + " of " + l.title + " in stock.");
    return out;
  }, []);
}

function payOption(value, title, text, disabled) {
  const on = payType === value;
  return '<label class="pay-option' + (on ? ' selected' : '') + (disabled ? ' disabled' : '') + '">' +
    '<input type="radio" name="pay" value="' + value + '"' + (on ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
    '<div><strong>' + title + '</strong><span>' + text + '</span></div></label>';
}

function render() {
  if (!loaded) return;
  const bag = lines();
  if (!bag.length) {
    return $("#checkoutBody").html('<div class="empty"><h3>Your bag is empty</h3>' +
      '<a class="btn" href="shop.html">Continue shopping</a></div>');
  }

  const issues = problems(), t = total();
  const canCredit = t > 0 && available() >= t;
  if (payType === "credit" && !canCredit) payType = "cash";

  const items = bag.map(function (l) {
    const it = findItem(l.id) || {};
    return '<div class="co-line">' + imgHtml(it.imageUrl, "line-img") +
      '<div><div class="co-title">' + esc(l.title) + '</div><div class="muted">' + l.qty + ' × ' + money(l.price) + '</div></div>' +
      '<strong>' + money(l.qty * l.price) + '</strong></div>';
  }).join("");

  const creditText = !customer ? "Not available for this account"
    : "Available credit: " + money(available()) + (canCredit ? "" : " (not enough for this order)");

  $("#checkoutBody").html('<div class="checkout"><div>' +
    '<section class="panel"><h2>Your items</h2>' + items + '</section>' +
    '<section class="panel"><h2>Payment</h2>' +
      payOption("cash", "Cash", "Pay when your order arrives", false) +
      payOption("credit", "Store credit", creditText, !canCredit) + '</section></div>' +
    '<aside class="panel summary"><h2>Order summary</h2>' +
      (issues.length ? '<div class="notice">' + issues.map(esc).join("<br>") +
        ' <button class="link-btn" id="btnFix">Fix my bag</button></div>' : '') +
      '<div class="sum-row"><span>Items</span><span>' + bag.reduce((n, l) => n + l.qty, 0) + '</span></div>' +
      '<div class="sum-row"><span>Shipping</span><span>Free</span></div>' +
      '<div class="sum-row sum-total"><span>Total</span><span>' + money(t) + '</span></div>' +
      '<button class="btn btn-block" id="btnPlace"' + (issues.length ? ' disabled' : '') + '>Place order</button>' +
      '<p class="err-text">' + esc(orderError) + '</p></aside></div>');
}

// Fresh stock and credit, then draw
function load() {
  window._items = null;
  $.when(getItems(), getRawDoc("customers", uid)).done(function (items, raw) {
    customer = raw ? fromDoc(raw) : null;
    const cart = getCart();                       // use today's prices
    Object.keys(cart).forEach(id => { if (findItem(id)) cart[id].price = findItem(id).price; });
    saveCart(cart);
    loaded = true;
    render();
  }).fail(function () {
    $("#checkoutBody").html('<p class="err-text">Could not load checkout. Please refresh the page.</p>');
  });
}

$("#checkoutBody").on("change", "input[name=pay]", function () {
  payType = this.value; orderError = ""; render();
});

$("#checkoutBody").on("click", "#btnFix", function () {
  lines().forEach(function (l) {
    const it = findItem(l.id);
    if (!it || it.active === false || it.qty <= 0) removeLine(l.id);
    else if (l.qty > it.qty) setLineQty(l.id, it.qty);
  });
  render();
});

$("#checkoutBody").on("click", "#btnPlace", function () {
  if (placing) return;
  placing = true;
  $(this).prop("disabled", true).text("Placing order...");
  placeOrder(uid, email, payType).done(function (r) {
    saveCart({});
    showCartCount();
    sessionStorage.setItem("email_" + r.orderId, r.emailStatus);
    location.href = "bill.html?id=" + r.orderId + "&new=1";
  }).fail(function (msg) {
    placing = false;
    orderError = typeof msg === "string" ? msg : "Could not place the order. Please try again.";
    load();
  });
});

window.onCartChange = render;     // redraw when the bag drawer changes the cart
load();