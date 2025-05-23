import { Link, useNavigate } from "react-router-dom";
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
                <Link to="/">Dashboard</Link>
              </li>
              <li className="breadcrumb-item active">Reports Evaluation And Monitoring</li>
            </ol>
          </nav>
            </div>
          </div>
          {/* Analytics Navigation */}
          <div className="analytics-navigation">
            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/submission-analytics")}>
              <FaFileAlt className="analytics-icon" />
              <span>One Shot Reports</span>
            </div>

            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/user-analytics")}>
              <FaUsers className="analytics-icon" />
              <span>User Analytics</span>
            </div>

            <div className="analytics-card" onClick={() => navigate("/evaluator/analytics/monthly-analytics")}>
              <FaChartBar className="analytics-icon" />
              <span>Program Analytics</span>
            </div>
          </div>
          </main> 
    </div>
  );
};

export default Analytics;
