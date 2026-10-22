// THIS DATA SHOULD BE REPLACED WITH A DATABASE EVENTUALLY

const posts = [
  {
    id: 1,
    title: "Lost Cat",
    description: "My orange cat went missing near campus.",
    author: "Sarah",
    status: "lost",
    location: "Hart Building",
    timePosted: "2026-10-21T14:30:00",
    contact: "226-666-6666",
    images: ["images/cat1.jpg", "images/cat2.jpg"],
    comments: [
      {
        author: "John",
        text: "I think I saw him near the library!"
      },
      {
        author: "Emily",
        text: "I'll keep an eye out!"
      }
    ]
  },
  {
    id: 2,
    title: "Found Keys",
    description: "Found a set of keys at the park.",
    author: "Michael",
    images: ["images/keys.jpg"],
    comments: []
  }
];

const params = new URLSearchParams(window.location.search);
const postId = Number(params.get("id"));

// Find the matching post
const post = posts.find(p => p.id === postId);

if (post) {
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

statusElement.textContent = statusLabels[post.status] ?? post.status;
statusElement.dataset.status = post.status;

// Display location
document.getElementById("post-location").textContent =
  "📍 " + post.location;

// Format the posting date
const postedDate = new Date(post.timePosted);

document.getElementById("post-time").textContent =
  "🕒 " + postedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

// Generate image carousel
const imageContainer = document.getElementById("post-images");
const prevButton = document.getElementById("prev-image");
const nextButton = document.getElementById("next-image");

let currentImageIndex = 0;

function displayImage() {
  // Clear the previous image
  imageContainer.innerHTML = "";

  // Create the current image
  const img = document.createElement("img");
  img.src = post.images[currentImageIndex];
  img.alt = post.title;

  imageContainer.appendChild(img);
}

// Go to previous image
prevButton.addEventListener("click", () => {
  currentImageIndex--;

  if (currentImageIndex < 0) {
    currentImageIndex = post.images.length - 1;
  }

  displayImage();
});

  // Go to next image
  nextButton.addEventListener("click", () => {
    currentImageIndex++;

    if (currentImageIndex >= post.images.length) {
      currentImageIndex = 0;
    }

    displayImage();
  });

  // Display the first image when the page loads
  if (post.images.length > 0) {
    displayImage();
  } else {
    prevButton.hidden = true;
    nextButton.hidden = true;
    imageContainer.textContent = "No images available";
  }

  // Hide arrows when there's only one image
  if (post.images.length <= 1) {
    prevButton.hidden = true;
    nextButton.hidden = true;
  }

  // Generate comments
  const commentContainer =
    document.getElementById("post-comments");

  post.comments.forEach(comment => {
    const commentElement = document.createElement("p");

    commentElement.textContent =
      comment.author + ": " + comment.text;

    commentContainer.appendChild(commentElement);
  });

} else {
  document.getElementById("post-title").textContent =
    "Post not found";
}

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

const postCommentButton = document.getElementById("post-comment");

postCommentButton.addEventListener("click", () => {
  commentForm.hidden = !commentForm.hidden;
  if (commentForm.hidden) {
    writeCommentButton.textContent = "💬 Write a Comment";
  } else {
    writeCommentButton.textContent = "Cancel";
    document.getElementById("comment-author").focus();
  }
})