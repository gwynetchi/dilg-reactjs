import styled from "styled-components";
// Assets
import CDDIcon from "../../assets/img/dilgsections/cddlogo.png";
import FADIcon from "../../assets/img/dilgsections/fadlogo.png";
import MEDIcon from "../../assets/img/dilgsections/medlogo.png";
import PrinterIcon from "../../assets/svg/Services/PrinterIcon";

interface ServiceBoxProps {
  icon: "CDDlogo" | "FADlogo" | "MEDlogo" | "printer";
  title: string;
  subtitle: string;
}

export default function ServiceBox({icon, title, subtitle}: ServiceBoxProps) {
  let getIcon;

  switch (icon) {
    case "CDDlogo":
      getIcon = <img src={CDDIcon} alt="CDD Logo" className="section-icon" />;
      break;
    case "FADlogo":
      getIcon = <img src={FADIcon} alt="FAD Logo" className="section-icon" />;
      break;
    case "MEDlogo":
      getIcon = <img src={MEDIcon} alt="MED Logo" className="section-icon" />;
      break;
    case "printer":
      getIcon = <PrinterIcon />;
      break;
    default:
      getIcon = <FADIcon />;
      break;
  }


  return (
    <Wrapper className="flex flexColumn">
      <IconStyle>{getIcon}</IconStyle>
      <TitleStyle className="font20 extraBold">{title}</TitleStyle>
      <SubtitleStyle className="font13">{subtitle}</SubtitleStyle>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
`;
const IconStyle = styled.div`
  .section-icon {
    width: 90px;
    height: 90px;
    object-fit: contain;
  }
  @media (max-width: 860px) {
    margin: 0 auto;
  }

`;
const TitleStyle = styled.h2`
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  padding: 30px 0;
  @media (max-width: 860px) {
    padding: 20px 0;
  }
`;
const SubtitleStyle = styled.p`
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
`;