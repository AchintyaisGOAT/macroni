import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Public, client-side Firebase config - protected by the project's authorized-domains
// list and enabled sign-in providers, not by secrecy (same pattern as PROXY_URL /
// APP_SHARED_TOKEN in backend/app/config.py being hardcoded rather than treated as secret).
const firebaseConfig = {
  apiKey: "AIzaSyDYkUg4birdwsDcjd4F9WyWbQuRf-pdF-4",
  authDomain: "macroni-app-96285.firebaseapp.com",
  projectId: "macroni-app-96285",
  storageBucket: "macroni-app-96285.firebasestorage.app",
  messagingSenderId: "205601099171",
  appId: "1:205601099171:web:c4112d75b9763c60ef5e16",
  measurementId: "G-BH1QRNZ6GQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
