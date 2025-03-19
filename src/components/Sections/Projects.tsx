import styled from "styled-components";
import FullButton from "../Buttons/FullButton";

// Sample Facebook videos list (Replace with actual thumbnails & links)
const facebookVideos = [
  {
    id: 1,
    thumbnail: "https://scontent.fmnl17-8.fna.fbcdn.net/v/t15.5256-10/476625131_614786014766059_8937425154670792990_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=282d23&_nc_eui2=AeE14JqDQ_rnqjygOqRt3DRNjMn1Vj7dgPuMyfVWPt2A-y3Ki7hsCnQkLhLDhi9-lVJvXBuf73UbaGePIelUO-0z&_nc_ohc=3XxhuB822j0Q7kNvgFoZQCL&_nc_oc=AdiCez733ah3PUnaUV8RU63tCl_0hJAZkm84-MjjYTMr1Raao-PR3-sQT0z8I2RGrGs&_nc_zt=23&_nc_ht=scontent.fmnl17-8.fna&_nc_gid=AMrdEFwkibgssEUYA2zHLqA&oh=00_AYEiW3-838ZOEkmrizbEv4F2baRZMqygmNJFYrpjMbsiPQ&oe=67D845F9",
    url: "https://www.facebook.com/share/v/1BjSekEejp/",
    title: "S4 E4 \"FIRE READY TOGETHER: Empowering Communities for Fire Safety\"",
  },
  {
    id: 2,
    thumbnail: "https://scontent.fmnl17-3.fna.fbcdn.net/v/t15.5256-10/484478737_1914627932606588_998095978612640966_n.jpg?stp=dst-jpg_s552x414_tt6&_nc_cat=106&ccb=1-7&_nc_sid=be8305&_nc_eui2=AeEBFXsAlaYi21rkHKCMRFy4YnbjhSk5GrtiduOFKTkau4-cgfZCyauneHBWgCXZ1MaudHXffMR3bNuWK7DNOyTn&_nc_ohc=stCpa1vnWJIQ7kNvgEWDyM4&_nc_oc=AdjIfT-zBDQuAGZrA2qxiR0JJzCITPnmDASo96kpTj7HwrCYKYZ3Wp-CkUyV-A61Hv4&_nc_zt=23&_nc_ht=scontent.fmnl17-3.fna&_nc_gid=AHvxE--Ts7s1xBzsFQBYarJ&oh=00_AYEoG_zrv06-P2jbIhDmE8D5sEY89b7ESSeKn7BV5b2YWQ&oe=67D834D4", // Replace with actual thumbnail URL
    url: "https://www.facebook.com/share/v/1BdfywbvQT/",
    title:"WATCH • Babae Ka, Hindi Babae Lang!",
  },
];

export default function Projects() {
  return (
    <Wrapper id="projects">
      <div className="whiteBg">
        <div className="container">
          <HeaderInfo>
            <h1 className="font40 extraBold">Feature Videos and Caviteños, Alam niyo Ba? streams</h1>
            <p className="font13">
              Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
            </p>
          </HeaderInfo>

          {/* Dynamically Render Facebook Videos */}
          <VideoGrid>
            {facebookVideos.map((video) => (
              <VideoWrapper key={video.id}>
                <a href={video.url} target="_blank" rel="noopener noreferrer">
                  <img src={video.thumbnail} alt="Watch on Facebook" />
                </a>
                <h1 className="font20 extraBold">{video.title}</h1>
                
              </VideoWrapper>
            ))}
          </VideoGrid>

          <div className="row flexCenter">
            <div style={{ margin: "50px 0", width: "200px" }}>
              <FullButton title="Load More" action={() => alert("clicked")} border={undefined} />
            </div>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}

// Styled Components
const Wrapper = styled.section`
  width: 100%;
`;
const HeaderInfo = styled.div`
  @media (max-width: 860px) {
    text-align: center;
  }
`;
const VideoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin: 50px 0;
`;
const VideoWrapper = styled.div`
  width: 300px;
  img {
    width: 100%;
    cursor: pointer;
    border-radius: 10px;
    transition: transform 0.2s ease-in-out;
    
    &:hover {
      transform: scale(1.05);
    }
  }
`;
