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

const ReportMetricsChart = ({ totalReports, pendingReports, lateReports, onTimeReports, forRevision, incomplete }: any) => {
  const completedReports = totalReports - pendingReports - lateReports - onTimeReports - forRevision - incomplete; // Completed reports calculation

  const data = {
    labels: [
      'Pending Reports', 
      'Late Reports', 
      'On Time Reports', 
      'No Submission', 
      'Incomplete', 
      'For Revision'
    ],
    datasets: [
      {
        data: [
          pendingReports, 
          lateReports, 
          onTimeReports,  // On time reports
          incomplete,      // Incomplete reports
          forRevision,     // For Revision reports
          completedReports // Completed reports
        ],
        backgroundColor: [
          '#FF0000',  // Red for No Submission (Pending or Late)
          '#4169e1',  // Blue for Late
          '#4DFF4D',  // Green for On Time
          '#FFB800',  // Orange for Revision
          '#FFFF00',  // Yellow for Incomplete
          '#343A40'   // Default color for completed (or you can choose another color)
        ],
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
