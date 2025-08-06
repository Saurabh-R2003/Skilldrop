// --- Firestore Database Manager ---
const DBManager = {
    db: null,
    user: null,

    /**
     * Initializes the DB Manager and sets up the authentication listener.
     * Should be called after Firebase is fully loaded.
     */
    async init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase is not initialized. Make sure Firebase SDK is loaded before db.js');
            return;
        }

        this.db = firebase.firestore();

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                this.user = user;
                document.dispatchEvent(new CustomEvent('user-loggedin', { detail: { user } }));
                await this.migrateToFirestore();
            } else {
                this.user = null;
                document.dispatchEvent(new Event('user-loggedout'));
            }
        });
    },

    /**
     * One-time migration from IndexedDB to Firestore for authenticated users.
     */
    async migrateToFirestore() {
        if (!this.user) return;

        const migrationKey = `migration_completed_${this.user.uid}`;
        if (localStorage.getItem(migrationKey)) return;

        console.log('Starting data migration from IndexedDB to Firestore...');
        try {
            const localDB = await this.openLocalDB();
            if (!localDB) return;

            const favorites = await this.getLocalStoreData(localDB, 'favorites');
            if (favorites.length > 0) {
                const favoritesRef = this.db.collection('users').doc(this.user.uid).collection('favorites');
                for (const fav of favorites) {
                    await favoritesRef.doc(fav.skillId.toString()).set({
                        title: fav.title,
                        summary: fav.summary,
                        url: fav.url,
                        createdAt: fav.createdAt || firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            localStorage.setItem(migrationKey, 'true');
            console.log('Migration successful!');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    },

    // --- Skill Operations ---
    async addSkill(skillData) {
        const skill = {
            ...skillData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            contributedBy: this.user ? this.user.uid : null
        };
        return await this.db.collection('skills').add(skill);
    },

    async getSkill(id) {
        const doc = await this.db.collection('skills').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async getAllSkills() {
        const snapshot = await this.db.collection('skills').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getRandomSkill() {
        const skills = await this.getAllSkills();
        if (skills.length === 0) return null;
        return skills[Math.floor(Math.random() * skills.length)];
    },

    // --- Favorites ---
    async addFavorite(skill) {
        if (!this.user) throw new Error("User not logged in");
        return await this.db.collection('users').doc(this.user.uid)
            .collection('favorites').doc(skill.id).set({
                title: skill.title,
                summary: skill.summary,
                url: skill.url || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    async removeFavorite(skillId) {
        if (!this.user) throw new Error("User not logged in");
        return await this.db.collection('users').doc(this.user.uid)
            .collection('favorites').doc(skillId).delete();
    },

    async getFavorite(skillId) {
        if (!this.user) return null;
        const doc = await this.db.collection('users').doc(this.user.uid)
            .collection('favorites').doc(skillId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async getFavorites() {
        if (!this.user) return [];
        const snapshot = await this.db.collection('users').doc(this.user.uid)
            .collection('favorites').orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // --- Ratings ---
    async addRating(skillId, rating) {
        if (!this.user) throw new Error("User not logged in");
        return await this.db.collection('users').doc(this.user.uid)
            .collection('ratings').doc(skillId).set({
                rating,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },

    async removeRating(skillId) {
        if (!this.user) throw new Error("User not logged in");
        return await this.db.collection('users').doc(this.user.uid)
            .collection('ratings').doc(skillId).delete();
    },

    async getRating(skillId) {
        if (!this.user) return null;
        const doc = await this.db.collection('users').doc(this.user.uid)
            .collection('ratings').doc(skillId).get();
        return doc.exists ? doc.data().rating : null;
    },

    // --- Local IndexedDB Helpers (for migration) ---
    async openLocalDB() {
        return new Promise((resolve, reject) => {
            // Check if IndexedDB exists before opening
            indexedDB.databases().then(databases => {
                if (!databases.map(db => db.name).includes('SkillDropsDB')) {
                    resolve(null);
                    return;
                }

                const request = indexedDB.open('SkillDropsDB', 1);
                request.onerror = () => reject("Error opening IndexedDB");
                request.onsuccess = () => resolve(request.result);
            });
        });
    },

    async getLocalStoreData(localDB, storeName) {
        return new Promise((resolve, reject) => {
            if (!localDB.objectStoreNames.contains(storeName)) {
                resolve([]);
                return;
            }
            const transaction = localDB.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(`Error reading from ${storeName}`);
            request.onsuccess = () => resolve(request.result);
        });
    }
};

// ✅ Initialize only after DOM and Firebase are ready
document.addEventListener('DOMContentLoaded', () => {
    DBManager.init();
});
