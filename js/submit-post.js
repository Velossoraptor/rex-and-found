const postForm = document.getElementById("create-post-form");
const submitButton = document.getElementById("submit_button");
const submitMessage = document.getElementById("submit-message");

// Handle form submission
postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Prevent duplicate submissions
    submitButton.disabled = true;
    submitButton.value = "Publishing...";
    submitMessage.textContent = "";

    const imagePaths = [];

    try {
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
        const author = document.getElementById(
            "author"
        ).value.trim();
        const contact = document.getElementById(
            "contact"
        ).value.trim();
        const category = document.getElementById("category").value;

        const photoInput = document.getElementById("photo");
        const photos = Array.from(photoInput.files);

        // 2. Validate required fields
        if (!status || !title || !description ||
            !location || !author || !contact) {
            throw new Error("Please fill out all required fields.");
        }

        
        // 3. Upload images (maximum 5)

        if (photos.length > 5) {
            throw new Error("You can upload a maximum of 5 photos.");
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
            const fileName = `${crypto.randomUUID()}.${extension}`;

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


        // 4. Insert the post into the database
        submitMessage.textContent = "Creating post...";

        const { data: newPost, error: insertError } =
            await supabaseClient
                .from("posts")
                .insert({
                    title: title,
                    description: description,
                    author: author,
                    status: status,
                    location: location,
                    time_posted: new Date().toISOString(),
                    images: imagePaths,
                    category: category,
                    contact: contact
                })
                .select("id")
                .single();

        if (insertError) {
            throw insertError;
        }

        // 5. Success!
        submitMessage.textContent = "Post published successfully!";

        // Redirect to the newly created post
        window.location.href =
            `item-page.html?id=${encodeURIComponent(newPost.id)}`;

    } catch (error) {
        console.error("Error creating post:", error);

        submitMessage.textContent =
            error.message || "Something went wrong. Please try again.";

        // Clean up an uploaded file if database insertion failed.
        // This is best-effort; Storage delete policies may prevent it.
        if (imagePaths.length > 0) {
            const { error: cleanupError } =
                await supabaseClient.storage
                    .from("post-images")
                    .remove(imagePaths);

            if (cleanupError) {
                console.warn("Could not clean up images:", cleanupError);
            }
        }

        submitButton.disabled = false;
        submitButton.value = "Publish Post";
    }
});