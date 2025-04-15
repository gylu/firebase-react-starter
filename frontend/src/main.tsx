import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Basic MUI Theme (customize as needed)
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Example primary color
    },
    secondary: {
      main: '#dc004e', // Example secondary color
    },
  },
  shape: {
    borderRadius: 8, // Consistent rounded corners
  },
});


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Ensures baseline styles and dark mode compatibility */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
