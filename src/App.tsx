import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import LandingPage from "./components/LandingPage";
import NewAuthForm from "./components/NewAuthForm";

const App: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isLandingVisible, setIsLandingVisible] = useState(true);

  const handleGetStarted = () => {
    setIsLandingVisible(false); // Hide landing page
    setShowAuth(true); // Show AuthForm
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<NewAuthForm />} />
        <Route path="/" element={
          !showAuth ? (
            <LandingPage onGetStarted={handleGetStarted} isVisible={isLandingVisible} />
          ) : (
            <NewAuthForm />
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
