import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ZoomControls from "./ZoomControls";


export interface OrgChartNode {
  id: number;
  position1: string;
  position2: string;
  name: string;
  email: string;
  status: string;
  icon: string;
  subordinates?: number[];
   layout?: "vertical" | "horizontal"; // ✅ Add this line
  x?: number; // <- add these
  y?: number;
}

interface D3OrgChartProps {
  data: OrgChartNode[];
}

const statusColor = {
  present: "#28a745",
  busy: "#ffc107",
  travel: "#17a2b8",
  offline: "#6c757d",
};

const D3OrgChart: React.FC<D3OrgChartProps> = ({ data }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const setTransformRef = useRef<((x: number, y: number, scale: number, animationTime?: number, animationType?: "linear" | "easeOut" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeInQuart" | "easeOutQuart" | "easeInOutQuart" | "easeInQuint" | "easeOutQuint" | "easeInOutQuint") => void) | null>(null);


  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.innerHTML = "";
    

    // Clone data to avoid mutating original
    const clonedData = JSON.parse(JSON.stringify(data)) as OrgChartNode[];

    const nodeMap = new Map<number, OrgChartNode>();
    clonedData.forEach(node => nodeMap.set(node.id, node));
    const rootData = clonedData.find(d => !clonedData.some(n => n.subordinates?.includes(d.id)));

    // Add dummy sibling beside node 26
    const targetId = 26;
    const dummyId = 999;
    const parentNode = clonedData.find(n => n.subordinates?.includes(targetId));

    if (parentNode && !parentNode.subordinates?.includes(dummyId)) {
      parentNode.subordinates?.push(dummyId);
      clonedData.push({
        id: dummyId,
        position1: "",
        position2: "",
        name: "",
        email: "",
        status: "offline",
        icon: "",
        subordinates: [],
        
      });
    }

    const buildHierarchy = (node: OrgChartNode): any => ({
      ...node,
      children: node.subordinates
      ?.map(id => nodeMap.get(id))
      .filter((n): n is OrgChartNode => n !== undefined)
      .map(buildHierarchy) || [],
        });

const hierarchy = d3.hierarchy(buildHierarchy(rootData!)) as d3.HierarchyPointNode<OrgChartNode>;
    const width = 1160;
    const height = 800;

    const svg = d3.select(svgRef.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("overflow", "visible");

    const g = svg.append("g").attr("transform", "translate(50,50)");

const treeLayout = d3.tree<OrgChartNode>()
  .size([width - 100, height - 50])
  .separation((a, b) => a.parent === b.parent ? 2 : 4);

treeLayout(hierarchy);

    const elbowLink = (d: d3.HierarchyPointLink<OrgChartNode>) => {
      const sx = d.source.x!;
      const sy = d.source.y!;
      const tx = d.target.x!;
      const ty = d.target.y!;
      const midY = sy + (ty - sy) / 2;
      return `M${sx},${sy}V${midY}H${tx}V${ty}`;
    };

    hierarchy.each(node => {
      if (!node.children) return;
      const layout = node.data.layout || "horizontal";

      if (layout === "vertical") {
        const spacingY = 150;
        const baseY = node.y! + spacingY;
        node.children.forEach((child, i) => {
          child.x = node.x!;
          child.y = baseY + i * spacingY;
        });
      } else {
        const spacingX = 300;
        const baseX = node.x!;
        node.children.forEach((child, i) => {if (node.children && node.children.length > 0) {
          child.x = baseX + (i - Math.floor(node.children.length / 2)) * spacingX;}
        });
      }
    });

const links = hierarchy.links() as d3.HierarchyPointLink<OrgChartNode>[];

g.selectAll(".link")
  .data(links.filter(d => d.target.data.id !== dummyId))

      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#28a745")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("d", elbowLink);

    const filteredData = hierarchy.descendants().filter(d => d.data.id !== dummyId);
    const nodeGroup = g.selectAll(".node")
      .data(filteredData)
      .enter()
      .append("g")
.attr("transform", (d: d3.HierarchyPointNode<OrgChartNode>) => `translate(${d.x},${d.y})`);


    const cardWidth = 290;
    const cardHeight = 110;
nodeGroup.on("click", (event, d) => {
  const { x, y } = d;
  const scale = 1.5;
  const centeredX = -x * scale + width / 2;
  const centeredY = -y * scale + height / 2;

  if (setTransformRef.current) {
    setTransformRef.current(centeredX, centeredY, scale, 300, "easeOut");
  }

  d3.select(event.currentTarget)
    .select("rect")
    .transition()
    .duration(300)
    .attr("stroke", "#f96332")
    .attr("stroke-width", 4)
    .transition()
    .duration(1000)
    .attr("stroke", "#001f3f")
    .attr("stroke-width", 1);
});

    
    
    nodeGroup.append("rect")
      .attr("x", -cardWidth / 2)
      .attr("y", -cardHeight / 2)
      .attr("width", cardWidth)
      .attr("height", cardHeight)
      .attr("rx", 10)
      .attr("fill", "#022350")
      .attr("stroke", "#ff9900")
      .attr("stroke-width", 1)
      .attr("filter", "url(#shadow)");

    nodeGroup.append("rect")
      .attr("x", -cardWidth / 2)
      .attr("y", cardHeight / 2 - 6)
      .attr("width", cardWidth)
      .attr("height", 6)
      .attr("fill", "#f96332");

      nodeGroup.append("image")
      .attr("xlink:href", d => d.data.icon || "https://via.placeholder.com/60")
      .attr("x", -cardWidth / 2 + 10)
      .attr("y", -cardHeight / 2 + 10)
      .attr("width", 60)
      .attr("height", 60)
      .attr("clip-path", "circle(30px at center)");  // <- 30px radius for 60x60 image
    

    nodeGroup.append("text")
      .attr("x", -cardWidth / 2 + 90)
      .attr("y", -cardHeight / 2 + 30)
      .attr("fill", "#ffffff")
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .text(d => d.data.name);

    nodeGroup.append("text")
      .attr("x", -cardWidth / 2 + 90)
      .attr("y", -cardHeight / 2 + 45)
      .attr("fill", "#cfcfcf")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text(d => d.data.position1);

      nodeGroup.append("text")
      .attr("x", -cardWidth / 2 + 90)
      .attr("y", -cardHeight / 2 + 60)
      .attr("fill", "#cfcfcf")
      .attr("font-size", "11px")
      .text(d => d.data.position2);

    nodeGroup.append("text")
      .attr("x", -cardWidth / 2 + 90)
      .attr("y", -cardHeight / 2 + 75)
      .attr("fill", "#ffffff")
      .attr("font-size", "10px")
      .text(d => d.data.email)
      .call(text => text.each(function () {
        const self = d3.select(this);
        const textLength = (self.node() as SVGTextElement).getComputedTextLength();
        if (textLength > cardWidth - 20) {
          self.text(self.text().substring(0, 28) + '...');
        }
      }));

    nodeGroup.append("circle")
      .attr("cx", 65)
      .attr("cy", -45)
      .attr("r", 6)
      .attr("fill", d => statusColor[d.data.status as keyof typeof statusColor] || "#6c757d");

    svg.append("defs")
      .append("filter")
      .attr("id", "shadow")
      .html(`<feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>`);
  
      if (setTransformRef.current) {
        const nodeToCenterId = 1; // <-- Set the ID of the node you want to center
        const nodeToCenter = filteredData.find(d => d.data.id === nodeToCenterId);
  
        if (nodeToCenter) {
          const { x, y } = nodeToCenter;
          const scale = 0.4; // Adjust zoom level as needed
          const centeredX = -x * scale + width / 2;
          const centeredY = -y * scale + 100; // Push it higher toward top (smaller = higher)
          setTransformRef.current(centeredX, centeredY, scale, 500, "easeOut");
        }
        
      }
  
  }, [data]);

  return (
    <div className="bg-light rounded shadow position-relative" style={{ height: "800px" }}>
<TransformWrapper
  initialScale={0.4}
  minScale={0.4}
  maxScale={4}
  wheel={{ disabled: false }}
  doubleClick={{ disabled: false }}
  panning={{ disabled: false }}
  centerOnInit // disable if you want full freedom
  limitToBounds={false} // allow free dragging outside edges
>

  {({ zoomIn, zoomOut, setTransform }) => {
    // Store setTransform in the ref
    setTransformRef.current = setTransform;

    return (
      <>  
<ZoomControls 
  zoomIn={zoomIn} 
  zoomOut={zoomOut} 
  resetTransform={() => {
    const nodeToCenterId = 1;
    const nodeToCenter = data.find(d => d.id === nodeToCenterId);
    if (nodeToCenter && setTransformRef.current) {
      const x = nodeToCenter.x || 0;
      const y = nodeToCenter.y || 0;
      const scale = 0.4;
      const centeredX = -x * scale + 720 / 2;
      const centeredY = -y * scale + 100;
      setTransformRef.current(centeredX, centeredY, scale, 500, "easeOut");
    }
  }} 
/>
        <TransformComponent>
          <div ref={svgRef} />
        </TransformComponent>
        
      </>
    );
  }}

</TransformWrapper>


    </div>
  );
};

export default D3OrgChart;
