import { motion, AnimatePresence } from "framer-motion";
import { Container } from "react-bootstrap";
import styles from "../styles/components/LandingPage.module.css";

interface LandingPageProps {
  onGetStarted: () => void;
  isVisible: boolean; // Add visibility control
}

export default function LandingPage({ onGetStarted, isVisible }: LandingPageProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`landing-page d-flex align-items-flex-start justify-content-flex-start text-white ${styles.landingPage}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.5 }}
        >
          <Container>
            <h1 className={`display-3 fw-bold ${styles.bloodyText}`}>Welcome to DILG</h1>
            <p className="lead">BE HAPPY 'COZ WE WANT YOU HAPPY</p>
            <motion.button
              className={styles.loginButton}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 1.1 }}
              onClick={onGetStarted}
            >
              Login
            </motion.button>
          </Container>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
