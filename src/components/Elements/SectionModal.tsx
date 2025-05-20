// src/components/Elements/SectionModal.tsx
import React, { useState } from "react";
import styled from "styled-components";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { OrgChartNode } from "./D3OrgChart";

interface SectionModalProps {
  section: "MES" | "FAS" | "CDS";
  onClose: () => void;
}

const SectionModal: React.FC<SectionModalProps> = ({ section, onClose }) => {
  const [users, setUsers] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "orgdata"));
        const items: OrgChartNode[] = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: +data.id,
              name: data.name || "",
              position1: data.position1 || "",
              position2: data.position2 || "",
              email: data.email || "",
              contact: data.contact || "",
              img: data.img || "",
              city: data.city || "",
              cluster: data.cluster || "",
              status: data.status || "offline",
              layout: data.layout as "vertical" | "horizontal" || "horizontal",
              section: data.section || "",
              subordinates: (data.subordinates || []).map((s: any) => +s),
              superiorId: data.superiorId ?? null,
            };
          })
          .filter(user => user.section === section);
        
        setUsers(items);
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [section]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.position1.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSectionFullName = (section: string) => {
    switch (section) {
      case "MES":
        return "Monitoring and Evaluation Section";
      case "FAS":
        return "Financial and Administrative Section";
      case "CDS":
        return "Capability Development Section";
      default:
        return section;
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{getSectionFullName(section)}</h2>
            <SectionSubtitle>Department Members</SectionSubtitle>
          </div>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <TotalMembers>{filteredUsers.length} members</TotalMembers>
        </SearchContainer>
        
        {loading ? (
          <LoadingContainer>
            <LoadingSpinner />
            <p>Loading members...</p>
          </LoadingContainer>
        ) : (
          <UserList>
            {filteredUsers.length === 0 ? (
              <EmptyState>
                <p>No members found in this section.</p>
                {searchTerm && <p>Try adjusting your search term.</p>}
              </EmptyState>
            ) : (
              filteredUsers.map(user => (
                <UserItem key={user.id}>
                  <UserImage src={user.img || "https://via.placeholder.com/80"} alt={user.name} />
                  <UserInfo>
                    <UserName>{user.name}</UserName>
                    <UserPosition>{user.position1}</UserPosition>
                    {user.position2 && <UserDesignation>{user.position2}</UserDesignation>}
                    <UserContact>
                      {user.email && <div>📧 {user.email}</div>}
                    </UserContact>
                  </UserInfo>
                </UserItem>
              ))
            )}
          </UserList>
        )}
      </ModalContainer>
    </ModalOverlay>
  );
};

// Styled components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContainer = styled.div`
  background: white;
  border-radius: 12px;
  width: 85%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 25px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;

  h2 {
    margin: 0;
    color: #2c3e50;
    font-size: 1.8rem;
  }
`;

const SectionSubtitle = styled.p`
  margin: 5px 0 0;
  color: #7f8c8d;
  font-size: 0.9rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #7f8c8d;
  padding: 5px;
  margin-top: -10px;
  margin-right: -10px;
  transition: color 0.2s;

  &:hover {
    color: #e74c3c;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;

  &:focus {
    border-color: #3498db;
  }
`;

const TotalMembers = styled.span`
  background: #3498db;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #7f8c8d;
`;

const LoadingSpinner = styled.div`
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const UserList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 5px;
`;

const UserItem = styled.div`
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 8px;
  display: flex;
  gap: 15px;
  align-items: flex-start;
  transition: transform 0.2s, box-shadow 0.2s;
  background: white;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
`;

const UserImage = styled.img`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #eee;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h3`
  margin: 0 0 5px;
  color: #2c3e50;
  font-size: 1.1rem;
`;

const UserPosition = styled.p`
  margin: 0 0 3px;
  color: #3498db;
  font-size: 0.9rem;
  font-weight: 500;
`;

const UserDesignation = styled.p`
  margin: 0 0 8px;
  color: #7f8c8d;
  font-size: 0.85rem;
`;

const UserContact = styled.div`
  margin-top: 8px;
  font-size: 0.85rem;
  color: #34495e;

  div {
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
`;

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #7f8c8d;

  p {
    margin: 5px 0;
  }
`;

export default SectionModal;