import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://backpdv.darkstoresuplementos.com');

// Helper function to check if the session is valid
export const ensureAuthenticated = async () => {
    return pb.authStore.isValid;
};
