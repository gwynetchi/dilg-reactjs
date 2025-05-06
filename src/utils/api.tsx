import { auth } from "../firebase";

export const updateUserCredentials = async (uid: string, email: string, password: string) => {
    try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch('http://localhost:5000/api/update-credentials', {  // 👈 Uses proxy
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ uid, email, password }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error('Error updating credentials:', error);
        throw new Error(
            error.message || 
            'Failed to update credentials. Please check your network connection.'
        );
    }
};