import React from "react";

interface InboxControlsProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterType: "all" | "communications" | "programcommunications";
  setFilterType: (value: "all" | "communications" | "programcommunications") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (value: "asc" | "desc") => void;
}

const InboxControls: React.FC<InboxControlsProps> = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  sortOrder,
  setSortOrder,
}) => {
  return (
    <div className="inbox-controls mb-3 d-flex align-items-center gap-3">
      <label htmlFor="searchInput" className="form-label mb-0">Search:</label>
      <input
        id="searchInput"
        type="text"
        placeholder="Search by subject or sender..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="form-control w-50"
      />

      <label htmlFor="filterSelect" className="form-label mb-0">Filter:</label>
      <select
        id="filterSelect"
        value={filterType}
        onChange={(e) =>
          setFilterType(e.target.value as "all" | "communications" | "programcommunications")
        }
        className="form-select w-auto"
      >
        <option value="all">All Types</option>
        <option value="communications">Direct Messages</option>
        <option value="programcommunications">Program Messages</option>
      </select>

      <label htmlFor="sortSelect" className="form-label mb-0">Sort:</label>
      <select
        id="sortSelect"
        value={sortOrder}
        onChange={(e) =>
          setSortOrder(e.target.value as "asc" | "desc")
        }
        className="form-select w-auto"
      >
        <option value="desc">Newest First</option>
        <option value="asc">Oldest First</option>
      </select>
    </div>
  );
};

export default InboxControls;
