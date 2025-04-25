import React from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface OrgChartViewerProps {
  imageUrl: string;
}

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ imageUrl }) => {
  return (
    <div
      className="container-fluid bg-light rounded shadow overflow-hidden position-relative"
      style={{ height: "300px" }} // You can adjust this height
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        wheel={{ disabled: false }}
        doubleClick={{ disabled: false }}
        panning={{ disabled: false }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Controls */}
            <div className="position-absolute top-0 start-0 m-3 d-flex gap-2 z-3">
              <button onClick={() => zoomIn()} className="btn btn-light shadow-sm">
                ➕ Zoom In
              </button>
              <button onClick={() => zoomOut()} className="btn btn-light shadow-sm">
                ➖ Zoom Out
              </button>
              <button onClick={() => resetTransform()} className="btn btn-light shadow-sm">
                🔄 Reset
              </button>
            </div>

            {/* Zoomable Image Area */}
            <TransformComponent>
              <img
                src={imageUrl}
                alt="Org Chart"
                className="w-100 h-auto"
                style={{
                  maxWidth: "none",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

export default OrgChartViewer;



