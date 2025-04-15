import { useNavigate } from "react-router-dom";
import { FaFileAlt, FaUsers, FaChartBar } from "react-icons/fa";
import "../styles/components/dashboard.css";

const Analytics = () => {
  const navigate = useNavigate(); 

  return (
    <div className="dashboard-container">
      <section id="content">
        <main>
        <div className="head-title">
            <div className="left">
              <h1>Analytics</h1>
              <ul className="breadcrumb">
                <li>
                  <a href="/dashboads" className="active">Home</a>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <a>Analytics</a>
                </li>
              </ul>
            </div>
          </div>
          <section id="content">
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
          </section>
          </main> 
      </section>
    </div>
  );
};

export default Analytics;
