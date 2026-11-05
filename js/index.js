console.log("home.js loaded successfully!");
// Fetch the 3 newest posts for a given status
async function loadRecentPosts(status, containerId) {
    const container = document.getElementById(containerId);

    console.log("Looking for:", containerId);
    console.log("Found container:", container);

    if (!container) return;

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, status, location, time_posted, images")
        .eq("status", status)
        .order("time_posted", { ascending: false })
        .limit(3);

    if (error) {
        console.error("Error fetching posts:", error);
        container.textContent = "Unable to load posts.";
        return;
    }

    container.replaceChildren();

    if (posts.length === 0) {
        container.textContent = `No ${status} items posted yet!`;
        return;
    }

    posts.forEach(post => {
        container.appendChild(createPostCard(post));
    });
}

// Convert the post date to a readable format
function formatPostDate(timestamp) {
    if (!timestamp) return "Date unknown";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return "Date unknown";
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

// Generate an HTML card for a database post
function createPostCard(post) {
    const article = document.createElement("article");
    article.className = "card";

    const link = document.createElement("a");
    link.className = "card-link";
    link.href = `item-page.html?id=${encodeURIComponent(post.id)}`;

    // Image container
    const image = document.createElement("div");
    image.className = "card-img";

    // Get the first image from the text[] array
    const firstImage = Array.isArray(post.images)
        ? post.images[0]
        : null;

    if (firstImage) {
        const { data } = supabaseClient.storage
            .from("post-images")
            .getPublicUrl(firstImage);

        image.style.backgroundImage = `url("${data.publicUrl}")`;
        image.style.backgroundSize = "cover";
        image.style.backgroundPosition = "center";

    } else {
        // No image uploaded
        image.classList.add("img-1");
    }

    // Status badge
    const badge = document.createElement("span");
    badge.className = "badge";

    if (post.status === "lost") {
        badge.classList.add("badge-lost");
        badge.textContent = "Lost";
    } else if (post.status === "found") {
        badge.classList.add("badge-found");
        badge.textContent = "Found";
    } else if (post.status === "picked up") {
        badge.classList.add("badge-picked");
        badge.textContent = "✓ Picked up";
    }

    image.appendChild(badge);

    // Card content
    const body = document.createElement("div");
    body.className = "card-body";

    const title = document.createElement("h3");
    title.textContent = post.title || "Untitled item";

    const location = document.createElement("p");
    location.className = "card-loc";
    location.textContent = `📍 ${post.location || "Unknown location"}`;

    const footer = document.createElement("div");
    footer.className = "card-foot";

    const date = document.createElement("span");
    date.textContent = `◷ ${formatPostDate(post.time_posted)}`;

    const arrow = document.createElement("span");
    arrow.className = "go";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";

    footer.append(date, arrow);
    body.append(title, location, footer);
    link.append(image, body);
    article.appendChild(link);

    return article;
}

// Load homepage posts
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded, fetching posts...");

    loadRecentPosts("lost", "recent-lost");
    loadRecentPosts("found", "recent-found");
});
