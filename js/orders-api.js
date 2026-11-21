// Order helpers: queries, placing an order in one atomic commit, and the order email.
// Needs config.js, api.js and auth.js loaded first.
// Optional in config.js (for the order email, see EmailJS setup):
//   emailjs: { serviceId: "...", templateId: "...", publicKey: "..." }

//Reading

// One document exactly as Firestore returns it (keeps updateTime). Resolves null if missing.
function getRawDoc(collection, id) {
  return $.ajax({
    url: FS_BASE + "/" + collection + "/" + id + "?key=" + CONFIG.apiKey,
    method: "GET",
    headers: fsHeaders()
  }).then(doc => doc, xhr => xhr.status === 404 ? null : $.Deferred().reject(xhr));
}

// All documents in a collection where field == value.
function queryDocs(collection, field, value) {
  const query = { structuredQuery: {
    from: [{ collectionId: collection }],
    where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: toFs(value) } }
  } };
  return $.ajax({
    url: FS_BASE + ":runQuery?key=" + CONFIG.apiKey,
    method: "POST",
    contentType: "application/json",
    headers: fsHeaders(),
    data: JSON.stringify(query)
  }).then(rows => rows.filter(r => r.document).map(r => fromDoc(r.document)));
}

//Small helpers

function round2(n) { return Math.round(n * 100) / 100; }

// Local date and time like 2026-11-21T14:05:09 (same format as the sample data)
function nowStamp() {
  const d = new Date(), p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
         "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}

function prettyDate(stamp) {
  return new Date(stamp).toLocaleString("en-IN",
    { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function payLabel(type) { return type === "credit" ? "Store credit" : "Cash"; }

function failWith(message) { return $.Deferred().reject(message).promise(); }

const CHANGED_MSG = "Something changed while you were checking out (stock or credit). " +
                    "Please review your bag and try again.";

// Placing an order
// Reads the customer and every item fresh, checks stock and credit, then saves the
// order, its lines, the new stock levels and the new credit used in ONE commit.
// Each stock/credit write carries the updateTime we just read, so if anything changed in
// between, Firestore rejects the whole commit and nothing is half-saved.
// Resolves with { orderId, order, lines, emailStatus: "sent" | "failed" | "off" }.
// Rejects with a message string.
function placeOrder(uid, email, payType) {
  const cart = Object.values(getCart());
  if (!cart.length) return failWith("Your bag is empty.");

  const reads = [getRawDoc("customers", uid)].concat(cart.map(l => getRawDoc("inventory", l.id)));
  return $.when.apply($, reads).then(function () {
    const docs = Array.prototype.slice.call(arguments);
    const custRaw = docs[0];
    const customer = custRaw ? fromDoc(custRaw) : null;

    const lines = [];
    for (let n = 0; n < cart.length; n++) {
      const raw = docs[n + 1], want = cart[n];
      const item = raw ? fromDoc(raw) : null;
      if (!item || item.active === false || item.qty <= 0)
        return failWith(want.title + " is no longer available.");
      if (want.qty > item.qty)
        return failWith("Only " + item.qty + " of " + want.title + " in stock.");
      lines.push({ raw: raw, item: item, qty: want.qty,
                   lineTotal: round2(want.qty * item.price) });
    }
    const total = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

    let creditUsed = 0;
    if (payType === "credit") {
      if (!customer) return failWith("Your customer profile was not found.");
      creditUsed = customer.creditUsed || 0;
      const available = (customer.creditLimit || 0) - creditUsed;
      if (total > available)
        return failWith("Not enough store credit. Available: ₹" + available + ".");
    }

    const date = nowStamp();
    const orderId = "ord" + Date.now();
    const orderNo = "ORD-" + date.slice(2, 10).replace(/-/g, "") + "-" + (1000 + Math.floor(Math.random() * 9000));
    const name = customer ? customer.name : email;
    const order = { orderNo: orderNo, customerId: uid, customerName: name, date: date,
                    paymentType: payType, total: total, status: "Completed" };

    const base = "projects/" + CONFIG.projectId + "/databases/(default)/documents/";
    const fieldsOf = obj => toFs(obj).mapValue.fields;
    const writes = [{ update: { name: base + "orders/" + orderId, fields: fieldsOf(order) },
                      currentDocument: { exists: false } }];

    lines.forEach(function (l, n) {
      writes.push({ update: { name: base + "orderItems/" + orderId + "_" + (n + 1), fields: fieldsOf({
        orderId: orderId, date: date, customerId: uid, catId: l.item.catId, itemId: l.item.id,
        title: l.item.title, qty: l.qty, price: l.item.price, lineTotal: l.lineTotal, paymentType: payType }) },
        currentDocument: { exists: false } });
      writes.push({ update: { name: base + "inventory/" + l.item.id, fields: fieldsOf({ qty: l.item.qty - l.qty }) },
                    updateMask: { fieldPaths: ["qty"] },
                    currentDocument: { updateTime: l.raw.updateTime } });
    });

    if (payType === "credit") {
      writes.push({ update: { name: base + "customers/" + uid, fields: fieldsOf({ creditUsed: round2(creditUsed + total) }) },
                    updateMask: { fieldPaths: ["creditUsed"] },
                    currentDocument: { updateTime: custRaw.updateTime } });
    }

    return $.ajax({
      url: FS_BASE + ":commit?key=" + CONFIG.apiKey,
      method: "POST",
      contentType: "application/json",
      headers: fsHeaders(),
      data: JSON.stringify({ writes: writes })
    }).then(function () {
      const summary = lines.map(l => ({ title: l.item.title, qty: l.qty, price: l.item.price, lineTotal: l.lineTotal }));
      return sendOrderEmail(order, summary, email).then(function (emailStatus) {
        return { orderId: orderId, order: order, lines: summary, emailStatus: emailStatus };
      });
    }, function (xhr) {
      // 400 FAILED_PRECONDITION or 409 ABORTED: stock or credit changed since we read it
      return failWith(xhr.status === 400 || xhr.status === 409 ? CHANGED_MSG
        : "Could not place the order. Please try again.");
    });
  });
}

//Order email (EmailJS REST API)
// Always resolves (never rejects): "sent", "failed", or "off" when EmailJS is not set up.
function sendOrderEmail(order, lines, toEmail) {
  const cfg = CONFIG.emailjs;
  if (!cfg || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) return $.Deferred().resolve("off").promise();

  const itemsText = lines.map(l => l.qty + " x " + l.title + " - ₹" + l.lineTotal).join("\n");
  return $.ajax({
    url: "https://api.emailjs.com/api/v1.0/email/send",
    method: "POST",
    contentType: "application/json",
    timeout: 8000,
    data: JSON.stringify({
      service_id: cfg.serviceId, template_id: cfg.templateId, user_id: cfg.publicKey,
      template_params: {
        to_email: toEmail, to_name: order.customerName, order_no: order.orderNo,
        order_date: prettyDate(order.date), payment: payLabel(order.paymentType),
        items: itemsText, total: "₹" + order.total
      }
    })
  }).then(() => "sent", () => $.Deferred().resolve("failed").promise());
}