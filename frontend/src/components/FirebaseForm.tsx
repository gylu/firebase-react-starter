import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Box, TextField, Button, CircularProgress, Alert, Snackbar, Typography } from '@mui/material';
import { db, auth } from '../config/firebaseConfig'; // Import potentially null db and auth
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import SendIcon from '@mui/icons-material/Send';

// Define the structure of our form data
interface IFormInput {
  name: string;
  message: string;
}

// Define props type
interface FirebaseFormProps {
    firebaseInitialized: boolean;
}

const FirebaseForm: React.FC<FirebaseFormProps> = ({ firebaseInitialized }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IFormInput>();
  // Use local loading state derived from react-hook-form's isSubmitting
  const loading = isSubmitting;
  const [formError, setFormError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Determine if the form should be disabled
  const isDisabled = !firebaseInitialized || loading;

  // Reset error when firebaseInitialized changes
  useEffect(() => {
      setFormError(null);
  }, [firebaseInitialized]);


  // Function to handle form submission
  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setFormError(null); // Clear previous errors

    // Double-check if Firebase is available before proceeding
    if (!firebaseInitialized || !db) {
      setFormError("Firestore is not available. Please configure Firebase.");
      return; // Stop submission
    }

    // Check if user is logged in (optional, but good practice)
    const currentUser = auth?.currentUser; // Use optional chaining for auth

    try {
      // Add a new document with a generated ID to the 'submissions' collection
      const docRef = await addDoc(collection(db, 'submissions'), {
        name: data.name,
        message: data.message,
        submittedAt: serverTimestamp(), // Add a server-side timestamp
        userId: currentUser?.uid || 'anonymous', // Store user ID if logged in
        userEmail: currentUser?.email || 'anonymous' // Store user email if available
      });
      console.log('Document written with ID: ', docRef.id);
      setSnackbarMessage('Data sent to Firebase successfully!');
      setSnackbarOpen(true);
      reset(); // Clear the form fields
    } catch (e) {
      console.error('Error adding document: ', e);
      setFormError('Failed to send data to Firebase. Please try again.');
    }
    // react-hook-form handles the loading state automatically based on the promise resolution
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
      noValidate // Disable browser validation, rely on react-hook-form
    >
      {/* Show persistent warning if Firebase isn't initialized */}
      {!firebaseInitialized && (
          <Alert severity="warning" sx={{mb: 1}}>
              Firestore is unavailable (Firebase not configured).
          </Alert>
      )}
      {/* Show submission errors */}
      {formError && <Alert severity="error">{formError}</Alert>}

      <TextField
        label="Name"
        variant="outlined"
        fullWidth
        {...register('name', { required: 'Name is required' })}
        error={!!errors.name}
        helperText={errors.name?.message}
        disabled={isDisabled} // Use combined disabled state
      />

      <TextField
        label="Message"
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        {...register('message', { required: 'Message is required' })}
        error={!!errors.message}
        helperText={errors.message?.message}
        disabled={isDisabled} // Use combined disabled state
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isDisabled} // Use combined disabled state
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        sx={{ alignSelf: 'flex-end' }} // Align button to the right
      >
        Send to Firebase
      </Button>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000} // Hide after 4 seconds
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {/* Ensure Alert is included for Snackbar content */}
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FirebaseForm;
