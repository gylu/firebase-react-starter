import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, TextField, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  User,
  ConfirmationResult,
  Auth // Import Auth type
} from 'firebase/auth';
// Note: We pass auth down as a prop now, don't import directly from config
import GoogleIcon from '@mui/icons-material/Google';
import PhoneIcon from '@mui/icons-material/Phone';
import LogoutIcon from '@mui/icons-material/Logout';

// Define props type for the component
interface AuthButtonsProps {
  user: User | null;
  auth: Auth | null; // Accept potentially null auth object
  firebaseInitialized: boolean; // Know if Firebase is configured
}

const AuthButtons: React.FC<AuthButtonsProps> = ({ user, auth, firebaseInitialized }) => {
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

  // Clean up reCAPTCHA on unmount or when auth becomes unavailable
  useEffect(() => {
    return () => {
      // Attempt to find and remove the reCAPTCHA widget if it exists
      try {
        const widgetId = recaptchaContainerRef.current?.querySelector('iframe')?.closest('[id^="___grecaptcha_"]')?.id;
        if (widgetId && typeof window !== 'undefined' && (window as any).grecaptcha) {
            (window as any).grecaptcha.reset(widgetId);
        }
        // Also clear the verifier ref
        recaptchaVerifierRef.current = null;
      } catch (e) {
        console.warn("Error cleaning up reCAPTCHA:", e);
      }
    };
  }, []);


  // --- Google Sign-In ---
  const handleGoogleSignIn = async () => {
    if (!auth) {
        setError("Firebase Auth not available.");
        return;
    }
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
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
     if (!auth) {
        setError("Firebase Auth not available.");
        return;
     }
     if (!phoneNumber || !recaptchaContainerRef.current) {
        setError("Phone number is required and reCAPTCHA container must exist.");
        return;
     }
     setLoading(true);
     setError(null);

     try {
        // Initialize reCAPTCHA only once or if needed again
        if (!recaptchaVerifierRef.current) {
             recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                 'size': 'invisible',
                 'callback': (response: any) => { console.log("reCAPTCHA verified", response); },
                 'expired-callback': () => {
                     setError("reCAPTCHA verification expired. Please try again.");
                     recaptchaVerifierRef.current?.render().then(widgetId => {
                         // @ts-ignore
                         window.grecaptcha?.reset(widgetId);
                     }).catch(e => console.warn("Error resetting expired reCAPTCHA", e));
                     setLoading(false);
                 }
             });
             await recaptchaVerifierRef.current.render();
             console.log("reCAPTCHA rendered");
        }

        // const phoneProvider = new PhoneAuthProvider(auth); // Not needed directly for signInWithPhoneNumber
        const result = await signInWithPhoneNumber(auth, `+${phoneNumber}`, recaptchaVerifierRef.current);
        setConfirmationResult(result);
        setShowOtpInput(true);
        setShowPhoneInput(false);
        console.log('OTP sent successfully.');

     } catch (err: any) {
        console.error('Phone Sign-In error (Step 1 - Send OTP):', err);
        setError(err.message || 'Failed to send OTP. Check phone number format (e.g., 1XXXXXXXXXX) and reCAPTCHA setup.');
        // Reset reCAPTCHA on error
        recaptchaVerifierRef.current?.render().then(widgetId => {
            // @ts-ignore
             window.grecaptcha?.reset(widgetId);
        }).catch(e => console.warn("Error resetting reCAPTCHA on OTP send error", e));
     } finally {
        setLoading(false);
     }
  };

  // --- Phone Sign-In: Step 2 (Verify OTP) ---
  const handleOtpSubmit = async () => {
    if (!auth) {
        setError("Firebase Auth not available.");
        return;
    }
    if (!otp || !confirmationResult) {
      setError('OTP is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(otp);
      console.log('Phone Sign-In successful (OTP verified)');
      setShowOtpInput(false);
      setOtp('');
      setPhoneNumber('');
    } catch (err: any) {
      console.error('Phone Sign-In error (Step 2 - Verify OTP):', err);
      setError(err.message || 'Failed to verify OTP. It might be incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };


  // --- Sign Out ---
  const handleSignOut = async () => {
    if (!auth) {
        setError("Firebase Auth not available.");
        return;
    }
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      console.log('Sign Out successful');
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

  // Don't render auth buttons if Firebase isn't initialized
  if (!firebaseInitialized) {
      return (
          <Typography variant="caption" color="textSecondary">
              Authentication unavailable (Firebase not configured).
          </Typography>
      );
  }

  // If Firebase is initialized, proceed with normal logic
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
          disabled={loading || !auth} // Disable if no auth
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
        disabled={loading || showPhoneInput || showOtpInput || !auth} // Disable if no auth
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
          disabled={loading || !auth} // Disable if no auth
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
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={loading}
                />
                 {/* reCAPTCHA Container */}
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
        <Dialog open={showOtpInput} onClose={() => { setShowOtpInput(false); setError(null); }}>
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
                    type="number"
                    fullWidth
                    variant="outlined"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    inputProps={{ maxLength: 6 }}
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
