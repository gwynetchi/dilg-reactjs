// components/OutcomeAreaDropdown.tsx
import React from "react";
import Select, { SingleValue, StylesConfig } from "react-select";

export interface OutcomeOption {
  value: string;
  label: string;
  color: string;
  textColor: string;
}

interface Props {
  value: OutcomeOption | null;
  onChange: (selected: SingleValue<OutcomeOption>) => void;
}

const outcomeOptions: OutcomeOption[] = [
  {
    value: "Excellence in Local Governance Upheld",
    label: "Excellence in Local Governance Upheld",
    color: "#ffc107",
    textColor: "#000",
  },
  {
    value: "Peaceful, Orderly, and Safe Communities Strengthened",
    label: "Peaceful, Orderly, and Safe Communities Strengthened",
    color: "#0d6efd",
    textColor: "#fff",
  },
  {
    value: "Resilient Communities Reinforced",
    label: "Resilient Communities Reinforced",
    color: "#198754",
    textColor: "#fff",
  },
  {
    value: "Inclusive Communities Enabled",
    label: "Inclusive Communities Enabled",
    color: "#6f42c1",
    textColor: "#fff",
  },
  {
    value: "Highly Trusted Department and Partner",
    label: "Highly Trusted Department and Partner",
    color: "#dc3545",
    textColor: "#fff",
  },
];

const customStyles: StylesConfig<OutcomeOption, false> = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? state.data.color 
      : state.isFocused 
      ? `${state.data.color}80` 
      : 'white',
    color: state.isSelected || state.isFocused ? state.data.textColor : '#212529',
    ':active': {
      backgroundColor: state.data.color,
      color: state.data.textColor
    }
  }),
  singleValue: (provided, state) => ({
    ...provided,
    backgroundColor: state.data.color,
    color: state.data.textColor,
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '500'
  }),
  control: (provided) => ({
    ...provided,
    borderColor: '#dee2e6',
    ':hover': {
      borderColor: '#adb5bd'
    }
  })
};

const OutcomeAreaDropdown: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Select
      options={outcomeOptions}
      value={value}
      onChange={onChange}
      styles={customStyles}
      className="basic-select"
      classNamePrefix="select"
      placeholder="Select outcome area..."
      isClearable
    />
  );
};

export default OutcomeAreaDropdown;