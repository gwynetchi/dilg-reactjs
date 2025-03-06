import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import styles from "../styles/components/NewAuthForm.module.css";

const NewAuthForm = () => {
  const [isActive, setIsActive] = useState(false); // Toggle between login & register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin"); // Default role
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Updated isActive:", isActive);
  }, [isActive]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), { email: user.email, role, password });

      console.log("Account Created Successfully");
      navigate("/"); // Redirect after signup
    } catch (err: any) {
      console.error(err);
      setError("Error creating account. Try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in successfully");
      navigate("/"); // Redirect to homepage
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password.");
    }
  };

  return (
    <div className={styles.authWrapper}>
      <div className={`${styles.container} ${isActive ? styles.active : ""}`}>
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
            <button type="submit" className={styles.btn}>Login</button>
            <p className={styles.text}>or login with social platforms</p>
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
            <button type="submit" className={styles.btn}>Register</button>
          </form>
        </div>

        {/* Toggle Box */}
        <div className={styles.toggleBox}>
          <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
            <h1>Welcome!</h1>
            <p>Don't have an account?</p>
            <button type="button" className={styles.btn} onClick={() => setIsActive(true)}>Register</button>
          </div>

          <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button type="button" className={styles.btn} onClick={() => setIsActive(false)}>Login</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAuthForm;
