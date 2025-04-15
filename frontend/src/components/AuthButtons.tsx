import React, { useState, useRef } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier, // Import RecaptchaVerifier
  User, // Import User type
  ConfirmationResult // Import ConfirmationResult type
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Import configured auth instance
import GoogleIcon from '@mui/icons-material/Google';
import PhoneIcon from '@mui/icons-material/Phone';
import LogoutIcon from '@mui/icons-material/Logout';

// Define props type for the component
interface AuthButtonsProps {
  user: User | null; // Pass the user state from App.tsx
}

const AuthButtons: React.FC<AuthButtonsProps> = ({ user }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneInput, setShowPhoneInput] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showOtpInput, setShowOtpInput] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Ref for the reCAPTCHA container
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  // Store the recaptchaVerifier instance
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);


  // --- Google Sign-In ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // User state will be updated by the onAuthStateChanged listener in App.tsx
      console.log('Google Sign-In successful');
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  // --- Phone Sign-In: Step 1 (Send OTP) ---
  const handlePhoneSignInRequest = async () => {
     if (!phoneNumber || !recaptchaContainerRef.current) {
        setError("Phone number is required and reCAPTCHA container must exist.");
        return;
     }
     setLoading(true);
     setError(null);

     try {
        // Initialize reCAPTCHA only once or if needed again
        if (!recaptchaVerifierRef.current) {
             // Ensure the container is visible or use invisible reCAPTCHA
             recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                 'size': 'invisible', // Use 'normal' or 'compact' if you want a visible widget
                 'callback': (response: any) => {
                     // reCAPTCHA solved, allow signInWithPhoneNumber.
                     console.log("reCAPTCHA verified", response);
                     // This callback might be triggered automatically for invisible reCAPTCHA
                 },
                 'expired-callback': () => {
                     // Response expired. Ask user to solve reCAPTCHA again.
                     setError("reCAPTCHA verification expired. Please try again.");
                     // Reset reCAPTCHA if necessary
                     recaptchaVerifierRef.current?.render().then(widgetId => {
                         // @ts-ignore - grecaptcha might not be typed perfectly
                         window.grecaptcha?.reset(widgetId);
                     });
                     setLoading(false);
                 }
             });
             // Render the reCAPTCHA (important step!)
             await recaptchaVerifierRef.current.render();
             console.log("reCAPTCHA rendered");
        }


        const phoneProvider = new PhoneAuthProvider(auth);
        const result = await signInWithPhoneNumber(auth, `+${phoneNumber}`, recaptchaVerifierRef.current);
        setConfirmationResult(result);
        setShowOtpInput(true); // Show OTP input field
        setShowPhoneInput(false); // Hide phone number input
        console.log('OTP sent successfully.');

     } catch (err: any) {
        console.error('Phone Sign-In error (Step 1 - Send OTP):', err);
        setError(err.message || 'Failed to send OTP. Check phone number format (e.g., 1XXXXXXXXXX) and reCAPTCHA setup.');
        // Reset reCAPTCHA on error
        recaptchaVerifierRef.current?.render().then(widgetId => {
            // @ts-ignore
             window.grecaptcha?.reset(widgetId);
        });
     } finally {
        setLoading(false);
     }
  };

  // --- Phone Sign-In: Step 2 (Verify OTP) ---
  const handleOtpSubmit = async () => {
    if (!otp || !confirmationResult) {
      setError('OTP is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(otp);
      // User state will be updated by the onAuthStateChanged listener in App.tsx
      console.log('Phone Sign-In successful (OTP verified)');
      setShowOtpInput(false); // Hide OTP input
      setOtp(''); // Clear OTP field
      setPhoneNumber(''); // Clear phone number field
    } catch (err: any) {
      console.error('Phone Sign-In error (Step 2 - Verify OTP):', err);
      setError(err.message || 'Failed to verify OTP. It might be incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };


  // --- Sign Out ---
  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      // User state will be updated by the onAuthStateChanged listener in App.tsx
      console.log('Sign Out successful');
      // Reset phone auth state
      setShowPhoneInput(false);
      setShowOtpInput(false);
      setPhoneNumber('');
      setOtp('');
      setConfirmationResult(null);
       // Reset reCAPTCHA if it exists
       recaptchaVerifierRef.current?.render().then(widgetId => {
           if (typeof window !== 'undefined' && (window as any).grecaptcha) {
               (window as any).grecaptcha.reset(widgetId);
           }
       }).catch(err => console.error("Error resetting reCAPTCHA on sign out:", err));

    } catch (err: any) {
      console.error('Sign Out error:', err);
      setError(err.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  // --- UI Rendering ---

  if (user) {
    // User is logged in
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Welcome, {user.displayName || user.email || user.phoneNumber || 'User'}!
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSignOut}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LogoutIcon />}
        >
          Sign Out
        </Button>
      </Box>
    );
  }

  // User is logged out - Show Sign-In Options
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
       {error && <Alert severity="error" sx={{ width: '100%', mb: 1 }}>{error}</Alert>}

      {/* Google Sign-In Button */}
      <Button
        variant="contained"
        onClick={handleGoogleSignIn}
        disabled={loading || showPhoneInput || showOtpInput}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
        sx={{ minWidth: '220px' }}
      >
        Sign In with Google
      </Button>

      {/* Phone Sign-In Button / Inputs */}
      {!showPhoneInput && !showOtpInput && (
        <Button
          variant="outlined"
          onClick={() => { setShowPhoneInput(true); setError(null); }}
          disabled={loading}
          startIcon={<PhoneIcon />}
          sx={{ minWidth: '220px' }}
        >
          Sign In with Phone
        </Button>
      )}

       {/* Phone Number Input Dialog */}
        <Dialog open={showPhoneInput} onClose={() => { setShowPhoneInput(false); setError(null); }}>
            <DialogTitle>Enter Phone Number</DialogTitle>
            <DialogContent>
                <Typography variant="caption" display="block" gutterBottom>
                    Include country code (e.g., 1 for US/Canada).
                </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="phone"
                    label="Phone Number (e.g., 1XXXXXXXXXX)"
                    type="tel"
                    fullWidth
                    variant="outlined"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} // Allow only numbers
                    disabled={loading}
                />
                 {/* reCAPTCHA Container - MUST be present in the DOM */}
                 <div ref={recaptchaContainerRef} id="recaptcha-container-id" style={{ marginTop: '10px' }}></div>
                 {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => { setShowPhoneInput(false); setError(null); }} disabled={loading}>Cancel</Button>
                <Button onClick={handlePhoneSignInRequest} variant="contained" disabled={loading || !phoneNumber}>
                    {loading ? <CircularProgress size={24} /> : 'Send OTP'}
                </Button>
            </DialogActions>
        </Dialog>

        {/* OTP Input Dialog */}
        <Dialog open={showOtpInput} onClose={() => { setShowOtpInput(false); setError(null); /* Don't clear confirmationResult here */ }}>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogContent>
                 <Typography variant="body2" gutterBottom>
                    Enter the code sent to +{phoneNumber}.
                 </Typography>
                <TextField
                    autoFocus
                    margin="dense"
                    id="otp"
                    label="Verification Code"
                    type="number" // Use number for easier input on mobile
                    fullWidth
                    variant="outlined"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    inputProps={{ maxLength: 6 }} // Standard OTP length
                />
                 {error && <Alert severity="error" sx={{ width: '100%', mt: 1 }}>{error}</Alert>}
            </DialogContent>
             <DialogActions>
                <Button onClick={() => { setShowOtpInput(false); setError(null); }} disabled={loading}>Cancel</Button>
                <Button onClick={handleOtpSubmit} variant="contained" disabled={loading || !otp}>
                     {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
                </Button>
            </DialogActions>
        </Dialog>


    </Box>
  );
};

export default AuthButtons;
