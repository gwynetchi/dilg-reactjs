import styled from "styled-components";
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Description} from "@headlessui/react";

// Components
import BlogBox from "../Elements/BlogBox";
import FullButton from "../Buttons/FullButton";
import TestimonialSlider from "../Elements/TestimonialSlider";

interface BlogPost {
  title: string;
  text: string;
  tag: string;
  author: string;
  children?: BlogPost[];
}


export default function Blog() {
  const allPosts: BlogPost[] = [
    {
      title: "Charmaine R. Lopez",
      text: "",
      tag: "Program Manager",
      author: "",
      children: [
        {
          title: "Marren E. Bautista",
          text: "",
          tag: "CDS Chief",
          author: "",
          children: [
            { title: "Child 1.1", text: "Detail about Child 1.1", tag: "CDS Member", author: "" },
            { title: "Child 1.2", text: "Detail about Child 1.2", tag: "CDS Member", author: "" },
          ],
        },
        {
          title: "James Carl F. Torres",
          text: "",
          tag: "OIC-MES Chief",
          author: "",
          children: [
            { title: "Child 1.1", text: "Detail about Child 1.1", tag: "CDS Member", author: "" },
            { title: "Child 1.2", text: "Detail about Child 1.2", tag: "CDS Member", author: "" },
          ],
        },
        {
          title: "James Carlo F. Fadrian",
          text: "",
          tag: "OIC-PDMU Chief",
          author: "",
          children: [
            { title: "Child 1.1", text: "Detail about Child 1.1", tag: "CDS Member", author: "" },
            { title: "Child 1.2", text: "Detail about Child 1.2", tag: "CDS Member", author: "" },
          ],
        },
        {
          title: "Evangeline B. Palo",
          text: "",
          tag: "FAS Chief",
          author: "",
          children: [
            { title: "Child 1.1", text: "Detail about Child 1.1", tag: "CDS Member", author: "" },
            { title: "Child 1.2", text: "Detail about Child 1.2", tag: "CDS Member", author: "" },
          ],
        },

      ],
    },
    {
      title: "Nancita N. Costelo",
      text: "",
      tag: "Head of Cluster A",
      author: "",
    },
    {
      title: "Celia A. Martal",
      text: "",
      tag: "Head of Cluster B",
      author: "",
    },
    {
      title: "Marcial A. Juangco",
      text: "",
      tag: "Head of Cluster C",
      author: "",
    },
    
    
  ];
  
  //   // State to control visible posts
  // const [visiblePosts, setVisiblePosts] = useState(0); // Show only 3 initially

  // // Function to load more posts
  // const loadMore = () => {
  //   setVisiblePosts((prev) => prev + 4); // Show 3 more on each click
  // };

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const openModal = (post: BlogPost) => {
    console.log('Opening modal for:', post);
    setSelectedPost(post);
  };
  const closeModal = () => setSelectedPost(null);

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
            </p>
          </HeaderInfo>
          <div className="row textCenter flexCenter">
                {/* <div className="col-xs-12 col-sm-4 col-md-4 col-lg-4">
                <BlogBox
                    title="Engr. Danilo Nobleza"
                    text=""
                    tag="Provincial Director"
                    author=""
                    action={() => alert("clicked")}
                    
                />
                </div> */}
            {allPosts.map((post, index) => (
              <div key={index} className="col-xs-12 col-sm-4 col-md-4 col-lg-3">
                <BlogBox
                  title={post.title}
                  text={post.text}
                  tag={post.tag}
                  author={post.author}
                  action={() => openModal(post)}
                />
              </div>
            ))}

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
        </div>
      </div>

      {selectedPost && (
        <Dialog open={true} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true"></div>
    
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md bg-white rounded p-6 shadow-lg">
            <DialogTitle className="font-bold text-xl mb-4">{selectedPost.title}</DialogTitle>
            <Description className="mb-4">{selectedPost.tag}</Description>
    
            <div className="mt-4">
              {selectedPost.children ? (
                selectedPost.children.map((child, index) => (
                  <div key={index} className="mb-2">
                    <BlogBox
                      title={child.title}
                      text={child.text}
                      tag={child.tag}
                      author={child.author}
                      action={() => alert(`Clicked on ${child.title}`)}
                    />
                  </div>
                ))
              ) : (
                <p>No children available for this post.</p>
              )}
            </div>
    
            <button
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
              onClick={closeModal}
            >
              Close
            </button>
          </DialogPanel>
        </div>
      </Dialog>
      )}




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