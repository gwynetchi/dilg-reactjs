import styled from "styled-components";
// Components
// Assets
// import RollerIcon from "../../assets/svg/Services/RollerIcon";
// import MonitorIcon from "../../assets/svg/Services/MonitorIcon";
// import BrowserIcon from "../../assets/svg/Services/BrowserIcon";
// import PrinterIcon from "../../assets/svg/Services/PrinterIcon";
// import CheckMark from "../../assets/svg/Checkmark";

interface PricingTableProps {
  icon: string;
  price: string;
  title: string;
  text: string;
  offers: { cheked: boolean; name: string }[];
  action: () => void;
}

export default function PricingTable({price, title, text, offers}: PricingTableProps) {
  //let getIcon;

  // switch (icon) {
  //   case "roller":
  //     getIcon = <RollerIcon />;
  //     break;
  //   case "monitor":
  //     getIcon = <MonitorIcon />;
  //     break;
  //   case "browser":
  //     getIcon = <BrowserIcon />;
  //     break;
  //   case "printer":
  //     getIcon = <PrinterIcon />;
  //     break;
  //   default:
  //     getIcon = <RollerIcon />;
  //     break;
  // }

  return (
    <Wrapper className="whiteBg radius8 shadow">
      <div className="flexSpaceCenter">
        <p className="font30 extraBold">{price}</p>
        {/* {getIcon} */}
        
      </div>
      <div style={{ margin: "30px 0" }}>
        <h4 className="font30 extraBold">{title}</h4>
        <JustifiedText className="font13">{text}</JustifiedText>
      </div>
      <div>
        {offers
          ? offers.map((item, index) => (
              <div className="flexNullCenter" style={{ margin: "15px 0" }} key={index}>
                <div style={{ position: "relative", top: "-1px", marginRight: "15px" }}>
                  {item.cheked ? (
                    <div style={{ minWidth: "20px", fontWeight: "bold", fontSize: "16px" }}>
                      {index + 1}.
                    </div>
                  ) : (
                    <div style={{ minWidth: "20px" }}></div>
                  )}
                </div>
                <JustifiedText className="font15">{item.name}</JustifiedText>
              </div>
            ))
          : null}
      </div>
      {/* <div style={{ maxWidth: "120px", margin: "30px auto 0 auto" }}>
        <FullButton title="" action={action} border={undefined} />
      </div> */}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  text-align: left;
  padding: 20px 30px;
  margin-top: 10px;
`;
const JustifiedText = styled.p`
  text-align: justify;
`;

