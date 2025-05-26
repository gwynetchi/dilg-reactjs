import React from 'react';

interface DeleteConfirmModalProps {
  show: boolean;
  loading: boolean;
  userName?: string;
  userPosition?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  show,
  loading,
  userName,
  userPosition,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Confirm Deletion
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onCancel}
              disabled={loading}
            ></button>
          </div>

          <div className="modal-body">
            <div className="text-center mb-4">
              <i className="bi bi-person-x text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            
            <div className="alert alert-warning" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Warning:</strong> This action cannot be undone!
            </div>

            <p className="mb-3">
              Are you sure you want to delete the following user?
            </p>

            {userName && (
              <div className="card border-danger">
                <div className="card-body text-center">
                  <h6 className="card-title text-danger mb-1">{userName}</h6>
                  {userPosition && (
                    <p className="card-text text-muted small mb-0">{userPosition}</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                This will also remove all hierarchical relationships with this user.
              </small>
            </div>
          </div>

          <div className="modal-footer bg-light">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              <i className="bi bi-arrow-left me-2"></i>Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="bi bi-trash me-2"></i>Delete User
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;