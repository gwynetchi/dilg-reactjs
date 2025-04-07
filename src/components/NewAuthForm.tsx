import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css"; // Ensure this file exists

import TopNavbar from "../components/Nav/TopNavbar";


const AuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
    setRole("Select Role"); // Default to "Admin" instead of empty
    setError("");
    setLoading(false);
    setSuccessMessage("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    if (role === "Select Role" || role === "") {
      setError("❌ Please select a valid role.");
      setLoading(false);
      return;
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Store user details in Firestore (without saving password)
      await setDoc(doc(db, "users", user.uid), { email: user.email, role, password });
  
      console.log("Account Created Successfully");
  
      // Sign out user immediately to prevent auto-login
      await auth.signOut();
  
      // Show success message and switch back to login form
      setSuccessMessage("✅ Account Created Successfully! Please log in.");
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
      console.log("Logged in successfully");
  
      // Get user info from userCredential instead of auth.currentUser
      const user = userCredential.user;
  
      if (!user) {
        setError("❌ User authentication failed.");
        setLoading(false);
        return;
      }
  
      // Fetch user role from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        console.log(`User role: ${userRole}`);
  
        setSuccessMessage("✅ Logged in successfully!");
        setLoading(false); // Move this here before navigation

        setTimeout(() => {
          resetForm();
          setLoading(false); // Ensure this runs before navigating
          navigate(`/${userRole.toLowerCase()}/dashboard`);
        }, 1000);
      } else {
        setError("❌ User data not found.");
        await auth.signOut(); // Sign out if no role is found
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
  
      // More specific error handling
      if (err.code === "auth/user-not-found") {
        setError("❌ No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("❌ Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        setError("❌ Invalid email format.");
      } else {
        setError("❌ Error logging in. Please try again.");
      }
  
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
                    <option value="Select Role" disabled>Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU</option>
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