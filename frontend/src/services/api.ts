import axios from 'axios';

// TODO: Replace with your *actual* deployed Cloud Run service URL + path
// Example: const cloudRunUrl = 'https://my-backend-service-abcde12345-uc.a.run.app/api/data';
// For local testing: const cloudRunUrl = 'http://localhost:8080/api/data';
const cloudRunUrl = 'YOUR_CLOUD_RUN_SERVICE_URL/api/data'; // Placeholder

/**
 * Sends data to the Cloud Run backend.
 * @param data - The data object to send.
 * @returns Promise resolving with the response data or rejecting with an error.
 */
export const sendDataToCloudRun = async (data: unknown): Promise<any> => {
  if (cloudRunUrl.startsWith('YOUR_CLOUD_RUN_SERVICE_URL')) {
      console.warn('Cloud Run URL is not configured in src/services/api.ts');
      return Promise.reject(new Error('Cloud Run URL not configured.'));
  }
  try {
    // Using axios for the request
    const response = await axios.post(cloudRunUrl, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('Data sent to Cloud Run successfully:', response.data);
    return response.data; // Return the response from the backend
  } catch (error) {
    console.error('Error sending data to Cloud Run:', error);
    // Provide more specific error feedback if possible
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', error.response?.data || error.message);
    }
    throw error; // Re-throw the error to be caught by the caller
  }
};

// Add other API call functions here if needed (e.g., for Stripe backend endpoints)
// export const createStripePaymentIntent = async (amount: number) => { ... }

