const tabs = document.querySelectorAll(".filter-tabs button");
const categorySelect = document.getElementById("categoryFilter");
const cards = document.querySelectorAll(".post-card");
const countEl = document.getElementById("resultsCount");
const noResults = document.getElementById("noResults");
const searchForm = document.querySelector(".search-bar");
const searchInput = document.getElementById("searchInput");

let currentStatus = "all";
let currentCategory = "all";
let currentQuery = "";

function formatPostDate(dateString) {
  const posted = new Date(dateString);
  const now = new Date();

  // Compare calendar days, not hours
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfPostDay = new Date(posted.getFullYear(), posted.getMonth(), posted.getDate());
  const dayDiff = Math.round((startOfToday - startOfPostDay) / 86400000);

  if (dayDiff === 0) {
    const time = posted.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    return `Today, ${time}`;
  }

  if (dayDiff === 1) {
    return "Yesterday";
  }

  // Older than yesterday: show the date, e.g. "Oct 29"
  const options = { month: "short", day: "numeric" };
  if (posted.getFullYear() !== now.getFullYear()) {
    options.year = "numeric"; // e.g. "Dec 3, 2025"
  }
  return posted.toLocaleDateString("en-US", options);
}

// Update every card's date label
cards.forEach(card => {
  const timeEl = card.querySelector(".post-time");
  if (timeEl && card.dataset.posted) {
    timeEl.textContent = formatPostDate(card.dataset.posted);
  }
});

function applyFilters() {
  let visible = 0;

  cards.forEach(card => {
    const statusMatch =
      currentStatus === "all" || card.dataset.status === currentStatus;
    const categoryMatch =
      currentCategory === "all" || card.dataset.category === currentCategory;
    const searchMatch =
      currentQuery === "" || card.textContent.toLowerCase().includes(currentQuery);

    const show = statusMatch && categoryMatch && searchMatch;
    card.hidden = !show;
    if (show) visible++;
  });

  countEl.textContent = visible === 1 ? "1 post" : `${visible} posts`;
  if (noResults) noResults.hidden = visible !== 0;

  // highlight the active tab
  tabs.forEach(tab => {
    tab.setAttribute("aria-pressed", tab.dataset.filter === currentStatus);
  });

  // keep the URL in sync so the filtered view can be shared or bookmarked
  const url = new URL(window.location);
  currentStatus === "all"
    ? url.searchParams.delete("filter")
    : url.searchParams.set("filter", currentStatus);
  currentQuery === ""
    ? url.searchParams.delete("q")
    : url.searchParams.set("q", currentQuery);
  history.replaceState(null, "", url);
}

// Status tabs
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    currentStatus = tab.dataset.filter;
    applyFilters();
  });
});

// Category dropdown
categorySelect.addEventListener("change", () => {
  currentCategory = categorySelect.value;
  applyFilters();
});

// On page load, read ?filter=lost or ?filter=found from the URL
const startFilter = new URLSearchParams(window.location.search).get("filter");
if (["lost", "found"].includes(startFilter)) {
  currentStatus = startFilter;
}

// Filter as the user types
searchInput.addEventListener("input", () => {
  currentQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
});

// Stop the form from reloading the page when Search is clicked or Enter is pressed
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  currentQuery = searchInput.value.trim().toLowerCase();
  applyFilters();
});

const startQuery = new URLSearchParams(window.location.search).get("q");
if (startQuery) {
  currentQuery = startQuery.trim().toLowerCase();
  searchInput.value = startQuery;
}






applyFilters();