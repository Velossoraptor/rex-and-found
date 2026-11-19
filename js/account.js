
/*
 * account.js
 *
 * Handles the Rex & Found account page.
 *
 * Features:
 * - Authentication check
 * - Profile loading
 * - Display name editing
 * - Google profile picture
 * - Logout
 */

document.addEventListener("DOMContentLoaded", async () => {

    // -----------------------------------------
    // 1. Get the authenticated user
    // -----------------------------------------

    const user = await getCurrentUser();

    // Redirect visitors who aren't logged in.
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    // Load posts belonging to the logged-in user.
    await loadMyPosts(user.id);

    // -----------------------------------------
    // 2. Find the account page elements
    // -----------------------------------------

    const greeting = document.getElementById("account-greeting");
    const email = document.getElementById("account-email");
    const avatar = document.getElementById("account-avatar");
    const displayNameInput = document.getElementById("display-name");
    const profileForm = document.getElementById("profile-form");
    const message = document.getElementById("profile-message");
    const logoutButton = document.getElementById("logout-button");

    // -----------------------------------------
    // 3. Load the user's profile
    // -----------------------------------------

    try {
        const profile = await getProfile(user.id);

        // Use the custom display name if available.
        const displayName =
            profile?.display_name ||
            user.user_metadata?.full_name ||
            "Neighbor";

        greeting.textContent = `Hello, ${displayName}!`;

        displayNameInput.value = displayName;

        // Email comes from Supabase Auth, not profiles.
        email.textContent = user.email || "";

        // Use the Google profile picture if available.
        const avatarUrl =
            profile?.avatar_url ||
            user.user_metadata?.avatar_url;

        if (avatarUrl) {
            avatar.src = avatarUrl;
        }

    } catch (error) {
        console.error("Error loading account:", error);
        message.textContent = "Unable to load your profile.";
    }

    // -----------------------------------------
    // 4. Save display name changes
    // -----------------------------------------

    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newName = displayNameInput.value.trim();

        message.textContent = "";

        try {
            await updateDisplayName(newName);

            // Update the greeting.
            greeting.textContent = `Hello, ${newName}!`;

            // Refresh the header with the new name.
            await updateAuthUI();

            message.textContent = "Display name updated successfully!";

        } catch (error) {
            console.error("Profile update failed:", error);
            message.textContent =
                error.message || "Unable to save changes.";
        }
    });

    // -----------------------------------------
    // 5. Sign out
    // -----------------------------------------

    logoutButton.addEventListener("click", async () => {
        await signOutUser();
    });

});


/*
 * Retrieve and display all posts belonging
 * to the currently authenticated user.
 */
async function loadMyPosts(userId) {
    const container = document.getElementById("account-posts");

    if (!container) return;

    container.textContent = "Loading your posts...";

    // Only retrieve posts belonging to this account.
    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, status, location, time_posted, images")
        .eq("user_id", userId)
        .order("time_posted", { ascending: false });

    if (error) {
        console.error("Error loading user posts:", error);
        container.textContent = "Unable to load your posts.";
        return;
    }

    container.replaceChildren();

    // Handle users who haven't created any posts.
    if (posts.length === 0) {
        const message = document.createElement("p");
        message.className = "account-empty";
        message.textContent =
            "You haven't posted anything yet. Help Rex find something!";

        container.appendChild(message);
        return;
    }

    // Create a grid for the user's posts.
    const grid = document.createElement("div");
    grid.className = "card-grid";

    posts.forEach(post => {
        grid.appendChild(createAccountPostCard(post));
    });

    container.appendChild(grid);
}


/*
 * Create a card representing one of the
 * currently logged-in user's posts.
 */
function createAccountPostCard(post) {

    const article = document.createElement("article");
    article.className = "card account-post-card";

    // Link to the full post details.
    const link = document.createElement("a");
    link.className = "card-link";
    link.href =
        `item-page.html?id=${encodeURIComponent(post.id)}`;

    // ------------------------------------
    // Post image
    // ------------------------------------

    const image = document.createElement("div");
    image.className = "card-img";

    const firstImage = Array.isArray(post.images)
        ? post.images[0]
        : null;

    if (firstImage) {
        const { data } = supabaseClient.storage
            .from("post-images")
            .getPublicUrl(firstImage);

        image.style.backgroundImage =
            `url("${data.publicUrl}")`;

        image.style.backgroundSize = "cover";
        image.style.backgroundPosition = "center";
    } else {
        image.classList.add("img-1");
    }

    // ------------------------------------
    // Status badge
    // ------------------------------------

    const badge = document.createElement("span");
    badge.className = "badge";

    if (post.status === "lost") {
        badge.classList.add("badge-lost");
        badge.textContent = "Lost";
    } else if (post.status === "found") {
        badge.classList.add("badge-found");
        badge.textContent = "Found";
    } else if (post.status === "picked-up") {
        badge.classList.add("badge-picked");
        badge.textContent = "✓ Picked up";
    } else {
        badge.textContent = post.status || "Unknown";
    }

    image.appendChild(badge);

    // ------------------------------------
    // Post information
    // ------------------------------------

    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.textContent = post.title || "Untitled item";

    const location = document.createElement("p");
    location.className = "card-loc";
    location.textContent =
        `📍 ${post.location || "Unknown location"}`;

    const footer = document.createElement("div");
    footer.className = "card-foot";

    const date = document.createElement("span");

    date.textContent = post.time_posted
        ? new Date(post.time_posted).toLocaleDateString()
        : "Date unknown";

    const arrow = document.createElement("span");
    arrow.className = "go";
    arrow.textContent = "›";
    arrow.setAttribute("aria-hidden", "true");

    footer.append(date, arrow);
    body.append(title, location, footer);


    link.append(image, body);
    article.appendChild(link);



    // ------------------------------------
    // Post management buttons
    // ------------------------------------

    const actions = document.createElement("div");
    actions.className = "account-post-actions";

    // Archived posts cannot be edited.
    if (post.status !== "picked-up") {

        // EDIT BUTTON
        const editButton = document.createElement("a");

        editButton.href =
            `post.html?edit=${encodeURIComponent(post.id)}`;

        editButton.className = "btn btn-outline";
        editButton.textContent = "Edit Post";

        actions.appendChild(editButton);

        // MARK AS PICKED UP BUTTON
        const pickedUpButton = document.createElement("button");

        pickedUpButton.type = "button";
        pickedUpButton.className = "btn btn-dark";
        pickedUpButton.textContent = "Mark as Picked Up";

        pickedUpButton.addEventListener("click", () => {
            markPostPickedUp(post.id, pickedUpButton);
        });

        actions.appendChild(pickedUpButton);

        // DELETE BUTTON
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className = "btn btn-delete";
        deleteButton.textContent = "Delete Post";

        deleteButton.addEventListener("click", () => {
            deleteMyPost(post.id, deleteButton);
        });

        actions.appendChild(deleteButton);

    } else {
        // Archived posts are view-only.
        const archivedLabel = document.createElement("p");
        archivedLabel.className = "account-archived-label";
        archivedLabel.textContent = "Archived — View Only";

        actions.appendChild(archivedLabel);
    }

    article.appendChild(actions);

    return article;

}

async function markPostPickedUp(postId, button) {
    const confirmed = confirm(
        "Mark this item as picked up? It will no longer appear in active lost and found searches."
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Updating...";

    const { error } = await supabaseClient
        .from("posts")
        .update({ status: "picked-up" })
        .eq("id", postId);

    if (error) {
        console.error("Error updating post:", error);
        alert("Unable to update the post. Please try again.");

        button.disabled = false;
        button.textContent = "Mark as Picked Up";
        return;
    }

    // Refresh the user's posts.
    const user = await getCurrentUser();

    if (user) {
        await loadMyPosts(user.id);
    }
}


async function deleteMyPost(postId, button) {

    const confirmed = confirm(
        "Are you sure you want to permanently delete this post? This cannot be undone."
    );

    if (!confirmed) return;

    const user = await getCurrentUser();

    if (!user) {
        alert("You must be logged in.");
        return;
    }

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        // Retrieve the post and its images.
        const { data: post, error: fetchError } =
            await supabaseClient
                .from("posts")
                .select("id, images, status")
                .eq("id", postId)
                .eq("user_id", user.id)
                .single();

        if (fetchError) throw fetchError;

        if (post.status === "picked-up") {
            throw new Error("Archived posts cannot be deleted.");
        }

        // Delete the database record.
        const { data: deleted, error: deleteError } =
            await supabaseClient
                .from("posts")
                .delete()
                .eq("id", postId)
                .eq("user_id", user.id)
                .in("status", ["lost", "found"])
                .select("id");

        if (deleteError) throw deleteError;

        if (!deleted || deleted.length === 0) {
            throw new Error("Post could not be deleted.");
        }

        // Clean up images stored in the user's folder.
        const ownedImages = (post.images || []).filter(
            path => path.startsWith(`${user.id}/`)
        );

        if (ownedImages.length > 0) {
            const { error: storageError } =
                await supabaseClient.storage
                    .from("post-images")
                    .remove(ownedImages);

            if (storageError) {
                console.warn(
                    "Post deleted, but some images remain in Storage:",
                    storageError
                );
            }
        }

        // Refresh My Posts.
        await loadMyPosts(user.id);

    } catch (error) {
        console.error("Error deleting post:", error);
        alert(error.message || "Unable to delete post.");

        button.disabled = false;
        button.textContent = "Delete Post";
    }
}
