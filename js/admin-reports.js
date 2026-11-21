requireLogin("admin");

const HIGH = 100, LOW = 15;           // high stock: more than 100, low stock: fewer than 15
let cats = [], items = [];

const inr = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const catName = id => (cats.find(c => c.id === id) || {}).name || "Unknown";

// Columns shared by the item reports. num: right-aligned number, fmt: how to show the value.
const ITEM_COLS = [
  { key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "cat", label: "Category" },
  { key: "qty", label: "Qty", num: true }, { key: "price", label: "Price", num: true, fmt: inr },
  { key: "status", label: "Status" }
];

function itemRows(list) {
  return list.map(i => ({ id: i.id, title: i.title, cat: catName(i.catId), qty: i.qty,
                          price: i.price, status: i.active === false ? "Inactive" : "Active" }));
}

// Every report is one entry here. run() returns { cols, rows }.
// category: true shows the category filter for that report.
const REPORTS = {
  stock: {
    label: "Current stock", category: true,
    run: function (cat) {
      const list = items.filter(i => !cat || i.catId === cat).sort((a, b) => a.title.localeCompare(b.title));
      return { cols: ITEM_COLS, rows: itemRows(list) };
    }
  },
  summary: {
    label: "Stock by category",
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
    label: "High stock (over " + HIGH + ")",
    run: () => ({ cols: ITEM_COLS, rows: itemRows(items.filter(i => i.qty > HIGH).sort((a, b) => b.qty - a.qty)) })
  },
  low: {
    label: "Low stock (under " + LOW + ")",
    run: () => ({ cols: ITEM_COLS, rows: itemRows(items.filter(i => i.qty < LOW).sort((a, b) => a.qty - b.qty)) })
  }
};

function show() {
  const rep = REPORTS[$("#reportType").val()];
  $("#fCat").toggle(!!rep.category);
  const out = rep.run($("#fCat").val());

  $("#reportTitle").text(rep.label);
  $("#reportNote").text(out.rows.length + (out.rows.length === 1 ? " row" : " rows"));
  $("#reportHead").html("<tr>" + out.cols.map(c =>
    "<th" + (c.num ? " class='num'" : "") + ">" + esc(c.label) + "</th>").join("") + "</tr>");
  $("#reportBody").html(out.rows.map(r => "<tr>" + out.cols.map(c =>
    "<td" + (c.num ? " class='num'" : "") + ">" + esc(c.fmt ? c.fmt(r[c.key]) : r[c.key]) + "</td>").join("") + "</tr>").join("") ||
    "<tr><td colspan='" + out.cols.length + "'>Nothing to show.</td></tr>");
}

$("#reportType").html(Object.keys(REPORTS).map(k => "<option value='" + k + "'>" + esc(REPORTS[k].label) + "</option>").join(""));
$("#reportType, #fCat").change(show);

$.when(getDocs("categories"), getDocs("inventory")).done(function (c, inv) {
  cats = c.sort((a, b) => a.name.localeCompare(b.name));
  items = inv;
  cats.forEach(cat => $("#fCat").append("<option value='" + esc(cat.id) + "'>" + esc(cat.name) + "</option>"));
  show();
}).fail(function () { $("#reportNote").text("Could not load the data. Please refresh."); });