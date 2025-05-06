// components/CommunicationControls.tsx
import React from "react";

interface Props {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortField: string;
  setSortField: (field: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
}

const CommunicationControls: React.FC<Props> = ({
  searchTerm,
  setSearchTerm,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
}) => {
  return (
    <div className="inbox-controls mb-3 d-flex align-items-center gap-3">
      <label htmlFor="searchInput" className="form-label mb-0">Search:</label>
      <input
        id="searchInput"
        type="text"
        placeholder="Search by subject or remarks..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="form-control w-50"
      />

      <label htmlFor="sortSelect" className="form-label mb-0">Sort By:</label>
      <select
        id="sortSelect"
        value={sortField}
        onChange={(e) => setSortField(e.target.value)}
        className="form-select w-auto"
      >
        <option value="createdAt">Created Date</option>
        <option value="subject">Subject</option>
        <option value="deadline">Deadline</option>
      </select>

      <label htmlFor="orderSelect" className="form-label mb-0">Order:</label>
      <select
        id="orderSelect"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
        className="form-select w-auto"
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </div>
  );
};

export default CommunicationControls;
