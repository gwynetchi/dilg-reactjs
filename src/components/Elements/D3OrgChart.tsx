import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ZoomControls from "./ZoomControls";


const clusterColors: Record<string, string> = {
  "A": "#0b6e4f",    // Soft white (slightly off-white for better visibility)
  "B": "#89C2D9",    // Deeper pastel blue
  "C": "#FF9BAA",    // Richer pastel red
  "D": "#FFE66D",    // Brighter pastel yellow
  "default": "#B392AC" // Deeper pastel purple
};
const clusterBorderColors: Record<string, string> = {
  "A": "#0b6e4f",    // Light gray
  "B": "#468FAF",    // Darker blue
  "C": "#E86A6A",    // Darker red
  "D": "#FFD43B",    // Golden yellow
  "default": "#8A6A9B" // Darker purple
};
export interface OrgChartNode {
  id: number;
  position1: string;
  position2: string;
  name: string;
  email: string;
  city: string;
  img: string;
  cluster: string;
  subordinates?: number[];
  layout?: "vertical" | "horizontal";
  superiorId?: number;
  section?: "MES" | "FAS" | "CDS" | "PDMU"; 
  x?: number;
  y?: number;
}

interface D3OrgChartProps {
  data: OrgChartNode[];
  onNodeClick?: (node: OrgChartNode) => void;
  selectedNodeId?: number | null;
}

const D3OrgChart: React.FC<D3OrgChartProps> = ({ data = [], onNodeClick, selectedNodeId }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const setTransformRef = useRef<(...args: any) => void>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!Array.isArray(data) || data.length === 0) {
      svgRef.current.innerHTML = "";
      return;
    }

    // Clear previous content
    svgRef.current.innerHTML = "";

    try {
      // Create node map
      const nodeMap = new Map<number, OrgChartNode>();
      data.forEach(node => nodeMap.set(node.id, node));

      // Find root nodes (nodes without superiors)
      const rootNodes = data.filter(node => 
        !data.some(n => n.subordinates?.includes(node.id))
      );

      // Create virtual root if multiple roots exist
      const virtualRoot: OrgChartNode = {
        id: -1,
        name: "Organization",
        position1: "",
        position2: "",
        email: "",
        city: "",
        img: "",
        cluster: "",
        subordinates: rootNodes.map(n => n.id),
        layout: "horizontal"
      };

      // Build hierarchy
      const buildHierarchy = (node: OrgChartNode): any => {
        return {
          ...node,
          children: (node.subordinates || [])
            .map(id => nodeMap.get(id))
            .filter((n): n is OrgChartNode => n !== undefined)
            .map(buildHierarchy)
        };
      };

      const hierarchyData = buildHierarchy(virtualRoot);
      const hierarchy = d3.hierarchy(hierarchyData) as d3.HierarchyPointNode<any>;

      // Set dimensions
      const width = 1160;
      const height = 800;

      // Create SVG
      const svg = d3.select(svgRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible");

      const g = svg.append("g").attr("transform", "translate(50,50)");

      // Setup tree layout with proper spacing
      const treeLayout = d3.tree<OrgChartNode>()
        .size([width - 100, height - 100])
        .nodeSize([250, 200]) // Increased spacing
        .separation((a, b) => a.parent === b.parent ? 1.5 : 2);

      treeLayout(hierarchy);

      // Draw links with smooth curves
      const linkGenerator = d3.linkVertical()
        .x((d: [number, number]) => d[0])
        .y((d: [number, number]) => d[1]);

g.selectAll(".link")
  .data(hierarchy.links())
  .enter()
  .append("path")
  .attr("class", "link")
  .attr("fill", "none")
  .attr("stroke", d => {
    const targetCluster = d.target.data.cluster;
    return clusterBorderColors[targetCluster] || "#28a745";
  })
  .attr("stroke-width", 2.5)
  .attr("stroke-opacity", 0.8)
  .attr("d", d => {
    const source: [number, number] = [d.source.x || 0, d.source.y || 0];
    const target: [number, number] = [d.target.x || 0, d.target.y || 0];
    return linkGenerator({ source, target } as any);
  });

      // Filter out virtual root
      const nodesToDraw = hierarchy.descendants().filter(d => d.data.id !== -1);

            // Draw cluster backgrounds first (so nodes appear on top)
      const clusters = Array.from(new Set(data.map(node => node.cluster))).filter(Boolean);
      
      clusters.forEach(cluster => {
        const clusterNodes = nodesToDraw.filter(d => d.data.cluster === cluster);
        if (clusterNodes.length === 0) return;

        // Calculate cluster bounds
        const xExtent = d3.extent(clusterNodes, d => d.x || 0) as [number, number];
        const yExtent = d3.extent(clusterNodes, d => d.y || 0) as [number, number];
        
        const padding = 40;
        g.append("rect")
          .attr("x", xExtent[0] - padding)
          .attr("y", yExtent[0] - padding)
          .attr("width", xExtent[1] - xExtent[0] + padding * 2)
          .attr("height", yExtent[1] - yExtent[0] + padding * 2)
          .attr("rx", 15)
          .attr("fill", clusterColors[cluster] || clusterColors.default)
          .attr("opacity", cluster === "A" ? 0.15 : 0.25) // More subtle for white cluster
          .attr("stroke", clusterBorderColors[cluster] || clusterBorderColors.default)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5");

        // Add cluster label
g.append("text")
  .attr("x", xExtent[0] - padding + 10)
  .attr("y", yExtent[0] - padding + 20)
  .attr("font-size", "14px")
  .attr("font-weight", "bold")
  .attr("fill", clusterBorderColors[cluster] || clusterBorderColors.default)
  .text(`Cluster ${cluster} (${clusterNodes.length} members)`);
      });

      // Draw nodes
      const nodeGroup = g.selectAll(".node")
        .data(nodesToDraw)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`)
        .style("cursor", "pointer");

      const cardWidth = 290;
      const cardHeight = 110;

      // Node click handler
      nodeGroup.on("click", function(event, d: d3.HierarchyPointNode<any>) {
        event.stopPropagation();
        
        if (setTransformRef.current) {
          const scale = 1.5;
          const centeredX = -d.x * scale + width / 2;
          const centeredY = -d.y * scale + height / 2;
          setTransformRef.current(centeredX, centeredY, scale, 300, "easeOut");
        }

        if (onNodeClick) {
          onNodeClick(d.data);
        }

        d3.select(this)
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

      // Node card background
nodeGroup.append("rect")
  .attr("x", -cardWidth / 2)
  .attr("y", -cardHeight / 2)
  .attr("width", cardWidth)
  .attr("height", cardHeight)
  .attr("rx", 10)
  .attr("fill", function(d: any) { return clusterBorderColors[d.data.cluster || ""] || "#ff9900"; })
  .attr("stroke", d => clusterBorderColors[d.data.cluster || ""] || "#ff9900")
  .attr("stroke-width", 1)
  .attr("filter", "url(#shadow)");
      // Node image
// Replace the image append code with this:
nodeGroup.append("image")
  .attr("xlink:href", d => d.data.img || "https://res.cloudinary.com/dr5c99td8/image/upload/v1747795819/xrmnclcohou8vu9x6fic.jpg")
  .attr("x", -cardWidth / 2 + 10)
  .attr("y", -cardHeight / 2 + 10)
  .attr("width", 60)
  .attr("height", 60)
  .attr("clip-path", "circle(30px at center)")
  .on("error", function() {
    // Fallback to placeholder if image fails to load
    d3.select(this)
      .attr("xlink:href", "https://res.cloudinary.com/dr5c99td8/image/upload/v1747795819/xrmnclcohou8vu9x6fic.jpg")
      .attr("width", 60)
      .attr("height", 60);
  });
      // Node name
      nodeGroup.append("text")
        .attr("x", -cardWidth / 2 + 90)
        .attr("y", -cardHeight / 2 + 30)
        .attr("fill", "#ffffff")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text(d => d.data.name);

      // Position 1
      nodeGroup.append("text")
        .attr("x", -cardWidth / 2 + 90)
        .attr("y", -cardHeight / 2 + 45)
        .attr("fill", "#cfcfcf")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text(d => d.data.position1);

      // Position 2
      nodeGroup.append("text")
        .attr("x", -cardWidth / 2 + 90)
        .attr("y", -cardHeight / 2 + 60)
        .attr("fill", "#cfcfcf")
        .attr("font-size", "11px")
        .text(d => d.data.position2);

      // Email (with truncation)
      nodeGroup.append("text")
        .attr("x", -cardWidth / 2 + 90)
        .attr("y", -cardHeight / 2 + 75)
        .attr("fill", "#ffffff")
        .attr("font-size", "10px")
        .text(d => {
          const city = d.data.city || "Unknown";
          const cluster = d.data.cluster || "No Cluster";
          return `${city} • Cluster ${cluster}`;
        })
        .call(text => text.each(function() {
          const self = d3.select(this);
          const textLength = (self.node() as SVGTextElement).getComputedTextLength();
          if (textLength > cardWidth - 20) {
            self.text(self.text().substring(0, 28) + '...');
          }
        }));
      // Add shadow filter
      svg.append("defs")
        .append("filter")
        .attr("id", "shadow")
        .html(`<feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>`);

      // Center initial view
      if (setTransformRef.current && nodesToDraw.length > 0) {
        const firstNode = nodesToDraw[0];
        const scale = 0.7;
        const centeredX = -(firstNode.data.x || 0) * scale + width / 3;
        const centeredY = -(firstNode.data.y || 0) * scale + height / 4;
        setTransformRef.current(centeredX, centeredY, scale, 500, "easeOut");
      }
      const clustersWithData = Array.from(new Set(data.map(d => d.cluster))).filter(Boolean);
      
      const legend = svg.append("g")
        .attr("transform", `translate(${width - 220}, 30)`)
        .attr("class", "chart-legend");

      legend.append("rect")
        .attr("width", 180)
        .attr("height", clustersWithData.length * 25 + 25)
        .attr("fill", "white")
        .attr("opacity", 0.9)
        .attr("rx", 5)
        .attr("stroke", "#ddd");

      legend.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Cluster Legend");

      clustersWithData.forEach((cluster, i) => {
        const legendItem = legend.append("g")
          .attr("transform", `translate(10, ${i * 25 + 30})`);

legendItem.append("rect")
  .attr("width", 15)
  .attr("height", 15)
  .attr("rx", 3)
  .attr("fill", clusterColors[cluster] || clusterColors.default)  // THIS WAS MISSING
  .attr("stroke", clusterBorderColors[cluster] || clusterBorderColors.default);

        legendItem.append("text")
          .attr("x", 20)
          .attr("y", 12)
          .attr("font-size", "12px")
          .attr("fill", "#333")
          .text(`Cluster ${cluster}`);
      });
    if (selectedNodeId && setTransformRef.current) {
      const selectedNode = nodesToDraw.find(d => d.data.id === selectedNodeId);
      if (selectedNode) {
        const scale = 1.5;
        const containerWidth = width;
        const containerHeight = height;
        const centeredX = containerWidth / 2 - (selectedNode.x || 0) * scale;
        const centeredY = containerHeight / 2 - (selectedNode.y || 0) * scale;
        setTransformRef.current(centeredX, centeredY, scale, 300, "easeOut");
      }
    }

    } catch (e) {
      console.error("Error rendering org chart:", e);
      if (svgRef.current) {
        svgRef.current.innerHTML = "<div class='text-center p-4 text-danger'>Error rendering organization chart</div>";
      }
    }
  }, [data, onNodeClick]);

  return (
    <div className="bg-light rounded shadow position-relative" style={{ height: "800px" }}>
      <TransformWrapper
        initialScale={0.1}
        minScale={0.1}
        maxScale={4}
        wheel={{ disabled: false }}
        doubleClick={{ disabled: false }}
        panning={{ disabled: false }}
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, setTransform }) => {
          setTransformRef.current = setTransform;
          return (
            <>
              <ZoomControls 
                zoomIn={zoomIn} 
                zoomOut={zoomOut} 
                resetTransform={() => {
                  if (data.length > 0 && setTransformRef.current) {
                    const firstNode = data[0];
                    const scale = 0.1;
                    const centeredX = -(firstNode.x || 0) * scale + 720 / 3;
                    const centeredY = -(firstNode.y || 0) * scale + 100;
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