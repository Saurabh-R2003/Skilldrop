// IndexedDB Database Manager
const DBManager = {
    db: null,
    dbName: 'SkillDropsDB',
    version: 1,
    
    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Skills store
                if (!db.objectStoreNames.contains('skills')) {
                    const skillsStore = db.createObjectStore('skills', { keyPath: 'id', autoIncrement: true });
                    skillsStore.createIndex('category', 'category', { unique: false });
                    skillsStore.createIndex('title', 'title', { unique: false });
                }
                
                // Favorites store
                if (!db.objectStoreNames.contains('favorites')) {
                    const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id', autoIncrement: true });
                    favoritesStore.createIndex('skillId', 'skillId', { unique: true });
                }
                
                // Ratings store
                if (!db.objectStoreNames.contains('ratings')) {
                    const ratingsStore = db.createObjectStore('ratings', { keyPath: 'id', autoIncrement: true });
                    ratingsStore.createIndex('skillId', 'skillId', { unique: true });
                }
                
                // User stats store
                if (!db.objectStoreNames.contains('stats')) {
                    const statsStore = db.createObjectStore('stats', { keyPath: 'key' });
                }
            };
        });
    },
    
    // Skills operations
    async addSkill(skillData) {
        const skill = {
            ...skillData,
            createdAt: new Date().toISOString(),
            userContributed: true
        };
        
        return this.performTransaction('skills', 'readwrite', (store) => {
            return store.add(skill);
        });
    },
    
    async getSkill(id) {
        return this.performTransaction('skills', 'readonly', (store) => {
            return store.get(id);
        });
    },
    
    async getAllSkills() {
        return this.performTransaction('skills', 'readonly', (store) => {
            return store.getAll();
        });
    },
    
    async getRandomSkill() {
        const skills = await this.getAllSkills();
        if (skills.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * skills.length);
        return skills[randomIndex];
    },
    
    async getSkillsCount() {
        return this.performTransaction('skills', 'readonly', (store) => {
            return store.count();
        });
    },
    
    async getSkillsByCategory(category) {
        return this.performTransaction('skills', 'readonly', (store) => {
            const index = store.index('category');
            return index.getAll(category);
        });
    },
    
    // Favorites operations
    async addFavorite(skillId) {
        const skill = await this.getSkill(skillId);
        if (!skill) throw new Error('Skill not found');
        
        const favorite = {
            skillId: skillId,
            title: skill.title,
            summary: skill.summary,
            url: skill.url,
            createdAt: new Date().toISOString()
        };
        
        return this.performTransaction('favorites', 'readwrite', (store) => {
            return store.add(favorite);
        });
    },
    
    async removeFavorite(skillId) {
        return this.performTransaction('favorites', 'readwrite', (store) => {
            const index = store.index('skillId');
            return index.getKey(skillId).then(key => {
                if (key) return store.delete(key);
            });
        });
    },
    
    async getFavorite(skillId) {
        return this.performTransaction('favorites', 'readonly', (store) => {
            const index = store.index('skillId');
            return index.get(skillId);
        });
    },
    
    async getFavorites() {
        return this.performTransaction('favorites', 'readonly', (store) => {
            return store.getAll();
        });
    },
    
    // Ratings operations
    async addRating(skillId, rating) {
        const existingRating = await this.getRating(skillId);
        
        if (existingRating) {
            // Update existing rating
            return this.performTransaction('ratings', 'readwrite', (store) => {
                const index = store.index('skillId');
                return index.get(skillId).then(ratingData => {
                    if (ratingData) {
                        ratingData.rating = rating;
                        ratingData.updatedAt = new Date().toISOString();
                        return store.put(ratingData);
                    }
                });
            });
        } else {
            // Add new rating
            const ratingData = {
                skillId: skillId,
                rating: rating,
                createdAt: new Date().toISOString()
            };
            
            return this.performTransaction('ratings', 'readwrite', (store) => {
                return store.add(ratingData);
            });
        }
    },
    
    async removeRating(skillId) {
        return this.performTransaction('ratings', 'readwrite', (store) => {
            const index = store.index('skillId');
            return index.getKey(skillId).then(key => {
                if (key) return store.delete(key);
            });
        });
    },
    
    async getRating(skillId) {
        const ratingData = await this.performTransaction('ratings', 'readonly', (store) => {
            const index = store.index('skillId');
            return index.get(skillId);
        });
        
        return ratingData ? ratingData.rating : null;
    },
    
    // Stats operations
    async getStats() {
        const totalSkills = await this.getSkillsCount();
        const favorites = await this.getFavorites();
        const streak = this.calculateStreak();
        
        return {
            totalSkills,
            favoritesCount: favorites.length,
            streak
        };
    },
    
    calculateStreak() {
        const today = new Date().toDateString();
        const lastSkillDate = localStorage.getItem('lastSkillDate');
        
        if (!lastSkillDate) return 0;
        
        const lastDate = new Date(lastSkillDate);
        const currentDate = new Date(today);
        const timeDiff = currentDate.getTime() - lastDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff === 0) {
            return parseInt(localStorage.getItem('currentStreak') || '1');
        } else if (daysDiff === 1) {
            const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
            const newStreak = currentStreak + 1;
            localStorage.setItem('currentStreak', newStreak.toString());
            return newStreak;
        } else {
            localStorage.setItem('currentStreak', '0');
            return 0;
        }
    },
    
    // Generic transaction helper
    async performTransaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            const request = operation(store);
            
            if (request && request.onsuccess !== undefined) {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                // Handle operations that don't return a request
                transaction.oncomplete = () => resolve(request);
                transaction.onerror = () => reject(transaction.error);
            }
        });
    },
    
    // Utility functions
    async clearAllData() {
        const stores = ['skills', 'favorites', 'ratings', 'stats'];
        
        for (const storeName of stores) {
            await this.performTransaction(storeName, 'readwrite', (store) => {
                return store.clear();
            });
        }
        
        localStorage.clear();
    },
    
    async exportData() {
        const data = {
            skills: await this.getAllSkills(),
            favorites: await this.getFavorites(),
            ratings: await this.performTransaction('ratings', 'readonly', (store) => store.getAll()),
            stats: await this.getStats(),
            localStorage: {
                theme: localStorage.getItem('theme'),
                currentStreak: localStorage.getItem('currentStreak'),
                lastSkillDate: localStorage.getItem('lastSkillDate'),
                lastNotification: localStorage.getItem('lastNotification')
            }
        };
        
        return JSON.stringify(data, null, 2);
    },
    
    async importData(jsonData) {
        const data = JSON.parse(jsonData);
        
        // Clear existing data
        await this.clearAllData();
        
        // Import skills
        if (data.skills) {
            for (const skill of data.skills) {
                await this.addSkill(skill);
            }
        }
        
        // Import favorites
        if (data.favorites) {
            for (const favorite of data.favorites) {
                await this.addFavorite(favorite.skillId);
            }
        }
        
        // Import ratings
        if (data.ratings) {
            for (const rating of data.ratings) {
                await this.addRating(rating.skillId, rating.rating);
            }
        }
        
        // Import localStorage data
        if (data.localStorage) {
            Object.entries(data.localStorage).forEach(([key, value]) => {
                if (value !== null) {
                    localStorage.setItem(key, value);
                }
            });
        }
    }
};
