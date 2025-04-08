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

const ReportMetricsChart = ({ totalReports, pendingReports, lateReports }: any) => {
  const data = {
    labels: ['Pending Reports', 'Late Reports', 'Completed Reports'],
    datasets: [
      {
        data: [
          pendingReports,
          lateReports,
          totalReports - pendingReports - lateReports,
        ],
        backgroundColor: ['#FFB800', '#FF4D4D', '#4DFF4D'],
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
