# Vocabula Developer & Onboarding Guide

This guide details the local development workflow, directory layout, environment configuration, and testing procedures for developing Vocabula.

---

## 1. Repository Directory Structure Blueprint

Vocabula utilizes **Expo Router** for file-based routing and organizes business logic into modular service layers:

```
Vocabula/
├── app/                              # Expo Router file-system routes
│   ├── _layout.tsx                   # Global app layout, notification listeners & theme provider
│   ├── index.tsx                     # Main dashboard & search interface
│   ├── word/
│   │   └── [id].tsx                  # Word detail, pronunciation & contextual examples
│   ├── review/
│   │   └── index.tsx                 # Spaced repetition flashcard session
│   ├── decks/
│   │   ├── index.tsx                 # User decks & bookmarks list
│   │   └── [deckId].tsx              # Deck contents view
│   └── settings/
│       └── index.tsx                 # Notification times, audio settings & backup/restore
├── assets/
│   ├── data/
│   │   └── words.json                # Seed dictionary data (bundled offline)
│   ├── fonts/                        # Custom typography (Inter, Outfit)
│   └── images/                       # App icons, splash screens & illustration SVGs
├── components/                       # Reusable UI components
│   ├── common/                       # Buttons, Cards, Inputs, Badges, Modals
│   ├── search/                       # SearchBar, SearchResultItem, FilterPills
│   ├── word/                         # PhoneticAudioButton, ExampleList, TagGroup
│   └── review/                       # FlashcardView, QualityRatingBar, StreakCounter
├── db/                               # Database & Persistence layer
│   ├── schema.ts                     # SQLite DDL queries and table definitions
│   ├── client.ts                     # Database connection instance (expo-sqlite)
│   ├── migrations.ts                 # Schema migration runner
│   ├── queries.ts                    # Strongly typed SQLite query methods
│   └── seed.ts                       # Initial hydration from words.json
├── services/                         # Core business logic engines
│   ├── notifications/
│   │   ├── scheduler.ts              # Rolling window buffer scheduling algorithm
│   │   ├── categories.ts             # Lock-screen notification actions & buttons
│   │   └── listeners.ts              # Deep linking response interceptors
│   ├── srs/
│   │   ├── sm2.ts                    # SuperMemo-2 mathematical calculator
│   │   └── leitner.ts                # Leitner 5-box algorithm
│   ├── speech/
│   │   └── tts.ts                    # expo-speech wrapper & voice config
│   └── storage/
│       ├── appStorage.ts             # Offline preferences & state
│       └── backup.ts                 # JSON export/import and schema validator
├── hooks/                            # Custom React hooks
│   ├── useSearch.ts                  # FTS5 debounced search-as-you-type
│   ├── useWord.ts                    # Word retrieval by ID
│   ├── useSRSQueue.ts                # Active review cards query
│   └── useSpeech.ts                  # Audio synthesis controls
├── types/                            # Global TypeScript contracts
│   ├── dictionary.ts                 # Word, Example, Translation types
│   └── srs.ts                        # Progress, Grade, ReviewLog types
├── app.json                          # Expo configuration & plugins
├── package.json
└── tsconfig.json
```

---

## 2. Prerequisites & Environment Setup

### Prerequisites
* **Node.js:** v18.18.0 or higher
* **Package Manager:** `bun`, `pnpm`, or `npm`
* **Mobile Tooling:**
  * **iOS:** macOS with Xcode 15+ and CocoaPods (for iOS Simulator or physical device).
  * **Android:** Android Studio with Android SDK (API 34+) and Android Emulator.

> [!IMPORTANT]
> **Expo Go vs Expo Dev Client:**  
> While initial UI prototyping can run in standard Expo Go, testing **local notification categories**, **native widgets**, and C++ JSI-based **MMKV** requires an **Expo Development Build** (`npx expo run:ios` or `npx expo run:android`).

### Initial Dependency Installation
When scaffolding or installing dependencies, install Expo-compatible native modules:

```bash
# Core Expo runtime & navigation
npx expo install expo-router react-native-safe-area-context react-native-screens expo-status-bar

# Persistence & Storage
npx expo install expo-sqlite @react-native-async-storage/async-storage

# Device Native Subsystems
npx expo install expo-notifications expo-speech expo-sharing expo-document-picker

# Utilities & Vector Icons
npx expo install @expo/vector-icons
```

---

## 3. Configuration (`app.json`)

Configure notification permissions, custom URL schemes, and notification plugins in `app.json`:

```json
{
  "expo": {
    "name": "Vocabula",
    "slug": "vocabula",
    "version": "1.0.0",
    "scheme": "vocabula",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#6366F1",
          "sounds": ["./assets/sounds/ambient-bell.wav"]
        }
      ]
    ],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.vocabula.app",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0F172A"
      },
      "package": "com.vocabula.app",
      "permissions": [
        "POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM"
      ]
    }
  }
}
```

---

## 4. Testing Local Notifications & Deep Linking

### 4.1 Testing on iOS Simulator
1. Build and boot the app on the simulator:
   ```bash
   npx expo run:ios
   ```
2. In the app settings screen, trigger a test notification with a 5-second delay:
   ```typescript
   await Notifications.scheduleNotificationAsync({
     content: {
       title: "✨ Serendipity (noun)",
       body: "/ˌsɛr.ənˈdɪp.ə.ti/ • A fortunate accident.",
       data: { wordId: "serendipity" },
       categoryIdentifier: "LEXIPULSE_WORD_CARD"
     },
     trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 }
   });
   ```
3. Send the app to the background (`Cmd + Shift + H` on macOS).
4. After 5 seconds, observe the lock screen notification banner.
5. Tap the notification banner and verify that Expo Router instantly opens `app/word/[id].tsx` with the `serendipity` data loaded.

### 4.2 Testing on Android Emulator
1. Build and boot the Android emulator:
   ```bash
   npx expo run:android
   ```
2. Verify that the app requests `POST_NOTIFICATIONS` permission (Android 13+).
3. Verify that the notification arrives in the Android notification shade with action buttons.

---

## 5. Troubleshooting & FAQ

### Issue: SQLite database changes not appearing during development
* **Root Cause:** When running on a simulator, `expo-sqlite` keeps the local `.db` file in the app sandbox container.
* **Resolution:** Increment your `app.schema_version` inside MMKV, or call `SQLite.deleteDatabaseAsync('vocabula.db')` in development to force re-hydration from `words.json`.

### Issue: Notifications stop firing after a few days
* **Root Cause:** The OS reached the end of the scheduled calendar triggers and the app was not opened to refresh the rolling buffer.
* **Resolution:** Ensure the rolling buffer algorithm is set to at least 14–21 days and refreshes anytime `AppState` transitions from `background` to `active`.

### Issue: Sound does not play on lock-screen notification
* **Root Cause:** Device is set to silent/vibrate mode or the notification channel importance is set below `HIGH` on Android.
* **Resolution:** Check `setupAndroidChannels()` to ensure `importance: Notifications.AndroidImportance.HIGH` is configured.
