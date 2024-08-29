import axios from 'axios';
import { Alert } from 'react-native';
import { BASE_URL } from './server_config.js';

// Reporting and hiding posts for explore and home page
export async function addReport(selectedPostId: string | null, reason: string) {
  console.log('es!')

    try {
        if (!selectedPostId) throw new Error('No post selected for reporting');
        
        // POST to django backend
        const response = await axios.post(`${BASE_URL}/add_report`, {
            selectedPostId: selectedPostId,
            reason: reason
        }, {
            withCredentials: true // 
        });

        if (response.status === 200) {
            Alert.alert('Report submitted', 'Thank you for your contribution to help keep our platform safe!');
        } else {
            throw new Error(response.data.error || 'An error occurred while submitting the report');
        }
    } catch (error) {
        if (error instanceof Error) {
            Alert.alert('Error', error.message);
        }
    }
}

export async function handleHide(auth:any, postId: string) {
    
    if (!auth.session) return; // Return early if no active user session

    try {
        // Make a POST request to your Django backend
        const response = await axios.post(`${BASE_URL}/handle_hide`, {
            postId: postId
        }, {
            withCredentials: true 
          }); 

        if (response.status === 200) {
            Alert.alert('Post successfully blocked');
        } else {
            throw new Error(response.data.error || 'An error occurred while blocking the post');
        }
    } catch (error) {
        if (error instanceof Error) {
            Alert.alert('Error', error.message);
        }
    }
}
