import styled from "styled-components";

interface BlogPost {
  title: string;
  text: string;
  tag: string;
  author: string;
  children?: BlogPost[];
}

// Organizational data
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

// Recursive component for the org chart
const OrgChartNode = ({ post }: { post: BlogPost }) => (
  <NodeContainer>
    <div className="node">
      <h3>{post.title}</h3>
      <p>{post.tag}</p>
    </div>
    {post.children && (
      <ChildrenContainer>
        {post.children.map((child, index) => (
          <OrgChartNode key={index} post={child} />
        ))}
      </ChildrenContainer>
    )}
  </NodeContainer>
);

export default function OrgChart() {
  return (
    <Wrapper>
      <h1>Organizational Chart</h1>
      <TreeContainer>
        {allPosts.map((post, index) => (
          <OrgChartNode key={index} post={post} />
        ))}
      </TreeContainer>
    </Wrapper>
  );
}

// Styled Components for Layout
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
`;

const TreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const NodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px;
  position: relative;

  .node {
    background-color: #3498db;
    color: white;
    padding: 10px;
    border-radius: 5px;
    text-align: center;
    min-width: 150px;
  }

  &:before {
    content: "";
    position: absolute;
    top: -20px;
    left: 50%;
    width: 2px;
    height: 20px;
    background: black;
  }

  &:first-child:before {
    display: none;
  }
`;

const ChildrenContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 10px;

  > ${NodeContainer} {
    margin: 0 10px;
  }
`;
