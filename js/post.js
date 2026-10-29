
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

  document.getElementById("post-author").textContent =
    "Posted by: " + post.author;

  document.getElementById("post-description").textContent =
    "Description: " + post.description;

  document.getElementById("author-contact").textContent =
    "Contact Information: " + post.contact;


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
  const images = post.images ?? [];
  const imageContainer = document.getElementById("post-images");
  const prevButton = document.getElementById("prev-image");
  const nextButton = document.getElementById("next-image");

  let currentImageIndex = 0;

  function displayImage() {
    // Clear the previous image
    imageContainer.innerHTML = "";

    // Create the current image
    const img = document.createElement("img");
    img.src = images[currentImageIndex];
    img.alt = post.title;

    imageContainer.appendChild(img);
  }

  // Go to previous image
  prevButton.addEventListener("click", () => {
    currentImageIndex--;

    if (currentImageIndex < 0) {
      currentImageIndex = images.length - 1;
    }

    displayImage();
  });

  // Go to next image
  nextButton.addEventListener("click", () => {
    currentImageIndex++;

    if (currentImageIndex >= images.length) {
      currentImageIndex = 0;
    }

    displayImage();
  });

  // Display the first image when the page loads
  if (images.length > 0) {
    displayImage();
  } else {
    prevButton.hidden = true;
    nextButton.hidden = true;
    imageContainer.textContent = "No images available";
  }

  // Hide arrows when there's only one image
  if (images.length <= 1) {
    prevButton.hidden = true;
    nextButton.hidden = true;
  }

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

  comments.forEach(comment => {
    const commentElement = document.createElement("p");

    commentElement.textContent =
      comment.author + ": " + comment.text;

    const dateElement = document.createElement("small");

    dateElement.textContent =
      "\n" + new Date(comment.time_posted).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric"
        }
      );

    commentElement.appendChild(dateElement);
    container.appendChild(commentElement);
  });
}


// Comment form listeners

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
    document.getElementById("comment-author").focus();
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

  const author = document
    .getElementById("comment-author").value.trim();

  const text = document
    .getElementById("comment-text").value.trim();

  if (!author || !text) {
    alert("Please fill out all fields.");
    return;
  }

  const submitButton = commentForm.querySelector(
    'button[type="submit"]'
  );

  submitButton.disabled = true;

  // Insert the new comment into Supabase
  const { error } = await supabaseClient
    .from("comments")
    .insert({
      post_id: postId,
      author: author,
      text: text
    });

  submitButton.disabled = false;

  if (error) {
    console.error("Error posting comment:", error);
    alert("Something went wrong. Please try again.");
    return;
  }

  // Clear and hide the form
  commentForm.reset();
  commentForm.hidden = true;

  document.getElementById("write-comment").textContent =
    "Write a Comment";

  // Reload comments from Supabase
  await loadComments(postId);
});


// Actually call the function to display the information on the page

loadPost();
