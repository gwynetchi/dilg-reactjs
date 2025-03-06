import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore"; // Import getDoc
import styles from "../styles/components/NewAuthForm.module.css";

const NewAuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Define the logged-in state
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true); // Trigger animation when component mounts
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), { email: user.email, role, password });

      console.log("Account Created Successfully");
      setIsLoggedIn(true); // Mark user as logged in
    } catch (err) {
      console.error(err);
      setError("Error creating account. Try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully");

      // Fetch user data from Firestore based on the user's UID
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef); // Use getDoc to fetch the user data

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData?.role;

          // Redirect based on the user's role
          if (userRole === "Admin") {
            navigate("../pages/admin/dashboard"); // Redirect to admin dashboard
          } else if (userRole === "LGU") {
            navigate("../pages/lgu/dashboard"); // Redirect to LGU user dashboard
          } else if (userRole === "Viewer") {
            navigate("../pages/viewer/dashboard"); // Redirect to viewer dashboard
          } else if (userRole === "Evaluator") {
            navigate("../pages/evaluator/dashboard"); // Redirect to evaluator dashboard
          } else {
            navigate("/"); // Default redirection if no role matches
          }
        } else {
          setError("Error: User data not found.");
        }
      }

      setIsLoggedIn(true); // Mark user as logged in
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password.");
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
                <motion.button
                  type="submit"
                  className={styles.btn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  Login
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
                  </select>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <motion.button
                  type="submit"
                  className={styles.btn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  Register
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
