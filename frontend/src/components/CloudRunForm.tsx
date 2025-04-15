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
  const { register, handleSubmit, reset, formState: { errors } } = useForm<IFormInput>();
  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // Function to handle form submission
  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setLoading(true);
    setFormError(null);

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
      if (err.message === 'Cloud Run URL not configured.') {
           setFormError('Cloud Run backend URL is not configured in src/services/api.ts.');
      } else {
           setFormError(err.response?.data?.error || err.message || 'Failed to send data. Check console for details.');
      }
      setSnackbarMessage(formError || 'Failed to send data.'); // Show error in snackbar too
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
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
      {/* Display persistent error related to configuration */}
      {formError && formError.includes('not configured') && <Alert severity="warning">{formError}</Alert>}
      {/* Display temporary submission errors */}
      {formError && !formError.includes('not configured') && <Alert severity="error">{formError}</Alert>}


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
        disabled={loading}
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
        disabled={loading}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        sx={{ alignSelf: 'flex-end' }}
      >
        Send to Cloud Run
      </Button>

       {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000} // Longer duration for errors
        onClose={handleSnackbarClose}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CloudRunForm;
