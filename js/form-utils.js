// Small helpers for the sign in and sign up pages.
// Each field is laid out as: <input id="x"> followed by <small class="field-error"></small>

// Shows (or clears) the message under a field. Returns true when the field is valid.
function setError(id, message) {
  const $input = $("#" + id);
  $input.toggleClass("invalid", !!message);
  $input.siblings(".field-error").text(message || "");
  return !message;
}

// The message line at the bottom of the form (element id="msg"). type: "ok" or "error".
function formMsg(text, type) {
  $("#msg").text(text).removeClass("ok error").addClass(type || "");
}

// Validate when the customer leaves a field, then keep re-checking while they fix it.
function liveCheck(id, check) {
  $("#" + id).on("blur", check).on("input", function () {
    if ($(this).hasClass("invalid")) check();
  });
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Use the store name from layout.js (BRAND) for the logo on the auth pages
$(function () { $(".auth-card .logo").text(BRAND); });
