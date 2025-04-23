import React from 'react';

interface Goal {
  text: string;
}

interface Outcome {
  title: string;
  colorClass: string; // Bootstrap bg class
  goals: Goal[];
  fullWidth?: boolean;
}

const outcomes: Outcome[] = [
  {
    title: "Excellence in local governance upheld",
    colorClass: "bg-warning text-dark",
    goals: [
      { text: "Sustain Accountable, Transparent and People-Centric Local Governments" },
      { text: "Project Innovative and Future-Ready Local Governments" },
    ]
  },
  {
    title: "Peaceful, orderly, and safe communities strengthened",
    colorClass: "bg-primary text-white",
    goals: [
      { text: "Bolster Peace and Order Security in Communities" },
      { text: "Enhance Human Rights and Facilitate Prosecution of Violations" },
      { text: "Improve Protection of Communities from Fires and Emergencies" },
    ]
  },
  {
    title: "Resilient communities reinforced",
    colorClass: "bg-success text-white",
    goals: [
      { text: "Intensify Adaptive Capacities of LGUs and Communities to Disasters" }
    ]
  },
  {
    title: "Highly trusted Department and Partner",
    colorClass: "bg-danger text-white",
    goals: [
      { text: "Cultivate a Culture of Accountability and Professionalism" },
      { text: "Infuse Innovative Solutions for Effective Systems and Processes" },
    ],
    fullWidth: false // make this one span the full width
  }
];

const ResultsFramework: React.FC = () => {
  return (
    <div className="container mt-4">
      <div className="row g-4">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className={outcome.fullWidth ? 'col-12' : 'col-md-3'}
          >
            <div className={`card ${outcome.colorClass} h-100`}>
              <div className="card-body">
                <h5 className="card-title fw-bold">{outcome.title}</h5>
                <ul className="mt-3">
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
