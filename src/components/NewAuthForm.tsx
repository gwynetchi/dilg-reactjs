import { useEffect, useState } from "react";
import styles from "../styles/components/NewAuthForm.module.css"; // Import the external CSS


const NewAuthForm = () => {
    const [isActive, setIsActive] = useState(false);
  
    useEffect(() => {
        console.log("Updated isActive:", isActive);
    }, [isActive]);
    
    return (
    < div className={styles.authWrapper}>
      <div className={`${styles.container} ${isActive ? styles.active : ""}`}>
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
            <button type="submit" className={styles.btn}>Login</button>
            <p className={styles.text}>or login with social platforms</p>
            <div className={styles.socialIcons}>
              <a href="#"><i className="bx bxl-google"></i></a>
              <a href="#"><i className="bx bxl-facebook"></i></a>
              <a href="#"><i className="bx bxl-github"></i></a>
              <a href="#"><i className="bx bxl-linkedin"></i></a>
            </div>
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
            <button type="submit" className={styles.btn}>Register</button>
            <p>or register with social platforms</p>
            <div className={styles.socialIcons}>
              <a href="#"><i className="bx bxl-google"></i></a>
              <a href="#"><i className="bx bxl-facebook"></i></a>
              <a href="#"><i className="bx bxl-github"></i></a>
              <a href="#"><i className="bx bxl-linkedin"></i></a>
            </div>
          </form>
        </div>
  
        {/* Toggle Box */}
        <div className={styles.toggleBox}>
          <div className={`${styles.togglePanel} ${styles.toggleLeft}`}>
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <button
                type="button" 
                className={`${styles.btn} ${styles.registerBtn}`} 
            onClick={(e) => {
                e.preventDefault();
                console.log("Register Clicked!");
                setIsActive(true);
                console.log("isActive:", isActive); // Debugging

            }}
            >
                Register
            </button>
          </div>
  
          <div className={`${styles.togglePanel} ${styles.toggleRight}`}>
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <button
                type="button"
                className={`${styles.btn} ${styles.loginBtn}`} 
                onClick={(e) => {
                    e.preventDefault();
                    setIsActive(false)
                }}
            >
                Login
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };
  
  export default NewAuthForm;