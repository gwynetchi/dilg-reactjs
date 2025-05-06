import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Register all required chart components
ChartJS.register(
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  PointElement,
  LineElement
);

const ReportMetricsChart = ({
  totalReports,
  pendingReports,
  lateReports,
  onTimeReports,
  forRevision,
  incomplete,
  noSubmission,
  chartType = 'pie', // Default to pie chart
  colors,
}: any) => {
  // Using the provided colors or fallback to defaults
  const chartColors = colors || {
    onTime: "#4CAF50",
    pending: "#9E9E9E",
    late: "#2196F3",
    forRevision: "#FF9800", 
    incomplete: "#FFC107",
    noSubmission: "#F44336",
    total: "black"
  };

  // Labels for the chart
  const labels = [
    'No Submission',
    'Pending Reports',
    'Late Reports',
    'On Time Reports',
    'Incomplete',
    'For Revision',
  ];

  // Data values
  const dataValues = [
    noSubmission,
    pendingReports,
    lateReports,
    onTimeReports,
    incomplete,
    forRevision,
  ];

  // Color values
  const colorValues = [
    chartColors.noSubmission,
    chartColors.pending,
    chartColors.late,
    chartColors.onTime,
    chartColors.incomplete,
    chartColors.forRevision,
  ];

  // Common data structure for pie and bar charts
  const baseData = {
    labels: labels,
    datasets: [
      {
        label: 'Report Metrics',
        data: dataValues,
        backgroundColor: chartType === 'line' ? chartColors.primary : colorValues,
        borderColor: chartType === 'pie' ? '#ffffff' : colorValues,
        borderWidth: 1,
        borderRadius: chartType === 'bar' ? 4 : 0,
        hoverOffset: chartType === 'pie' ? 5 : 0,
        maxBarThickness: 50,
      },
    ],
  };

  // Line chart needs a different data structure
  const lineData = {
    labels: labels,
    datasets: labels.map((label, index) => ({
      label: label,
      data: [0, 0, 0, 0, 0, 0], // Initialize with zeros
      backgroundColor: colorValues[index],
      borderColor: colorValues[index],
      pointBackgroundColor: colorValues[index],
      tension: 0.1,
      pointRadius: 4,
      fill: false,
    })),
  };
  
  // Fill in the actual data for line chart
  // Since line chart needs data points over time, we'll just use a single value for demonstration
  if (chartType === 'line') {
    lineData.datasets.forEach((dataset, index) => {
      dataset.data[index] = dataValues[index]; // Set the value at its own index
    });
  }

  // Select data based on chart type
  const data = chartType === 'line' ? lineData : baseData;

  // Pie chart specific options
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 20,
        left: 10, 
        right: 10
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          padding: 10,
          font: {
            size: 9,
          },
        },
        margin: 15,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.label}: ${tooltipItem.raw} (${((tooltipItem.raw / totalReports) * 100).toFixed(1)}%)`;
          },
        },
      },
    },
  };

  // Bar chart specific options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 5, 
        right: 5
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          drawBorder: false,
          borderDash: [2],
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
          }
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 9,
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
    },
    plugins: {
      legend: {
        display: false, // Hide legend as labels are on x-axis
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `Count: ${tooltipItem.raw} (${((tooltipItem.raw / totalReports) * 100).toFixed(1)}%)`;
          },
        },
      },
    },
  };

  // Line chart specific options
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 5, 
        right: 5
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          borderDash: [2],
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 10,
          }
        }
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 9,
          }
        }
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          usePointStyle: true,
          padding: 6,
          font: {
            size: 8,
          },
        },
      },
    },
  };

  // Select options based on chart type
  let options;
  switch(chartType) {
    case 'pie':
      options = pieOptions;
      break;
    case 'bar':
      options = barOptions;
      break;
    case 'line':
      options = lineOptions;
      break;
    default:
      options = pieOptions;
  }

  return (
    <div className="h-100 w-100 d-flex flex-column">
      <div className="chart-container mt-4" style={{ position: 'relative', height: '100%', width: '100%', flex: 1 }}>
        {chartType === 'pie' && <Pie data={data} options={options} />}
        {chartType === 'bar' && <Bar data={data} options={options} />}
        {chartType === 'line' && <Line data={data} options={options} />}
        {!['pie', 'bar', 'line'].includes(chartType) && (
          <div className="text-center p-3">
            <p>Unsupported chart type: {chartType}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportMetricsChart;