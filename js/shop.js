requireLogin("customer");
renderLayout();
bindCards($("#itemBody"));

const PAGE_SIZE = 12;
const params = new URLSearchParams(location.search);
let items = [], catNames = {}, page = 1;
let selCat = params.get("cat") || "";
let query = params.get("q") || "";
let onlySaved = params.get("saved") === "1";

// The header search box calls this when the customer is already on this page
window.onSearch = function (q) { query = q; page = 1; render(); };

function filtered() {
  const min = Number($("#minPrice").val()) || 0;
  const max = Number($("#maxPrice").val()) || Infinity;
  const q = query.toLowerCase();
  const saved = onlySaved ? getWish() : null;

  const list = items.filter(i =>
    i.active !== false &&
    (!selCat || i.catId === selCat) &&
    (!q || i.id.toLowerCase() === q || i.title.toLowerCase().includes(q)) &&
    i.price >= min && i.price <= max &&
    (!saved || saved.includes(i.id)));

  const sort = $("#sortBy").val();
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  else if (sort === "high") list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => a.title.localeCompare(b.title));
  return list;
}

function pageTitle() {
  if (onlySaved) return "Saved items";
  if (query) return "Results for “" + query + "”";
  return selCat ? (catNames[selCat] || "Products") : "All products";
}

function render() {
  const list = filtered();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;

  $("#shopTitle").text(pageTitle());
  $("#itemBody").html(list.slice(start, start + PAGE_SIZE).map(productCard).join("") ||
    '<div class="empty"><h3>No products found</h3><p>Try changing your filters or search.</p></div>');
  $("#resultCount").text(list.length + (list.length === 1 ? " product" : " products"));
  $("#pageInfo").text("Page " + page + " of " + pages);
  $("#prev").prop("disabled", page <= 1);
  $("#next").prop("disabled", page >= pages);
  markNav(selCat);
  observeReveal();
}

function radio(value, label) {
  return '<label><input type="radio" name="cat" value="' + esc(value) + '"> ' + esc(label) + '</label>';
}

function load() {
  $.when(getCategories(), getItems()).done(function (cats, inv) {
    items = inv;
    cats.forEach(c => catNames[c.id] = c.name);
    $("#catFilter").html(radio("", "All categories") + cats.map(c => radio(c.id, c.name)).join(""));
    $("#catFilter input").filter(function () { return this.value === selCat; }).prop("checked", true);
    render();
  }).fail(function () { showMsg("Could not load products.", "error"); });
}

$("#catFilter").on("change", "input", function () { selCat = this.value; page = 1; render(); });
$("#btnApply").click(function () { page = 1; render(); });
$("#sortBy").change(function () { page = 1; render(); });
$("#btnFilters").click(() => $("#filters").toggleClass("open"));

$("#btnClear").click(function () {
  selCat = ""; query = ""; onlySaved = false; page = 1;
  $("#search, #minPrice, #maxPrice").val("");
  $("#sortBy").val("name");
  $("#catFilter input").first().prop("checked", true);
  history.replaceState(null, "", "shop.html");
  render();
});

$("#prev").click(function () { page--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("#next").click(function () { page++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });

load();
