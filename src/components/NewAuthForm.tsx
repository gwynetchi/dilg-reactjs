import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getDoc, doc, getDocs, collection, query, where } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css";
// Adding icons for enhanced UI
import { FaEye, FaEyeSlash, FaHome, FaExclamationCircle, FaCheck } from "react-icons/fa";
import { getFirebaseErrorMessage } from "../utils/firebaseErrors";
const AuthForm = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!successMessage && !error && !resetEmailSent) return;

    let loadingTimer: NodeJS.Timeout | null = null;
    let errorTimer: NodeJS.Timeout | null = null;
    let resetEmailTimer: NodeJS.Timeout | null = null;

    loadingTimer = setTimeout(() => setLoading(false), 1000);

    if (error) {
      errorTimer = setTimeout(() => setError(""), 5000);
    }
    
    if (resetEmailSent) {
      resetEmailTimer = setTimeout(() => setResetEmailSent(false), 5000);
    }

    return () => {
      if (loadingTimer) clearTimeout(loadingTimer);
      if (errorTimer) clearTimeout(errorTimer);
      if (resetEmailTimer) clearTimeout(resetEmailTimer);
    };
  }, [successMessage, error, resetEmailSent]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
    setLoading(false);
    setSuccessMessage("");
    setResetEmailSent(false);
  };
  
  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    
    setResetLoading(true);
    setError("");
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setResetLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseErrorMessage(err.code || err.message));
      setResetLoading(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setResetEmailSent(false);
  
    try {
      const q = query(collection(db, "deleted_users"), where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
        setError("This email belongs to a deleted account. Please contact an administrator.");
        setLoading(false);
        return;
      }
  
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      if (!user) {
        setError("User authentication failed.");
        setLoading(false);
        return;
      }
  
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        console.log(`User role: ${userRole}`);
  
        setSuccessMessage("Logged in successfully!");
        setLoading(false);
  
        setTimeout(() => {
          resetForm();
          navigate(`/${userRole.toLowerCase()}/dashboard`);
        }, 1000);
      } else {
        setError("User data not found.");
        await auth.signOut();
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseErrorMessage(err.code || err.message));
      setLoading(false);
    }
  };
  return (
    <div className={styles.authWrapper}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={styles.container}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 10 }}
          >
            {/* Login Form */}
            <div className={`${styles.formBox} ${styles.login}`}>
              <form onSubmit={handleLogin}>
                <h1>Login</h1>
                
                {/* Enhanced Success Message */}
                {successMessage && (
                  <div className={styles.messageContainer}>
                    <div className={styles.successMessage}>
                      <FaCheck className={styles.messageIcon} />
                      <p>{successMessage}</p>
                    </div>
                  </div>
                )}
                
                {/* Enhanced Error Message */}
                {error && (
                  <div className={styles.messageContainer}>
                    <div className={styles.errorMessage}>
                      <FaExclamationCircle className={styles.messageIcon} />
                      <p>{error}</p>
                    </div>
                  </div>
                )}
                
                {/* Reset Password Success Message */}
                {resetEmailSent && (
                  <div className={styles.messageContainer}>
                    <div className={styles.successMessage}>
                      <FaCheck className={styles.messageIcon} />
                      <p>Password reset email sent! Check your inbox.</p>
                    </div>
                  </div>
                )}
                
                <div className={styles.inputBox}>
                  <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className={styles.inputBox}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                  <button 
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                
                <div className={styles.forgotPasswordContainer}>
                  <button 
                    type="button" 
                    className={styles.forgotPassword}
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Sending..." : "Forgot Password?"}
                  </button>
                </div>
                
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  <motion.button 
                    type="submit" 
                    className={styles.btn} 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                  >
                    Login
                  </motion.button>
                )}
              </form>
            </div>

            {/* Logo and Description Panel */}
            <div className={styles.toggleBox}>
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <div className={styles.logoContainer}>
                  <div className={styles.logo}>
                    <img 
                      src="/images/logo.png" 
                      alt="DILG - RMS Logo" 
                      className={styles.logoImage}
                    />
                  </div>
                  <h1>DILG - RMS</h1>
                  <p>Records Management System</p>
                  <motion.button 
                    className={styles.backLink}
                    onClick={() => navigate("/")}
                    whileHover={{ scale: 1.05, backgroundColor: "#ffce1b" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FaHome className={styles.homeIcon} /> Back to Home
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthForm;