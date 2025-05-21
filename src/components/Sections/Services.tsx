import styled from "styled-components";
import { Link } from "react-scroll";
import { useState } from "react";
// Components
import ClientSlider from "../Elements/ClientSlider";
import ServiceBox from "../Elements/ServiceBox";
import FullButton from "../Buttons/FullButton";
// Assets
import AddImage1 from "../../assets/img/add/pd1.png";
import AddImage2 from "../../assets/img/add/pic2.png";
import AddImage3 from "../../assets/img/add/pic3.png";
import AddImage4 from "../../assets/img/add/pic4.png";
import SectionModal from "../Elements/SectionModal";


export default function Services({ onSectionClick }: { onSectionClick: (section: string) => void }) {
  const [selectedSection, setSelectedSection] = useState<"MES" | "FAS" | "CDS" | "PDMU" | null>(null);

const handleSectionClick = (section: "MES" | "FAS" | "CDS" | "PDMU") => {
  setSelectedSection(section);
  if (onSectionClick) {
    onSectionClick(section);
  }
};

  return (
    <Wrapper id="services">
      <div className="lightBg" style={{ padding: "50px 0" }}>
        <div className="container">
          <ClientSlider />
        </div>
      </div>
      <div className="whiteBg" style={{ padding: "60px 0" }}>
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">DILG-Cavite's Sections:</h1>
            <p className="font13">
            The Department of the Interior and Local Government (DILG) is composed of three key divisions.
              <br />
              Each plays a vital role in ensuring <strong>effective governance, accountability, and support</strong> for local government units.
              
            </p>
          </HeaderInfo>
          <ServiceBoxRow className="flex">
        <ServiceBoxWrapper onClick={() => handleSectionClick("MES")}>
              <ServiceBox
                icon="MEDlogo"
                title="Monitoring and Evaluation Section (MES)"
                subtitle="Oversees the performance of local government units (LGUs) by implementing monitoring, evaluation, and assessment programs to ensure effective governance and service delivery."
              />
            </ServiceBoxWrapper>
            <ServiceBoxWrapper onClick={() => handleSectionClick("CDS")}>
              <ServiceBox
                icon="CDDlogo"
                title="Capability Development Section (CDS)"
                subtitle="Enhances the skills and competencies of local government officials and employees through training programs, technical assistance, and capacity-building initiatives to strengthen local governance."
              />
            </ServiceBoxWrapper>
            <ServiceBoxWrapper onClick={() => handleSectionClick("FAS")}>
              <ServiceBox
                icon="FADlogo"
                title="Financial and Administrative Section (FAS)"
                subtitle="Oversees financial, human resource, and administrative operations to ensure the proper and transparent use of the agency’s funds and resources."
              />
            </ServiceBoxWrapper>
            <ServiceBoxWrapper onClick={() => handleSectionClick("PDMU")}>
              <ServiceBox
                icon="FADlogo"
                title="Project and Development Monitoring Unit (PDMU)"
                subtitle="Responsible for the planning, implementation, monitoring, and evaluation of infrastructure and development projects in coordination with local government units and stakeholders."
              />
            </ServiceBoxWrapper>
          </ServiceBoxRow>
        </div>
        <div className="lightBg">
          <div className="container">
            <Advertising className="flexSpaceCenter">
              <AddLeft>
                <h4 className="font15 semiBold">A few words about</h4>
                <h2 className="font40 extraBold">Strengthening Local Governance</h2>
                <p className="font12">
                The Department of the Interior and Local Government (DILG) Cavite is committed to fostering transparency, efficiency, and innovation in local governance. Through monitoring, capacity-building, and financial oversight, we empower communities for sustainable development and responsive leadership.
                </p>
                <ButtonsRow className="flexNullCenter" style={{ margin: "30px 0"}}>
                  <div style={{ width: "190px" }}>
                    <FullButton title="Visit our FB page" action={() => window.open("https://www.facebook.com/dilgcavite", "_blank")} border={undefined} />
                  </div>
                  <div style={{ width: "190px", marginLeft: "15px" }}>
                    {/* <FullButton title="Contact Us" action={() => alert("clicked")} border /> */}
                    <Link to="contact" spy={true} smooth={true} offset={-60} duration={500}>
                      <FullButton title="Contact Us" border />
                    </Link>
                  </div>
                </ButtonsRow>
              </AddLeft>
              <AddRight>
                <AddRightInner>
                  <div className="flexNullCenter">
                    <AddImgWrapp1 className="flexCenter">
                      <img src={AddImage1} alt="office" />
                    </AddImgWrapp1>
                    <AddImgWrapp2>
                      <img src={AddImage2} alt="office" />
                    </AddImgWrapp2>
                  </div>
                  <div className="flexNullCenter">
                    <AddImgWrapp3>
                      <img src={AddImage3} alt="office" />
                    </AddImgWrapp3>
                    <AddImgWrapp4>
                      <img src={AddImage4} alt="office" />
                    </AddImgWrapp4>
                  </div>
                </AddRightInner>
              </AddRight>
            </Advertising>
          </div>
        </div>
      </div>
            {selectedSection && (
        <SectionModal 
          section={selectedSection}
          onClose={() => setSelectedSection(null)}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
`;
const ServiceBoxRow = styled.div`
  @media (max-width: 860px) {
    flex-direction: column;
  }
`;
const ServiceBoxWrapper = styled.div`
  width: 45%;
  margin-right: 5%;
  padding: 40px 0;
  @media (max-width: 860px) {
    width: 100%;
    text-align: center;
    padding: 40px 0;
  }
`;
const HeaderInfo = styled.div`
  @media (max-width: 860px) {
    text-align: center;
  }
`;
const Advertising = styled.div`
  margin: 80px 0;
  padding: 100px 0;
  position: relative;
  @media (max-width: 1160px) {
    padding: 100px 0 40px 0;
  }
  @media (max-width: 860px) {
    flex-direction: column;
    padding: 0 0 30px 0;
    margin: 80px 0 0px 0;
  }
`;
const ButtonsRow = styled.div`
  @media (max-width: 860px) {
    justify-content: space-between;
  }
`;
const AddLeft = styled.div`
  width: 50%;
  p {
    max-width: 475px;
  }
  @media (max-width: 860px) {
    width: 80%;
    order: 2;
    text-align: center;
    h2 {
      line-height: 3rem;
      margin: 15px 0;
    }
    p {
      margin: 0 auto;
    }
  }
`;
const AddRight = styled.div`
  width: 50%;
  position: absolute;
  top: -70px;
  right: 0;
  @media (max-width: 860px) {
    width: 80%;
    position: relative;
    order: 1;
    top: -40px;
  }
`;
const AddRightInner = styled.div`
  width: 100%;
`;
const AddImgWrapp1 = styled.div`
  width: 48%;
  margin: 0 6% 10px 6%;
  img {
    width: 100%;
    height: auto;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -webkit-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -moz-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;
const AddImgWrapp2 = styled.div`
  width: 30%;
  margin: 0 5% 10px 5%;
  img {
    width: 100%;
    height: auto;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -webkit-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -moz-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;
const AddImgWrapp3 = styled.div`
  width: 20%;
  margin-left: 40%;
  img {
    width: 100%;
    height: auto;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -webkit-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -moz-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;
const AddImgWrapp4 = styled.div`
  width: 30%;
  margin: 0 5%auto;
  img {
    width: 100%;
    height: auto;
    border-radius: 1rem;
    box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -webkit-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
    -moz-box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  }
`;