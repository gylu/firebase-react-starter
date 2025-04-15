import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Box, TextField, Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import { sendDataToCloudRun } from '../services/api'; // Import the API function
import SendIcon from '@mui/icons-material/Send';

// Define the structure of our form data
interface IFormInput {
  email: string;
  feedback: string;
}

const CloudRunForm: React.FC = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IFormInput>();
  const loading = isSubmitting; // Use react-hook-form's state
  const [formError, setFormError] = useState<string | null>(null); // For general/submission errors
  const [configError, setConfigError] = useState<string | null>(null); // Specific error for config issue
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');

  // Function to handle form submission
  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setFormError(null); // Clear previous submission errors
    setConfigError(null); // Clear previous config errors

    try {
      // Call the API service function
      const response = await sendDataToCloudRun(data);
      console.log('Response from Cloud Run:', response);
      setSnackbarMessage(response?.message || 'Data sent to Cloud Run successfully!'); // Use backend message if available
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      reset(); // Clear the form fields
    } catch (err: any) {
      console.error('Error sending data via API service: ', err);
      // Check if the error is the specific 'not configured' error
      const configErrorMessage = 'Cloud Run URL not configured.';
      if (err.message === configErrorMessage) {
           // Set the specific config error state to display a persistent warning
           setConfigError('Cloud Run backend URL is not configured in src/services/api.ts.');
           setSnackbarMessage(configErrorMessage); // Show in snackbar too
           setSnackbarSeverity('warning');
      } else {
           // Handle other submission errors
           const errorMessage = err.response?.data?.error || err.message || 'Failed to send data. Check console for details.';
           setFormError(errorMessage);
           setSnackbarMessage(errorMessage);
           setSnackbarSeverity('error');
      }
      setSnackbarOpen(true); // Open snackbar for both config and other errors
    }
    // react-hook-form handles loading state
  };

   // Handle Snackbar close
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      noValidate
    >
      {/* Display persistent warning if Cloud Run URL is not configured */}
      {configError && <Alert severity="warning" sx={{mb: 1}}>{configError}</Alert>}
      {/* Display temporary submission errors */}
      {formError && <Alert severity="error">{formError}</Alert>}


      <TextField
        label="Email Address"
        variant="outlined"
        type="email"
        fullWidth
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
        error={!!errors.email}
        helperText={errors.email?.message}
        disabled={loading} // Disable while submitting
      />

      <TextField
        label="Feedback"
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        {...register('feedback', { required: 'Feedback cannot be empty' })}
        error={!!errors.feedback}
        helperText={errors.feedback?.message}
        disabled={loading} // Disable while submitting
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading} // Disable while submitting
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        sx={{ alignSelf: 'flex-end' }}
      >
        Send to Cloud Run
      </Button>

       {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000} // Longer duration for errors/warnings
        onClose={handleSnackbarClose}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Ensure Alert is included for Snackbar content */}
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CloudRunForm;
