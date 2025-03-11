import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import LandingPage from "./components/LandingPage";
import NewAuthForm from "./components/NewAuthForm";
import AdminDashboard from "./pages/admin/dashboard";
import EvaluatorDashboard from "./pages/evaluator/dashboard";
import LGUuserDashboard from "./pages/lgu/dashboard";
import ViewerDashboard from "./pages/viewer/dashboard";

const App: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [isLandingVisible, setIsLandingVisible] = useState(true);

  const handleGetStarted = () => {
    setIsLandingVisible(false);
    setShowAuth(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<NewAuthForm />} />
        <Route
          path="/"
          element={
            showAuth ? (
              <NewAuthForm />
            ) : (
              <LandingPage onGetStarted={handleGetStarted} isVisible={isLandingVisible} />
            )
          }
        />
        {/* Dashboard Routes */}
        <Route path="/pages/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/pages/evaluator/dashboard" element={<EvaluatorDashboard />} />
        <Route path="/pages/lgu/dashboard" element={<LGUuserDashboard />} />
        <Route path="/pages/viewer/dashboard" element={<ViewerDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
