const AUTH_BASE = "https://identitytoolkit.googleapis.com/v1/accounts";

function authCall(action, body) {
  return $.ajax({
    url: AUTH_BASE + ":" + action + "?key=" + CONFIG.apiKey,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(body)
  });
}

// Turn Firebase error codes into readable messages
function authError(xhr) {
  const code = xhr.responseJSON && xhr.responseJSON.error
    ? xhr.responseJSON.error.message : "NETWORK";
  const messages = {
    EMAIL_EXISTS: "This email is already registered.",
    INVALID_LOGIN_CREDENTIALS: "Wrong email or password.",
    INVALID_PASSWORD: "Wrong email or password.",
    EMAIL_NOT_FOUND: "No account with this email.",
    INVALID_EMAIL: "Please enter a valid email.",
    NETWORK: "Network error. Check your connection."
  };
  if (code.startsWith("WEAK_PASSWORD")) return "Password must be at least 6 characters.";
  if (code.startsWith("TOO_MANY_ATTEMPTS")) return "Too many attempts. Try again later.";
  return messages[code] || code;
}

function saveSession(r) {
  sessionStorage.setItem("idToken", r.idToken);
  sessionStorage.setItem("uid", r.localId);
  sessionStorage.setItem("email", r.email);
  return r;
}

function isAdmin() {
  const e = sessionStorage.getItem("email") || "";
  return e.toLowerCase() === CONFIG.adminEmail.toLowerCase();
}

function signUp(name, email, mob, password) {
  return authCall("signUp", { email: email, password: password, returnSecureToken: true })
    .then(saveSession)
    .then(r => {
      if (isAdmin()) return r;   // the admin doesn't need a customer record
      return setDocById("customers", r.localId,
        { name: name, email: email, mob: mob, creditLimit: 0 });
    });
}

function signIn(email, password) {
  return authCall("signInWithPassword", { email: email, password: password, returnSecureToken: true })
    .then(saveSession);
}

function resetPassword(email) {
  return authCall("sendOobCode", { requestType: "PASSWORD_RESET", email: email });
}

function redirectByRole() {
  location.href = isAdmin() ? "admin/inventory.html" : "customer/shop.html";
}

// Call at the top of protected pages (pages inside admin/ or customer/)
function requireLogin(role) {
  if (!sessionStorage.getItem("idToken")) { location.href = "../index.html"; return; }
  if (role === "admin" && !isAdmin()) location.href = "../customer/shop.html";
  if (role === "customer" && isAdmin()) location.href = "../admin/inventory.html";
}

function logout() {
  sessionStorage.clear();
  location.href = "../index.html";
}