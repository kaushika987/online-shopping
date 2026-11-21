requireLogin("customer");
renderLayout();
bindCards($("#bestSellers"));

const TRUST = [
  ["truck", "Free shipping", "On every order"],
  ["return", "Easy returns", "7-day hassle-free returns"],
  ["shield", "Secure payment", "Cash or store credit"]
];
$("#trust").html(TRUST.map(t =>
  '<div class="trust-item reveal">' + icon(t[0]) + '<div><strong>' + t[1] + '</strong><span>' + t[2] + '</span></div></div>').join(""));
observeReveal();

$.when(getCategories(), getItems()).done(function (cats, items) {
  const live = items.filter(i => i.active !== false);

  // Category cards use the first product picture in each category, if there is one
  $("#catCards").html(cats.map(function (c) {
    const pic = live.find(i => i.catId === c.id && i.imageUrl);
    return '<a class="cat-card reveal" href="shop.html?cat=' + encodeURIComponent(c.id) + '">' +
      (pic ? imgHtml(pic.imageUrl, "cat-img") : '') + '<span>' + esc(c.name) + '</span></a>';
  }).join(""));
  observeReveal();

  // Best sellers: most units sold in past orders (falls back to name order)
  getDocs("orderItems").then(lines => lines, () => []).done(function (lines) {
    const sold = {};
    lines.forEach(l => sold[l.itemId] = (sold[l.itemId] || 0) + l.qty);

    const best = live.filter(i => i.qty > 0)
      .sort((a, b) => (sold[b.id] || 0) - (sold[a.id] || 0) || a.title.localeCompare(b.title))
      .slice(0, 4);

    $("#bestSellers").html(best.map(productCard).join(""));
    const pic = best.find(i => i.imageUrl);
    if (pic) $("#heroArt").html(imgHtml(pic.imageUrl, "hero-img"));
    observeReveal();
  });
}).fail(function () { showMsg("Could not load products.", "error"); });
