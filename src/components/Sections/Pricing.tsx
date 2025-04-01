import styled from "styled-components";
// Components
import PricingTable from "../Elements/PricingTable";




export default function Pricing() {
  return (
    <Wrapper id="pricing">
      <div className="whiteBg">
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Quality Policy, Objectives and Goals</h1>
            <p className="font13">
              The DILG upholds transparency, accountability, and efficiency in local governance. Committed to policy development and capacity-building,
              <br />
              it ensures resilient, inclusive, and progressive communities through continuous improvement and excellence.
            </p>
          </HeaderInfo>
          <TablesWrapper className="flexSpaceNull">
            <TableBox>
              <PricingTable
                icon=""
                price="Quality Policy"
                title=""
                text="We, the DILG, imbued with the core values of Integrity, Commitment, Teamwork and Responsiveness, commit to formulate sound policies on strengthening local government capacities, performing oversight function over LGUs, and providing rewards and incentives. We pledge to provide effective technical and administrative services to uphold excellence in local governance and enhance the service delivery of our Regional and Field Offices for the LGUs to become transparent, resilient, socially-protective and competitive, where people in the community live happily. We commit to continually improve the effectiveness of our Quality Management System compliant with applicable statutory and regulatory requirements and international standards gearing towards organizational efficiency in pursuing our mandate and achieving our client’s satisfaction. We commit to consistently demonstrate a “Matino, Mahusay at Maasahang Kagawaran Para sa Mapagkalinga at Maunlad na Pamahalaang Lokal”."

                action={() => alert("clicked")} offers={[]}              
              />
            </TableBox>
            <TableBox>
              <PricingTable
                icon="monitor"
                price="Objectives"
                title=""
                text=""
                offers={[
                  { name: "Reduce crime incidents and improve crime solution efficiency", cheked: true },
                  { name: "Improve jail management and penology services", cheked: true },
                  { name: "Improve fire protection services", cheked: true },
                  { name: "Enhance LGU capacities to improve their performance and enable them to effectively and efficiently deliver services to their constituents", cheked: true },
                  { name: "Continue to initiate policy reforms in support of local autonomy", cheked: true },
                ]}
                action={() => alert("clicked")}
              />
            </TableBox>
            <TableBox>
              <PricingTable
                icon="roller"
                price="Goals"
                title=""
                text=""
                offers={[
                  { name: "Peaceful, safe, self-reliant and development-dominated communities;", cheked: true },
                  { name: "Improve performance of local governments in governance, administration, social and economic development and environmental management;", cheked: true },
                  { name: "Sustain peace and order condition and ensure public safety.", cheked: true },                  
                ]}

                action={() => alert("clicked")}             
                />
            </TableBox>
          </TablesWrapper>
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
  padding: 50px 0;
`;
const HeaderInfo = styled.div`
  margin-bottom: 30px;
  @media (max-width: 860px) {
    text-align: center;
  }
`;
const TablesWrapper = styled.div`
  @media (max-width: 860px) {
    flex-direction: column;
  }
`;
const TableBox = styled.div`
  width: 31%;
  @media (max-width: 860px) {
    width: 100%;
    max-width: 370px;
    margin: 0 auto
  }
`;





