// Cart and wishlist, saved in the browser per signed-in customer.
// A cart line looks like: { id, title, price, catId, qty }

function cartKey() {
  return "cart_" + (sessionStorage.getItem("uid") || "guest");
}

function getCart() {
  try { return JSON.parse(localStorage.getItem(cartKey())) || {}; }
  catch (e) { return {}; }
}

function saveCart(cart) {
  try { localStorage.setItem(cartKey(), JSON.stringify(cart)); } catch (e) {}
}

function cartCount() {
  return Object.values(getCart()).reduce((n, line) => n + line.qty, 0);
}

function cartTotal() {
  return Object.values(getCart()).reduce((sum, line) => sum + line.qty * line.price, 0);
}

function showCartCount() {
  $("#cartCount").text(cartCount());
}

// A page (like checkout) can set window.onCartChange to redraw itself when the bag changes
function cartChanged() {
  if (window.onCartChange) window.onCartChange();
}

// Returns "" when added, otherwise a message explaining why not.
function addToCart(item, qty) {
  if (!item) return "This product is not available.";
  if (!Number.isInteger(qty) || qty < 1) return "Quantity must be a whole number, 1 or more.";

  const cart = getCart();
  const already = cart[item.id] ? cart[item.id].qty : 0;
  if (already + qty > item.qty) {
    return "Only " + item.qty + " available" +
      (already ? " (you already have " + already + " in your bag)." : ".");
  }
  cart[item.id] = { id: item.id, title: item.title, price: item.price,
                    catId: item.catId, qty: already + qty };
  saveCart(cart);
  showCartCount();
  cartChanged(); 
  return "";
}

function setLineQty(id, qty) {
  const cart = getCart();
  if (cart[id]) { cart[id].qty = qty; saveCart(cart); }
  showCartCount();
}

function removeLine(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
  showCartCount();
  cartChanged();
}

// Wishlist: a list of item ids
function wishKey() {
  return "wish_" + (sessionStorage.getItem("uid") || "guest");
}

function getWish() {
  try { return JSON.parse(localStorage.getItem(wishKey())) || []; }
  catch (e) { return []; }
}

// Adds or removes the id. Returns true when the item is now saved.
function toggleWish(id) {
  const list = getWish();
  const saved = !list.includes(id);
  const next = saved ? list.concat(id) : list.filter(x => x !== id);
  try { localStorage.setItem(wishKey(), JSON.stringify(next)); } catch (e) {}
  return saved;
}
