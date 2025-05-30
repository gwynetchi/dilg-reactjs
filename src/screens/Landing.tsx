// Sections
import TopNavbar from "../components/Nav/TopNavbar";
import Header from "../assets/img/Header";
import Services from "../components/Sections/Services";
{/*import Projects from "../components/Sections/Projects";*/}
import Blog from "../components/Sections/Blog";
import Pricing from "../components/Sections/Pricing";
import Contact from "../components/Sections/Contact";
import Footer from "../components/Sections/Footer"



import "../style/flexboxgrid.min.css";
import '../style/index.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Landing() {
  return (
    <>
      <TopNavbar />
      <Header />
      <Services onSectionClick={function (_section: string): void {
        throw new Error("Function not implemented.");
      } } />
      {/* <Projects /> */}
      <Blog /> 
      <Pricing />
      <Contact />
      <Footer />
    </>
  );
}


