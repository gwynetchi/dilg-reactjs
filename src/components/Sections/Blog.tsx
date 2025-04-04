import styled from "styled-components";
import { useState } from "react";

// Components
import BlogBox from "../Elements/BlogBox";
//import FullButton from "../Buttons/FullButton";
import TestimonialSlider from "../Elements/TestimonialSlider";

interface BlogPost {
  title: string;
  text: string;
  tag: string;
  author: string;
  backgroundImage?: string;
  children?: BlogPost[];
}


export default function Blog() {
  const allPosts: BlogPost[] = [
    {
      title: "DILG-Cavite PROVINCIAL OFFICE",
      text: "",
      tag: "See more",
      author: "",
      backgroundImage: "/orgchart/2x2.png",
      children: [
        {
          title: "Charmaine R. Lopez",
          text: "",
          tag: "Program Manager",
          author: "LGOO VI",
          backgroundImage: "/orgchart/sample.png",
          children: [
            {
              title: "Marren E. Juangco-Bautista",
              text: "",
              tag: "CDS Chief",
              author: "LGOO VI",
              children: [
                { title: "Niña Norisa C. Maranga", text: "Detail about Child 1.1", tag: "Technical Staff", author: "LGOO III" },
                { title: "Beverly V. Villaruel", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO III" },
                { title: "Amiel D. Dela Rosa", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
                { title: "Atty. Melissa Mae C. Marero", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
                { title: "Reymundo A. Matienzo Jr.", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Erwin L. Fidel", text: "Detail about Child 1.2", tag: "Information Analysis I", author: "ISA I" },
    
              ],
            },
            {
              title: "James Carl F. Torres",
              text: "",
              tag: "OIC-MES Chief",
              author: "LGOO III",
              children: [
                { title: "Maria May M. Ambata", text: "Detail about Child 1.1", tag: "Technical Staff", author: "LGOO III" },
                { title: "Alice C. Bay", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO III" },
                { title: "Rey Ann M. Avilla", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO III" },
                { title: "Marinelle E. Juangco", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
                { title: "Equila Jessa Alforja", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
                { title: "Alwyn Alysa C. Bay", text: "Detail about Child 1.2", tag: "Technical Staff", author: "PDO II" },
    
    
    
    
              ],
            },
            {
              title: "James Carlo F. Fadrian",
              text: "",
              tag: "OIC-PDMU Chief",
              author: "LGOO II",
              children: [
                { title: "Eldrin Boi D. Tirona", text: "Detail about Child 1.1", tag: "Engineer II", author: "ENGR II" },
                { title: "Jilsa A. Alva", text: "Detail about Child 1.2", tag: "Engineer II", author: "ENGR II" },
                { title: "Renee Rose Araya", text: "Detail about Child 1.2", tag: "PEO II", author: "PEO II" },
                { title: "Earl R. Buna", text: "Detail about Child 1.2", tag: "PEO II", author: "PEO II" },
    
              ],
            },
            {
              title: "Evangeline B. Palo",
              text: "",
              tag: "FAS Chief",
              author: "ADAS II",
              children: [
                { title: "Christopher C. Montoya", text: "Detail about Child 1.1", tag: "Administrative Staff", author: "ADAS II" },
                { title: "Cornelio L. Gregorio Jr.", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA VI" },
                { title: "Annabelle F. Nocon", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Maria Kathlee Joyce S. Isla", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Marco D. Diaz", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Rafael F. Saturno", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Bradford P. Camu", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
                { title: "Byron Patrick M. bronce", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
    
    
              ],
            },
    
          ],
        },
      ],
    },
    {
      title: "DILG-Cavite CLUSTER A",
      text: "",
      tag: "See more",
      author: "",
      backgroundImage: "/orgchart/2x2.png",
      children: [
        {
          title: "Nencita N. Costelo",
          text: "",
          tag: "Head of Cluster A",
          author: "LGOO VII",
          backgroundImage: "/orgchart/2x2.png",
          children: [
            { title: "Ma. Normita H. Arceo", text: "Detail about Child 1.1", tag: "Cavite City", author: "LGOO VI" },
            { title: "Joseph Ryan V. Geronimo", text: "Detail about Child 1.2", tag: "City of Bacoor", author: "LGOO VI" },
            { title: "Mary Roxanne T. Vicedo", text: "Detail about Child 1.2", tag: "City of Imus", author: "LGOO V" },
            { title: "Maria Melita O. Villaruel", text: "Detail about Child 1.2", tag: "Noveleta", author: "LGOO VI" },
            { title: "Evelyn T. Alvarez", text: "Detail about Child 1.2", tag: "Rosario", author: "LGOO VI" },
            { title: "Julie Anne  M. Jolampong", text: "Detail about Child 1.2", tag: "Kawit", author: "LGOO VI" },
            { title: "Janica Zandra V. Mendoza", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO III" },
            { title: "Michelle A. Aguipo", text: "Detail about Child 1.2", tag: "Administrative Staff", author: "ADA IV" },
    
          ],
        },
      ],
    },
    {
      title: "DILG-Cavite CLUSTER B",
      text: "",
      tag: "See more",
      author: "",
      backgroundImage: "/orgchart/2x2.png",
      children: [
        {
          title: "Celia A. Martal",
          text: "",
          tag: "Head of Cluster B",
          author: "LGOO VII",
          backgroundImage: "/orgchart/sample.png",
          children: [
            { title: "Norma V. Corpuz", text: "Detail about Child 1.2", tag: "City of Dasmariñas", author: "LGOO VI" },
            { title: "Candice Rona B. Ramirez", text: "Detail about Child 1.2", tag: "City of Carmona", author: "LGOO VI" },
            { title: "Ronald A. Mojica", text: "Detail about Child 1.2", tag: "City of General Trias", author: "LGOO VI" },
            { title: "Leo C. Data", text: "Detail about Child 1.2", tag: "trece Martires City", author: "LGOO VI" },
            { title: "Jennalyn E. Adalia", text: "Detail about Child 1.2", tag: "Tanza", author: "LGOO VI" },
            { title: "Rhyianne L. Mojica", text: "Detail about Child 1.2", tag: "General Mariano Alvarez", author: "LGOO VI" },
            { title: "Primitiva G. Mojica", text: "Detail about Child 1.2", tag: "Amadeo", author: "LGOO VI" },
            { title: "Ramon B. Nedic", text: "Detail about Child 1.2", tag: "Silang", author: "LGOO V" },
            { title: "Katherrine Grace M. Garcia", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO III" },
            { title: "Lucky Kharl-Lheen D. Jorolan", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
    
          ]
        },
      ],
    },
    {
      title: "DILG-Cavite CLUSTER C",
      text: "",
      tag: "See more",
      author: "",
      backgroundImage: "/orgchart/2x2.png",
      children: [
        {
          title: "Marcial A. Juangco",
          text: "",
          tag: "Head of Cluster C",
          author: "LGOO VII",
          backgroundImage: "/orgchart/2x2.png",
          children: [
            { title: "Jerome M. Lingan", text: "Detail about Child 1.2", tag: "Tagaytay City", author: "LGOO VI" },
            { title: "Abe gail B. Beltran", text: "Detail about Child 1.2", tag: "Magallanes", author: "LGOO VI" },
            { title: "Aladdino P. Calanog", text: "Detail about Child 1.2", tag: "Alfonso", author: "LGOO VI" },
            { title: "Jermiluz R. De Castro-Gadon", text: "Detail about Child 1.2", tag: "General Emilio Aguinaldo", author: "LGOO VI" },
            { title: "Josephine S. Dela Rosa", text: "Detail about Child 1.2", tag: "Maragondon", author: "LGOO VI" },
            { title: "Christine B. Sierra", text: "Detail about Child 1.2", tag: "Naic", author: "LGOO VI" },
            { title: "Jonalyn Cate V. Magcayang", text: "Detail about Child 1.2", tag: "Mendez Nuñez", author: "LGOO VI" },
            { title: "Angelica C. Grueso", text: "Detail about Child 1.2", tag: "Technical Staff", author: "LGOO II" },
    
          ]
        },
      ],
    },
    
    
  ];

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postHistory, setPostHistory] = useState<BlogPost[]>([]);

  // When opening a new child post
  const openPost = (post: BlogPost) => {
    if (selectedPost) {
      setPostHistory(prevHistory => [...prevHistory, selectedPost]);
    }
    setSelectedPost(post);
  };

  // When clicking the Back button
  const handleBack = () => {
    if (postHistory.length > 0) {
      const previousPost = postHistory[postHistory.length - 1];
      setPostHistory(prevHistory => prevHistory.slice(0, -1));
      setSelectedPost(previousPost);
    }
  };

  
  //   // State to control visible posts
  // const [visiblePosts, setVisiblePosts] = useState(4); // Show only 3 initially

  // // Function to load more posts
  // const loadMore = () => {
  //   setVisiblePosts((prev) => prev + 4); // Show 3 more on each click
  // };

  

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
          <div className="row textCenter flexCenter">
                <div className="col-xs-12 col-sm-4 col-md-4 col-lg-4">
                <BlogBox
                title="Engr. Danilo Nobleza"
                text=""
                tag="Provincial Director"
                author=""
                backgroundImage="/orgchart/provincialdirector.png" onClick={function (): void {
                  throw new Error("Function not implemented.");
                } }                    // onClick={() => setSelectedPost(post)}
                    
                />
                </div>

          </div>
          
          
          {/* <div className="row textCenter flexCenter">
            {allPosts.slice(0, visiblePosts).map((post, index) => (
              <div key={index} className="col-xs-12 col-sm-4 col-md-4 col-lg-3">
                <BlogBox
                  title={post.title}
                  text={post.text}
                  tag={post.tag}
                  author={post.author}
                  action={() => alert(`Clicked on ${post.title}`)}
                />
              </div>
            ))}
          </div>
          <div className="row flexCenter">
            {visiblePosts < allPosts.length && ( // Hide button if all posts are loaded
              <div style={{ margin: "50px 0", width: "200px" }}>
                <FullButton title="Load More" action={loadMore} border={undefined} />
              </div>
            )}
          </div> */}
          <div>
          <div className="row textCenter flexCenter">
            {allPosts.map((post, index) => (
              <div key={index} className="col-xs-12 col-sm-4 col-md-4 col-lg-3">
                <BlogBox
                  title={post.title}
                  text={post.text}
                  tag={post.tag}
                  author={post.author}
                  backgroundImage={post.backgroundImage} 
                  onClick={() => setSelectedPost(post)}
                />
              </div>
            ))}
          </div>

          {selectedPost && (
            <ModalWrapper>
              <ModalContent>
                <CloseButton onClick={() => { setSelectedPost(null); setPostHistory([]); }}>X</CloseButton>
                
                {postHistory.length > 0 && (
                  <BackButton onClick={handleBack}>Back</BackButton>
                )}

                {selectedPost.children && selectedPost.children.length > 0 ? (
                  <div className="row textCenter flexCenter">
                    {selectedPost.children.map((child: BlogPost, index: number) => (
                      <div key={index} className="col-xs-12 col-sm-4 col-md-4 col-lg-3">
                        <BlogBox
                          title={child.title}
                          text={child.text}
                          tag={child.tag}
                          author={child.author}
                          backgroundImage={child.backgroundImage}
                          onClick={() => openPost(child)} // Clicking a child opens its modal
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No more available for this post.</p>
                )}
              </ModalContent>
            </ModalWrapper>
          )}
        </div>


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

const ModalWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  text-align: center;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 20px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  &:hover {
    color: red;
  }
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: #1E4E92; /* Bootstrap Primary Blue */
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #ffce1b; /* Darker Blue */
  }
`;