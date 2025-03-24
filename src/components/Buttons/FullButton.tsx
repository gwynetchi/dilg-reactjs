import styled from "styled-components";


interface FullButtonProps {
  title: string;
  action?: () => void;
  border?: boolean;
}

export default function FullButton({ title, action, border }: FullButtonProps) {
  return (
    <Wrapper
    
      className="animate pointer radius8"
      onClick={action ? () => action() : undefined}
      border={border}
    >
      {title}
    </Wrapper>
  );
}

interface WrapperProps {
  border?: boolean;
}

const Wrapper = styled.button<WrapperProps>`
  border: 1px solid ${(props) => (props.border ? "#707070" : "#0B093B")};
  background-color: ${(props) => (props.border ? "transparent" : "#0B093B")};
  width: 100%;
  padding: 15px;
  outline: none;
  color: ${(props) => (props.border ? "#707070" : "#fff")};
  :hover {
    background-color: ${(props) => (props.border ? "transparent" : "#ffce1b")};
    border: 1px solid #ffce1b;
    color: ${(props) => (props.border ? "#0B093B" : "#fff")};
  }
`;

