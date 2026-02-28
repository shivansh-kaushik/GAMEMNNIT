import { Client, Account, Databases } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '69a15b8c001a2d23ddf4');

export const account = new Account(client);
export const databases = new Databases(client);
export const client_ = client;

// Appwrite IDs — update these after creating the collection in Appwrite Console
export const DB_ID = 'mnnit_campus';
export const BLOCKS_COLLECTION_ID = 'placed_blocks';
export const BUILDINGS_COLLECTION_ID = 'buildings';
export const ROADS_COLLECTION_ID = 'roads';
