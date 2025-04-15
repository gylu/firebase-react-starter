import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Grid, Paper } from '@mui/material';
import { auth } from './config/firebaseConfig'; // Import auth object
import { User, onAuthStateChanged } from 'firebase/auth';

// Import Components
import AuthButtons from './components/AuthButtons';
import ImageCarousel from './components/ImageCarousel';
import FirebaseForm from './components/FirebaseForm';
import CloudRunForm from './components/CloudRunForm';
import StripeForm from './components/StripeForm';

function App() {
  // State to hold the current user
  const [user, setUser] = useState<User | null>(null);
  // State to track loading status during auth check
  const [loading, setLoading] = useState<boolean>(true);
  // State for general errors
  const [error, setError] = useState<string | null>(null);

  // Effect to listen for authentication state changes
  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set user to null if logged out, or User object if logged in
      setLoading(false); // Finished loading auth state
      setError(null); // Clear any previous auth errors
      console.log("Auth State Changed:", currentUser ? currentUser.uid : 'No user');
    }, (authError) => {
      // Handle errors during listener setup or events
      console.error("Auth state listener error:", authError);
      setError("Error checking authentication status. Please refresh.");
      setLoading(false);
    });

    // Cleanup function to unsubscribe when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Render Logic ---

  // Show loading indicator while checking auth state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Display general errors */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Hello World!
        </Typography>
        {/* Authentication Buttons */}
        <AuthButtons user={user} />
      </Box>

      {/* Main Content Area */}
      <Grid container spacing={4} justifyContent="center">

        {/* Image Carousel */}
        <Grid item xs={12} md={8}>
           <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
             <Typography variant="h5" component="h2" gutterBottom align="center">
               Image Carousel
             </Typography>
            <ImageCarousel />
           </Paper>
        </Grid>

        {/* Forms Section */}
        <Grid item xs={12} container spacing={4} justifyContent="center">
          {/* Firebase Form */}
          <Grid item xs={12} md={6}>
             <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
               <Typography variant="h6" component="h3" gutterBottom>
                 Send Data to Firebase Firestore
               </Typography>
               <FirebaseForm />
             </Paper>
          </Grid>

          {/* Cloud Run Form */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
               <Typography variant="h6" component="h3" gutterBottom>
                 Send Data to Cloud Run Backend
               </Typography>
               <CloudRunForm />
             </Paper>
          </Grid>
        </Grid>

        {/* Stripe Payment Form Section */}
         <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, mt: 4, borderRadius: 2 }}>
               <Typography variant="h6" component="h3" gutterBottom>
                 Simulated Stripe Payment
               </Typography>
               <StripeForm />
            </Paper>
         </Grid>

      </Grid>

    </Container>
  );
}

export default App;
