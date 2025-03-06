import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/components/NewAuthForm.module.css"; // Import the external CSS

const NewAuthForm = () => {
    const [isActive, setIsActive] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true); // Trigger animation when component mounts
    }, []);

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
                            <form action="#">
                                <h1>Login</h1>
                                <div className={styles.inputBox}>
                                    <input type="text" placeholder="Username" required />
                                    <i className="bx bxs-user"></i>
                                </div>
                                <div className={styles.inputBox}>
                                    <input type="password" placeholder="Password" required />
                                    <i className="bx bxs-lock-alt"></i>
                                </div>
                                <div className={styles.forgotLink}>
                                    <a href="#">Forgot Password?</a>
                                </div>
                                <motion.button
                                    type="submit"
                                    className={styles.btn}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 150 }}
                                >
                                    Login
                                </motion.button>
                            </form>
                        </div>

                        {/* Registration Form */}
                        <div className={`${styles.formBox} ${styles.register}`}>
                            <form action="#">
                                <h1 className={styles.title}>Registration</h1>
                                <div className={styles.inputBox}>
                                    <input type="text" placeholder="Username" required />
                                    <i className="bx bxs-user"></i>
                                </div>
                                <div className={styles.inputBox}>
                                    <input type="email" placeholder="Email" required />
                                    <i className="bx bxs-envelope"></i>
                                </div>
                                <div className={styles.inputBox}>
                                    <input type="password" placeholder="Password" required />
                                    <i className="bx bxs-lock-alt"></i>
                                </div>
                                <motion.button
                                    type="submit"
                                    className={styles.btn}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 150 }}
                                >
                                    Register
                                </motion.button>
                            </form>
                        </div>

                        {/* Toggle Box */}
                        <div className={styles.toggleBox}>
                            <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
                                <h1>Hello, Welcome!</h1>
                                <p>Don't have an account?</p>
                                <motion.button
                                    type="button"
                                    className={`${styles.btn} ${styles.registerBtn}`}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsActive(true);
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
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsActive(false);
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
