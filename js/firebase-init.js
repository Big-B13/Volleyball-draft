// Initialize Firebase using the modular v10+ SDK from Google's CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, onValue, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
} catch (e) {
  console.error("Firebase init failed:", e);
  alert("Firebase failed to initialize. Have you edited js/firebase-config.js with your project's config?");
}

export { db, ref, set, get, update, onValue, runTransaction, serverTimestamp };
