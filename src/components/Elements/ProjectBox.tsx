import styled from "styled-components";

interface ProjectBoxProps {
  img: string;
  title: string;
  text: string;
  action?: () => void;
}

export default function ProjectBox({ img, title, text, action }: ProjectBoxProps) {
  return (
    <Wrapper>
      <ImgBtn className="animate pointer" onClick={action ? () => action() : undefined}>
        <img className="radius8" src={img} alt="project"></img>
      </ImgBtn>
      <h3 className="font20 extraBold">{title}</h3>
      <p className="font13">{text}</p>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  margin-top: 30px;
  img {
    width: 100%;
    height: auto;
    margin: 20px 0;
  }
  h3 {
    padding-bottom: 10px;
  }
`;
const ImgBtn = styled.button`
  background-color: transparent;
  border: 0px;
  outline: none;
  padding: 0px;
  margin: 0px;
  :hover > img {
    opacity: 0.5;
  }
`;