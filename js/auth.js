
/*
 * auth.js
 * Shared authentication functionality for Rex & Found.
 *
 * Requires supabase-config.js to load first.
 */

// Redirect the user to Google's sign-in page.
async function signInWithGoogle() {
    const returnPage =
        sessionStorage.getItem("redirectAfterLogin") || "index.html";

    const redirectTo =
        new URL(returnPage, window.location.href).href;

    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: redirectTo
        }
    });

    if (error) {
        console.error("Google login failed:", error);
        throw error;
    }
}

// Return the currently authenticated user.
async function getCurrentUser() {
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Unable to get user:", error);
        return null;
    }

    return data.user;
}

// Sign out the current user.
async function signOutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout failed:", error);
        return;
    }

    window.location.href = "index.html";
}

// Update the login link in the navigation.

// Update the header based on the current login state.
async function updateAuthUI() {
    const loginLink = document.querySelector(".login-link");

    if (!loginLink) return;

    const user = await getCurrentUser();

    if (!user) {
        loginLink.textContent = "Log in";
        loginLink.href = "login.html";
        return;
    }

    // Retrieve the user's Rex & Found profile.
    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Unable to load profile:", error);
    }

    // Prefer the custom display name.
    // Fall back to the Google name if necessary.
    const displayName =
        profile?.display_name ||
        user.user_metadata?.full_name ||
        "My Account";

    loginLink.textContent = `Hi, ${displayName}!`;
    loginLink.href = "account.html";
}


/*
 * Require authentication before accessing
 * an account-only page.
 *
 * Returns the user if signed in.
 * Otherwise redirects to login.html.
 */
async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        // Remember the page the visitor wanted.
        const returnPage =
            window.location.pathname.split("/").pop() +
            window.location.search;

        sessionStorage.setItem(
            "redirectAfterLogin",
            returnPage
        );

        window.location.replace("login.html");
        return null;
    }

    return user;
}



document.addEventListener("DOMContentLoaded", updateAuthUI);
