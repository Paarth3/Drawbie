# Drawbie 🎨👕

> **Your Personal Digital Closet & Outfit Visualizer**

<div align="center"> <video src="Drawbie__Demo.mp4" width="100%" controls="true"></video>

  

<em>Watch the demo video above to see Drawbie in action.</em> </div>

---

## 📖 Project Overview

Drawbie is a mobile application designed to digitize your wardrobe, making outfit planning easier, more visual, and social. It solves the common problem of having a closet full of clothes but feeling like you have "nothing to wear" by allowing users to keep track of their clothing items/accessories and visualize new combinations without making a mess.

**Key Features:**

- **Digital Closet:** Upload photos of your clothing and organize them by category (Tops, Bottoms, Shoes, Accessories).
- **Outfit Canvas:** A drag-and-drop virtual canvas that allows users to test various combinations of their items to create the perfect look.
- **Outfit Preservation:** Save successful combinations to a personal collection for future reference.
- **Social Connectivity:** Follow friends to view their profiles. A robust privacy system ensures that only "public" items and outfits are visible to followers.
- **Daily Inspiration:** Receive daily style prompts on the home screen to spark creativity.

---

## 🚀 Key Learnings

Building Drawbie was a comprehensive exercise in Full Stack Mobile Development.

**Core Competencies Developed:**

- **Cross-Platform Mobile Architecture:** The app uses **React Native** ecosystem (via Expo), managing complex navigation flows between Stacks, Tabs, and Modals.
- **Backend-as-a-Service (BaaS) Integration:** Gained experience connecting a mobile frontend to **Google Firebase**. This involved handling Authentication, Real-time Databases (Firestore), and File Storage.
- **Asynchronous Data Handling:** Implemented robust patterns for fetching data, handling loading states, and managing real-time data streams using Firestore snapshots.
- **Gesture-Based UI:** Utilized `react-native-gesture-handler` and `react-native-reanimated` to create the interactive "Outfit Canvas," translating user touch input into fluid UI movements.
- **Network Debugging:** Solved complex connectivity issues involving local server emulation, IP binding, and mobile client communication within restricted network environments.

---

## 🛠 Technical Details

### Tech Stack

- **Frontend:** JavaScript, React Native, Expo.
- **Navigation:** React Navigation (Stack & Bottom Tabs).
- **Styling:** Custom Design System (`theme.js`), Expo Linear Gradient.
- **Backend:** Firebase Authentication, Cloud Firestore, Firebase Storage.
- **Development Tools:** VS Code, Firebase Local Emulators.

### Architecture & Design Decisions

**1. Hybrid Backend Setup (Production Auth + Local Data)** To maintain a cost-effective development environment suitable for a student project, Drawbie utilizes **Firebase Local Emulators** for Firestore and Storage. This allows for unlimited read/write testing without incurring cloud costs.

- _Note:_ The Authentication service remains connected to the production cloud to ensure secure and reliable user session management.    

**2. Component Modularity** The codebase is structured for scalability. Reusable UI components (like `OutfitPreviewCard` and custom `TabBars`) are separated from screen logic. Global constants (`COLORS`, `SIZES`, `FONTS`) are centralized in a theme file to ensure UI consistency across the app.

**3. Interactive "Canvas" Implementation** The core feature of the app, the Outfit Canvas, uses shared values and animated styles. This allows users to drag clothing items freely across the screen. The app calculates position data relative to the canvas to ensure a smooth user experience.

### App Structure (Key Screens)

- **Auth Stack:** Login, Sign Up, Email Verification.
- **Main Tab Navigator:**
    - **Home:** Daily prompts and dynamic greetings.
    - **Search:** Discover other people on Drawbie.
    - **Closet:** Grid view of all digitized items with management options.
    - **My Outfits:** Gallery of saved outfit collages.
        
- **Feature Stack:**
    - **AddItem:** Upload images directly from the phone's photo gallery.
    - **OutfitCanvas:** The workspace for styling.

---

## 🚧 Status & Roadmap

Drawbie is currently in the **beta testing phase**. It is not yet hosted on the App Store or Google Play Store, but plans for a public release are in motion.

**Future Improvements:**

- AI-powered background removal for uploaded clothing items.
- "Outfit of the Day" calendar integration.
- Migration from Local Emulators to Production Firebase for public release.

I am open to feedback, code reviews, and feature suggestions! Feel free to open an issue or reach out.
