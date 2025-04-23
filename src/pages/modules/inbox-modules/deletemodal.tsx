import React from "react";

interface DeleteMessageModalProps {
  show: boolean;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({ show, onClose, onDelete }) => {
  if (!show) return null;

  return (
    <div className="modal show fade d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Delete</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p>Are you sure you want to delete this message?</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
            type="button" className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessageModal;
