
import { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import AuthForm from './components/AuthForm';
import LandingPage from "./components/LandingPage";
import NewAuthForm from "./components/NewAuthForm";

function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLandingVisible, setIsLandingVisible] = useState(true);

  const handleGetStarted = () => {
    setIsLandingVisible(false); // Hide landing page when clicking the button
    setShowAuth(true); //show AuthForm
  };

  return (
    <>
      {!showAuth ? (
        <LandingPage onGetStarted={handleGetStarted} isVisible={isLandingVisible} />
      ) : (
        <NewAuthForm />
      )}
    </>
  );
}


export default App;