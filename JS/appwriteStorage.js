import { account, databases, ID, Query } from './appwriteClient.js';
import config from './config.js';

const DB_ID = config.APPWRITE_DATABASE_ID;
const COLLECTIONS = {
    notes: 'notes',
    folders: 'folders',
    profiles: 'profiles',
    shared_notes: 'shared_notes'
};

/**
 * Helper to get current Appwrite User ID
 */
async function getUserId() {
    try {
        const user = await account.get();
        return user.$id;
    } catch (e) {
        return null;
    }
}

/**
 * Fetches all notes for the logged-in user.
 */
export async function fetchNotes() {
    const userId = await getUserId();
    if (!userId) return [];

    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.notes,
            [
                Query.equal('user_id', userId),
                Query.orderDesc('updated_at')
            ]
        );
        return response.documents;
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
}

/**
 * Saves (Upserts) a single note.
 */
export async function saveNote(note) {
    const userId = await getUserId();
    if (!userId) return null;

    const documentId = note.id || ID.unique();
    const data = {
        ...note,
        user_id: userId,
        updated_at: new Date().toISOString()
    };
    
    // Remove ID from data object if it exists (it's in the param)
    delete data.id;
    delete data.$id; 
    delete data.$permissions;
    delete data.$collectionId;
    delete data.$databaseId;
    delete data.$createdAt;
    delete data.$updatedAt;

    try {
        // Appwrite doesn't have upsert, so we try update then create
        try {
            return await databases.updateDocument(DB_ID, COLLECTIONS.notes, documentId, data);
        } catch (e) {
            return await databases.createDocument(DB_ID, COLLECTIONS.notes, documentId, data);
        }
    } catch (error) {
        console.error("Error saving note:", error);
        throw error;
    }
}

/**
 * Deletes a note by ID.
 */
export async function deleteNote(noteId) {
    try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.notes, noteId);
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
}

/**
 * Fetches folders.
 */
export async function fetchFolders() {
    const userId = await getUserId();
    if (!userId) return [];

    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.folders,
            [Query.equal('user_id', userId)]
        );
        return response.documents;
    } catch (error) {
        console.error("Error fetching folders:", error);
        return [];
    }
}

/**
 * Saves (upserts) a folder.
 */
export async function saveFolder(folder) {
    const userId = await getUserId();
    if (!userId) return;

    const documentId = folder.id || ID.unique();
    const data = { ...folder, user_id: userId };
    delete data.id;
    delete data.$id;

    try {
        try {
            return await databases.updateDocument(DB_ID, COLLECTIONS.folders, documentId, data);
        } catch (e) {
            return await databases.createDocument(DB_ID, COLLECTIONS.folders, documentId, data);
        }
    } catch (error) {
        console.error("Error saving folder:", error);
    }
}

/**
 * Deletes a folder by ID.
 */
export async function deleteFolder(folderId) {
    try {
        await databases.deleteDocument(DB_ID, COLLECTIONS.folders, folderId);
    } catch (error) {
        console.error("Error deleting folder:", error);
        throw error;
    }
}

/**
 * Get user profile
 */
export async function getUserProfile() {
    const userId = await getUserId();
    if (!userId) return null;

    try {
        return await databases.getDocument(DB_ID, COLLECTIONS.profiles, userId);
    } catch (error) {
        console.warn("Profile not found in Appwrite collection");
        return null;
    }
}

/**
 * Shares a note
 */
export async function shareNote(note) {
    const userId = await getUserId();
    if (!userId) throw new Error("User must be logged in to share.");

    const data = {
        title: note.title,
        content: note.content,
        user_id: userId
    };

    try {
        return await databases.createDocument(DB_ID, COLLECTIONS.shared_notes, ID.unique(), data);
    } catch (error) {
        console.error("Error sharing note:", error);
        throw error;
    }
}

/**
 * Retrieves a shared note
 */
export async function getSharedNote(id) {
    try {
        return await databases.getDocument(DB_ID, COLLECTIONS.shared_notes, id);
    } catch (error) {
        console.error("Error fetching shared note:", error);
        return null;
    }
}
