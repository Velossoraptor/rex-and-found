const postForm = document.getElementById("create-post-form");
const submitButton = document.getElementById("submit_button");
const submitMessage = document.getElementById("submit-message");


// ==========================================
// CREATE / EDIT MODE DETECTION
// ==========================================

// Example:
// post.html          -> create mode
// post.html?edit=42  -> edit mode

const urlParams = new URLSearchParams(window.location.search);
const editPostId = urlParams.get("edit");

const isEditMode = editPostId !== null;

// Store the original post when editing.
let existingPost = null;
let retainedImagePaths = [];
let editPostLoaded = false;



/*
 * Load a post into the form when editing.
 *
 * Only the owner should be allowed to edit.
 */
async function loadPostForEditing() {

    if (!isEditMode) return;

    const user = await getCurrentUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Retrieve the post.
    const { data: post, error } = await supabaseClient
        .from("posts")
        .select("*")
        .eq("id", editPostId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !post) {
        alert("Post not found, or you don't have permission to edit it.");
        window.location.href = "account.html";
        return;
    }

    // Archived posts cannot be edited.
    if (post.status === "picked-up") {
        alert("Archived posts cannot be edited.");
        window.location.replace("account.html");
        return;
    }

    existingPost = post;

    // Update page headings.
    document.getElementById("post_title").textContent =
        "Edit Your Post";

    document.getElementById("form_title").textContent =
        "Update the details";

    submitButton.value = "Save Changes";

    // Fill in the existing values.
    const statusInput = document.querySelector(
        `input[name="item_status"][value="${post.status}"]`
    );

    if (statusInput) {
        statusInput.checked = true;
    }

    // Prevent users from changing the original post type
    // while editing an existing post.
    document.querySelectorAll(
        'input[name="item_status"]'
    ).forEach(radio => {
        radio.disabled = true;
    });

    document.getElementById("title").value =
        post.title || "";

    document.getElementById("category").value =
        post.category || "other";

    document.getElementById("location").value =
        post.location || "";

    document.getElementById("full_description").value =
        post.description || "";

    document.getElementById("phone-number").value =
        post.phone_number || "";

    document.getElementById("show-email").checked =
        post.show_email === true;


    // Copy the existing image paths into our retained images array.
    retainedImagePaths = Array.isArray(post.images)
        ? [...post.images]
        : [];

    // Display the existing images.
    displayExistingPhotos();
    editPostLoaded = true;
}

// Load the post when the page opens.
document.addEventListener("DOMContentLoaded", loadPostForEditing);


// Check authentication when the posting page loads.
document.addEventListener("DOMContentLoaded", async () => {
    await requireAuth();
});

// Handle form submission
postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isEditMode && !editPostLoaded) {
        submitMessage.textContent =
            "Please wait for your post to finish loading.";
        return;
    }

    // Prevent duplicate submissions
    if (submitButton.disabled) return;

    submitButton.disabled = true;
    submitButton.value = isEditMode
        ? "Saving Changes..."
        : "Publishing...";

    submitMessage.textContent = "";

    const imagePaths = [];

    try {
        // 0. Verify the user is authenticated.
        const user = await getCurrentUser();

        if (!user) {
            throw new Error(
                "You must be logged in to create a post."
            );
        }

        
        // Retrieve the user's current Rex & Found display name.
        const { data: profile, error: profileError } =
            await supabaseClient
                .from("profiles")
                .select("display_name")
                .eq("id", user.id)
                .single();

        if (profileError) {
            throw profileError;
        }

        const author = profile.display_name;


        // 1. Collect form data
        const status = document.querySelector(
            'input[name="item_status"]:checked'
        )?.value;

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById(
            "full_description"
        ).value.trim();
        const location = document.getElementById(
            "location"
        ).value.trim();
        const phoneNumber =
            document.getElementById("phone-number").value.trim();

        const showEmail =
            document.getElementById("show-email").checked;
        const category = document.getElementById("category").value;

        const photoInput = document.getElementById("photo");
        const photos = Array.from(photoInput.files);

        // 2. Validate required fields
        if (!status || !title || !description || !location) {
            throw new Error("Please fill out all required fields.");
        }


        // 3. Upload images (maximum 5)

        const existingCount = isEditMode
            ? retainedImagePaths.length
            : 0;

        const totalPhotos = existingCount + photos.length;

        if (totalPhotos > 5) {
            throw new Error(
                `You have selected ${totalPhotos} photos. ` +
                "A post can have a maximum of 5."
            );
        }

        const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/gif": "gif"
        };

        const maxFileSize = 5 * 1024 * 1024; // 5 MB per image

        // Validate all photos before uploading any
        for (const photo of photos) {
            if (!allowedTypes[photo.type]) {
                throw new Error(
                    `${photo.name} is not a supported image type.`
                );
            }

            if (photo.size > maxFileSize) {
                throw new Error(
                    `${photo.name} exceeds the 5 MB limit.`
                );
            }
        }

        // Upload images one at a time
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];

            submitMessage.textContent =
                `Uploading photo ${i + 1} of ${photos.length}...`;


            const extension = allowedTypes[photo.type];

            // Store images inside a folder named after the user ID.
            // Example: user-uuid/unique-photo-name.jpg
            const fileName =
                `${user.id}/${crypto.randomUUID()}.${extension}`;


            const { data, error: uploadError } =
                await supabaseClient.storage
                    .from("post-images")
                    .upload(fileName, photo, {
                        contentType: photo.type,
                        upsert: false
                    });

            if (uploadError) {
                throw uploadError;
            }

            imagePaths.push(data.path);
        }



        // ==========================================
        // 4. CREATE OR UPDATE THE POST
        // ==========================================

        submitMessage.textContent = isEditMode
            ? "Saving changes..."
            : "Creating post...";

        // Combine existing retained images with newly uploaded images.
        const finalImagePaths = isEditMode
            ? [...retainedImagePaths, ...imagePaths]
            : imagePaths;

        console.log("Retained images:", retainedImagePaths);
        console.log("New images:", imagePaths);
        console.log("Final images:", finalImagePaths);

        // These fields can be changed when editing.
        const postData = {
            title: title,
            description: description,
            location: location,
            category: category,
            images: finalImagePaths,
            phone_number: phoneNumber || null,
            show_email: showEmail
        };

        let savedPostId;

        if (isEditMode) {

            // Update the existing post instead of creating a new one.
            // The original user_id, author, status, and
            // time_posted are preserved.
            const { data, error } = await supabaseClient
                .from("posts")
                .update(postData)
                .eq("id", editPostId)
                .eq("user_id", user.id)
                .in("status", ["lost", "found"])
                .select("id")
                .single();

            if (error) {
                throw error;
            }

            savedPostId = data.id;

        } else {

            // Create a brand-new post.
            const { data, error } = await supabaseClient
                .from("posts")
                .insert({
                    ...postData,
                    user_id: user.id,
                    author: author,
                    status: status,
                    time_posted: new Date().toISOString()
                })
                .select("id")
                .single();

            if (error) {
                throw error;
            }

            savedPostId = data.id;
        }

        // ==========================================
        // 5. REMOVE OLD IMAGES AFTER SUCCESSFUL SAVE
        // ==========================================

        if (isEditMode && existingPost) {

            const originalImages = existingPost.images || [];

            // Find images the user explicitly removed.
            const removedImages = originalImages.filter(
                path => !retainedImagePaths.includes(path)
            );

            if (removedImages.length > 0) {

                const { error: deleteError } =
                    await supabaseClient.storage
                        .from("post-images")
                        .remove(removedImages);

                if (deleteError) {
                    console.warn(
                        "Post saved, but removed images could not be deleted:",
                        deleteError
                    );
                }
            }
        }

        // ==========================================
        // 6. SUCCESS
        // ==========================================

        submitMessage.textContent = isEditMode
            ? "Changes saved successfully!"
            : "Post published successfully!";

        window.location.href =
            `item-page.html?id=${encodeURIComponent(savedPostId)}`;



    
    } catch (error) {
        console.error("Error saving post:", error);

        submitMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        // Clean up any NEW images uploaded during this attempt.
        // Never delete retained images here.
        if (imagePaths.length > 0) {
            const { error: cleanupError } =
                await supabaseClient.storage
                    .from("post-images")
                    .remove(imagePaths);

            if (cleanupError) {
                console.warn(
                    "Could not clean up uploaded images:",
                    cleanupError
                );
            }
        }

    } finally {
        // Always restore the button after submission finishes,
        // including validation errors and failed uploads.
        submitButton.disabled = false;

        submitButton.value = isEditMode
            ? "Save Changes"
            : "Publish Post";
    }
});



/*
 * Display existing images and allow users
 * to remove individual photos from the post.
 *
 * Removing a photo here only changes the
 * editing form. It does not delete anything
 * from Supabase until the user saves.
 */
function displayExistingPhotos() {

    const container =
        document.getElementById("existing-photos");

    if (!container) return;

    container.replaceChildren();

    retainedImagePaths.forEach(path => {

        const wrapper = document.createElement("div");
        wrapper.className = "existing-photo-wrapper";

        const { data } = supabaseClient.storage
            .from("post-images")
            .getPublicUrl(path);

        const image = document.createElement("img");
        image.src = data.publicUrl;
        image.alt = "Existing post photo";
        image.className = "existing-photo";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "remove-photo-button";
        removeButton.textContent = "Remove";

        removeButton.addEventListener("click", () => {

            retainedImagePaths =
                retainedImagePaths.filter(p => p !== path);

            displayExistingPhotos();
        });

        wrapper.append(image, removeButton);
        container.appendChild(wrapper);
    });
}

