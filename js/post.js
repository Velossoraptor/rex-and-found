
// Get post ID from url

const params = new URLSearchParams(window.location.search);
const postId = Number(params.get("id"));


// Get and display post from supabase

async function loadPost() {
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    document.getElementById("post-title").textContent =
      "Invalid Post ID";
    return;
  }

  const { data: post, error } = await supabaseClient
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!post) {
    document.getElementById("post-title").textContent =
      "Post not found";
    return;
  }

  // Insert basic information
  document.getElementById("post-title").textContent =
    post.title;


  // ==========================================
  // DISPLAY THE AUTHOR'S CURRENT PROFILE NAME
  // ==========================================

  // Fall back to the original author for older posts.
  let authorName = post.author || "Unknown";

  if (post.user_id) {
    const { data: profile, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", post.user_id)
        .maybeSingle();

    if (profileError) {
      console.error("Error loading author profile:", profileError);
    } else if (profile?.display_name) {
      authorName = profile.display_name;
    }
  }

  document.getElementById("post-author").textContent =
    "Posted by: " + authorName;


  document.getElementById("post-description").textContent =
    "Description: " + post.description;


  // ==========================================
  // DISPLAY PUBLIC CONTACT INFORMATION
  // ==========================================

  const contactElement =
    document.getElementById("author-contact");

  const contactDetails = [];

  // Optional phone number.
  if (post.phone_number) {
    contactDetails.push(`Phone: ${post.phone_number}`);
  }

  // Only retrieve the email when the author opted in.
  if (post.show_email === true && post.user_id) {
    const { data: email, error: emailError } =
      await supabaseClient.rpc(
        "get_post_contact_email",
        { requested_post_id: post.id }
      );

    if (emailError) {
      console.error("Error loading public email:", emailError);
    } else if (email) {
      contactDetails.push(`Email: ${email}`);
    }
  }

  // Older posts may still use the original contact field.
  // Only display it for posts without an account owner.
  if (!post.user_id && post.contact) {
    contactDetails.push(post.contact);
  }

  contactElement.textContent = contactDetails.length > 0
    ? contactDetails.join(" | ")
    : "No public contact information provided.";



  // Display post status
  const statusElement = document.getElementById("post-status");

  const statusLabels = {
    lost: "Lost",
    found: "Found",
    "picked-up": "Picked Up"
  };

  statusElement.textContent =
    statusLabels[post.status] ?? post.status;

  statusElement.dataset.status = post.status;


  // Display location
  document.getElementById("post-location").textContent =
    "📍 " + post.location;


  // Format the posting date
  const postedDate = new Date(post.time_posted);

  document.getElementById("post-time").textContent =
    "🕒 " + postedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });



  // Generate image carousel
  const images = Array.isArray(post.images)
    ? post.images.filter(path => typeof path === "string" && path.trim())
    : [];

  const imageContainer = document.getElementById("post-images");
  const prevButton = document.getElementById("prev-image");
  const nextButton = document.getElementById("next-image");

  // Replace with your actual public bucket name
  const bucketName = "post-images";

  let currentImageIndex = 0;

  // Convert a stored file path into a public image URL
  function getImageUrl(path) {
    // Also supports full URLs if you have older posts
    // that stored image URLs instead of paths
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const { data } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Display the currently selected image
  function displayImage() {
    imageContainer.replaceChildren();

    const img = document.createElement("img");

    img.src = getImageUrl(images[currentImageIndex]);
    img.alt = `${post.title} - Image ${currentImageIndex + 1}`;

    img.onerror = () => {
      img.remove();

      const errorMessage = document.createElement("p");
      errorMessage.textContent = "Unable to load image.";

      imageContainer.appendChild(errorMessage);
    };

    imageContainer.appendChild(img);
  }

  // Go to previous image
  prevButton.addEventListener("click", () => {
    if (images.length <= 1) return;

    currentImageIndex =
      (currentImageIndex - 1 + images.length) % images.length;

    displayImage();
  });

  // Go to next image
  nextButton.addEventListener("click", () => {
    if (images.length <= 1) return;

    currentImageIndex =
      (currentImageIndex + 1) % images.length;

    displayImage();
  });

  // Display the first image or a placeholder
  if (images.length > 0) {
    displayImage();
  } else {
    imageContainer.textContent = "No images available";
  }

  // Only show navigation buttons for multiple images
  prevButton.hidden = images.length <= 1;
  nextButton.hidden = images.length <= 1;


  // Load comments for this post
  await loadComments(post.id);
}


// Get and display comments from supabase


async function loadComments(postId) {

    const { data: comments, error } = await supabaseClient
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("time_posted", { ascending: true });

    if (error) {
        console.error("Error loading comments:", error);
        return;
    }

    const container = document.getElementById("post-comments");
    container.replaceChildren();

    for (const comment of comments) {

        let displayName = comment.author;
        const isMember = comment.user_id !== null;

        // Retrieve current display name for members.
        if (isMember) {
            const { data: profile } = await supabaseClient
                .from("profiles")
                .select("display_name")
                .eq("id", comment.user_id)
                .maybeSingle();

            if (profile?.display_name) {
                displayName = profile.display_name;
            }
        }

        // Comment wrapper.
        const commentElement = document.createElement("div");
        commentElement.className = "comment-item";

        // Author.
        const authorElement = document.createElement("strong");
        authorElement.textContent = displayName || "Anonymous";

        // Member or Guest badge.
        const badge = document.createElement("span");
        badge.className = isMember
            ? "comment-badge comment-member"
            : "comment-badge comment-guest";

        badge.textContent = isMember ? "Member" : "Guest";

        // Comment text.
        const textElement = document.createElement("p");
        textElement.textContent = comment.text;

        // Date.
        const dateElement = document.createElement("small");
        dateElement.textContent = new Date(
            comment.time_posted
        ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        commentElement.append(
            authorElement,
            badge,
            textElement,
            dateElement
        );

        container.appendChild(commentElement);
    }
}



// Comment form listeners

// ==========================================
// COMMENT AUTHENTICATION
// ==========================================

// Stores the signed-in user, if one exists.
let commentUser = null;

// Configure the comment form for guests or members.
async function initializeCommentForm() {
  commentUser = await getCurrentUser();

  const authorField =
    document.getElementById("comment-author-field");

  const authorInput =
    document.getElementById("comment-author");

  if (commentUser) {
    // Members use their profile display name.
    authorField.hidden = true;
    authorInput.required = false;
  } else {
    // Guests must enter a name.
    authorField.hidden = false;
    authorInput.required = true;
  }
}

// Initialize when the page loads.
initializeCommentForm();

// Get the button and form
const writeCommentButton = document.getElementById("write-comment");
const commentForm = document.getElementById("comment-form");

// Show or hide the comment form when clicked
writeCommentButton.addEventListener("click", () => {
  commentForm.hidden = !commentForm.hidden;

  // Change button text depending on form visibility
  if (commentForm.hidden) {
    writeCommentButton.textContent = "💬 Write a Comment";
  } else {
    writeCommentButton.textContent = "Cancel";
    if (commentUser) {
      document.getElementById("comment-text").focus();
    } else {
      document.getElementById("comment-author").focus();
    }
  }
});

// const postCommentButton = document.getElementById("post-comment");

// postCommentButton.addEventListener("click", () => {
//   commentForm.hidden = !commentForm.hidden;

//   if (commentForm.hidden) {
//     writeCommentButton.textContent = "💬 Write a Comment";
//   } else {
//     writeCommentButton.textContent = "Cancel";
//     document.getElementById("comment-author").focus();
//   }
// });


// Handle comment submission


commentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = document
        .getElementById("comment-text").value.trim();

    const user = await getCurrentUser();

    let author;
    let userId = null;

    if (user) {
        // Signed-in users use their current profile name.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("display_name")
                .eq("id", user.id)
                .single();

        if (profileError) {
            console.error("Unable to load profile:", profileError);
            alert("Unable to load your profile. Please try again.");
            return;
        }

        author = profile.display_name;
        userId = user.id;

    } else {
        // Guests enter their own name.
        author = document
            .getElementById("comment-author").value.trim();
    }

    if (!author || !text) {
        alert("Please fill out all required fields.");
        return;
    }

    const submitButton = commentForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;

    try {
        const { error } = await supabaseClient
            .from("comments")
            .insert({
                post_id: postId,
                author: author,
                user_id: userId,
                text: text
            });

        if (error) throw error;

        // Reset the form.
        commentForm.reset();
        commentForm.hidden = true;

        document.getElementById("write-comment").textContent =
            "💬 Write a Comment";

        await loadComments(postId);

    } catch (error) {
        console.error("Error posting comment:", error);
        alert("Unable to post your comment. Please try again.");

    } finally {
        submitButton.disabled = false;
    }
});



// Actually call the function to display the information on the page

loadPost();
