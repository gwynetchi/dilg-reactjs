import React from 'react';

interface Goal {
  text: string;
}

interface Outcome {
  title: string;
  headerClass: string;
  bodyClass: string;
  textClass: string;
  goals: Goal[];
  fullWidth?: boolean;
}

const outcomes: Outcome[] = [
  {
    title: "Excellence in Local Governance Upheld",
    headerClass: "bg-warning text-dark",
    bodyClass: "bg-warning-subtle",
    textClass: "text-dark",
    goals: [
      { text: "1. Sustain Accountable, Transparent and People-Centric Local Governments" },
      { text: "2. Project Innovative and Future-Ready Local Governments" },
    ]
  },
  {
    title: "Peaceful, Orderly, and Safe Communities Strengthened",
    headerClass: "bg-primary text-white",
    bodyClass: "bg-primary-subtle",
    textClass: "text-dark",
    goals: [
      { text: "1. Bolster Peace and Order Security in Communities" },
      { text: "2. Enhance Human Rights and Facilitate Prosecution of Violations" },
      { text: "3. Improve Protection of Communities from Fires and Emergencies" },
    ]
  },
  {
    title: "Resilient Communities Reinforced",
    headerClass: "bg-success text-white",
    bodyClass: "bg-success-subtle",
    textClass: "text-dark",
    goals: [
      { text: "1. Intensify Adaptive Capacities of LGUs and Communities to Disasters" }
    ]
  },
  {
    title: "Inclusive Communities Enabled",
    headerClass: "bg-purple text-white", // use custom CSS class for purple
    bodyClass: "bg-purple-subtle",
    textClass: "text-dark",
    goals: [
      { text: "1. Advance the Full Potential and Interests of Women, Youth, Vulnerable, and At-Risk Sectors as Stakeholders of National Development" }
    ]
  },
  {
    title: "Highly Trusted Department and Partner",
    headerClass: "bg-danger text-white",
    bodyClass: "bg-danger-subtle",
    textClass: "text-dark",
    goals: [
      { text: "1. Cultivate a Culture of Accountability and Professionalism" },
      { text: "2. Infuse Innovative Solutions for Effective Systems and Processes" },
    ],
    fullWidth: true
  }
];

const ResultsFramework: React.FC = () => {
  return (
    <div className="container mt-4">
      <div className="row g-4">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className={`${outcome.fullWidth ? 'col-12' : 'col-md-3'} d-flex`}
          >
            <div className="card w-100 h-100">
              <div className={`card-header fw-bold ${outcome.headerClass}`}>
                {outcome.title}
              </div>
              <div className={`card-body ${outcome.bodyClass} ${outcome.textClass}`}>
                <ul className="mb-0">
                  {outcome.goals.map((goal, i) => (
                    <li key={i}>{goal.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsFramework;
