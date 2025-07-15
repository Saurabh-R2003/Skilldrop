// Global variables
let currentSkill = null;
let deferredPrompt = null;
let notificationPermissionRequested = false;

// DOM elements
const elements = {
    // Navigation
    homeBtn: document.getElementById('homeBtn'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    contributeBtn: document.getElementById('contributeBtn'),
    themeToggle: document.getElementById('themeToggle'),
    installBtn: document.getElementById('installBtn'),
    addToHomeBtn: document.getElementById('addToHomeBtn'),
    
    // Views
    homeView: document.getElementById('homeView'),
    favoritesView: document.getElementById('favoritesView'),
    contributeView: document.getElementById('contributeView'),
    
    // Home view elements
    dropSkillBtn: document.getElementById('dropSkillBtn'),
    skillCard: document.getElementById('skillCard'),
    skillTitle: document.getElementById('skillTitle'),
    skillSummary: document.getElementById('skillSummary'),
    skillLink: document.getElementById('skillLink'),
    skillUrl: document.getElementById('skillUrl'),
    favoriteBtn: document.getElementById('favoriteBtn'),
    thumbsUpBtn: document.getElementById('thumbsUpBtn'),
    thumbsDownBtn: document.getElementById('thumbsDownBtn'),
    
    // Stats
    streakCount: document.getElementById('streakCount'),
    totalSkills: document.getElementById('totalSkills'),
    favoritesCount: document.getElementById('favoritesCount'),
    
    // Favorites view
    favoritesList: document.getElementById('favoritesList'),
    
    // Contribute view
    contributeForm: document.getElementById('contributeForm'),
    skillTitleInput: document.getElementById('skillTitleInput'),
    skillDescriptionInput: document.getElementById('skillDescriptionInput'),
    skillUrlInput: document.getElementById('skillUrlInput'),
    skillCategoryInput: document.getElementById('skillCategoryInput'),
    
    // Notifications
    notificationPermission: document.getElementById('notificationPermission'),
    allowNotifications: document.getElementById('allowNotifications'),
    denyNotifications: document.getElementById('denyNotifications'),
    
    // Toast
    toast: document.getElementById('toast')
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
    setupServiceWorker();
    checkInstallPrompt();
    updateStats();
    handleURLShortcuts();
});

// Initialize application
async function initializeApp() {
    try {
        await DBManager.init();
        await loadInitialSkills();
        applyTheme();
        
        // Check for notification permission after a delay
        setTimeout(() => {
            if (!notificationPermissionRequested && Notification.permission === 'default') {
                showNotificationPermissionDialog();
            }
        }, 3000);
        
        // Setup daily notifications
        setupDailyNotifications();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to initialize app', 'error');
    }
}

// Load initial predefined skills
async function loadInitialSkills() {
    const skillsExist = await DBManager.getSkillsCount();
    if (skillsExist > 0) return;
    
    const initialSkills = [
        {
            title: "The 2-Minute Rule",
            summary: "If something takes less than 2 minutes to complete, do it immediately instead of adding it to your to-do list.",
            url: "https://www.youtube.com/watch?v=mNBmyEAAlug",
            category: "productivity"
        },
        {
            title: "Power Posing",
            summary: "Stand in a confident pose for 2 minutes before important meetings to boost confidence and reduce stress hormones.",
            url: "https://www.youtube.com/watch?v=Ks-_Mh1QhMc",
            category: "soft-skill"
        },
        {
            title: "The Pomodoro Technique",
            summary: "Work for 25 minutes, then take a 5-minute break. Repeat 4 times, then take a longer break.",
            url: "https://www.youtube.com/watch?v=VFW3Ld7JO0w",
            category: "productivity"
        },
        {
            title: "Box Breathing",
            summary: "Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat to reduce stress and improve focus.",
            url: "https://www.youtube.com/watch?v=tEmt1Znux58",
            category: "health"
        },
        {
            title: "The Feynman Technique",
            summary: "Learn by teaching: explain a concept in simple terms as if teaching a child to truly understand it.",
            url: "https://www.youtube.com/watch?v=_f-qkGJBPts",
            category: "productivity"
        },
        {
            title: "Active Listening",
            summary: "Focus completely on the speaker, avoid interrupting, and ask clarifying questions to improve communication.",
            url: "https://www.youtube.com/watch?v=rzsVh8YwZEQ",
            category: "soft-skill"
        },
        {
            title: "The 5-Second Rule",
            summary: "When you feel an impulse to act on a goal, count 5-4-3-2-1 and physically move before your brain stops you.",
            url: "https://www.youtube.com/watch?v=Lp7E973zozc",
            category: "life-hack"
        },
        {
            title: "Keyboard Shortcuts Master",
            summary: "Learn Ctrl+Shift+T to reopen closed tabs, Ctrl+L to focus address bar, and Win+D to minimize all windows.",
            url: "https://www.youtube.com/watch?v=I3PBZBX-Fig",
            category: "technology"
        },
        {
            title: "The 10-10-10 Rule",
            summary: "When making decisions, ask: How will I feel about this in 10 minutes, 10 months, and 10 years?",
            url: "https://www.youtube.com/watch?v=rqMzQ-rOKdE",
            category: "life-hack"
        },
        {
            title: "Mind Mapping",
            summary: "Create visual diagrams with a central topic and branching ideas to improve creativity and memory.",
            url: "https://www.youtube.com/watch?v=MlabrWv25qQ",
            category: "creativity"
        }
    ];
    
    for (const skill of initialSkills) {
        await DBManager.addSkill(skill);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements.homeBtn.addEventListener('click', () => showView('home'));
    elements.favoritesBtn.addEventListener('click', () => showView('favorites'));
    elements.contributeBtn.addEventListener('click', () => showView('contribute'));
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Install button
    elements.installBtn.addEventListener('click', installApp);
    
    // Add to home button
    elements.addToHomeBtn.addEventListener('click', installApp);
    
    // Drop skill button
    elements.dropSkillBtn.addEventListener('click', dropRandomSkill);
    
    // Skill actions
    elements.favoriteBtn.addEventListener('click', toggleFavorite);
    elements.thumbsUpBtn.addEventListener('click', () => rateSkill('up'));
    elements.thumbsDownBtn.addEventListener('click', () => rateSkill('down'));
    
    // Contribute form
    elements.contributeForm.addEventListener('submit', handleContributeSubmit);
    
    // Notification permission
    elements.allowNotifications.addEventListener('click', requestNotificationPermission);
    elements.denyNotifications.addEventListener('click', hideNotificationPermissionDialog);
}

// Show view
function showView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(viewName + 'Btn').classList.add('active');
    
    // Show view
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewName + 'View').classList.add('active');
    
    // Load view-specific content
    if (viewName === 'favorites') {
        loadFavorites();
    }
}

// Drop random skill
async function dropRandomSkill() {
    try {
        const skill = await DBManager.getRandomSkill();
        if (!skill) {
            showToast('No skills available', 'error');
            return;
        }
        
        currentSkill = skill;
        displaySkill(skill);
        
        // Update stats
        await updateLastSkillDate();
        updateStats();
        
        showToast('New skill dropped! 🎁', 'success');
    } catch (error) {
        console.error('Failed to drop skill:', error);
        showToast('Failed to load skill', 'error');
    }
}

// Display skill
function displaySkill(skill) {
    elements.skillTitle.textContent = skill.title;
    elements.skillSummary.textContent = skill.summary;
    
    // Handle URL
    if (skill.url) {
        elements.skillUrl.href = skill.url;
        
        // Better link text based on URL type
        if (skill.url.includes('youtube.com') || skill.url.includes('youtu.be')) {
            elements.skillUrl.textContent = '🎥 Watch Video';
        } else if (skill.url.includes('article') || skill.url.includes('blog') || skill.url.includes('medium.com')) {
            elements.skillUrl.textContent = '📖 Read Article';
        } else {
            elements.skillUrl.textContent = '🔗 Learn More';
        }
        
        elements.skillLink.style.display = 'block';
    } else {
        elements.skillLink.style.display = 'none';
    }
    
    // Update button states
    updateSkillButtonStates(skill);
    
    // Show skill card
    elements.skillCard.style.display = 'block';
}

// Update skill button states
async function updateSkillButtonStates(skill) {
    const favorite = await DBManager.getFavorite(skill.id);
    const rating = await DBManager.getRating(skill.id);
    
    // Update favorite button
    elements.favoriteBtn.classList.toggle('active', !!favorite);
    
    // Update rating buttons
    elements.thumbsUpBtn.classList.toggle('active', rating === 'up');
    elements.thumbsDownBtn.classList.toggle('active', rating === 'down');
}

// Toggle favorite
async function toggleFavorite() {
    if (!currentSkill) return;
    
    try {
        const favorite = await DBManager.getFavorite(currentSkill.id);
        
        if (favorite) {
            await DBManager.removeFavorite(currentSkill.id);
            elements.favoriteBtn.classList.remove('active');
            showToast('Removed from favorites', 'success');
        } else {
            await DBManager.addFavorite(currentSkill.id);
            elements.favoriteBtn.classList.add('active');
            showToast('Added to favorites! ⭐', 'success');
        }
        
        updateStats();
    } catch (error) {
        console.error('Failed to toggle favorite:', error);
        showToast('Failed to update favorite', 'error');
    }
}

// Rate skill
async function rateSkill(rating) {
    if (!currentSkill) return;
    
    try {
        const currentRating = await DBManager.getRating(currentSkill.id);
        
        if (currentRating === rating) {
            // Remove rating if clicking same button
            await DBManager.removeRating(currentSkill.id);
            elements.thumbsUpBtn.classList.remove('active');
            elements.thumbsDownBtn.classList.remove('active');
            showToast('Rating removed', 'success');
        } else {
            // Add new rating
            await DBManager.addRating(currentSkill.id, rating);
            elements.thumbsUpBtn.classList.toggle('active', rating === 'up');
            elements.thumbsDownBtn.classList.toggle('active', rating === 'down');
            showToast(`Rated ${rating === 'up' ? '👍' : '👎'}`, 'success');
        }
    } catch (error) {
        console.error('Failed to rate skill:', error);
        showToast('Failed to rate skill', 'error');
    }
}

// Handle contribute form submission
async function handleContributeSubmit(e) {
    e.preventDefault();
    
    const skillData = {
        title: elements.skillTitleInput.value.trim(),
        summary: elements.skillDescriptionInput.value.trim(),
        url: elements.skillUrlInput.value.trim() || null,
        category: elements.skillCategoryInput.value
    };
    
    if (!skillData.title || !skillData.summary) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        await DBManager.addSkill(skillData);
        showToast('Skill added successfully! 🎉', 'success');
        
        // Clear form
        elements.contributeForm.reset();
        
        // Switch to home view
        showView('home');
        updateStats();
    } catch (error) {
        console.error('Failed to add skill:', error);
        showToast('Failed to add skill', 'error');
    }
}

// Load favorites
async function loadFavorites() {
    try {
        const favorites = await DBManager.getFavorites();
        const favoritesList = elements.favoritesList;

        if (favorites.length === 0) {
            favoritesList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⭐</span>
                    <h3>No favorites yet</h3>
                    <p>Start favoriting skills to see them here!</p>
                </div>
            `;
            return;
        }

        favoritesList.innerHTML = favorites.map(favorite => `
            <div class="favorite-item">
                <h3>${favorite.title}</h3>
                <p>${favorite.summary}</p>
                ${favorite.url ? `<a href="${favorite.url}" target="_blank" rel="noopener noreferrer" class="skill-link-btn">
                    ${favorite.url.includes('youtube.com') || favorite.url.includes('youtu.be') ? '🎥 Watch Video' : 
                      favorite.url.includes('article') || favorite.url.includes('blog') ? '📖 Read Article' : 
                      '🔗 Learn More'}
                </a>` : ''}
                <div class="favorite-actions">
                    <button class="action-btn" onclick="removeFavorite(${favorite.id})">
                        <span class="icon">🗑️</span>
                        <span class="text">Remove</span>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load favorites:', error);
        showToast('Failed to load favorites', 'error');
    }
}


// Remove favorite
async function removeFavorite(skillId) {
    try {
        await DBManager.removeFavorite(skillId);
        loadFavorites();
        updateStats();
        showToast('Removed from favorites', 'success');
    } catch (error) {
        console.error('Failed to remove favorite:', error);
        showToast('Failed to remove favorite', 'error');
    }
}

// Update stats
async function updateStats() {
    try {
        const stats = await DBManager.getStats();
        
        elements.streakCount.textContent = stats.streak;
        elements.totalSkills.textContent = stats.totalSkills;
        elements.favoritesCount.textContent = stats.favoritesCount;
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

// Update last skill date
async function updateLastSkillDate() {
    const today = new Date().toDateString();
    localStorage.setItem('lastSkillDate', today);
}

// Calculate streak
async function calculateStreak() {
    const today = new Date().toDateString();
    const lastSkillDate = localStorage.getItem('lastSkillDate');
    
    if (!lastSkillDate) return 0;
    
    const lastDate = new Date(lastSkillDate);
    const currentDate = new Date(today);
    const timeDiff = currentDate.getTime() - lastDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff === 1) {
        const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
        const newStreak = currentStreak + 1;
        localStorage.setItem('currentStreak', newStreak.toString());
        return newStreak;
    } else if (daysDiff === 0) {
        return parseInt(localStorage.getItem('currentStreak') || '0');
    } else {
        localStorage.setItem('currentStreak', '0');
        return 0;
    }
}

// Theme management
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    elements.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    elements.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Service Worker
async function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }
}

// Install prompt
function checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        elements.installBtn.style.display = 'block';
        elements.addToHomeBtn.style.display = 'none'; // Hide manual button when native prompt is available
    });
    
    // Check if app is already installed
    window.addEventListener('appinstalled', (e) => {
        elements.installBtn.style.display = 'none';
        elements.addToHomeBtn.style.display = 'none';
        showToast('App installed successfully! 🎉', 'success');
    });
    
    // Show appropriate button based on installation status
    if (window.matchMedia('(display-mode: standalone)').matches) {
        elements.installBtn.style.display = 'none';
        elements.addToHomeBtn.style.display = 'none';
    }
}

async function installApp() {
    if (!deferredPrompt) {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            showToast('App is already installed!', 'success');
            return;
        }
        
        // Try to trigger the native browser install prompt
        if ('BeforeInstallPromptEvent' in window) {
            showToast('Installation prompt should appear in your browser', 'success');
        } else {
            // Fallback for browsers that don't support the API
            showToast('To install: Use your browser menu > "Add to Home Screen" or "Install App"', 'error');
        }
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        showToast('App installed successfully! 🎉', 'success');
    } else {
        showToast('Installation cancelled', 'error');
    }
    
    deferredPrompt = null;
    elements.installBtn.style.display = 'none';
}



// Notifications
function showNotificationPermissionDialog() {
    notificationPermissionRequested = true;
    elements.notificationPermission.style.display = 'flex';
}

function hideNotificationPermissionDialog() {
    elements.notificationPermission.style.display = 'none';
}

async function requestNotificationPermission() {
    try {
        const permission = await Notification.requestPermission();
        hideNotificationPermissionDialog();
        
        if (permission === 'granted') {
            showToast('Notifications enabled! 🔔', 'success');
            setupDailyNotifications();
        } else {
            showToast('Notifications disabled', 'error');
        }
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        showToast('Failed to enable notifications', 'error');
    }
}

function setupDailyNotifications() {
    if (Notification.permission !== 'granted') return;
    
    // Register push notification service worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            // Setup push subscription if supported
            setupPushSubscription(registration);
        });
    }
    
    // Schedule daily notification (for demo, we'll use a shorter interval)
    setInterval(() => {
        const lastNotification = localStorage.getItem('lastNotification');
        const today = new Date().toDateString();
        
        if (lastNotification !== today) {
            new Notification('Your skill drop is ready! 💡', {
                body: 'Learn something new today with SkillDrops',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'daily-skill',
                renotify: true,
                actions: [
                    {
                        action: 'view',
                        title: 'View Skill'
                    },
                    {
                        action: 'dismiss',
                        title: 'Dismiss'
                    }
                ]
            });
            
            localStorage.setItem('lastNotification', today);
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    // For demo purposes, also set a shorter interval
    setTimeout(() => {
        if (Notification.permission === 'granted') {
            new Notification('Welcome to SkillDrops! 💡', {
                body: 'Your daily micro-skill learning companion is ready',
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'welcome'
            });
        }
    }, 5000); // 5 seconds for demo
}

async function setupPushSubscription(registration) {
    try {
        // This is a demo - in production you'd need a real push server
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            //applicationServerKey: null // You'd need a real VAPID key here
        });
        
        console.log('Push subscription successful:', subscription);
    } catch (error) {
        console.log('Push subscription failed:', error);
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Handle URL shortcuts from manifest
function handleURLShortcuts() {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    switch(action) {
        case 'drop':
            dropRandomSkill();
            break;
        case 'favorites':
            showView('favorites');
            break;
        case 'contribute':
            showView('contribute');
            break;
        default:
            // Default behavior - show home
            showView('home');
    }
}

// Make functions globally available
window.removeFavorite = removeFavorite;
