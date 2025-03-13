
import React, { useEffect, useState } from "react";
import NavBar from "./navigation/navbar";
import "./navigation/dashboard.css";
import { db } from "../../firebase"; // Firebase config
import { doc, getDoc, setDoc } from "firebase/firestore";

const Dashboard = () => {
    const [sheetLink, setSheetLink] = useState("");
    const [inputLink, setInputLink] = useState("");

    useEffect(() => {
        const fetchSheetLink = async () => {
            const docRef = doc(db, "settings", "googleSheet");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const savedLink = docSnap.data().link;
                setSheetLink(savedLink.replace("/edit", "/preview"));
            }
        };
        fetchSheetLink();
    }, []);

    const handleSaveLink = async () => {
        if (!inputLink.includes("docs.google.com/spreadsheets")) {
            alert("Please enter a valid Google Sheets link.");
            return;
        }

        const modifiedLink = inputLink.replace("/edit", "/preview");
        setSheetLink(modifiedLink);

        // Save to Firestore
        await setDoc(doc(db, "settings", "googleSheet"), { link: inputLink });
        alert("Google Sheet link saved!");
    };

    return (
        <div className="dashboard-container">
            <NavBar />
            <section id="content">
                <main>
                    <div className="head-title">
                        <div className="left">
                            <h1>LGU User Dashboard</h1>
                            <ul className="breadcrumb">
                                <li><a href="#">LGU user Tools</a></li>
                                <li><i className="bx bx-chevron-right"></i></li>
                                <li><a className="active" href="#">Home</a></li>
                            </ul>
                        </div>
                        <a href="#" className="btn-download">
                            <i className="bx bxs-cloud-download bx-fade-down-hover"></i>
                            <span className="text">PDF Export</span>
                        </a>
                    </div>

                    <ul className="box-info">
                        <li>
                            <i className="bx bxs-calendar-check"></i>
                            <span className="text">
                                <h3>1020</h3>
                                <p>New Users</p>
                            </span>
                        </li>
                        <li>
                            <i className="bx bxs-group"></i>
                            <span className="text">
                                <h3>2834</h3>
                                <p>Manage Users</p>
                            </span>
                        </li>
                        <li>
                            <i className="bx bxs-user-x"></i>
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
                                <i className="bx bx-search"></i>
                                <i className="bx bx-filter"></i>
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
                                <i className="bx bx-plus icon"></i>
                                <i className="bx bx-filter"></i>
                            </div>
                            <ul className="todo-list">
                                <li className="completed">
                                    <p>Check Inventory</p>
                                    <i className="bx bx-dots-vertical-rounded"></i>
                                </li>
                                <li className="not-completed">
                                    <p>Contact Selma: Confirm Delivery</p>
                                    <i className="bx bx-dots-vertical-rounded"></i>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="google-sheet-section">
                        <h2>Google Sheets Viewer</h2>
                        <input
                            type="text"
                            placeholder="Enter Google Sheet link"
                            value={inputLink}
                            onChange={(e) => setInputLink(e.target.value)}
                        />
                        <button onClick={handleSaveLink}>Save & View</button>

                        {sheetLink && (
                            <iframe
                                width="1000px"
                                height="700px"
                                src={sheetLink}
                                title="Google Sheet"
                                style={{ border: "none", marginTop: "20px" }}
                            ></iframe>
                        )}
                    </div>
                </main>
            </section>
        </div>
    );

};

export default Dashboard;
