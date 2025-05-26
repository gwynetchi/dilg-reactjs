import styled from "styled-components";
import FullButton from "../../components/Buttons/FullButton";
import HeaderImage from "../../assets/img/DILG-Logo-2.svg";
import Dots from "../svg/Dots";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <Wrapper id="home" className="container flexSpaceCenter">
      <DotsWrapper>
        <Dots />
      </DotsWrapper>

      <LeftSide className="flexCenter">
        <div>
          <h3 className="font23 semiBold">Welcome to the</h3>
          <h1 className="extraBold font60">DILG - Cavite's</h1>
          <h3 className="font23 extraBold">Reports Management System.</h3>
          <HeaderP className="font21 semiBold">
            "Matino, Mahusay, at Maaasahang Kagawaran Para sa Mapagkalinga at Maunlad na Pamahalaang Lokal"
          </HeaderP>
          <BtnWrapper>
            <FullButton title="Get Started" action={() => navigate("/login")} border={undefined} />
          </BtnWrapper>
        </div>
      </LeftSide>

      <RightSide>
        <ImageWrapper>
          <Img className="radius8" src={HeaderImage} alt="DILG Logo" />
        </ImageWrapper>
      </RightSide>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  padding-top: 80px;
  width: 100%;
  min-height: 840px;
  position: relative;
  display: flex;
  @media (max-width: 960px) {
    flex-direction: column;
  }
`;

const DotsWrapper = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.1;
  pointer-events: none;

  svg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const LeftSide = styled.div`
  width: 60%;
  height: 100%;
  z-index: 1;
  @media (max-width: 960px) {
    width: 100%;
    order: 2;
    margin: 50px 0;
    text-align: center;
  }
  @media (max-width: 560px) {
    margin: 80px 0 50px 0;
  }
`;

const RightSide = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 1;
  @media (max-width: 960px) {
    width: 100%;
    order: 1;
    margin-top: 10px;
    justify-content: center;
  }
`;

const HeaderP = styled.div`
  max-width: 470px;
  padding: 15px 0 50px 0;
  line-height: 1.5rem;
  @media (max-width: 960px) {
    text-align: center;
    max-width: 100%;
  }
`;

const BtnWrapper = styled.div`
  max-width: 190px;
  @media (max-width: 960px) {
    margin: 0 auto;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  @media (max-width: 960px) {
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Img = styled.img`
  width: 200%;
  max-width: 1000px;
  height: auto;
  z-index: 1;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
  margin-left: auto;
  @media (max-width: 960px) {
    margin: 0 auto;
  }
`;
