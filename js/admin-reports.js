requireLogin("admin");

const HIGH = 100, LOW = 15;           // high stock: more than 100, low stock: fewer than 15
let cats = [], items = [], orders = [], lines = [], customers = [];

const inr = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const r2 = n => Math.round(n * 100) / 100;
const catName = id => (cats.find(c => c.id === id) || {}).name || "Unknown";
const payName = type => type === "credit" ? "Store credit" : "Cash";
const stampText = s => String(s).replace("T", " ").slice(0, 16);

// getDocs only reads the first 300 documents, so reports page through everything
function getAll(collection, token, found) {
  found = found || [];
  return $.ajax({
    url: FS_BASE + "/" + collection + "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "") + "&key=" + CONFIG.apiKey,
    method: "GET", headers: fsHeaders()
  }).then(function (r) {
    found = found.concat((r.documents || []).map(fromDoc));
    return r.nextPageToken ? getAll(collection, r.nextPageToken, found) : found;
  });
}

// True when a stored date (like 2026-11-03T10:15:00) falls inside the From/To boxes, both days included
function inRange(stamp) {
  const day = String(stamp).slice(0, 10), from = $("#fFrom").val(), to = $("#fTo").val();
  return (!from || day >= from) && (!to || day <= to);
}

// Columns. num: right-aligned number, fmt: how to show the value.
const ITEM_COLS = [
  { key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "cat", label: "Category" },
  { key: "qty", label: "Qty", num: true }, { key: "price", label: "Price", num: true, fmt: inr },
  { key: "status", label: "Status" }
];
const ORDER_COLS = [
  { key: "no", label: "Order" }, { key: "date", label: "Date" }, { key: "customer", label: "Customer" },
  { key: "pay", label: "Payment" }, { key: "total", label: "Total", num: true, fmt: inr }
];

function itemRows(list) {
  return list.map(i => ({ id: i.id, title: i.title, cat: catName(i.catId), qty: i.qty,
                          price: i.price, status: i.active === false ? "Inactive" : "Active" }));
}

// Orders in the date range, oldest first, with a Total row. type: "cash", "credit" or "" for all.
function orderReport(type) {
  const list = orders.filter(o => inRange(o.date) && (!type || o.paymentType === type))
                     .sort((a, b) => a.date.localeCompare(b.date));
  return {
    cols: ORDER_COLS,
    rows: list.map(o => ({ no: o.orderNo, date: stampText(o.date), customer: o.customerName,
                           pay: payName(o.paymentType), total: o.total })),
    foot: { no: "Total (" + list.length + (list.length === 1 ? " order)" : " orders)"),
            total: r2(list.reduce((n, o) => n + o.total, 0)) }
  };
}

// Purchases per customer in the date range, biggest first. type: "cash", "credit" or "" for all. max: optional row limit.
function customerReport(type, max) {
  const t = {};
  orders.filter(o => inRange(o.date) && (!type || o.paymentType === type)).forEach(function (o) {
    const c = t[o.customerId] = t[o.customerId] || { id: o.customerId, orders: 0, total: 0 };
    c.orders++; c.total += o.total;
  });
  let rows = Object.keys(t).map(function (id) {
    const c = customers.find(x => x.id === id) || {};
    return { name: c.name || "Unknown", email: c.email || "", orders: t[id].orders, total: r2(t[id].total) };
  }).sort((a, b) => b.total - a.total);
  if (max) rows = rows.slice(0, max);
  return {
    cols: [{ key: "name", label: "Customer" }, { key: "email", label: "Email" },
           { key: "orders", label: "Orders", num: true }, { key: "total", label: "Total purchases", num: true, fmt: inr }],
    rows: rows,
    foot: { name: "Total", orders: rows.reduce((n, r) => n + r.orders, 0), total: r2(rows.reduce((n, r) => n + r.total, 0)) }
  };
}

// Units and sales per item in the date range. Every inventory item is included, so unsold items show 0.
function itemSales() {
  const t = {};
  items.forEach(i => t[i.id] = { title: i.title, cat: catName(i.catId), units: 0, sales: 0 });
  lines.filter(l => inRange(l.date)).forEach(function (l) {
    const x = t[l.itemId] = t[l.itemId] || { title: l.title, cat: catName(l.catId), units: 0, sales: 0 };
    x.units += l.qty; x.sales += l.lineTotal;
  });
  return Object.keys(t).map(id => ({ id: id, title: t[id].title, cat: t[id].cat, units: t[id].units, sales: r2(t[id].sales) }));
}
const SELL_COLS = [{ key: "title", label: "Item" }, { key: "cat", label: "Category" },
                   { key: "units", label: "Units sold", num: true }, { key: "sales", label: "Sales", num: true, fmt: inr }];

// Every report is one entry here. run() returns { cols, rows, foot? }.
// category: true shows the category filter. dates: true shows the From/To boxes.
const REPORTS = {
  stock: {
    label: "Inventory: current stock", category: true,
    run: function (cat) {
      const list = items.filter(i => !cat || i.catId === cat).sort((a, b) => a.title.localeCompare(b.title));
      return { cols: ITEM_COLS, rows: itemRows(list) };
    }
  },
  summary: {
    label: "Inventory: stock by category",
    run: function () {
      const rows = cats.map(function (c) {
        const own = items.filter(i => i.catId === c.id);
        return { cat: c.name, count: own.length,
                 units: own.reduce((n, i) => n + i.qty, 0),
                 value: own.reduce((n, i) => n + i.qty * i.price, 0) };
      });
      return { cols: [{ key: "cat", label: "Category" }, { key: "count", label: "Items", num: true },
                      { key: "units", label: "Units in stock", num: true },
                      { key: "value", label: "Stock value", num: true, fmt: inr }], rows: rows };
    }
  },
  high: {
    label: "Inventory: high stock (over " + HIGH + ")",
    run: () => ({ cols: ITEM_COLS, rows: itemRows(items.filter(i => i.qty > HIGH).sort((a, b) => b.qty - a.qty)) })
  },
  low: {
    label: "Inventory: low stock (under " + LOW + ")",
    run: () => ({ cols: ITEM_COLS, rows: itemRows(items.filter(i => i.qty < LOW).sort((a, b) => a.qty - b.qty)) })
  },
    customers: {
    label: "Customers: all details",
    run: function () {
      const rows = customers.slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => ({
        name: c.name, email: c.email, mob: c.mob, limit: c.creditLimit || 0,
        used: c.creditUsed || 0, left: (c.creditLimit || 0) - (c.creditUsed || 0) }));
      return { cols: [{ key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "mob", label: "Mobile" },
                      { key: "limit", label: "Credit limit", num: true, fmt: inr }, { key: "used", label: "Credit used", num: true, fmt: inr },
                      { key: "left", label: "Credit available", num: true, fmt: inr }], rows: rows };
    }
  },
  top10:      { label: "Customers: top 10 by purchases", dates: true, run: () => customerReport("", 10) },
  custCash:   { label: "Customers: cash purchases", dates: true, run: () => customerReport("cash") },
  custCredit: { label: "Customers: store credit purchases", dates: true, run: () => customerReport("credit") },
    topItems: {
    label: "Items: top 10 selling", dates: true,
    run: () => ({ cols: SELL_COLS, rows: itemSales().filter(i => i.units > 0)
                  .sort((a, b) => b.units - a.units || b.sales - a.sales).slice(0, 10) })
  },
  bottomItems: {
    label: "Items: bottom 10 selling", dates: true,
    run: () => ({ cols: SELL_COLS, rows: itemSales()
                  .sort((a, b) => a.units - b.units || a.sales - b.sales).slice(0, 10) })
  },
  salesAll:    { label: "Sales: all orders", dates: true, run: () => orderReport("") },
  salesCash:   { label: "Sales: cash orders", dates: true, run: () => orderReport("cash") },
  salesCredit: { label: "Sales: store credit orders", dates: true, run: () => orderReport("credit") },
  salesCat: {
    label: "Sales: by category", dates: true,
    run: function () {
      const sold = {};
      cats.forEach(c => sold[c.id] = { units: 0, sales: 0 });          // categories with no sales show zeros
      lines.filter(l => inRange(l.date)).forEach(function (l) {
        const t = sold[l.catId] = sold[l.catId] || { units: 0, sales: 0 };
        t.units += l.qty; t.sales += l.lineTotal;
      });
      const rows = Object.keys(sold).map(id => ({ cat: catName(id), units: sold[id].units, sales: r2(sold[id].sales) }))
                         .sort((a, b) => b.sales - a.sales);
      return { cols: [{ key: "cat", label: "Category" }, { key: "units", label: "Units sold", num: true },
                      { key: "sales", label: "Sales", num: true, fmt: inr }], rows: rows,
               foot: { cat: "Total", units: rows.reduce((n, r) => n + r.units, 0), sales: r2(rows.reduce((n, r) => n + r.sales, 0)) } };
    }
  }
};

function cell(c, value, tag) {
  const shown = value === undefined ? "" : (c.fmt ? c.fmt(value) : value);
  return "<" + tag + (c.num ? " class='num'" : "") + ">" + esc(shown) + "</" + tag + ">";
}

function show() {
  const rep = REPORTS[$("#reportType").val()];
  const from = $("#fFrom").val(), to = $("#fTo").val();
  $("#fCat").toggle(!!rep.category);
  $("#dateWrap").toggle(!!rep.dates);
  $("#reportTitle").text(rep.label);

  if (rep.dates && from && to && from > to) {
    $("#reportNote").text("The From date must be on or before the To date.");
    return $("#reportHead, #reportBody, #reportFoot").empty();
  }

  const out = rep.run($("#fCat").val());
  const range = rep.dates && (from || to) ? " · " + (from || "start") + " to " + (to || "today") : "";
  $("#reportNote").text(out.rows.length + (out.rows.length === 1 ? " row" : " rows") + range);
  $("#reportHead").html("<tr>" + out.cols.map(c =>
    "<th" + (c.num ? " class='num'" : "") + ">" + esc(c.label) + "</th>").join("") + "</tr>");
  $("#reportBody").html(out.rows.map(r => "<tr>" + out.cols.map(c => cell(c, r[c.key], "td")).join("") + "</tr>").join("") ||
    "<tr><td colspan='" + out.cols.length + "'>Nothing to show.</td></tr>");
  $("#reportFoot").html(out.foot && out.rows.length
    ? "<tr>" + out.cols.map(c => cell(c, out.foot[c.key], "td")).join("") + "</tr>" : "");
}

$("#reportType").html(Object.keys(REPORTS).map(k => "<option value='" + k + "'>" + esc(REPORTS[k].label) + "</option>").join(""));
$("#reportType, #fCat, #fFrom, #fTo").change(show);

$.when(getAll("categories"), getAll("inventory"), getAll("orders"), getAll("orderItems"), getAll("customers")).done(function (c, inv, ord, ln, cu) {
  cats = c.sort((a, b) => a.name.localeCompare(b.name));
  items = inv; orders = ord; lines = ln; customers = cu;
  cats.forEach(cat => $("#fCat").append("<option value='" + esc(cat.id) + "'>" + esc(cat.name) + "</option>"));
  show();
}).fail(function () { $("#reportNote").text("Could not load the data. Please refresh."); });