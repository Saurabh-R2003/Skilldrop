# SkillDrops - Daily Micro-Skills PWA

## Overview

SkillDrops is a Progressive Web App (PWA) built with vanilla HTML, CSS, and JavaScript that delivers daily micro-skill lessons to users. The app allows users to discover random skills, save favorites, contribute new skills, and works fully offline with installable capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript using a view-based navigation system
- **Progressive Web App**: Implements PWA standards with service worker, web app manifest, and offline capabilities
- **Responsive Design**: Mobile-first approach with CSS custom properties for theming
- **Component-Based Structure**: Modular JavaScript architecture with separated concerns

### Backend Architecture
- **Client-Side Only**: No server-side components - entirely frontend-based application
- **Local Data Storage**: Uses IndexedDB for persistent, offline-first data storage
- **Static Asset Serving**: Relies on service worker for caching and offline functionality

### Data Storage Solution
- **IndexedDB**: Primary storage mechanism with four object stores:
  - `skills`: Stores skill data with category and title indexes
  - `favorites`: Tracks user's favorite skills
  - `ratings`: Stores user ratings (thumbs up/down)
  - `stats`: Maintains user statistics and streak data

## Key Components

### 1. Database Manager (db.js)
- **Purpose**: Handles all IndexedDB operations
- **Architecture**: Singleton pattern with promise-based async methods
- **Functionality**: CRUD operations for skills, favorites, ratings, and statistics

### 2. Main Application (script.js)
- **Purpose**: Core application logic and user interactions
- **Architecture**: Event-driven with global state management
- **Key Features**:
  - Navigation between views
  - Skill dropping mechanism
  - Favorite/rating management
  - Theme switching
  - PWA installation handling

### 3. Service Worker (service-worker.js)
- **Purpose**: Enables offline functionality and caching
- **Strategy**: Cache-first approach for static assets
- **Features**:
  - App shell caching
  - Offline fallback
  - Cache versioning and cleanup

### 4. UI Components
- **Navigation**: Tab-based navigation between Home, Favorites, and Contribute views
- **Skill Card**: Dynamic component for displaying skill information
- **Forms**: Contribution form for user-generated content
- **Notifications**: Permission handling for push notifications

## Data Flow

### 1. Application Initialization
1. DOM loads and initializes database
2. Service worker registers for offline capabilities
3. Theme preference loads from localStorage
4. App checks for PWA installation prompt

### 2. Skill Discovery Flow
1. User clicks "Drop Today's Skill" button
2. App retrieves random skill from IndexedDB
3. Skill card displays with title, summary, and optional link
4. User can favorite or rate the skill
5. Actions update IndexedDB immediately

### 3. Contribution Flow
1. User navigates to Contribute view
2. Fills out skill submission form
3. Form validates and saves to IndexedDB
4. New skill becomes available for future drops

### 4. Offline Functionality
1. Service worker caches all static assets
2. IndexedDB provides offline data persistence
3. App functions fully without internet connection

## External Dependencies

### None Required
- **No External Libraries**: Built entirely with vanilla web technologies
- **No CDN Dependencies**: All resources served locally
- **No Backend Services**: Fully client-side application

### Optional Integrations
- **YouTube Links**: Skills can reference external YouTube videos
- **Article Links**: Skills can link to external learning resources
- **Push Notifications**: Browser's native notification API

## Deployment Strategy

### Static Hosting
- **Requirements**: Any static file server (GitHub Pages, Netlify, Vercel, etc.)
- **Files**: All assets are static HTML, CSS, JavaScript, and icons
- **No Build Process**: Direct deployment of source files

### PWA Installation
- **Web App Manifest**: Configures installable app behavior
- **Service Worker**: Enables offline functionality and caching
- **Icons**: Multiple sizes for different devices and platforms
- **Shortcuts**: Quick actions for installed app

### Offline-First Architecture
- **Cache Strategy**: Service worker caches app shell and assets
- **Data Persistence**: IndexedDB ensures data survives browser sessions
- **Fallback Handling**: Graceful degradation when offline

### Performance Considerations
- **Lazy Loading**: Views load on demand
- **Efficient Caching**: Strategic asset caching via service worker
- **Minimal Bundle**: No external dependencies keep app lightweight
- **IndexedDB Optimization**: Indexed queries for fast skill retrieval

The application is designed to be completely self-contained, requiring no server infrastructure while providing a rich, app-like experience that works offline and can be installed on users' devices.