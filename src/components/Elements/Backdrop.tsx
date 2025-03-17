import React from "react";
import styled from "styled-components";

interface BackdropProps {
  toggleSidebar: (value: boolean) => void;
}

const Backdrop: React.FC<BackdropProps> = ({ toggleSidebar }) => {
  return <Wrapper className="darkBg" onClick={() => toggleSidebar(false)} />;
};

export default Backdrop;

const Wrapper = styled.div`
  width: 100%;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99;
  opacity: 0.8;
`;
