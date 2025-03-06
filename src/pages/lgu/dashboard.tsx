import React from 'react';
import TopNav from './navigation/topnav';

const Dashboard = () => {
    return (
        <div>
            <TopNav />
            <h1>Welcome to the Viewer Dashboard</h1>
            <p>This is the dashboard you see after logging in.</p>
            {/* Add more dashboard components and functionality here */}
        </div>
    );
};

export default Dashboard;