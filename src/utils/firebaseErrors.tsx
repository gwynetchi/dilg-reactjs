// utils/firebaseErrors.ts
export const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please use a different email.';
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled.';
      case 'auth/weak-password':
        return 'The password is too weak (minimum 6 characters).';
      case 'auth/user-not-found':
        return 'No user found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'auth/requires-recent-login':
        return 'This operation requires recent authentication. Please log in again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };