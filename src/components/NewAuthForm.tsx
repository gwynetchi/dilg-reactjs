import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, getDocs, getDoc, collection, query, where } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css"; // Make sure the CSS exists
import { softDelete, checkIfDeletedUser } from "../pages/modules/inbox-modules/softDelete";

const AuthForm = () => {
  const [isActive, setIsActive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Select Role");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (!successMessage && !error) return;

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
    setRole("Select Role");
    setError("");
    setLoading(false);
    setSuccessMessage("");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    if (role === "Select Role" || role.trim() === "") {
      setError("❌ Please select a valid role.");
      setLoading(false);
      return;
    }

    try {
      const isDeleted = await checkIfDeletedUser(email.toLowerCase());
      if (isDeleted) {
        setError("❌ This email belongs to a deleted account. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const userSnapshot = await getDocs(q);

      if (!userSnapshot.empty) {
        const existingUserDoc = userSnapshot.docs[0];
        const existingUserData = { ...existingUserDoc.data(), id: existingUserDoc.id };

        await softDelete(existingUserData, "users", "deleted_users", "");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: email.toLowerCase(),
        role,
        password,
        createdAt: new Date(),
      });

      console.log("✅ Account Created Successfully");

      await auth.signOut();

      setSuccessMessage("✅ Account Created Successfully! Please log in.");
      setLoading(false);

      setTimeout(() => {
        setIsActive(false);
        resetForm();
      }, 500);

    } catch (err: any) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setError("❌ This email is already in use. Please log in or use a different email.");
      } else if (err.code === "auth/invalid-email") {
        setError("❌ Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("❌ Password should be at least 6 characters.");
      } else {
        setError("❌ Error creating account. Please try again.");
      }

      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const q = query(collection(db, "deleted_users"), where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("❌ This email belongs to a deleted account. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        setError("❌ User authentication failed.");
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        console.log(`User role: ${userRole}`);

        setSuccessMessage("✅ Logged in successfully!");
        setLoading(false);

        setTimeout(() => {
          resetForm();
          navigate(`/${userRole.toLowerCase()}/dashboard`);
        }, 1000);
      } else {
        setError("❌ User data not found.");
        await auth.signOut();
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);

      if (err.code === "auth/user-not-found") {
        setError("❌ No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("❌ Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        setError("❌ Invalid email format.");
      } else if (err.code === "auth/invalid-credential") {
        setError("❌ Invalid credentials. Please check your email and password.");
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
                {loading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
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
                <button className={styles.backLink} onClick={() => navigate("/")}>
                  ← Back to Home
                </button>
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
                <button className={styles.backLink} onClick={() => navigate("/")}>
                  ← Back to Home
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuthForm;
