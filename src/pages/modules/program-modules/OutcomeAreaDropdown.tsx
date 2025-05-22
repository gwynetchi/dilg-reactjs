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
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? state.data.color
      : state.isFocused
      ? `${state.data.color}cc`
      : state.data.color,
    color: state.data.textColor,
    cursor: "pointer",
  }),
  singleValue: (base, state) => ({
    ...base,
    backgroundColor: state.data.color,
    color: state.data.textColor,
    padding: "5px 10px",
    borderRadius: "6px",
  }),
};

const OutcomeAreaDropdown: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Select
      inputId="outcomeArea"
      options={outcomeOptions}
      value={value}
      onChange={onChange}
      styles={customStyles}
      placeholder="Select Outcome Area"
      isClearable
    />
  );
};

export default OutcomeAreaDropdown;
