const checks = {
  name:     () => setError("name", $("#name").val().trim().length >= 2 ? "" : "Enter your full name."),
  email:    () => setError("email", isEmail($("#email").val().trim()) ? "" : "Enter a valid email address."),
  mob:      () => setError("mob", /^[0-9]{10}$/.test($("#mob").val().trim()) ? "" : "Mobile number must be 10 digits."),
  password: () => setError("password", $("#password").val().length >= 6 ? "" : "Password must be at least 6 characters."),
  confirm:  () => setError("confirm", $("#confirm").val() === $("#password").val() ? "" : "Passwords do not match.")
};

Object.keys(checks).forEach(id => liveCheck(id, checks[id]));
$("#password").on("input", function () { if ($("#confirm").val()) checks.confirm(); });

$("#signupForm").on("submit", function (e) {
  e.preventDefault();
  // run every check so all problems show at once
  const results = Object.keys(checks).map(id => checks[id]());
  if (results.includes(false)) return;

  formMsg("Creating your account...");
  $("#btnSignUp").prop("disabled", true);
  signUp($("#name").val().trim(), $("#email").val().trim(), $("#mob").val().trim(), $("#password").val())
    .done(redirectByRole)
    .fail(function (xhr) {
      formMsg(authError(xhr), "error");
      $("#btnSignUp").prop("disabled", false);
    });
});
