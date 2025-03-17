import { useEffect, useState } from "react"; 
import React from "react";
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
  const [role, setRole] = useState("Admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // <-- Added loading state
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // <-- Start loading
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), { email: user.email, role, password });

      console.log("Account Created Successfully");
      navigate("/dashboard"); // Adjust the redirection as needed
    } catch (err) {
      console.error(err);
      setError("Error creating account. Try again.");
    } finally {
      setLoading(false); // <-- Stop loading
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // <-- Start loading
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully");

      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userRole = userDoc.data()?.role;

          switch (userRole) {
            case "Admin":
              navigate("../pages/admin/dashboard");
              break;
            case "LGU":
              navigate("../pages/lgu/dashboard");
              break;
            case "Viewer":
              navigate("../pages/viewer/dashboard");
              break;
            case "Evaluator":
              navigate("../pages/evaluator/dashboard");
              break;
            default:
              navigate("/");
          }
        } else {
          setError("Error: User data not found.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false); // <-- Stop loading
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
                <div className={styles.inputBox}>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className={styles.inputBox}>
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {loading ? <p>Loading...</p> : null}
                <motion.button
                  type="submit"
                  className={styles.btn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={loading} // Disable button while loading
                >
                  {loading ? "Logging in..." : "Login"}
                </motion.button>
              </form>
            </div>

            {/* Registration Form */}
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
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU User</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Evaluator">Evaluator</option>
                  </select>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                {loading ? <p>Loading...</p> : null}
                <motion.button
                  type="submit"
                  className={styles.btn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={loading} // Disable button while loading
                >
                  {loading ? "Registering..." : "Register"}
                </motion.button>
              </form>
            </div>

            {/* Toggle Box */}
            <div className={styles.toggleBox}>
              <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                <h1>Welcome!</h1>
                <p>Don't have an account?</p>
                <motion.button
                  type="button"
                  className={`${styles.btn} ${styles.registerBtn}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsActive(true)}
                  disabled={loading}
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
                  onClick={() => setIsActive(false)}
                  disabled={loading}
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
