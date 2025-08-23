<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBVLS7bARnU_mH3KlueEeFjDSywN3FCESY",
    authDomain: "financeapp-6da16.firebaseapp.com",
    projectId: "financeapp-6da16",
    storageBucket: "financeapp-6da16.firebasestorage.app",
    messagingSenderId: "342917624338",
    appId: "1:342917624338:web:b9977ec338b63f4d50decb",
    measurementId: "G-KRNK2W5VPX"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>