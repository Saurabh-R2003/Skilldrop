// --- Global Variables ---
let currentSkill = null;
let deferredPrompt = null;
let notificationPermissionRequested = false;

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyB9NSghuBU9pnNmUpzacnEPm_ooGkUD9gA",
  authDomain: "skilldrop-bff89.firebaseapp.com", // ✅ Corrected domain
  projectId: "skilldrop-bff89",
  storageBucket: "skilldrop-bff89.appspot.com",
  messagingSenderId: "57757622291",
  appId: "1:57757622291:web:3c047d1297f91ddb72dfe6",
  measurementId: "G-NMW03G9HKX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- DOM Elements ---
const elements = {
  homeBtn: document.getElementById('homeBtn'),
  favoritesBtn: document.getElementById('favoritesBtn'),
  contributeBtn: document.getElementById('contributeBtn'),
  themeToggle: document.getElementById('themeToggle'),
  installBtn: document.getElementById('installBtn'),
  addToHomeBtn: document.getElementById('addToHomeBtn'),
  homeView: document.getElementById('homeView'),
  favoritesView: document.getElementById('favoritesView'),
  contributeView: document.getElementById('contributeView'),
  dropSkillBtn: document.getElementById('dropSkillBtn'),
  skillCard: document.getElementById('skillCard'),
  skillTitle: document.getElementById('skillTitle'),
  skillSummary: document.getElementById('skillSummary'),
  skillLink: document.getElementById('skillLink'),
  skillUrl: document.getElementById('skillUrl'),
  favoriteBtn: document.getElementById('favoriteBtn'),
  thumbsUpBtn: document.getElementById('thumbsUpBtn'),
  thumbsDownBtn: document.getElementById('thumbsDownBtn'),
  streakCount: document.getElementById('streakCount'),
  totalSkills: document.getElementById('totalSkills'),
  favoritesCount: document.getElementById('favoritesCount'),
  favoritesList: document.getElementById('favoritesList'),
  contributeForm: document.getElementById('contributeForm'),
  skillTitleInput: document.getElementById('skillTitleInput'),
  skillDescriptionInput: document.getElementById('skillDescriptionInput'),
  skillUrlInput: document.getElementById('skillUrlInput'),
  skillCategoryInput: document.getElementById('skillCategoryInput'),
  notificationPermission: document.getElementById('notificationPermission'),
  allowNotifications: document.getElementById('allowNotifications'),
  denyNotifications: document.getElementById('denyNotifications'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  userProfile: document.getElementById('user-profile'),
  userDisplayName: document.getElementById('userDisplayName'),
  toast: document.getElementById('toast')
};

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  setupEventListeners();
  applyTheme();
  setupServiceWorker();
  checkInstallPrompt();
  handleURLShortcuts();
  updateStats();
  seedInitialSkills();
}

function setupEventListeners() {
  elements.homeBtn.addEventListener('click', () => showView('home'));
  elements.favoritesBtn.addEventListener('click', () => showView('favorites'));
  elements.contributeBtn.addEventListener('click', () => showView('contribute'));
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.installBtn.addEventListener('click', installApp);
  elements.addToHomeBtn.addEventListener('click', installApp);
  elements.dropSkillBtn.addEventListener('click', dropRandomSkill);
  elements.favoriteBtn.addEventListener('click', toggleFavorite);
  elements.thumbsUpBtn.addEventListener('click', () => rateSkill('up'));
  elements.thumbsDownBtn.addEventListener('click', () => rateSkill('down'));
  elements.contributeForm.addEventListener('submit', handleContributeSubmit);
  elements.allowNotifications.addEventListener('click', requestNotificationPermission);
  elements.denyNotifications.addEventListener('click', hideNotificationPermissionDialog);

  // ✅ Google Sign-In
  elements.loginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    auth.signInWithPopup(provider).catch(error => {
      console.error('Login failed:', error);
      showToast('Login failed: ' + error.message, 'error');
    });
  });

  elements.logoutBtn.addEventListener('click', () => {
    auth.signOut();
  });

  // Respond to auth events from db.js
  document.addEventListener('user-loggedin', (e) => {
    const user = e.detail.user;
    elements.userProfile.style.display = 'flex';
    elements.userDisplayName.textContent = `Hi, ${user.displayName.split(' ')[0]}`;
    elements.loginBtn.style.display = 'none';
    elements.logoutBtn.style.display = 'block';
    loadFavorites();
    updateStats();
    showToast(`Welcome back, ${user.displayName}!`, 'success');
  });

  document.addEventListener('user-loggedout', () => {
    elements.userProfile.style.display = 'none';
    elements.loginBtn.style.display = 'block';
    elements.logoutBtn.style.display = 'none';
    elements.favoritesList.innerHTML = `<div class="empty-state"><h3>Please log in</h3><p>Log in to see and save your favorite skills.</p></div>`;
    updateStats();
    showToast('You have been logged out.', 'success');
  });
}

// --- Core Functions ---

function showView(viewName) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${viewName}Btn`).classList.add('active');
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.getElementById(`${viewName}View`).classList.add('active');
  if (viewName === 'favorites') loadFavorites();
}

async function dropRandomSkill() {
  try {
    const skill = await DBManager.getRandomSkill();
    if (!skill) return showToast('No skills available. Contribute one!', 'error');
    currentSkill = skill;
    displaySkill(skill);
    await updateLastSkillDate();
    updateStats();
    showToast('New skill dropped! 🎁', 'success');
  } catch (error) {
    console.error('Failed to drop skill:', error);
    showToast('Failed to load skill', 'error');
  }
}

function displaySkill(skill) {
  elements.skillTitle.textContent = skill.title;
  elements.skillSummary.textContent = skill.summary;

  if (skill.url) {
    elements.skillUrl.href = skill.url;
    elements.skillUrl.textContent = skill.url.includes('youtube') ? '🎥 Watch Video' : '📖 Read Article';
    elements.skillLink.style.display = 'block';
  } else {
    elements.skillLink.style.display = 'none';
  }

  updateSkillButtonStates(skill);
  elements.skillCard.style.display = 'block';
}

async function updateSkillButtonStates(skill) {
  if (!DBManager.user) {
    elements.favoriteBtn.classList.remove('active');
    elements.thumbsUpBtn.classList.remove('active');
    elements.thumbsDownBtn.classList.remove('active');
    return;
  }

  const isFavorite = await DBManager.getFavorite(skill.id);
  const rating = await DBManager.getRating(skill.id);
  elements.favoriteBtn.classList.toggle('active', !!isFavorite);
  elements.thumbsUpBtn.classList.toggle('active', rating === 'up');
  elements.thumbsDownBtn.classList.toggle('active', rating === 'down');
}

async function toggleFavorite() {
  if (!currentSkill) return;
  if (!DBManager.user) return showToast('Please log in to save favorites.', 'error');

  try {
    const isFavorite = await DBManager.getFavorite(currentSkill.id);
    if (isFavorite) {
      await DBManager.removeFavorite(currentSkill.id);
      elements.favoriteBtn.classList.remove('active');
      showToast('Removed from favorites', 'success');
    } else {
      await DBManager.addFavorite(currentSkill);
      elements.favoriteBtn.classList.add('active');
      showToast('Added to favorites! ⭐', 'success');
    }
    updateStats();
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
  }
}

async function rateSkill(rating) {
  if (!currentSkill || !DBManager.user) return showToast('Please log in to rate skills.', 'error');

  try {
    await DBManager.addRating(currentSkill.id, rating);
    elements.thumbsUpBtn.classList.toggle('active', rating === 'up');
    elements.thumbsDownBtn.classList.toggle('active', rating === 'down');
    showToast(`Rated ${rating === 'up' ? '👍' : '👎'}`, 'success');
  } catch (error) {
    console.error('Failed to rate skill:', error);
  }
}

async function handleContributeSubmit(e) {
  e.preventDefault();
  if (!DBManager.user) return showToast('Please log in to contribute.', 'error');

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
    elements.contributeForm.reset();
    showView('home');
    updateStats();
  } catch (error) {
    console.error('Failed to add skill:', error);
  }
}

async function loadFavorites() {
  if (!DBManager.user) {
    elements.favoritesList.innerHTML = `<div class="empty-state"><h3>Please log in</h3><p>Log in to see your favorite skills.</p></div>`;
    return;
  }

  try {
    const favorites = await DBManager.getFavorites();
    if (favorites.length === 0) {
      elements.favoritesList.innerHTML = `<div class="empty-state"><h3>No favorites yet</h3><p>Start favoriting skills to see them here!</p></div>`;
      return;
    }

    elements.favoritesList.innerHTML = favorites.map(fav => `
      <div class="favorite-item">
        <h3>${fav.title}</h3>
        <p>${fav.summary}</p>
        ${fav.url ? `<a href="${fav.url}" target="_blank" class="skill-link-btn">Learn More</a>` : ''}
        <div class="favorite-actions">
          <button class="action-btn" onclick="removeFavorite('${fav.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load favorites:', error);
  }
}

async function removeFavorite(skillId) {
  try {
    await DBManager.removeFavorite(skillId);
    loadFavorites();
    updateStats();
    showToast('Removed from favorites', 'success');
  } catch (error) {
    console.error('Failed to remove favorite:', error);
  }
}

async function updateStats() {
  try {
    const skills = await DBManager.getAllSkills();
    elements.totalSkills.textContent = skills.length;
    elements.streakCount.textContent = calculateStreak();
    if (DBManager.user) {
      const favorites = await DBManager.getFavorites();
      elements.favoritesCount.textContent = favorites.length;
    } else {
      elements.favoritesCount.textContent = '0';
    }
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

function calculateStreak() {
  return localStorage.getItem('currentStreak') || 0;
}

async function updateLastSkillDate() {
  localStorage.setItem('lastSkillDate', new Date().toDateString());
}

function toggleTheme() {
  const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  elements.themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function applyTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  elements.themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function showToast(message, type = 'success') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

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

function checkInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    elements.installBtn.style.display = 'block';
    elements.addToHomeBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    elements.installBtn.style.display = 'none';
    elements.addToHomeBtn.style.display = 'none';
    showToast('App installed successfully! 🎉', 'success');
  });

  if (window.matchMedia('(display-mode: standalone)').matches) {
    elements.installBtn.style.display = 'none';
    elements.addToHomeBtn.style.display = 'none';
  }
}

async function installApp() {
  if (!deferredPrompt) return showToast('To install: Use browser menu → "Add to Home Screen"', 'error');
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  showToast(outcome === 'accepted' ? 'App installed successfully! 🎉' : 'Installation cancelled', outcome === 'accepted' ? 'success' : 'error');
  deferredPrompt = null;
  elements.installBtn.style.display = 'none';
}

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

function handleURLShortcuts() {
  const action = new URLSearchParams(window.location.search).get('action');
  if (action) showView(action);
}

// Make removeFavorite globally accessible
window.removeFavorite = removeFavorite;
