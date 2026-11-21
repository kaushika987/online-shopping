requireLogin("admin");

const PAGE_SIZE = 10;
let items = [], catNames = {}, page = 1, editingId = null;
let newImage = "", oldImage = "", imageError = "";

//filtering
function filtered() {
    const cat = $("#catFilter").val();
    const q = $("#search").val().trim().toLowerCase();

    return items.filter(i =>
        (!cat || i.catId === cat) &&
        (!q || i.id.toLowerCase() === q || i.title.toLowerCase().includes(q))
    );
}


//rendering
function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

    if (page > pages) page = pages;

    const start = (page - 1) * PAGE_SIZE;

    const rows = list.slice(start, start + PAGE_SIZE).map(i => {
        const active = i.active !== false;
        const id = esc(i.id);

        return "<tr class='" + (active ? "" : "inactive") + "'>" +
            "<td>" + imgHtml(i.imageUrl, "thumb") + "</td>" +
            "<td>" + id + "</td>" +
            "<td>" + esc(i.title) + "</td>" +
            "<td>" + esc(catNames[i.catId] || "Unknown") + "</td>" +
            "<td>" + i.qty + "</td>" +
            "<td>₹" + i.price + "</td>" +
            "<td>" + (active ? "Active" : "Inactive") + "</td>" +
            "<td><button class='edit' data-id='" + id + "'>Edit</button>" +
            "<button class='tog' data-id='" + id + "'>" +
            (active ? "Deactivate" : "Activate") + "</button>" +
            "<button class='del' data-id='" + id + "'>Delete</button></td></tr>";
    });

    $("#itemBody").html(rows.join("") ||
        "<tr><td colspan='8'>No items found.</td></tr>"
    );

    $("#pageInfo").text(
        "Page " + page + " of " + pages + " (" + list.length + " items)"
    );

    $("#prev").prop("disabled", page <= 1);
    $("#next").prop("disabled", page >= pages);
}


//loading data
function loadItems() {
    return getDocs("inventory")
        .done(function (inv) {
            items = inv.sort((a, b) => a.title.localeCompare(b.title));
            render();
        })
        .fail(function () {
            $("#msg").text("Could not load inventory.");
        });
}

function loadAll() {
    getDocs("categories")
        .done(function (cats) {
            cats.sort((a, b) => a.name.localeCompare(b.name));

            cats.forEach(c => {
                catNames[c.id] = c.name;

                const opt =
                    "<option value='" + esc(c.id) + "'>" +
                    esc(c.name) +
                    "</option>";

                $("#catFilter").append(opt);
                $("#fCat").append(opt);
            });

            loadItems();
        })
        .fail(function () {
            $("#msg").text("Could not load categories.");
        });
}

function showPreview(url) {
  if (url) $("#fPreview").attr("src", url).show(); else $("#fPreview").hide();
}

//add / edit form
function openForm(item) {
    editingId = item ? item.id : null;

    $("#formTitle").text(item ? "Edit item " + item.id : "Add item");
    $("#fTitle").val(item ? item.title : "");
    $("#fDes").val(item ? item.des : "");
    $("#fCat").val(item ? item.catId : "");
    $("#fQty").val(item ? item.qty : "");
    $("#fPrice").val(item ? item.price : "");

    $("#formMsg").text("");
    $("#formBox").show();
    $("#fTitle").focus();

   newImage = ""; imageError = ""; oldImage = item ? (item.imageUrl || "") : "";
   $("#fImage").val("");
   showPreview(oldImage);
}

function closeForm() {
    $("#formBox").hide();
    editingId = null;
}

$("#btnNew").click(function () {
    openForm(null);
});

$("#btnCancel").click(closeForm);


$("#btnSave").click(function () {
    const title = $("#fTitle").val().trim();
    const des = $("#fDes").val().trim();
    const catId = $("#fCat").val();
    const qtyText = $("#fQty").val().trim();
    const qty = Number(qtyText);
    const price = Number($("#fPrice").val());

    let err = "";

    if (title.length < 2 || title.length > 60)
        err = "Title must be 2 to 60 characters.";

    else if (des.length > 200)
        err = "Description can be at most 200 characters.";

    else if (!catId)
        err = "Choose a category.";

    else if (qtyText === "" || !Number.isInteger(qty) || qty < 0)
        err = "Quantity must be a whole number, 0 or more.";

    else if (!(price > 0))
        err = "Price must be greater than 0.";

    if (err) return $("#formMsg").text(err);
    if (imageError) return $("#formMsg").text(imageError);

    const data = {
        catId: catId,
        title: title,
        des: des,
        qty: qty,
        price: price
    };

    if (!editingId || newImage) data.imageUrl = newImage;

    const done = function (text) {
        closeForm();
        $("#msg").text(text);
        loadItems();
    };

    const fail = function () {
        $("#formMsg").text("Could not save. Try again.");
    };

    if (editingId) {
        updateDoc("inventory", editingId, data)
            .done(() => done("Item updated."))
            .fail(fail);

    } else {
        data.active = true;

        addDoc("inventory", data)
            .done(() => done("Item added."))
            .fail(fail);
    }
});


//row actions
function findItem(id) {
    return items.find(i => i.id === id);
}


// Edit item
$("#itemBody").on("click", ".edit", function () {
    openForm(findItem($(this).data("id")));
    window.scrollTo(0, 0);
});


// Activate / Deactivate item
$("#itemBody").on("click", ".tog", function () {
    const item = findItem($(this).data("id"));
    const nowActive = item.active !== false;

    updateDoc("inventory", item.id, {
        active: !nowActive
    })
        .done(function () {
            $("#msg").text(
                nowActive ? "Item deactivated." : "Item activated."
            );

            loadItems();
        })
        .fail(function () {
            $("#msg").text("Could not change status.");
        });
});


// Delete item
$("#itemBody").on("click", ".del", function () {
    const item = findItem($(this).data("id"));

    if (!confirm("Delete \"" + item.title + "\"? Yes = OK, No = Cancel"))
        return;

    deleteDocById("inventory", item.id)
        .done(function () {
            $("#msg").text("Item deleted.");
            loadItems();
        })
        .fail(function () {
            $("#msg").text("Could not delete.");
        });
});



//filters and pagination
$("#catFilter").change(function () {
    page = 1;
    render();
});

$("#btnSearch").click(function () {
    page = 1;
    render();
});

$("#search").keyup(function (e) {
    if (e.key === "Enter") {
        page = 1;
        render();
    }
});

$("#btnClear").click(function () {
    $("#search").val("");
    $("#catFilter").val("");

    page = 1;
    render();
});

$("#prev").click(function () {
    page--;
    render();
});

$("#next").click(function () {
    page++;
    render();
});

$("#fImage").change(function () {
  const file = this.files[0];
  newImage = ""; imageError = "";
  $("#formMsg").text("");
  if (!file) return showPreview(oldImage);

  if (!file.type.startsWith("image/")) imageError = "Please choose an image file.";
  else if (file.size > 500 * 1024) imageError = "Please choose an image under 500 KB.";
  if (imageError) { showPreview(oldImage); return $("#formMsg").text(imageError); }

  const reader = new FileReader();
  reader.onload = function () { newImage = reader.result; showPreview(newImage); };
  reader.readAsDataURL(file);
});


//initial loading
loadAll();