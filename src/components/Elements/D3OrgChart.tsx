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
  contact: string;
  img: string;
  city: string;
  cluster: string;
  status: string;
  icon: string;
  superiorId?: number;
  subordinates?: number[];
  layout?: "vertical" | "horizontal";
  x?: number;
  y?: number;
}

interface D3OrgChartProps {
  data: OrgChartNode[];
  onNodeClick?: (node: OrgChartNode) => void;
}

const statusColor = {
  present: "#28a745",
  busy: "#ffc107",
  travel: "#17a2b8",
  offline: "#6c757d",
};

const D3OrgChart: React.FC<D3OrgChartProps> = ({ data = [], onNodeClick }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const setTransformRef = useRef<((x: number, y: number, scale: number, animationTime?: number, animationType?: "easeOut" | "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutQuad" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeInQuart" | "easeOutQuart" | "easeInOutQuart" | "easeInQuint" | "easeOutQuint" | "easeInOutQuint" | undefined) => void) | null>(null);

  useEffect(() => {
    try {
      // Validate inputs
      if (!svgRef.current) {
        console.error("SVG container reference is not available");
        return;
      }

      if (!Array.isArray(data) || data.length === 0) {
        console.error("Invalid or empty data provided");
        svgRef.current.innerHTML = "<div class='text-center p-4'>No organization data available</div>";
        return;
      }

      // Clear previous content
      svgRef.current.innerHTML = "";

      // Clone and validate data
      let clonedData: OrgChartNode[];
      try {
        clonedData = JSON.parse(JSON.stringify(data)) as OrgChartNode[];
      } catch (e) {
        console.error("Failed to clone data", e);
        return;
      }

      // Create node map and find root
      const nodeMap = new Map<number, OrgChartNode>();
      clonedData.forEach(node => {
        if (node?.id !== undefined) {
          nodeMap.set(node.id, node);
        }
      });

      if (nodeMap.size === 0) {
        console.error("No valid nodes found in data");
        return;
      }

      const rootData = clonedData.find(d => 
        !clonedData.some(n => n.subordinates?.includes(d.id))
      );

      if (!rootData) {
        console.error("No root node found in data");
        return;
      }

      // Handle dummy node logic
      const dummyId = 999;
      const targetId = 26;
      try {
        const parentNode = clonedData.find(n => n.subordinates?.includes(targetId));
        if (parentNode) {
          if (!Array.isArray(parentNode.subordinates)) {
            parentNode.subordinates = [];
          }
          if (!parentNode.subordinates.includes(dummyId)) {
            parentNode.subordinates.push(dummyId);
            clonedData.push({
              id: dummyId,
              position1: "",
              position2: "",
              name: "",
              email: "",
              contact: "",
              img: "",
              city: "",
              cluster: "",
              status: "offline",
              icon: "",
              subordinates: [],
            });
          }
        }
      } catch (e) {
        console.error("Error processing dummy node", e);
      }

      // Build hierarchy with error handling
      const buildHierarchy = (node: OrgChartNode): any => {
        if (!node) return null;
        
        return {
          ...node,
          children: (node.subordinates || [])
            .map(id => nodeMap.get(id))
            .filter((n): n is OrgChartNode => n !== undefined)
            .map(buildHierarchy)
            .filter(n => n !== null)
        };
      };

      const hierarchyData = buildHierarchy(rootData);
      if (!hierarchyData) {
        console.error("Failed to build hierarchy");
        return;
      }

      const hierarchy = d3.hierarchy(hierarchyData) as d3.HierarchyPointNode<OrgChartNode>;
      if (!hierarchy) {
        console.error("Failed to create d3 hierarchy");
        return;
      }

      // Set dimensions with fallbacks
      const containerWidth = svgRef.current.clientWidth || 1160;
      const containerHeight = svgRef.current.clientHeight || 800;
      const width = Math.max(containerWidth, 800);
      const height = Math.max(containerHeight, 600);

      // Create SVG with error handling
      let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
      try {
        svg = d3.select(svgRef.current)
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("overflow", "visible");
      } catch (e) {
        console.error("Failed to create SVG element", e);
        return;
      }

      const g = svg.append("g").attr("transform", "translate(50,50)");

      // Setup tree layout with fallbacks
      let treeLayout;
      try {
        treeLayout = d3.tree<OrgChartNode>()
          .size([width - 100, height - 50])
          .separation((a, b) => a.parent === b.parent ? 2 : 4);
      } catch (e) {
        console.error("Failed to create tree layout", e);
        return;
      }

      try {
        treeLayout(hierarchy);
      } catch (e) {
        console.error("Failed to apply tree layout", e);
        return;
      }

      // Link generator with fallback
      const elbowLink = (d: d3.HierarchyPointLink<OrgChartNode>) => {
        try {
          const sx = d.source.x || 0;
          const sy = d.source.y || 0;
          const tx = d.target.x || 0;
          const ty = d.target.y || 0;
          const midY = sy + (ty - sy) / 2;
          return `M${sx},${sy}V${midY}H${tx}V${ty}`;
        } catch (e) {
          console.error("Error generating link path", e);
          return "";
        }
      };

      // In D3OrgChart.tsx, modify the custom layout section:
      try {
        hierarchy.each(node => {
          if (!node?.children) return;
          const layout = node.data.layout || "horizontal";

          if (layout === "vertical") {
            const spacingY = 150;
            const baseY = (node.y || 0) + spacingY;
            node.children.forEach((child, i) => {
              if (child) {
                child.x = node.x || 0;
                child.y = baseY + i * spacingY;
              }
            });
          } else {
            // Group by cluster first
            const childrenByCluster = new Map<string, d3.HierarchyPointNode<OrgChartNode>[]>();
            node.children.forEach(child => {
              const childCluster = child.data.cluster || "";
              if (!childrenByCluster.has(childCluster)) {
                childrenByCluster.set(childCluster, []);
              }
              childrenByCluster.get(childCluster)?.push(child);
            });

            const spacingX = 300;
            const clusterSpacing = 400; // Extra space between clusters
            const baseX = node.x || 0;
            
            let clusterOffset = 0;
            let clusterIndex = 0;
            const clusterCount = childrenByCluster.size;

            childrenByCluster.forEach((children, clusterName) => {
              const clusterWidth = (children.length - 1) * spacingX;
              const clusterStartX = baseX - (clusterCount > 1 ? clusterWidth/2 : 0) + clusterOffset;

              children.forEach((child, i) => {
                if (child) {
                  child.x = clusterStartX + i * spacingX;
                  child.y = (node.y || 0) + 150;
                  
                  // Add cluster visual indicator (optional)
                  if (i === 0) {
                    child.data.position2 = `${clusterName} ${child.data.position2 || ''}`.trim();
                  }
                }
              });

              clusterOffset += clusterWidth + clusterSpacing;
              clusterIndex++;
            });
          }
        });
      } catch (e) {
        console.error("Error applying custom layouts", e);
      }

      // Draw links with error handling
      try {
        const links = hierarchy.links() as d3.HierarchyPointLink<OrgChartNode>[];
      g.selectAll(".link")
        .data(links.filter(d => d.target.data.id !== dummyId))
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", d => {
          const sourceCluster = d.source.data.cluster || "";
          const targetCluster = d.target.data.cluster || "";
          return sourceCluster === targetCluster && sourceCluster !== "" ? "#4CAF50" : "#28a745";
        })
        .attr("stroke-width", d => {
          const sourceCluster = d.source.data.cluster || "";
          const targetCluster = d.target.data.cluster || "";
          return sourceCluster === targetCluster && sourceCluster !== "" ? 3 : 2;
        })
        .attr("stroke-linecap", "round")
        .attr("d", elbowLink);
      } catch (e) {
        console.error("Error drawing links", e);
      }

      // Draw nodes with error handling
      try {
        const filteredData = hierarchy.descendants().filter(d => d.data.id !== dummyId);
        const nodeGroup = g.selectAll(".node")
          .data(filteredData)
          .enter()
          .append("g")
          .attr("transform", (d: d3.HierarchyPointNode<OrgChartNode>) => 
            `translate(${d.x || 0},${d.y || 0})`);

        const cardWidth = 290;
        const cardHeight = 110;

        // Node click handler with error handling
        nodeGroup.on("click", (event, d) => {
          try {
            const { x = 0, y = 0 } = d;
            const scale = 1.5;
            const centeredX = -x * scale + width / 2;
            const centeredY = -y * scale + height / 2;

            if (setTransformRef.current) {
              setTransformRef.current(centeredX, centeredY, scale, 300, "easeOut");
            }

            if (onNodeClick) {
              onNodeClick(d.data);
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
          } catch (e) {
            console.error("Error handling node click", e);
          }
        });

        // Draw node cards
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

        nodeGroup.append("rect")
          .attr("x", -cardWidth / 2 + 5)
          .attr("y", -cardHeight / 2 + 5)
          .attr("width", 4)
          .attr("height", cardHeight - 10)
          .attr("rx", 2)
          .attr("fill", d => {
            // Generate a consistent color based on cluster name
            const cluster = d.data.cluster || "";
            if (!cluster) return "#6c757d";
            
            // Simple hash function for consistent colors
            let hash = 0;
            for (let i = 0; i < cluster.length; i++) {
              hash = cluster.charCodeAt(i) + ((hash << 5) - hash);
            }
            const color = `hsl(${Math.abs(hash % 360)}, 70%, 50%)`;
            return color;
          });
        // Draw node images with fallback
        nodeGroup.append("image")
          .attr("xlink:href", d => {
            try {
              return d.data.icon || "https://via.placeholder.com/60";
            } catch {
              return "https://via.placeholder.com/60";
            }
          })
          .attr("x", -cardWidth / 2 + 10)
          .attr("y", -cardHeight / 2 + 10)
          .attr("width", 60)
          .attr("height", 60)
          .attr("clip-path", "circle(30px at center)");

        // Draw node text with fallbacks and truncation
        const addTextWithFallback = (
          selection: d3.Selection<SVGTextElement, d3.HierarchyPointNode<OrgChartNode>, SVGGElement, unknown>,
          getter: (d: OrgChartNode) => string,
          x: number,
          y: number,
          styles: Record<string, string>,
          maxLength?: number
        ) => {
          selection
            .attr("x", x)
            .attr("y", y)
            .text(d => {
              try {
                const text = getter(d.data) || "";
                return maxLength && text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
              } catch {
                return "";
              }
            });

          Object.entries(styles).forEach(([key, value]) => {
            selection.attr(key, value);
          });
        };

        addTextWithFallback(
          nodeGroup.append("text"),
          d => d.name,
          -cardWidth / 2 + 90,
          -cardHeight / 2 + 30,
          {
            "fill": "#ffffff",
            "font-size": "13px",
            "font-weight": "bold"
          },
          20
        );

        addTextWithFallback(
          nodeGroup.append("text"),
          d => d.position1,
          -cardWidth / 2 + 90,
          -cardHeight / 2 + 45,
          {
            "fill": "#cfcfcf",
            "font-size": "11px",
            "font-weight": "bold"
          },
          25
        );

        addTextWithFallback(
          nodeGroup.append("text"),
          d => d.position2,
          -cardWidth / 2 + 90,
          -cardHeight / 2 + 60,
          {
            "fill": "#cfcfcf",
            "font-size": "11px"
          },
          25
        );

        addTextWithFallback(
          nodeGroup.append("text"),
          d => d.email,
          -cardWidth / 2 + 90,
          -cardHeight / 2 + 75,
          {
            "fill": "#ffffff",
            "font-size": "10px"
          }
        );

        // Draw status indicator
        nodeGroup.append("circle")
          .attr("cx", 65)
          .attr("cy", -45)
          .attr("r", 6)
          .attr("fill", d => {
            try {
              return statusColor[d.data.status as keyof typeof statusColor] || "#6c757d";
            } catch {
              return "#6c757d";
            }
          });

        // Add shadow filter
        svg.append("defs")
          .append("filter")
          .attr("id", "shadow")
          .html(`<feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>`);

        // Center on initial node
        if (setTransformRef.current) {
          const nodeToCenterId = 1;
          const nodeToCenter = filteredData.find(d => d.data.id === nodeToCenterId);

          if (nodeToCenter) {
            const { x = 0, y = 0 } = nodeToCenter;
            const scale = 0.4;
            const centeredX = -x * scale + width / 2;
            const centeredY = -y * scale + 100;
            setTransformRef.current(centeredX, centeredY, scale, 500, "easeOut");
          }
        }
      } catch (e) {
        console.error("Error drawing nodes", e);
      }
    } catch (e) {
      console.error("Unexpected error in D3OrgChart", e);
      if (svgRef.current) {
        svgRef.current.innerHTML = "<div class='text-center p-4 text-danger'>Error rendering organization chart</div>";
      }
    }
  }, [data, onNodeClick]);

  return (
    <div className="bg-light rounded shadow position-relative" style={{ height: "800px" }}>
      <TransformWrapper
        initialScale={0.4}
        minScale={0.4}
        maxScale={4}
        wheel={{ disabled: false }}
        doubleClick={{ disabled: false }}
        panning={{ disabled: false }}
        centerOnInit
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
                  try {
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
                  } catch (e) {
                    console.error("Error resetting transform", e);
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