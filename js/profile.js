
/*
 * profile.js
 *
 * Manages Rex & Found user profiles.
 *
 * Requires:
 * - supabase-config.js
 * - auth.js
 */

// Retrieve a user's public profile.
async function getProfile(userId) {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error loading profile:", error);
        throw error;
    }

    return data;
}

// Create a profile for the signed-in user.
async function createProfile(displayName) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("You must be logged in.");
    }

    const name = displayName.trim();

    if (name.length < 2 || name.length > 30) {
        throw new Error(
            "Display names must be between 2 and 30 characters."
        );
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .insert({
            id: user.id,
            display_name: name
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

// Update the signed-in user's display name.
async function updateDisplayName(displayName) {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("You must be logged in.");
    }

    const name = displayName.trim();

    if (name.length < 2 || name.length > 30) {
        throw new Error(
            "Display names must be between 2 and 30 characters."
        );
    }

    const { data, error } = await supabaseClient
        .from("profiles")
        .update({
            display_name: name,
            updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
        .select()
        .single();

    if (error) throw error;

    return data;
}
