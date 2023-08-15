// a similar firebase.js file is required to run the project locally.
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "ashinsabu-258b6.firebaseapp.com",
  projectId: "ashinsabu-258b6",
  storageBucket: "ashinsabu-258b6.appspot.com",
  messagingSenderId: "1018813183957",
  appId: "1:1018813183957:web:5ff6a650c6e8b2f1ccef5c",
  measurementId: "G-RPG6HC6J9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export { app, analytics }