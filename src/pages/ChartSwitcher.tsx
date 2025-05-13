import React, { useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
  Sector,
} from "recharts";
import { Button, ButtonGroup, Card } from "react-bootstrap";

interface ChartData {
  status: string;
  autoCount: number;
  manualCount: number;
}

interface ChartSwitcherProps {
  data: ChartData[];
  title?: string;
  statusColors: Record<string, string>;
}

const ChartSwitcher: React.FC<ChartSwitcherProps> = ({ data, title = "Status Distribution", statusColors }) => {
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Transform data for pie chart
  const transformDataForPie = (type: "auto" | "manual") => {
    return data.map((item) => ({
      name: item.status,
      value: type === "auto" ? item.autoCount : item.manualCount,
      color: statusColors[item.status],
    })).filter(item => item.value > 0); // Filter out zero values
  };

  const pieData = {
    auto: transformDataForPie("auto"),
    manual: transformDataForPie("manual"),
  };

  // Custom active shape for pie chart for better visualization
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 8}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <text x={cx} y={cy} dy={-15} textAnchor="middle" fill={fill} style={{ fontWeight: 'bold' }}>
          {payload.name}
        </text>
        <text x={cx} y={cy} dy={15} textAnchor="middle" fill="#333">
          {value} ({(percent * 100).toFixed(0)}%)
        </text>
      </g>
    );
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (chartType === "bar") {
        return (
          <div className="custom-tooltip" style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
          }}>
            <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={`item-${index}`} style={{ margin: '3px 0', color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            ))}
          </div>
        );
      } else {
        // Pie chart tooltip
        return (
          <div className="custom-tooltip" style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            padding: '10px', 
            border: '1px solid #ccc', 
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
          }}>
            <p className="label" style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].name}</p>
            <p style={{ margin: '3px 0', color: payload[0].color }}>
              Count: {payload[0].value}
            </p>
            <p style={{ margin: '3px 0', fontSize: '0.9em' }}>
              Percentage: {((payload[0].value / 
                pieData[payload[0].dataKey.includes('auto') ? 'auto' : 'manual']
                  .reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
            </p>
          </div>
        );
      }
    }
    return null;
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title>{title}</Card.Title>
          <ButtonGroup>
            <Button
              variant={chartType === "bar" ? "primary" : "outline-primary"}
              onClick={() => setChartType("bar")}
              size="sm"
            >
              <i className="bx bx-bar-chart-alt-2 me-1"></i>
              Bar Chart
            </Button>
            <Button
              variant={chartType === "pie" ? "primary" : "outline-primary"}
              onClick={() => setChartType("pie")}
              size="sm"
            >
              <i className="bx bx-pie-chart-alt me-1"></i>
              Pie Chart
            </Button>
          </ButtonGroup>
        </div>

        {chartType === "bar" ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                wrapperStyle={{ paddingBottom: "10px" }} 
              />
              
              {/* Auto Status Bar (Lighter Color) */}
              <Bar dataKey="autoCount" name="Auto Status" barSize={40} isAnimationActive={true}>
                {data.map((entry, index) => (
                  <Cell key={`auto-cell-${index}`} fill={statusColors[entry.status] + "90"} />
                ))}
              </Bar>
          
              {/* Manual Status Bar (Darker Color) */}
              <Bar dataKey="manualCount" name="Evaluator Status" barSize={40} isAnimationActive={true}>
                {data.map((entry, index) => (
                  <Cell key={`manual-cell-${index}`} fill={statusColors[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="d-flex flex-column flex-md-row">
            <div className="w-100 w-md-50 mb-4 mb-md-0">
              <h6 className="text-center mb-2">Auto Status</h6>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieData.auto}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    onMouseEnter={onPieEnter}
                  >
                    {pieData.auto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label value="Auto Status" position="center" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-100 w-md-50">
              <h6 className="text-center mb-2">Evaluator Status</h6>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieData.manual}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    onMouseEnter={onPieEnter}
                  >
                    {pieData.manual.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label value="Evaluator Status" position="center" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartType === "pie" && (
          <div className="text-center text-muted mt-3" style={{ fontSize: "0.85rem" }}>
            <i className="bx bx-info-circle me-1"></i>
            Hover over segments for details | Click chart type buttons to switch views
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ChartSwitcher;