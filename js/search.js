// Fetch posts from Supabase
async function loadSearchPosts() {
    const container = document.getElementById("search-results");
    const countElement = document.getElementById("results-count");

    const { data: posts, error } = await supabaseClient
        .from("posts")
        .select("id, title, status, location, time_posted, images")
        .order("time_posted", { ascending: false });

    if (error) {
        console.error("Error loading posts:", error);
        container.textContent = "Unable to load posts.";
        countElement.textContent = "Error loading posts";
        return;
    }

    // Remove loading message
    container.replaceChildren();

    // Update results count
    countElement.textContent =
        `${posts.length} ${posts.length === 1 ? "post" : "posts"}`;

    if (posts.length === 0) {
        container.textContent = "No posts found.";
        return;
    }

    // Create a card for each post
    posts.forEach(post => {
        container.appendChild(createSearchCard(post));
    });
}

// Generate a card using the existing CSS
function createSearchCard(post) {
    const article = document.createElement("article");
    article.className = "post-card";

    const link = document.createElement("a");
    link.href = `item-page.html?id=${encodeURIComponent(post.id)}`;

    // Image container
    const image = document.createElement("div");
    image.className = "post-img";

    // Get first image from text[] column
    const firstImage = Array.isArray(post.images)
        ? post.images[0]
        : null;

    if (typeof firstImage === "string" && firstImage.trim()) {
        let imageUrl;

        if (/^https?:\/\//i.test(firstImage)) {
            imageUrl = firstImage;
        } else {
            const { data } = supabaseClient.storage
                .from("post-images")
                .getPublicUrl(firstImage);

            imageUrl = data.publicUrl;
        }

        image.style.backgroundImage = `url("${imageUrl}")`;
        image.style.backgroundSize = "cover";
        image.style.backgroundPosition = "center";
    } else {
        image.classList.add("img-1");
    }

    // Status badge
    const badge = document.createElement("span");
    badge.className = "badge";

    const status = (post.status || "").toLowerCase();

    if (status === "lost") {
        badge.classList.add("badge-lost");
        badge.textContent = "Lost";
    } else if (status === "found") {
        badge.classList.add("badge-found");
        badge.textContent = "Found";
    } else if (status === "picked up" || status === "picked-up") {
        badge.classList.add("badge-picked");
        badge.textContent = "✓ Picked up";
    } else {
        badge.textContent = post.status || "Unknown";
    }

    image.appendChild(badge);

    // Card body
    const body = document.createElement("div");
    body.className = "post-body";

    const title = document.createElement("h3");
    title.textContent = post.title || "Untitled item";

    const location = document.createElement("p");
    location.className = "post-meta post-loc";
    location.textContent = post.location || "Location unknown";

    // Card footer
    const footer = document.createElement("div");
    footer.className = "post-foot";

    const time = document.createElement("span");
    time.className = "post-meta post-time";

    if (post.time_posted) {
        const date = new Date(post.time_posted);

        time.textContent = Number.isNaN(date.getTime())
            ? "Date unknown"
            : date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
    } else {
        time.textContent = "Date unknown";
    }

    const arrow = document.createElement("span");
    arrow.className = "post-go";
    arrow.setAttribute("aria-hidden", "true");

    footer.append(time, arrow);
    body.append(title, location, footer);
    link.append(image, body);
    article.appendChild(link);

    return article;
}

// Run after HTML has loaded
document.addEventListener("DOMContentLoaded", loadSearchPosts);