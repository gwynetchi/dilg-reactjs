import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css";


const NewAuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [full_name, setfullName] = useState("");
  const [locality, setLocality] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [networkReady, setNetworkReady] = useState(false); // New state to track network readiness
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true); // Trigger animation on mount

    // Simulate network loading delay (replace with real network checks)
    setTimeout(() => {
      setNetworkReady(true);
    }, 3000); // Simulate 3 seconds delay for network readiness
  }, []);

  const clearFields = () => {
    setEmail("");
    setPassword("");
    setRole("");
    setfullName("");
    setLocality("");
    setConfirmPassword("");
  };


  /** ✅ Handles User Registration */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (!email.endsWith("@gmail.com")) {
      setError("⚠️ Only Gmail accounts (@gmail.com) are allowed.");
      setIsLoading(false);
      return;
    }

    if (!role) {
      setError("⚠️ Please select a role.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("⚠️ Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), { email: user.email, full_name, locality, role, password });

      setMessage("🎉 Account Created Successfully! Redirecting...");
      clearFields();
      setTimeout(() => {
        setIsActive(false);
        setError(""); // ✅ Clear errors
        setMessage(""); // ✅ Clear messages
        setIsLoading(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "⚠️ Error creating account. Try again.");
      setIsLoading(false);
    }
  };

  /** ✅ Handles User Login */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (!email || !password) {
      setError("⚠️ Email and password are required.");
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef).catch(() => getDoc(userRef));

      if (userDoc.exists()) {
        const userRole = userDoc.data()?.role;
        setMessage("✅ Login successful! Redirecting...");
        setTimeout(() => navigate(`/pages/${userRole.toLowerCase()}/dashboard`), 200);
      } else {
        setError("⚠️ User data not found. Please contact support.");
        setIsLoading(false);
      }
      clearFields();
      setIsLoading(false);
    } catch (err: any) {
      console.error("Login Error:", err);
      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "⚠️ No account found with this email. Please check and try again.",
        "auth/wrong-password": "⚠️ Incorrect password. Please try again.",
        "auth/invalid-credential": "⚠️ Invalid email or password. Double-check your credentials.",
        "auth/too-many-requests": "⏳ Too many failed attempts. Please try again later.",
        "auth/network-request-failed": "🌐 Network error. Check your internet connection.",
      };

      setError(errorMessages[err.code] || "⚠️ Login failed. Try again.");
      setIsLoading(false);
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
            {/* Show Loading Animation if Network is not Ready */}
            {!networkReady ? (
              <motion.div
                className={styles.loadingContainer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
              >
                <div className={styles.spinner}></div>
                <p>Loading Network...</p>
              </motion.div>
            ) : (
              // ✅ After network is ready, display the form or dashboard
              <>
                {/* ✅ Login Form */}
                <div className={`${styles.formBox} ${styles.login}`}>
                  <form onSubmit={handleLogin}>
                    <h1>Login</h1>
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
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {message && <p className={styles.success}>{message}</p>}

                    {isLoading ? (
                      <motion.button
                        className={styles.btn}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled
                      >
                        Loading...
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        className={styles.btn}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        Login
                      </motion.button>
                    )}
                  </form>
                </div>

                {/* ✅ Registration Form */}
                <div className={`${styles.formBox} ${styles.register}`}>
                  <form onSubmit={handleSignUp}>
                    <h1>Registration</h1>
                    <div className={styles.inputBox}>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={full_name}
                        onChange={(e) => setfullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.inputBox}>
                      <input
                        type="text"
                        placeholder="Locality"
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        required
                      />
                    </div>
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
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.inputBox}>
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.inputBox}>
                      <select value={role} onChange={(e) => setRole(e.target.value)} required>
                        <option value="" disabled>
                          Select Role
                        </option>
                        <option value="Admin">Admin</option>
                        <option value="LGU">LGU User</option>
                        <option value="Viewer">Viewer</option>
                        <option value="Evaluator">Evaluator</option>
                      </select>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}
                    {message && <p className={styles.success}>{message}</p>}

                    {isLoading ? (
                      <motion.button
                        className={styles.btn}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled
                      >
                        Loading...
                      </motion.button>
                    ) : (
                      <motion.button
                        type="submit"
                        className={styles.btn}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        Register
                      </motion.button>
                    )}
                  </form>
                </div>
              </>
            )}

            {/* ✅ Toggle Box */}
            <div className={styles.toggleBox}>
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <h1>Welcome!</h1>
                <p>Don't have an account?</p>
                <motion.button
                  type="button"
                  className={`${styles.btn} ${styles.registerBtn}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsActive(true);
                    setError(""); // ✅ Clear errors when switching
                    setMessage(""); // ✅ Clear messages when switching
                  }}
                >
                  Register
                </motion.button>
              </div>

              <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
                <h1>Welcome Back!</h1>
                <p>Already have an account?</p>
                <motion.button
                  type="button"
                  className={`${styles.btn} ${styles.loginBtn}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setIsActive(false);
                    setError(""); // ✅ Clear errors when switching
                    setMessage(""); // ✅ Clear messages when switching
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

export default NewAuthForm;
