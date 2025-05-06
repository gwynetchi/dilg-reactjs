import { useNavigate } from "react-router-dom";
import { FaFileAlt, FaUsers, FaChartBar } from "react-icons/fa";
import "../styles/components/dashboard.css";

const Analytics = () => {
  const navigate = useNavigate(); 

  return (
    <div className="dashboard-container">
        <main>
        <div className="head-title">
            <div className="left">
              <h1>Analytics</h1>
              <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="/dashboards">Home</a>
              </li>
              <li className="breadcrumb-item active">Analytics</li>
            </ol>
          </nav>
            </div>
          </div>
          {/* Analytics Navigation */}
          <div className="analytics-navigation">
            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/submission-analytics")}>
              <FaFileAlt className="analytics-icon" />
              <span>Submission Compliance</span>
            </div>

            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/user-analytics")}>
              <FaUsers className="analytics-icon" />
              <span>User Analytics</span>
            </div>

            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/monthly-analytics")}>
              <FaChartBar className="analytics-icon" />
              <span>Monthly Report</span>
            </div>
          </div>
          </main> 
    </div>
  );
};

export default Analytics;
