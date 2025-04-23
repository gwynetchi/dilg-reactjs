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
import ClientLogo27 from "../../assets/img/clients/cindang.png";
import ClientLogo28 from "../../assets/img/clients/cindang.png";

const logos = [
  { src: ClientLogo01, alt: "client logo", link: "https://calabarzon.dilg.gov.ph" },
  { src: ClientLogo02, alt: "Bagong Pilipinas", link: "https://www.bagongpilipinastayo.com/" },
  { src: ClientLogo03, alt: "LGRC", link: "https://calabarzon.dilg.gov.ph" },
  { src: ClientLogo04, alt: "CALABARZON", link: "https://calabarzon.dilg.gov.ph" },
  { src: ClientLogo05, alt: "City of Bacoor", link: "https://bacoor.gov.ph/" },
  { src: ClientLogo06, alt: "Cavite City", link: "http://cavitecity.gov.ph/" },
  { src: ClientLogo07, alt: "City of Imus", link: "https://cityofimus.gov.ph/" },
  { src: ClientLogo08, alt: "Noveleta", link: "https://noveleta.gov.ph/" },
  { src: ClientLogo09, alt: "Kawit", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-kawit/" },
  { src: ClientLogo10, alt: "Rosario", link: "https://www.rosariocavite.ph/" },
  { src: ClientLogo11, alt: "Trece Martires City", link: "https://trecemartirescity.gov.ph/" },
  { src: ClientLogo12, alt: "City of Dasmariñas", link: "https://cityofdasmarinas.gov.ph/" },
  { src: ClientLogo13, alt: "City of General Trias", link: "https://generaltrias.gov.ph/" },
  { src: ClientLogo14, alt: "Tanza", link: "https://tanza.gov.ph/" },
  { src: ClientLogo15, alt: "Amadeo", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-amadeo/" },
  { src: ClientLogo16, alt: "Carmona", link: "https://carmona.gov.ph/" },
  { src: ClientLogo17, alt: "General Mariano Alvarez", link: "https://genmarianoalvarez.gov.ph/" },
  { src: ClientLogo18, alt: "Silang", link: "https://silang.gov.ph/" },
  { src: ClientLogo19, alt: "Tagaytay City", link: "http://tagaytay.gov.ph/" },
  { src: ClientLogo20, alt: "Magallanes", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-magallanes/" },
  { src: ClientLogo21, alt: "Maragondon", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-maragondon/" },
  { src: ClientLogo22, alt: "Naic", link: "https://www.facebook.com/municipalityofnaic/" },
  { src: ClientLogo23, alt: "Mendez", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-mendez/" },
  { src: ClientLogo24, alt: "General Emilio Aguinaldo", link: "https://cavite.gov.ph/home/cities-and-municipalities/municipality-of-general-emilio-aguinaldo/" },
  { src: ClientLogo25, alt: "Ternate", link: "https://cavite.gov.ph/home/tag/municipality-of-ternate/" },
  { src: ClientLogo26, alt: "Alfonso", link: "https://cavite.gov.ph/home/tag/municipality-of-alfonso/" },
  { src: ClientLogo27, alt: "Indang", link: "https://indang-cavite.ph/" },
  { src: ClientLogo28, alt: "client logo", link: "https://example.com/logo28" },
];

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
        {logos.map((logo, index) => (
          <LogoWrapper key={index} className="flexCenter">
            <a
              href={logo.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${logo.alt}`}
            >
              <ImgStyle src={logo.src} alt={logo.alt} />
            </a>
          </LogoWrapper>
        ))}
      </Slider>
    </div>
  );
}

const LogoWrapper = styled.div`
  width: 100%;
  height: 100px;
  cursor: pointer;

  a {
    display: inline-block;
    width: 100%;
    height: 100%;
  }
`;

const ImgStyle = styled.img`
  width: 110%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.9));
  transition: transform 0.3s ease, opacity 0.3s ease;

  &:hover {
    transform: scale(1.05);
    opacity: 0.85;
  }
`;
