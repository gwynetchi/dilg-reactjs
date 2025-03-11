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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const clearFields = () => {
    setEmail("");
    setPassword("");
    setRole("");
  };

  // 🔹 Unified Error Handler
  const handleAuthError = (err: any) => {
    console.error("Auth Error:", err);
    switch (err.code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please log in instead.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/invalid-email":
        return "Invalid email format. Please enter a valid email.";
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Invalid email or password. Please try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return err.message || "An error occurred. Please try again.";
    }
  };

  // 🔹 SIGN UP HANDLER
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.endsWith("@gmail.com")) {
      setError("Only Gmail accounts (@gmail.com) are allowed.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), { email: user.email, role });

      setMessage("🎉 Account Created Successfully! Redirecting...");
      clearFields();
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setError(handleAuthError(err));
    }
  };

  // 🔹 LOGIN HANDLER
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
  
      if (userDoc.exists()) {
        const userRole = userDoc.data()?.role;
        setMessage("✅ Login successful! Redirecting...");
  
        setTimeout(() => {
          switch (userRole) {
            case "Admin":
              navigate("/pages/admin/dashboard");
              break;
            case "LGU":
              navigate("/pages/lgu/dashboard");
              break;
            case "Viewer":
              navigate("/pages/viewer/dashboard");
              break;
            case "Evaluator":
              navigate("/pages/evaluator/dashboard");
              break;
            default:
              navigate("/");
          }
        }, 2000);
      } else {
        setError("⚠️ User data not found. Please contact support.");
      }
  
      clearFields();
    } catch (err: any) {
      console.error("Login Error:", err);
  
      switch (err.code) {
        case "auth/user-not-found":
          setError("⚠️ No account found with this email. Please check and try again.");
          break;
        case "auth/wrong-password":
          setError("⚠️ Incorrect password. Please try again.");
          break;
        case "auth/invalid-credential":
          setError("⚠️ Invalid email or password. Please check your credentials.");
          break;
        case "auth/too-many-requests":
          setError("⏳ Too many failed attempts. Please try again later.");
          break;
        case "auth/network-request-failed":
          setError("🌐 Network error. Check your internet connection.");
          break;
        default:
          setError(err.message || "⚠️ Login failed. Try again.");
      }
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
            {/* 🔹 LOGIN FORM */}
            <div className={`${styles.formBox} ${styles.login}`}>
              <form onSubmit={handleLogin}>
                <h1>Login</h1>
                <div className={styles.inputBox}>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {message && <p className={styles.success}>{message}</p>}
                <motion.button type="submit" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  Login
                </motion.button>
              </form>
            </div>

            {/* 🔹 REGISTRATION FORM */}
            <div className={`${styles.formBox} ${styles.register}`}>
              <form onSubmit={handleSignUp}>
                <h1>Registration</h1>
                <div className={styles.inputBox}>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <select value={role} onChange={(e) => setRole(e.target.value)} required>
                    <option value="" disabled>Select Role</option>
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU User</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Evaluator">Evaluator</option>
                  </select>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {message && <p className={styles.success}>{message}</p>}
                <motion.button type="submit" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  Register
                </motion.button>
              </form>
            </div>

            {/* 🔹 TOGGLE BOX */}
            <div className={styles.toggleBox}>
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <h1>Welcome!</h1>
                <p>Don't have an account?</p>
                <motion.button type="button" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsActive(true)}>
                  Register
                </motion.button>
              </div>

              <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
                <h1>Welcome Back!</h1>
                <p>Already have an account?</p>
                <motion.button type="button" className={styles.btn} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsActive(false)}>
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
