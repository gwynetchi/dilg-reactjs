import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css"; // Ensure this file exists

const AuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    setIsVisible(true);
    onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          navigate(`/${userDoc.data().role.toLowerCase()}/dashboard`);
        }
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!successMessage && !error) return; // Prevent running on first load
  
    let loadingTimer: NodeJS.Timeout | null = null;
    let errorTimer: NodeJS.Timeout | null = null;
  
    loadingTimer = setTimeout(() => setLoading(false), 1000);
    
    if (error) {
      errorTimer = setTimeout(() => setError(""), 5000);
    }
  
    return () => {
      if (loadingTimer) clearTimeout(loadingTimer);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [successMessage, error]);
  
  
  const resetForm = () => {
    setEmail("");
    setPassword("");
    setRole("Admin"); // Default to "Admin" instead of empty
    setError("");
    setLoading(false);
    setSuccessMessage("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Store user details in Firestore (without saving password)
      await sendEmailVerification(user);
      console.log("Email verification sent");  
      setSuccessMessage("✉️ Verification email sent! Please verify your email.");  
      // Sign out user immediately to prevent auto-login
      await auth.signOut();
      setLoading(false);

      setTimeout(() => {
        setIsActive(false); // Switch to login form
        resetForm(); // Clear input fields
      }, 500);
  
    } catch (err) {
      console.error(err);
      setError("❌ Error creating account. Try again.");
      setLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Check if email is verified
      if (!user.emailVerified) {
        setError("❌ Please verify your email before logging in.");
        setLoading(false);
        await signOut(auth); // Sign out unverified users
        return;
      }
  
      // Fetch user role from Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
  
      let userRole = role; // Default to selected role if not found
  
      if (userDoc.exists()) {
        userRole = userDoc.data().role;
        console.log(`User role: ${userRole}`);
      } else {
        // If no role is found, assign a new one
        await setDoc(userRef, { email: user.email, role: userRole });
        console.log("User registered in Firestore.");
      }
  
      setSuccessMessage("✅ Logged in successfully!");
      setLoading(false);
  
      setTimeout(() => {
        resetForm();
        navigate(`/${userRole.toLowerCase()}/dashboard`);
      }, 1000);
    } catch (err: any) {
      console.error(err);
  
      // Handle different Firebase auth errors
      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "❌ No account found with this email.",
        "auth/wrong-password": "❌ Incorrect password.",
        "auth/invalid-email": "❌ Invalid email format.",
        "auth/too-many-requests": "⚠️ Too many failed attempts. Try again later.",
      };
  
      setError(errorMessages[err.code] || "❌ Error logging in. Please try again.");
      setLoading(false);
    }
  };
  
  
  return (
    <div className={styles.authWrapper}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`${styles.container} ${isActive ? styles.active : ""}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 10 }}
          >
            {/* Login Form */}
            <div className={`${styles.formBox} ${styles.login}`}>
              <form onSubmit={handleLogin}>
                <h1>Login</h1>
                {successMessage && <p className={styles.success}>{successMessage}</p>}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.inputBox}>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  <motion.button type="submit" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    Login
                  </motion.button>
                )}
              </form>
            </div>

            {/* Registration Form */}
            <div className={`${styles.formBox} ${styles.register}`}>
              <form onSubmit={handleSignUp}>
                <h1>Register</h1>
                {successMessage && <p className={styles.success}>{successMessage}</p>}
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.inputBox}>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU User</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Evaluator">Evaluator</option>
                  </select>
                </div>
                {loading ? <div className={styles.loadingSpinner}></div> : (
                  <motion.button type="submit" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    Register
                  </motion.button>
                )}
              </form>
            </div>

            {/* Toggle Box */}
            <div className={styles.toggleBox}>
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <h1>New Here?</h1>
                <p>Create an account and start your journey!</p>
                <motion.button
                  type="button"
                  className={`${styles.btn} ${styles.registerBtn}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsActive(true);
                    resetForm();
                  }}
                >
                  Register
                </motion.button>
              </div>

              <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
                <h1>Welcome Back!</h1>
                <p>Sign in to continue</p>
                <motion.button
                  type="button"
                  className={`${styles.btn} ${styles.loginBtn}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsActive(false);
                    resetForm();
                  }}
                >
                  Login
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthForm;