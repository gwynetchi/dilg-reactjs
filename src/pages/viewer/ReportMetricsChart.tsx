import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale } from 'chart.js';

// Register necessary components with Chart.js
ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale);

const ReportMetricsChart = ({ totalReports, pendingReports, lateReports }: any) => {
  const data = {
    labels: ['Pending Reports', 'Late Reports', 'Completed Reports'],  // Pie chart labels
    datasets: [
      {
        data: [
          pendingReports, 
          lateReports, 
          totalReports - pendingReports - lateReports
        ], // Pie chart data (calculated dynamically)
        backgroundColor: ['#FFB800', '#4169e1', '#4DFF4D'], // Colors for each segment
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.label}: ${tooltipItem.raw} (${((tooltipItem.raw / totalReports) * 100).toFixed(2)}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="report-metrics-chart">
      <h3>Report Status Breakdown</h3>
      <Pie data={data} options={options} />
    </div>
  );
};

export default ReportMetricsChart;
