requireLogin("customer");
renderLayout();

const uid = sessionStorage.getItem("uid");

function itemsText(lines) {
  return lines.map(l => l.qty + " × " + esc(l.title)).join(", ");
}

$.when(queryDocs("orders", "customerId", uid), queryDocs("orderItems", "customerId", uid)).done(function (orders, lines) {
  if (!orders.length) {
    return $("#orderList").html('<div class="empty"><h3>No orders yet</h3>' +
      '<p>When you place an order it will show up here.</p><a class="btn" href="shop.html">Start shopping</a></div>');
  }

  const byOrder = {};
  lines.forEach(l => (byOrder[l.orderId] = byOrder[l.orderId] || []).push(l));
  orders.sort((a, b) => b.date.localeCompare(a.date));          // newest first

  $("#orderList").html(orders.map(o =>
    '<article class="order-card reveal">' +
      '<div class="order-head"><div><div class="order-no">' + esc(o.orderNo) + '</div>' +
        '<div class="muted">' + prettyDate(o.date) + '</div></div>' +
        '<div><span class="pill">' + payLabel(o.paymentType) + '</span>' +
        '<span class="pill ok">' + esc(o.status) + '</span></div></div>' +
      '<p class="order-items">' + itemsText(byOrder[o.id] || []) + '</p>' +
      '<div class="order-foot"><strong>' + money(o.total) + '</strong>' +
        '<a class="btn btn-outline btn-sm" href="bill.html?id=' + encodeURIComponent(o.id) + '">View bill</a></div>' +
    '</article>').join(""));
  observeReveal();
}).fail(function () {
  $("#orderList").html('<p class="err-text">Could not load your orders. Please refresh the page.</p>');
});