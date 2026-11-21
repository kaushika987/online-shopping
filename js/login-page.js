function checkEmail() {
  return setError("email", isEmail($("#email").val().trim()) ? "" : "Enter a valid email address.");
}
function checkPassword() {
  return setError("password", $("#password").val() ? "" : "Enter your password.");
}

liveCheck("email", checkEmail);
liveCheck("password", checkPassword);

$("#loginForm").on("submit", function (e) {
  e.preventDefault();
  const emailOk = checkEmail(), passwordOk = checkPassword();
  if (!emailOk || !passwordOk) return;

  formMsg("Signing in...");
  $("#btnSignIn").prop("disabled", true);
  signIn($("#email").val().trim(), $("#password").val())
    .done(redirectByRole)
    .fail(function (xhr) {
      formMsg(authError(xhr), "error");
      $("#btnSignIn").prop("disabled", false);
    });
});

$("#btnReset").click(function () {
  if (!checkEmail()) return formMsg("Type your email above first.", "error");
  resetPassword($("#email").val().trim())
    .done(() => formMsg("Reset link sent. Check your email.", "ok"))
    .fail(xhr => formMsg(authError(xhr), "error"));
});
