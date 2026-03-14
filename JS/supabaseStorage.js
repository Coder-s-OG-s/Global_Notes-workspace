import { supabase } from "./supabaseClient.js";

/**
 * Fetches all notes for the logged-in user.
 */
export async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
    return data;
}

/**
 * Saves (Upserts) a single note.
 * If note has an ID that exists, it updates. Otherwise inserts.
 */
export async function saveNote(note) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Ensure note has user_id
    const noteToSave = {
        ...note,
        user_id: user.id,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('notes')
        .upsert(noteToSave)
        .select()
        .single();

    if (error) {
        console.error("Error saving note:", error);
        throw error;
    }
    return data;
}

/**
 * Deletes a note by ID (scoped to current user for safety).
 */
export async function deleteNote(noteId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Fetches folders.
 */
export async function fetchFolders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id);

    return data || [];
}

/**
 * Saves (upserts) a folder.
 */
export async function saveFolder(folder) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const folderToSave = { ...folder, user_id: user.id };

    const { error } = await supabase
        .from('folders')
        .upsert(folderToSave);

    if (error) console.error("Error saving folder:", error);
}

/**
 * Deletes a folder by ID (scoped to current user for safety).
 */
export async function deleteFolder(folderId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

    if (error) throw error;
}

/**
 * Get user profile (avatar, description, settings)
 */
export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignore 'not found' error
        console.error("Error fetching profile:", error);
    }
    return data;
}

/**
 * Shares a note by saving it to the public shared_notes table.
 * Returns the UUID of the shared note.
 */
export async function shareNote(note) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User must be logged in to share.");

    const noteToShare = {
        title: note.title,
        content: note.content,
        // Optional: you could link to original user_id if you want to show "Shared by..."
        user_id: user.id
    };

    const { data, error } = await supabase
        .from('shared_notes')
        .insert(noteToShare)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Retrieves a shared note by its UUID.
 * Accessible by anyone (public).
 */
export async function getSharedNote(id) {
    const { data, error } = await supabase
        .from('shared_notes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error fetching shared note:", error);
        return null;
    }
    return data;
}
