requireLogin("admin");

const PAGE_SIZE = 10;
const MAX_LIMIT = 100000;
let customers = [], page = 1;

function showMsg(t) { $("#msg").text(t); }
function limitOf(c) { return c.creditLimit || 0; }
function usedOf(c) { return c.creditUsed || 0; }
function findCustomer(id) { return customers.find(c => c.id === id); }

function filtered() {
  const q = $("#search").val().trim().toLowerCase();
  return customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
}

function render() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;

  const rows = list.slice(start, start + PAGE_SIZE).map(c => {
    const id = esc(c.id);
    return "<tr>" +
      "<td>" + esc(c.name) + "</td>" +
      "<td>" + esc(c.email) + "</td>" +
      "<td>" + esc(c.mob) + "</td>" +
      "<td>₹" + limitOf(c) + "</td>" +
      "<td>₹" + usedOf(c) + "</td>" +
      "<td>₹" + (limitOf(c) - usedOf(c)) + "</td>" +
      "<td><button class='set' data-id='" + id + "'>Set limit</button>" +
      "<button class='remove' data-id='" + id + "'>Remove limit</button></td></tr>";
  });
  $("#custBody").html(rows.join("") ||
    "<tr><td colspan='7'>No customers found.</td></tr>");

  $("#pageInfo").text("Page " + page + " of " + pages + " (" + list.length + " customers)");
  $("#prev").prop("disabled", page <= 1);
  $("#next").prop("disabled", page >= pages);
}

function loadCustomers() {
  getDocs("customers").done(function (list) {
    customers = list.sort((a, b) => a.name.localeCompare(b.name));
    render();
  }).fail(function () { showMsg("Could not load customers."); });
}

// Create / update the limit
$("#custBody").on("click", ".set", function () {
  const c = findCustomer($(this).data("id"));
  const text = prompt("Credit limit for " + c.name + " (₹):", limitOf(c));
  if (text === null) return;
  const clean = text.trim();
  const limit = Number(clean);

  if (clean === "" || !Number.isInteger(limit) || limit < 0)
    return showMsg("Credit limit must be a whole number, 0 or more.");
  if (limit > MAX_LIMIT)
    return showMsg("Credit limit cannot be more than ₹" + MAX_LIMIT + ".");
  if (limit < usedOf(c))
    return showMsg("Limit cannot be below the credit already used (₹" + usedOf(c) + ").");

  updateDoc("customers", c.id, { creditLimit: limit }).done(function () {
    showMsg("Credit limit updated for " + c.name + ".");
    loadCustomers();
  }).fail(function () { showMsg("Could not update the limit."); });
});

// Delete = remove the limit (set back to 0)
$("#custBody").on("click", ".remove", function () {
  const c = findCustomer($(this).data("id"));
  if (limitOf(c) === 0) return showMsg(c.name + " has no credit limit to remove.");
  if (usedOf(c) > 0)
    return showMsg("Cannot remove: " + c.name + " still has ₹" + usedOf(c) + " of credit in use.");
  if (!confirm("Remove the credit limit for " + c.name + "? Yes = OK, No = Cancel")) return;

  updateDoc("customers", c.id, { creditLimit: 0 }).done(function () {
    showMsg("Credit limit removed for " + c.name + ".");
    loadCustomers();
  }).fail(function () { showMsg("Could not remove the limit."); });
});

$("#btnSearch").click(function () { page = 1; render(); });
$("#search").keyup(function (e) { if (e.key === "Enter") { page = 1; render(); } });
$("#btnClear").click(function () { $("#search").val(""); page = 1; render(); });
$("#prev").click(function () { page--; render(); });
$("#next").click(function () { page++; render(); });

loadCustomers();