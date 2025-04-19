import styled from "styled-components";
// Assets
import ContactImg1 from "../../assets/img/contactimg/contactimg1.jpg";
import ContactImg2 from "../../assets/img/contactimg/contactimg2.jpg";
import ContactImg3 from "../../assets/img/contactimg/contactimg3.jpg";


export default function Contact() {



  return (
    <Wrapper id="contact">
      <div className="lightBg">
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Contact Us</h1>
            <p className="font13">
              We welcome your inquiries, feedback, and concerns. Feel free to reach out to us for assistance,
              <br />
              collaboration, or any information you may need. We're here to serve you.
            </p>
          </HeaderInfo>
          <div className="row" style={{ paddingBottom: "30px" }}>
            <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6">
              <Form method="POST" action="https://api.web3forms.com/submit"> {/* Register the receiving email here for free */}
                  <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE" /> {/* Replace the value with the access key sent to the email you provide on web3forms */}
                  
                  <label htmlFor="fname" className="font13">Full name:</label>
                  <input type="text" id="fname" name="fname" className="font20 extraBold" required />

                  <label htmlFor="email" className="font13">Email:</label>
                  <input type="email" id="email" name="email" className="font20 extraBold" required />

                  <label htmlFor="subject" className="font13">Subject:</label>
                  <input type="text" id="subject" name="subject" className="font20 extraBold" required />

                  <label htmlFor="message" className="font13">Message:</label>
                  <textarea rows={4} cols={50} id="message" name="message" className="font20 extraBold" required />
                  
                  <SubmitWrapper className="flex">
                    <ButtonInput 
                      type="submit" 
                      value="Send Message" 
                      className="pointer animate radius8 buttonInput" 
                      style={{
                        maxWidth: "220px",
                        border: "1px solid #0B093B",
                        backgroundColor: "#0B093B",
                        width: "100%",
                        height: "50px",
                        padding: "15px",
                        outline: "none",
                        color: "#fff",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        
                      }} 
                    />
                  </SubmitWrapper>
                
              </Form>
              
            </div>
            <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 flex">
              <div style={{ width: "50%" }} className="flexNullCenter flexColumn">
                <ContactImgBox>
                  <img src={ContactImg1} alt="office" className="radius6" />
                </ContactImgBox>
                <ContactImgBox>
                  <img src={ContactImg2} alt="office" className="radius6" />
                </ContactImgBox>
              </div>
              <div style={{ width: "50%" }}>
                <div style={{ marginTop: "100px" }}>
                  <img src={ContactImg3} alt="office" className="radius6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  width: 100%;
`;
const HeaderInfo = styled.div`
  padding: 70px 0 30px 0;
  @media (max-width: 860px) {
    text-align: center;
  }
`;
const Form = styled.form`
  padding: 0px 0 30px 0;
  input:not([type="submit"]),
  textarea {
    width: 100%;
    background-color: transparent;
    border: 0px;
    outline: none;
    box-shadow: none;
    border-bottom: 1px solid #707070;
    height: 30px;
    margin-bottom: 30px;
  }
  textarea {
    min-height: 100px;
  }
  @media (max-width: 860px) {
    padding: 30px 0;
  }
  .buttonInput {
    border: 1px solid #0B093B;
    background-color: #0B093B;
    width: 100%;
    padding: 15px;
    outline: none;
    color: #fff;
    &:hover {
      background-color:rgb(231, 171, 4);
      border: 1px solid #F2B300;
      color: #fff;
    }
    @media (max-width: 991px) {
      margin: 0 auto;
    }
  }
`;
const ButtonInput = styled.input`
  border: 1px solid #0B093B;
  background-color: #0B093B;
  width: 100%;
  padding: 15px;
  outline: none;
  color: #fff;
  &:hover {
    background-color:rgb(231, 171, 4);
    border: 1px solid #F2B300;
    color: #fff;
  }
  @media (max-width: 991px) {
    margin: 0 auto;
  }
 `;
const ContactImgBox = styled.div`
  max-width: 180px; 
  align-self: flex-end; 
  margin: 10px 30px 10px 0;
`;
const SubmitWrapper = styled.div`
  @media (max-width: 991px) {
    width: 100%;
    margin-bottom: 50px;
  }
`;









