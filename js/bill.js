requireLogin("customer");
renderLayout();

const params = new URLSearchParams(location.search);
const orderId = params.get("id");
const isNew = params.get("new") === "1";
const email = sessionStorage.getItem("email");

function notFound() {
  $("#billBody").html('<div class="empty"><h3>Order not found</h3><a class="btn" href="shop.html">Back to shop</a></div>');
}

$.when(getDocById("orders", orderId), queryDocs("orderItems", "orderId", orderId)).done(function (order, lines) {
  if (order.customerId !== sessionStorage.getItem("uid")) return notFound();
  lines.sort((a, b) => a.title.localeCompare(b.title));

  const notes = { sent: "A confirmation email was sent to " + email + ".",
                  failed: "We could not send the confirmation email, but your order is saved." };
  const note = isNew ? notes[sessionStorage.getItem("email_" + orderId)] : "";

  const rows = lines.map(l => '<div class="bill-row"><span>' + esc(l.title) + '</span><span>' + l.qty +
    '</span><span>' + money(l.price) + '</span><span>' + money(l.lineTotal) + '</span></div>').join("");

  $("#billBody").html(
    (isNew ? '<div class="success-banner no-print"><strong>Thank you! Your order is placed.</strong>' +
      (note ? '<div>' + esc(note) + '</div>' : '') + '</div>' : '') +
    '<article class="bill"><div class="bill-head">' +
      '<div><h1>' + esc(BRAND) + '</h1><div class="bill-meta">Order bill</div></div>' +
      '<div class="bill-meta right"><strong>' + esc(order.orderNo) + '</strong><br>' + prettyDate(order.date) +
        '<br>Payment: ' + payLabel(order.paymentType) + '</div></div>' +
    '<p class="bill-to">Billed to <strong>' + esc(order.customerName) + '</strong></p>' +
    '<div class="bill-row head"><span>Item</span><span>Qty</span><span>Price</span><span>Amount</span></div>' + rows +
    '<div class="sum-row"><span>Shipping</span><span>Free</span></div>' +
    '<div class="bill-total"><span>Total</span><span>' + money(order.total) + '</span></div></article>' +
     '<div class="bill-actions no-print"><button class="btn" id="btnPrint">Print bill</button>' +
      '<a class="btn btn-outline" href="orders.html">My orders</a>' +
      '<a class="btn btn-outline" href="shop.html">Continue shopping</a></div>');
}).fail(notFound);

$("#billBody").on("click", "#btnPrint", () => window.print());