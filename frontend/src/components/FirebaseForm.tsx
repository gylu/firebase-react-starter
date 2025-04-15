import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Box, TextField, Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import { db, auth } from '../config/firebaseConfig'; // Import Firestore instance and auth
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import SendIcon from '@mui/icons-material/Send';

// Define the structure of our form data
interface IFormInput {
  name: string;
  message: string;
}

const FirebaseForm: React.FC = () => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<IFormInput>();
  const [loading, setLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  // Function to handle form submission
  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setLoading(true);
    setFormError(null);

    // Check if user is logged in (optional, but good practice)
    const currentUser = auth.currentUser;
    // if (!currentUser) {
    //   setFormError("You must be logged in to submit data.");
    //   setLoading(false);
    //   return;
    // }

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
      noValidate // Disable browser validation, rely on react-hook-form
    >
      {formError && <Alert severity="error">{formError}</Alert>}

      <TextField
        label="Name"
        variant="outlined"
        fullWidth
        {...register('name', { required: 'Name is required' })}
        error={!!errors.name}
        helperText={errors.name?.message}
        disabled={loading}
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
        disabled={loading}
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={loading}
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
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FirebaseForm;
