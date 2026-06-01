import config from './config.js';

const { Client, Account, Databases, Storage, ID, Query } = window.Appwrite;

const client = new Client();

client
    .setEndpoint(config.APPWRITE_ENDPOINT)
    .setProject(config.APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Mocking the Supabase-like syntax for a smoother transition later
const appwrite = {
    client,
    account,
    databases,
    storage,
    dbID: config.APPWRITE_DATABASE_ID,
    // Helping with common collection IDs
    collections: {
        notes: config.APPWRITE_NOTES_COLLECTION_ID || 'notes',
        folders: config.APPWRITE_FOLDERS_COLLECTION_ID || 'folders',
        profiles: config.APPWRITE_PROFILES_COLLECTION_ID || 'profiles',
        shared_notes: config.APPWRITE_SHARED_NOTES_COLLECTION_ID || 'shared_notes'
    }
};

console.log("Appwrite Client Initialized");

export { appwrite, account, databases, storage, ID, Query };
