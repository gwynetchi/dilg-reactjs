import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; // Import for redirection
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDoc } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css"; // Ensure this file exists

const AuthForm = () => {
  const navigate = useNavigate(); // React Router navigation
  const [isActive, setIsActive] = useState(false); // Tracks whether to show login or register form
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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
    setRole("Admin"); // Default role
    setError("");
    setSuccessMessage("");
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store user details in Firestore, including the role
      await setDoc(doc(db, "users", user.uid), { email: user.email, role });

      console.log("✅ Account Created Successfully!");

      // Automatically log in the user after registration
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in successfully!");

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        console.log("User Role:", userRole);

        // Redirect based on role
        if (userRole === "Admin") {
          navigate("/admin/dashboard");
        } else if (userRole === "Evaluator") {
          navigate("/evaluator/dashboard");
        } else if (userRole === "LGU") {
          navigate("/lgu/dashboard");
        } else if (userRole === "Viewer") {
          navigate("/viewer/dashboard");
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("❌ Error creating account. Try again.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in successfully!");

      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userRole = userDoc.data().role;
          console.log("User Role:", userRole);

          // Redirect based on role
          if (userRole === "Admin") {
            navigate("/admin/dashboard");
          } else if (userRole === "Evaluator") {
            navigate("/evaluator/dashboard");
          } else if (userRole === "LGU") {
            navigate("/lgu/dashboard");
          } else if (userRole === "Viewer") {
            navigate("/viewer/dashboard");
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("❌ Invalid email or password.");
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
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
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

            {/* Registration Form */}
            <div className={`${styles.formBox} ${styles.register}`}>
              <form onSubmit={handleSignUp}>
                <h1>Register</h1>
                {successMessage && <p className={styles.success}>{successMessage}</p>}
                {error && <p className={styles.error}>{error}</p>}
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
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="Admin">Admin</option>
                    <option value="LGU">LGU User</option>
                    <option value="Viewer">Viewer</option>
                    <option value="Evaluator">Evaluator</option>
                  </select>
                </div>
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
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
                    setIsActive(true); // Show the Register form
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
                    setIsActive(false); // Show the Login form
                    resetForm();
                    setSuccessMessage(""); // Ensure success message is cleared
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
