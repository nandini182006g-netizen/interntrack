
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

const formHeading = document.getElementById("formHeading");
const formSubtitle = document.getElementById("formSubtitle");

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function switchForm(mode) {
  const isLogin = mode === "login";

  loginForm.classList.toggle("hidden-form", !isLogin);
  signupForm.classList.toggle("hidden-form", isLogin);

  loginTab.classList.toggle("active", isLogin);
  signupTab.classList.toggle("active", !isLogin);

  loginTab.setAttribute("aria-selected", String(isLogin));
  signupTab.setAttribute("aria-selected", String(!isLogin));

  formHeading.textContent = isLogin
    ? "Welcome back!"
    : "Let's get started!";

  formSubtitle.textContent = isLogin
    ? "Your career journey is waiting for you."
    : "Create an account and organize your future.";

  setMessage(document.getElementById("loginMessage"), "");
  setMessage(document.getElementById("signupMessage"), "");
}

loginTab.addEventListener("click", () => switchForm("login"));
signupTab.addEventListener("click", () => switchForm("signup"));
showSignup.addEventListener("click", () => switchForm("signup"));
showLogin.addEventListener("click", () => switchForm("login"));

async function sendAuthRequest(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Something went wrong.");
  }

  return result;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  button.disabled = true;
  button.textContent = "Logging in...";
  setMessage(message, "");

  try {
    await sendAuthRequest("/api/auth/login", { email, password });

    setMessage(message, "Login successful! Opening your dashboard...", "success");
    window.location.replace("index.html");
  } catch (error) {
    setMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Login to InternTrack <span aria-hidden="true">→</span>';
  }
});

signupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const button = document.getElementById("signupButton");
  const message = document.getElementById("signupMessage");

  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;

  if (password.length < 8 || password.length > 72) {
    setMessage(message, "Password must be between 8 and 72 characters.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Creating account...";
  setMessage(message, "");

  try {
    await sendAuthRequest("/api/auth/signup", {
      name,
      email,
      password
    });

    setMessage(message, "Account created! Opening your dashboard...", "success");
    window.location.replace("index.html");
  } catch (error) {
    setMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
    button.innerHTML = 'Create my account <span aria-hidden="true">→</span>';
  }
});

// If already logged in, go straight to the dashboard.
fetch("/api/auth/me", { credentials: "same-origin" })
  .then(response => {
    if (response.ok) {
      window.location.replace("index.html");
    }
  })
  .catch(error => {
    console.error("Could not check login status:", error);
  });
