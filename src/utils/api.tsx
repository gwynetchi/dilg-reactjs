import { auth } from "../firebase";

export const updateUserCredentials = async (uid: string, email: string, password: string) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');

        const token = await currentUser.getIdToken();
        
        const response = await fetch('http://localhost:5000/api/users/update-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                uid, 
                email, 
                password
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Request failed with status ${response.status}`);
        }

        return responseData;
    } catch (error: any) {
        console.error('Error updating credentials:', error);
        throw new Error(
            error.message || 
            'Failed to update credentials. Please check your network connection.'
        );
    }
};

export const deleteUserAccount = async (uid: string, permanent: boolean = false) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Not authenticated');

        const token = await currentUser.getIdToken();
        
        const response = await fetch('http://localhost:5000/api/users/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                uid, 
                permanent
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Handle specific error cases
            if (response.status === 404) {
                throw new Error('The user was not found in the system');
            } else if (response.status === 403) {
                throw new Error('You do not have permission to perform this action');
            }
            throw new Error(responseData.error || `Request failed with status ${response.status}`);
        }

        return responseData;
    } catch (error: any) {
        console.error('Error deleting user:', error);
        // Provide more user-friendly messages
        const message = error.message.includes('Not authenticated') 
            ? 'You need to be logged in to perform this action'
            : error.message.includes('not found')
                ? 'The user account could not be found'
                : 'Failed to delete user. Please try again later';
        
        throw new Error(message);
    }
};