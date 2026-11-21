// Product card HTML plus the click handling shared by the home, listing and detail pages.

function productCard(i) {
  const out = i.qty <= 0;
  const low = !out && i.qty < 15;
  const link = "product.html?id=" + encodeURIComponent(i.id);

  const actions = out
    ? '<button class="btn" disabled>Out of stock</button>'
    : '<div class="stepper"><button class="qty-minus" aria-label="Decrease">−</button>' +
      '<input class="qty" type="number" min="1" max="' + i.qty + '" value="1">' +
      '<button class="qty-plus" aria-label="Increase">+</button></div>' +
      '<button class="btn add">Add to Cart</button>';

  return '<article class="card reveal" data-id="' + esc(i.id) + '">' +
    '<a class="card-media" href="' + link + '">' + imgHtml(i.imageUrl, "card-img") +
      (low ? '<span class="badge">Low stock</span>' : '') +
      (out ? '<div class="sold-overlay">Out of stock</div>' : '') + '</a>' +
    '<button class="wish' + (getWish().includes(i.id) ? ' on' : '') + '" aria-label="Save to wishlist">' + icon("heart") + '</button>' +
    '<div class="card-body"><a class="card-title" href="' + link + '">' + esc(i.title) + '</a>' +
      '<div class="price">' + money(i.price) + '</div>' +
      '<div class="card-actions">' + actions + '</div></div></article>';
}

// Call once per container. Works for cards and for the detail page's buy box
// (any element with a data-id that holds a .qty input and an .add button).
function bindCards($root) {
  $root.on("click", ".qty-plus, .qty-minus", function () {
    const $in = $(this).siblings(".qty");
    const max = Number($in.attr("max")) || 1;
    const step = $(this).hasClass("qty-plus") ? 1 : -1;
    $in.val(Math.min(max, Math.max(1, (Number($in.val()) || 1) + step)));
  });

  $root.on("click", ".add", function () {
    const $box = $(this).closest("[data-id]");
    const item = findItem($box.attr("data-id"));
    const err = addToCart(item, Number($box.find(".qty").val()));
    if (err) return showMsg(err, "error");
    showMsg(item.title + " added to your bag.", "ok");
    $box.find(".qty").val(1);
  });

  $root.on("click", ".wish", function () {
    $(this).toggleClass("on", toggleWish($(this).closest("[data-id]").attr("data-id")));
  });
}
