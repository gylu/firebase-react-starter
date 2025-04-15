import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Grid, Paper } from '@mui/material';
import { auth, firebaseInitialized } from './config/firebaseConfig'; // Import auth object AND initialization status
import { User, onAuthStateChanged } from 'firebase/auth';

// Import Components
import AuthButtons from './components/AuthButtons';
import FirebaseForm from './components/FirebaseForm';
import CloudRunForm from './components/CloudRunForm';
import StripeForm from './components/StripeForm';

function App() {
  // State to hold the current user
  const [user, setUser] = useState<User | null>(null);
  // State to track loading status (now defaults to false if Firebase isn't initialized)
  const [loading, setLoading] = useState<boolean>(firebaseInitialized); // Only true if Firebase might initialize
  // State for general errors
  const [error, setError] = useState<string | null>(null);

  // Effect to listen for authentication state changes ONLY if Firebase is initialized
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (firebaseInitialized && auth) {
      setLoading(true); // Start loading indicator since we will check auth state
      // onAuthStateChanged returns an unsubscribe function
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser); // Set user to null if logged out, or User object if logged in
        setLoading(false); // Finished loading auth state
        setError(null); // Clear any previous auth errors
        console.log("Auth State Changed:", currentUser ? currentUser.uid : 'No user');
      }, (authError) => {
        // Handle errors during listener setup or events
        console.error("Auth state listener error:", authError);
        setError("Error checking authentication status.");
        setLoading(false);
      });
    } else {
      // If Firebase isn't initialized, we're not loading auth state
      setLoading(false);
    }

    // Cleanup function to unsubscribe when the component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Render Logic ---

  // Show loading indicator ONLY if Firebase was initialized and we are waiting for auth state
  if (loading && firebaseInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Display warning if Firebase is not configured */}
      {!firebaseInitialized && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Firebase is not configured. Authentication and Firestore features are disabled. Please update <code>src/config/firebaseConfig.ts</code> and restart the app.
        </Alert>
      )}
      {/* Display general errors */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}


      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Hello World!
        </Typography>
        {/* Pass potentially null auth and user state to AuthButtons */}
        <AuthButtons user={user} auth={auth} firebaseInitialized={firebaseInitialized} />
      </Box>

      {/* Main Content Area */}
      <Grid container spacing={4} justifyContent="center">

        {/* Image Carousel */}
        <Grid item xs={12} md={8}>
           <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
             <Typography variant="h5" component="h2" gutterBottom align="center">
               Image Carousel
             </Typography>
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
               {/* Pass firebaseInitialized status to the form */}
               <FirebaseForm firebaseInitialized={firebaseInitialized} />
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
