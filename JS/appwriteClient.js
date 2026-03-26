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
        notes: 'notes',
        folders: 'folders',
        profiles: 'profiles',
        shared_notes: 'shared_notes'
    }
};

console.log("Appwrite Client Initialized");

export { appwrite, account, databases, storage, ID, Query };
