# FitTrack Pro 🏋️‍♂️

FitTrack Pro is a modern, AI-powered fitness application designed to bridge the gap between workout inspiration and execution. Whether you find a routine on YouTube or want to dictate your own session, FitTrack Pro uses cutting-edge AI to turn raw content into structured, actionable workout templates.

---

## ✨ Key Features

### 🤖 AI Workout Extraction
- **YouTube Import**: Paste any YouTube URL to fetch the transcript. Our AI (Llama 3 via Groq) automatically extracts exercises, sets, reps, and categories.
- **Voice Import**: Record yourself describing a workout. The app transcribes your voice and parses it into a structured plan instantly.

### 📋 Workout Management
- **Template Creator**: Build custom workouts from scratch with a smart exercise library.
- **Interactive Playing**: Follow your workouts with integrated timers, rest alerts, and set tracking.
- **Exercise Library**: Search through a comprehensive database of exercises with categorical tagging.

### 📊 Progress & Analytics
- **Visual Growth**: Track your consistency and volume over time with beautiful charts.
- **Personal Records**: Keep track of your heaviest lifts and best sessions.

### 🎨 Premium User Experience
- **Dynamic Themes**: Full support for Dark and Light modes.
- **Modern UI**: Smooth animations, glassmorphism elements, and a responsive layout for all screen sizes.

---

## 🛠 Tech Stack

### Mobile App (iOS & Android)
- **Framework**: React Native / Expo
- **Language**: TypeScript
- **State Management**: React Context API
- **Database/Auth**: Supabase
- **Styling**: Vanilla CSS / React Native StyleSheet
- **Animations**: Reanimated & Expo Linear Gradient

### Backend (AI & Transcription)
- **Runtime**: Node.js
- **Framework**: Express
- **AI Engine**: Groq SDK (Llama 3 & Whisper)
- **Deployment**: Configured for Render

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo Go app (for mobile testing)
- A Groq API Key

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

### 2. Mobile App Setup
1. Navigate to the mobile-app directory:
   ```bash
   cd mobile-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npx expo start --tunnel
   ```
4. Scan the QR code with your phone or run on an emulator.

> [!TIP]
> Use `--tunnel` if your mobile device is on a different network or cannot connect directly to your laptop's local IP.

---

## ☁️ Deployment

The backend is pre-configured for **Render** using the included `render.yaml` blueprint. Simply connect your repository to Render to launch the web service.

---
