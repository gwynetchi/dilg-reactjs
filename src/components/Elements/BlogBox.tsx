import styled from "styled-components";


interface BlogBoxProps {
  tag: string;
  title: string;
  text: string;
  author: string;
  backgroundImage?: string;
  onClick: () => void; 
  
}

export default function BlogBox({ tag, title, author, backgroundImage, onClick }: BlogBoxProps) {
  
  return (
    <WrapperBtn className="animate pointer" onClick={onClick}>
      <Wrapper className="whiteBg radius8 shadow" backgroundImage={backgroundImage} >
        <h3 className="font15 extraBold">{title}</h3>
        {/* <p className="font13" style={{ padding: "30px 0" }}>
          {text}
        </p> */}
        <p className="font11 extraBold">{author}</p>
        <div className="flex">
          <p className="tag coralBg radius6 font13 extraBold">{tag}</p>
        </div>
      </Wrapper>
    </WrapperBtn>


  );
}

const Wrapper = styled.div<{ backgroundImage?: string}>`
  width: 100%;
  text-align: left;
  padding: 20px 30px;
  margin-top: 30px;
  background-size: cover;
  transition: all 0.3s ease;
  position: relative;

  // height: 100px; /* Initial height for the wrapper */
  transition: background-image 0.3s ease; /* Smooth transition */

  
  
  &:hover {
    background-image: ${({ backgroundImage }) => `url(${backgroundImage})`}; // Apply background image
    height: calc(30vw / 2); /* Dynamically change height based on image's aspect ratio */

  }

  &:hover p,
  &:hover h3 {
    opacity: 0;
    transition: opacity 0.6s ease;
  }
`;
const WrapperBtn = styled.button`
  border: 0px;
  outline: none;
  background-color: transparent;
  &:hover {
    //opacity: 0.5;
  }
`;

