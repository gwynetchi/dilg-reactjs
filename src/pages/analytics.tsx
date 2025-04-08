import { Link, useNavigate } from "react-router-dom";
import { FaFileAlt, FaUsers, FaChartBar } from "react-icons/fa";
import "../styles/components/dashboard.css";

const Analytics = () => {
  const navigate = useNavigate(); 

  return (<main>
    <div className="dashboard-container">
      <section id="content">
        
        <div className="head-title">
            <div className="left">
              <h2>Analytics</h2>
              <ul className="breadcrumb">
                <li>
                  <Link to="/dashboards" className="active">Home</Link>
                </li>
                <li>
                  <i className="bx bx-chevron-right"></i>
                </li>
                <li>
                  <Link to="#" >Analytics</Link>
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
           
      </section>
    </div></main> 
  );
};

export default Analytics;
