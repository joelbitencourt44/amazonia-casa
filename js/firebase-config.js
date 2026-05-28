// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyC9qw7X5k4WzcFNV9vLemL623RJL6-BAYA",
  authDomain: "ia-em-casa-754b3.firebaseapp.com",
  projectId: "ia-em-casa-754b3",
  storageBucket: "ia-em-casa-754b3.firebasestorage.app",
  messagingSenderId: "122299997881",
  appId: "1:122299997881:web:bffd92992f16e917688568",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar serviços
const db = firebase.firestore();
const auth = firebase.auth();

console.log("🔥 Firebase conectado!");
