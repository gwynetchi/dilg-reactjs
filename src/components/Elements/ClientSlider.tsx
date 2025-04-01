import Slider from "react-slick";
import styled from "styled-components";
// Assets
import ClientLogo01 from "../../public/images/logo.png";
import ClientLogo02 from "../../assets/img/clients/bagongphlogo.png";
import ClientLogo03 from "../../assets/img/clients/lgrcLogo.png";
import ClientLogo04 from "../../assets/img/clients/calabarzonlogo.png";
import ClientLogo05 from "../../assets/img/clients/abacoor.png";
import ClientLogo06 from "../../assets/img/clients/acavitecity.png";
import ClientLogo07 from "../../assets/img/clients/aimus.png";
import ClientLogo08 from "../../assets/img/clients/anoveleta.png";
import ClientLogo09 from "../../assets/img/clients/akawit.png";
import ClientLogo10 from "../../assets/img/clients/arosario.png";
import ClientLogo11 from "../../assets/img/clients/btrece.png";
import ClientLogo12 from "../../assets/img/clients/bdasma.png";
import ClientLogo13 from "../../assets/img/clients/bgentri.png";
import ClientLogo14 from "../../assets/img/clients/btanza.png";
import ClientLogo15 from "../../assets/img/clients/bamadeo.png";
import ClientLogo16 from "../../assets/img/clients/bcarmona.png";
import ClientLogo17 from "../../assets/img/clients/bgma.png";
import ClientLogo18 from "../../assets/img/clients/bsilang.png";
import ClientLogo19 from "../../assets/img/clients/ctagaytay.png";
import ClientLogo20 from "../../assets/img/clients/cmagallanes.png";
import ClientLogo21 from "../../assets/img/clients/cmaragondon.png";
import ClientLogo22 from "../../assets/img/clients/cnaic.png";
import ClientLogo23 from "../../assets/img/clients/cmendez.png";
import ClientLogo24 from "../../assets/img/clients/cgea.png";
import ClientLogo25 from "../../assets/img/clients/cternate.png";
import ClientLogo26 from "../../assets/img/clients/calfonso.png";
import ClientLogo27 from "../../assets/img/clients/calfonso.png";
import ClientLogo28 from "../../assets/img/clients/cindang.png";



export default function ClientSlider() {
  const settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 2,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 2,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
    ],
  };
  return (
    <div>
      <Slider {...settings}>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo01} alt="client logo" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo02} alt="Bagong Pilipinas" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo03} alt="LGRC" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo04} alt="client logo" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo05} alt="City of Bacoor" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo06} alt="Cavite City" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo07} alt="City of Imus" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo08} alt="Noveleta" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo09} alt="Kawit" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo10} alt="Rosario" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo11} alt="Trece Martires City" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo12} alt="City of Dasmariñas" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo13} alt="City of General Trias" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo14} alt="Tanza" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo15} alt="Amadeo" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo16} alt="Carmona" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo17} alt="General Mariano Alvarez" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo18} alt="Silang" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo19} alt="Tagaytay City" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo20} alt="Magallanes" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo21} alt="Maragondon" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo22} alt="Naic" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo23} alt="Mendez" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo24} alt="General Emilio Aguinaldo" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo25} alt="Ternate" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo26} alt="Alfonso" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo27} alt="Indang" />
        </LogoWrapper>
        <LogoWrapper className="flexCenter">
          <ImgStyle src={ClientLogo28} alt="client logo" />
        </LogoWrapper>
      </Slider>
    </div>
  );
}

const LogoWrapper = styled.div`
  width: 100%;
  height: 100px;
  cursor: pointer;
  :focus-visible {
    outline: none;
    border: 0px;
  }
`;
const ImgStyle = styled.img`
  width: 110%;
  height: 100%;
  padding: %;
  object-fit: contain;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.9));

  
`;