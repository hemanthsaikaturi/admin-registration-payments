// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}
// FIX: Renamed 'auth' to 'loginAuth' to avoid conflicts with other pages.
const loginAuth = firebase.auth();

const loginForm = document.getElementById("admin-login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    loginAuth
      .signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        console.log("Admin signed in successfully");
        window.location.href = "admin.html";
      })
      .catch((error) => {
        // Handle Errors here.
        if (errorMessage) {
          errorMessage.style.display = "block";
          errorMessage.textContent = "Error: Invalid email or password.";
        }
        console.error("Authentication Error:", error);
      });
  });
}