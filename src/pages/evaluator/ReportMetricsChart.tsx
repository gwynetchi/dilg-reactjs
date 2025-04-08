import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale);

const ReportMetricsChart = ({ totalReports, pendingReports, lateReports, onTimeReports }: any) => {
  const completedReports = totalReports - pendingReports - lateReports - onTimeReports; // Completed reports calculation

  const data = {
    labels: ['Pending Reports', 'Late Reports', 'On Time Reports', 'No Submission'],  // Pie chart labels
    datasets: [
      {
        data: [
          pendingReports, 
          lateReports, 
          onTimeReports,  // On time reports
          completedReports, // Completed reports (calculated dynamically)
        ], // Pie chart data
        backgroundColor: ['#FFB800', '#4169e1', '#4DFF4D', '#343A40'], // Colors for each segment
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // 👈 this is crucial
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
    <div className="report-metrics-chart" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center'}}>
      <h3>Report Status Breakdown</h3>
      <div style={{ position: 'relative', height: '510px', width: '100%' }}>
        <Pie data={data} options={options} />
      </div>
    </div>
  );
};

export default ReportMetricsChart;
