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

const ReportMetricsChart = ({
  totalReports,
  pendingReports,
  lateReports,
  onTimeReports,
  forRevision,
  incomplete,
  noSubmission,
}: any) => {
  // Calculate the completed reports based on the remaining data
  const completedReports = Math.max(0, totalReports - pendingReports - lateReports - onTimeReports - forRevision - incomplete - noSubmission);

  // Pie chart data
  const data = {
    labels: [
      'No Submission', // Red
      'Pending Reports', // Grey
      'Late Reports',  // Blue
      'On Time Reports', // Green
      'Incomplete', // Yellow
      'For Revision', // Orange
    ],
    datasets: [
      {
        data: [
          noSubmission, // Combined No Submission (Pending + No Submission)
          pendingReports,
          lateReports,  // Late Reports
          onTimeReports,  // On Time Reports
          incomplete,      // Incomplete Reports
          forRevision,     // For Revision Reports
          completedReports // Completed Reports (calculated dynamically)
        ],
        backgroundColor: [
          '#FF0000',  // Red for No Submission
          '#808080',  // Grey for Pending Reports
          '#4169e1',  // Blue for Late
          '#4DFF4D',  // Green for On Time
          '#FF0000',  // Yellow for Incomplete
          '#FFB800',  // Orange for Revision
        ],
        hoverOffset: 4,
      },
    ],
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false, // Make sure the chart maintains aspect ratio
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
