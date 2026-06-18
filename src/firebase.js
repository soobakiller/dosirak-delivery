import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjmXvw1MCdC8zKfe1yq8avQV1qOliHHSQ",
  authDomain: "dosirak-delivery.firebaseapp.com",
  projectId: "dosirak-delivery",
  storageBucket: "dosirak-delivery.firebasestorage.app",
  messagingSenderId: "979930329604",
  appId: "1:979930329604:web:d11ab03558c23ee77b3b51",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);