import React from 'react';
import ReportMetricsChart from "../pages/ReportMetricsChart";

// Component styles
// const metricStyles = {
//   metricCard: {
//     padding: "12px",
//     borderRadius: "8px",
//     boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
//     marginBottom: "10px",
//     display: "flex",
//     alignItems: "center",
//     backgroundColor: "#fff"
//   },
//   metricIcon: {
//     fontSize: "24px",
//     marginRight: "10px"
//   },
//   metricContent: {
//     flex: 1
//   },
//   metricLabel: {
//     fontSize: "12px",
//     color: "#666",
//     marginBottom: "2px"
//   },
//   metricValue: {
//     fontSize: "16px",
//     fontWeight: "bold"
//   },
//   metricProgress: {
//     height: "4px",
//     backgroundColor: "#e9ecef",
//     borderRadius: "2px",
//     marginTop: "5px",
//     position: "relative" as const
//   },
//   progressBar: {
//     height: "100%",
//     borderRadius: "2px",
//     position: "absolute" as const
//   },
//   percentText: {
//     fontSize: "10px",
//     position: "absolute" as const,
//     right: "0",
//     top: "-15px"
//   }
// };

interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  percent?: string;
}

interface MetricsChartSectionProps {
  totalReports: number;
  activeUsers: number;
  onTimeReports: number;
  pendingReports: number;
  lateReports: number;
  forRevision: number;
  incomplete: number;
  noSubmission: number;
  chartType: string;
  setChartType: (type: string) => void;
}

const MetricsChartSection: React.FC<MetricsChartSectionProps> = ({
  totalReports,
  activeUsers,
  onTimeReports,
  pendingReports,
  lateReports,
  forRevision,
  incomplete,
  noSubmission,
  chartType,
  setChartType
}) => {
  // Calculate percentage
  const getPercentage = (value: number) => {
    return totalReports > 0 ? (value / totalReports * 100).toFixed(1) : "0.0";
  };

  // Metric card data
  const metricCards: MetricCardProps[] = [
    { 
      label: "Total Reports", 
      value: totalReports, 
      icon: "bx bx-file",
      color: "black" 
    },
    { 
      label: "Active Users", 
      value: activeUsers, 
      icon: "bx bx-user-check",
      color: "#673AB7" 
    },
    {
      label: "On Time",
      value: onTimeReports,
      percent: getPercentage(onTimeReports),
      icon: "bx bx-check-circle",
      color: "#4CAF50"
    },
    {
      label: "Pending",
      value: pendingReports,
      percent: getPercentage(pendingReports),
      icon: "bx bx-time",
      color: "#9E9E9E"
    },
    {
      label: "Late",
      value: lateReports,
      percent: getPercentage(lateReports),
      icon: "bx bx-error",
      color: "#2196F3"
    },
    {
      label: "For Revision",
      value: forRevision,
      percent: getPercentage(forRevision),
      icon: "bx bx-revision",
      color: "#FF9800"
    },
    {
      label: "Incomplete",
      value: incomplete,
      percent: getPercentage(incomplete),
      icon: "bx bx-x-circle",
      color: "#FFC107"
    },
    {
      label: "No Submission",
      value: noSubmission,
      percent: getPercentage(noSubmission),
      icon: "bx bx-block",
      color: "#F44336"
    }
  ];

  // Chart colors
  const chartColors = {
    onTime: "#4CAF50",
    pending: "#9E9E9E",
    late: "#2196F3",
    forRevision: "#FF9800",
    incomplete: "#FFC107",
    noSubmission: "#F44336",
    total: "black"
  };

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row">
          {/* Metrics Column */}
          <div className="col-lg-5">
            <h6 className="mb-3">Evaluation Metrics</h6>
            <div className="row g-2">
              {metricCards.map((metric, index) => (
                <div key={index} className="col-md-6 col-lg-6">
                  <div className="card">
                    <div className="card-body p-2" style={{borderLeft: `3px solid ${metric.color}`}}>
                      <div className="d-flex align-items-center">
                        <div style={{color: metric.color, fontSize: "20px"}} className="me-2">
                          <i className={metric.icon}></i>
                        </div>
                        <div>
                          <div className="small text-muted">{metric.label}</div>
                          <div className="fw-bold">{metric.value}</div>
                          {metric.percent && (
                            <div className="progress mt-1" style={{height: "3px"}}>
                              <div 
                                className="progress-bar" 
                                role="progressbar"
                                style={{width: `${metric.percent}%`, backgroundColor: metric.color}}
                                aria-valuenow={parseFloat(metric.percent)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              ></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Chart Column */}
          <div className="col-lg-7">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Report Metrics Visualization</h6>
              <div className="btn-group btn-group-sm">
                <button 
                  className={`btn ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </button>
                <button 
                  className={`btn ${chartType === 'pie' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setChartType('pie')}
                >
                  Pie
                </button>
                <button 
                  className={`btn ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setChartType('line')}
                >
                  Line
                </button>
              </div>
            </div>
            <div className="chart-container" style={{height: "280px"}}>
              <ReportMetricsChart
                totalReports={totalReports}
                pendingReports={pendingReports}
                lateReports={lateReports}
                onTimeReports={onTimeReports}
                forRevision={forRevision}
                incomplete={incomplete}
                noSubmission={noSubmission}
                chartType={chartType}
                colors={chartColors}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsChartSection;