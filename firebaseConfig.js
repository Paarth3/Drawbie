// File: firebaseConfig.js
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
	getAuth,
	getReactNativePersistence,
	initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

// --- SETUP: YOUR LOCAL IP ---
const LOCAL_IP = "172.20.10.2"; // <--- CHANGE THIS

const firebaseConfig = {
	apiKey: "AIzaSyDGKj2XbLbIh4jcxtrisACF_XnrmzhBSxI",
	authDomain: "drawbieapp.firebaseapp.com",
	databaseURL: "https://drawbieapp-default-rtdb.firebaseio.com",
	projectId: "drawbieapp",
	storageBucket: "drawbieapp.firebasestorage.app",
	messagingSenderId: "790969284636",
	appId: "1:790969284636:web:1cbb17dd810e9e7b0547d9",
	measurementId: "G-W83BEXWXB1",
};

// --- ROBUST INITIALIZATION ---
let app;
let auth;

if (getApps().length === 0) {
	app = initializeApp(firebaseConfig);
} else {
	app = getApp();
}

try {
	// Try to retrieve existing auth
	auth = getAuth(app);
} catch (e) {
	// If race condition occurs, re-initialize
	console.log("Auth lost... Re-initializing.");
	auth = initializeAuth(app, {
		persistence: getReactNativePersistence(ReactNativeAsyncStorage),
	});
}

const db = getFirestore(app);
const storage = getStorage(app);

// --- CONNECT EMULATORS (DEV ONLY) ---
if (__DEV__) {
	// Global flag prevents double-connection crash
	if (!global.emulatorsConnected) {
		try {
			connectStorageEmulator(storage, LOCAL_IP, 9199);
			console.log(`Storage Emulator Connected: ${LOCAL_IP}`);
			global.emulatorsConnected = true;
		} catch (e) {
			// Ignore if already connected
		}
	}
}

export { auth, db, storage };
