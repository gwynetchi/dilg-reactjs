
//import React from 'react';
//import NavBar from './navigation/navbar';   <NavBar />
import "../../styles/components/dashboard.css"; // Ensure you have the corresponding CSS file

const Dashboard = () => {
    return (
        <div className="dashboard-container">
            {/* SIDEBAR (Handled by NavBar) */}
            {/* CONTENT */}
            <section id="content">
                <main>
                    <div className="head-title">
                        <div className="left">
                            <h1>Evaluator Dashboard</h1>
                            <ul className="breadcrumb">
                                <li><a href="#">Administrative Tools</a></li>
                                <li><i className='bx bx-chevron-right'></i></li>
                                <li><a className="active" href="#">Home</a></li>
                            </ul>
                        </div>
                        <a href="#" className="btn-download">
                            <i className='bx bxs-cloud-download bx-fade-down-hover'></i>
                            <span className="text">PDF Export</span>
                        </a>
                    </div>

                    <ul className="box-info">
                        <li>
                            <i className='bx bxs-calendar-check'></i>
                            <span className="text">
                                <h3>1020</h3>
                                <p>New Users</p>
                            </span>
                        </li>
                        <li>
                            <i className='bx bxs-group'></i>
                            <span className="text">
                                <h3>2834</h3>
                                <p>Manage Users</p>
                            </span>
                        </li>
                        <li>
                            <i className='bx bxs-user-x'></i>
                            <span className="text">
                                <h3>13</h3>
                                <p>Users Not Approved</p>
                            </span>
                        </li>
                    </ul>
                    
                    <div className="table-data">
                        <div className="order">
                            <div className="head">
                                <h3>Recent Users</h3>
                                <i className='bx bx-search'></i>
                                <i className='bx bx-filter'></i>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Creation Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <img src="https://placehold.co/600x400/png" alt="Profile" />
                                            <p>Micheal John</p>
                                        </td>
                                        <td>07-03-2025</td>
                                        <td><span className="status completed">Approved</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="todo">
                            <div className="head">
                                <h3>Todos</h3>
                                <i className='bx bx-plus icon'></i>
                                <i className='bx bx-filter'></i>
                            </div>
                            <ul className="todo-list">
                                <li className="completed">
                                    <p>Check Inventory</p>
                                    <i className='bx bx-dots-vertical-rounded'></i>
                                </li>
                                <li className="not-completed">
                                    <p>Contact Selma: Confirm Delivery</p>
                                    <i className='bx bx-dots-vertical-rounded'></i>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <iframe 
                        width="1000px" 
                        height="700px" 
                        src="https://docs.google.com/spreadsheets/d/1zseIl5-m0ABOZ39gOHo2zvJQc50rusWtjkH52InCeNY/preview">
                    </iframe>
                </main>
            </section>
        </div>
    );

};

export default Dashboard;
