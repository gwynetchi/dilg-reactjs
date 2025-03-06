import React from 'react';
import TopNav from './navigation/topnav';

const Dashboard = () => {
    return (
        <div>
            <TopNav />
            <h1>Welcome to the Admin Dashboard</h1>
            <p>This is the dashboard you see after logging in.</p>
            {/* Add more dashboard components and functionality here */}
            <iframe width="1000px" height="700px" src="https://docs.google.com/spreadsheets/d/1zseIl5-m0ABOZ39gOHo2zvJQc50rusWtjkH52InCeNY/preview"></iframe>
        </div>
    );
};

export default Dashboard;