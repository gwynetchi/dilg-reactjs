import { useState } from "react";
import { Form, Button, Container, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/components/AuthForm.module.css"; 

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", confirmPassword: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    alert(isLogin ? "Logged in successfully!" : "Account created!");
  };

  return (
    <Container fluid className={styles.authContainer}>
      <Row className="vh-100">
        {/* Left Side - Logo Image */}
        <Col md={6} className={styles.leftSide}>
          <img src="https://scontent.fmnl17-5.fna.fbcdn.net/v/t39.30808-6/472311036_921960780118585_2294339441687169412_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeE8hNmddmL4ITzhKz9HNTrdyLcNbA-F9cDItw1sD4X1wBDTjdzQ3RnA8WKxv2oKe5sKS6l8oaFBrNDoh_kXSTV5&_nc_ohc=mEePo8E5BggQ7kNvgGRIOJl&_nc_oc=AdhAxVojQkc2QLG6TY2dFov0sj03UrOiuKDcIgNu-zeFM8rINlcXmIukunG1kn1KTnM&_nc_zt=23&_nc_ht=scontent.fmnl17-5.fna&_nc_gid=ABy-2bPdR6-gOosAYac8GQ3&oh=00_AYBz4F-hlIAfZGxJ12eBnwvp5DgxTl_QBY2dW0RxTwFqoA&oe=67CC66C1" alt="DILG Cavite Logo" className={styles.logoImage} />
        </Col>

        {/* Right Side - Login / Sign Up Form */}
        <Col md={6} className={styles.rightSide}>
          <AnimatePresence mode="wait">
          <motion.div
              key={isLogin ? "login" : "signup"} // Unique key triggers animation change
              initial={{ opacity: 0, y: 50 }} // Start hidden below
              animate={{ opacity: 1, y: 0 }} // Slide in and fade in
              exit={{ opacity: 0, y: -50 }} // Slide up and fade out when changing
              transition={{ duration: 0.5 }}
              className={styles.loginBox}
            >
              <h2 className="text-white text-center mb-4">{isLogin ? "LOGIN" : "SIGN UP"}</h2>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Email:</Form.Label>
                  <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="text-white">Password:</Form.Label>
                  <Form.Control type="password" name="password" value={formData.password} onChange={handleChange} required />
                </Form.Group>

                {!isLogin && (
                  <Form.Group className="mb-3">
                    <Form.Label className="text-white">Confirm Password:</Form.Label>
                    <Form.Control type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                  </Form.Group>
                )}

                {isLogin && (
                  <div className="text-end">
                    <a href="#" className={styles.forgotPassword}>Forgot Password?</a>
                  </div>
                )}

                <Button variant="warning" type="submit" className="w-100 mt-3">
                  {isLogin ? "Login" : "Sign Up"}
                </Button>
              </Form>

              <div className="text-center mt-3">
                <small className="text-white">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <span className={styles.toggleLink} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? " Sign Up" : " Login"}
                  </span>
                </small>
              </div>
            </motion.div>
            
          </AnimatePresence>
        </Col>
      </Row>
    </Container>
    
  );
}
