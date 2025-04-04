import styled from "styled-components";

interface BlogBoxProps {
  tag: string;
  title: string;
  text: string;
  action?: () => void;
  author: string;
}

export default function BlogBox({ tag, title, text, action, author }: BlogBoxProps) {
  return (
    <WrapperBtn className="animate pointer" onClick={action ? () => action() : undefined}>
      <Wrapper className="whiteBg radius8 shadow">
        <h3 className="font20 extraBold">{title}</h3>
        {/* <p className="font13" style={{ padding: "30px 0" }}>
          {text}
        </p> */}
        <p className="font13 extraBold">{author}</p>
        <div className="flex">
          <p className="tag coralBg radius6 font11 extraBold">{tag}</p>
        </div>
      </Wrapper>
    </WrapperBtn>
  );
}

const Wrapper = styled.div`
  width: 100%;
  text-align: left;
  padding: 20px 30px;
  margin-top: 30px;
  
  transition: background-image 0.3s ease; /* Smooth transition */
  &:hover {
    background-size: cover; /* Ensures image covers the wrapper */
    // background-image: url('/public/pd.png');
  }
`;
const WrapperBtn = styled.button`
  border: 0px;
  outline: none;
  background-color: transparent;
  &:hover {
    opacity: 0.5;
  }
`;
