requireLogin("customer");
renderLayout();
bindCards($("#detail"));

const productId = new URLSearchParams(location.search).get("id");

$.when(getCategories(), getItems()).done(function (cats, items) {
  const item = items.find(i => i.id === productId);
  if (!item || item.active === false) {
    $("#detail").html('<div class="empty"><h3>Product not found</h3><a class="btn" href="shop.html">Back to shop</a></div>');
    return;
  }

  const cat = cats.find(c => c.id === item.catId);
  const out = item.qty <= 0;
  const stock = out ? '<span class="stock out">Out of stock</span>'
    : item.qty < 15 ? '<span class="stock low">Only ' + item.qty + ' left</span>'
    : '<span class="stock in">In stock</span>';

  document.title = item.title + " | " + BRAND;
  $("#detail").html(
    '<div class="detail-media">' + imgHtml(item.imageUrl, "detail-img") + '</div>' +
    '<div class="detail-info" data-id="' + esc(item.id) + '">' +
      '<div class="crumbs"><a href="home.html">Home</a> / ' +
        (cat ? '<a href="shop.html?cat=' + encodeURIComponent(cat.id) + '">' + esc(cat.name) + '</a>' : 'Shop') + '</div>' +
      '<h1>' + esc(item.title) + '</h1>' +
      '<div class="detail-price">' + money(item.price) + '</div>' + stock +
      (item.des ? '<p class="detail-desc">' + esc(item.des) + '</p>' : '<div class="detail-desc"></div>') +
      '<div class="buy-row">' + (out
        ? '<button class="btn" disabled>Out of stock</button>'
        : '<div class="stepper"><button class="qty-minus" aria-label="Decrease">−</button>' +
          '<input class="qty" type="number" min="1" max="' + item.qty + '" value="1">' +
          '<button class="qty-plus" aria-label="Increase">+</button></div>' +
          '<button class="btn add">Add to Cart</button>') + '</div>' +
    '</div>');
}).fail(function () { showMsg("Could not load the product.", "error"); });
