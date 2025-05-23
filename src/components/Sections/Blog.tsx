import styled from "styled-components";


// Components
//import FullButton from "../Buttons/FullButton";
import TestimonialSlider from "../Elements/TestimonialSlider";
import OrgChartViewer from "../Elements/OrgChartViewer";
import MapSection from "../Elements/MapSection";

// interface BlogPost {
//   title: string;
//   text: string;
//   tag: string;
//   author: string;
//   backgroundImage?: string;
//   children?: BlogPost[];
// }


export default function Blog() {
 

  return (
    <Wrapper id="blog">
      <div className="whiteBg">
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Organizational Structure</h1>
            <p className="font13">
              The Department of the Interior and Local Government - Cavite (DILG-Cavite) is organized to effectively oversee and coordinate local governance within the province of Cavite. 
              <br />
              The structure comprises key leadership positions, divisions, and offices dedicated to implementing policies, providing technical assistance, and ensuring compliance with national directives to enhance local governance and public safety.
              <br />
            </p>
            
          </HeaderInfo>
          <OrgChartViewer  />
          <MapSection/>



        </div>
      </div>


      <div className="lightBg" style={{padding: '50px 0'}}>
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Mission, Vision & Shared Values</h1>
            <p className="font13">

            </p>
          </HeaderInfo>
          <TestimonialSlider />
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
  padding-top: 20px;
`;
const HeaderInfo = styled.div`
  // margin-bottom:  30px;
  @media (max-width: 860px) {
    text-align: center;
  }
`;