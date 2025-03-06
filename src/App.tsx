import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import LandingPage from "./components/LandingPage";
import NewAuthForm from "./components/NewAuthForm";
import AdminDashboard from './pages/admin/dashboard'; // Import AdminDashboard
import EvaluatorDashboard from './pages/evaluator/dashboard'; // Import EvaluatorDashboard
import LGUuserDashboard from './pages/lgu/dashboard'; // Import LGUuserDashboard
import ViewerDashboard from './pages/viewer/dashboard'; // Import ViewerDashboard

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
        
        {/* Add Route for Admin Dashboard */}
        <Route path="/pages/admin/dashboard" element={<AdminDashboard />} /> 
        <Route path="/pages/evaluator/dashboard" element={<EvaluatorDashboard />} /> 
        <Route path="/pages/lgu/dashboard" element={<LGUuserDashboard />} /> 
        <Route path="/pages/viewer/dashboard" element={<ViewerDashboard />} /> 

        {/* You can add more routes for different dashboards based on the user role */}
      </Routes>
    </Router>
  );
};

export default App;
