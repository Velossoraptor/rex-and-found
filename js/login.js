
/*
 * login.js
 *
 * Handles the Rex & Found login page.
 *
 * Requires:
 * - supabase-config.js
 * - auth.js
 */

document.addEventListener("DOMContentLoaded", async () => {

    const loginButton = document.getElementById("google-login");
    const errorMessage = document.getElementById("login-error");

    // Check whether the user is already signed in.
    const user = await getCurrentUser();

    if (user) {
        const returnPage =
            sessionStorage.getItem("redirectAfterLogin") || "index.html";

        sessionStorage.removeItem("redirectAfterLogin");

        window.location.replace(returnPage);
        return;
    }

    // Start Google OAuth when the button is clicked.
    loginButton.addEventListener("click", async () => {

        loginButton.disabled = true;
        loginButton.textContent = "Connecting to Google...";

        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Login error:", error);

            errorMessage.textContent =
                "Something went wrong. Please try again.";

            loginButton.disabled = false;
            loginButton.textContent = "Continue with Google";
        }
    });
});
