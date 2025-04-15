import React from 'react';
import Carousel from 'react-material-ui-carousel'; // Using this library for simplicity
import { Paper, Box, Typography } from '@mui/material';

// Placeholder images - replace with your actual images or dynamic loading
// Using placehold.co for demonstration
const items = [
  {
    name: "Nature Scene",
    description: "A beautiful landscape.",
    imageUrl: "https://placehold.co/800x400/81C784/FFFFFF?text=Nature+Scene" // Green background
  },
  {
    name: "City Skyline",
    description: "Urban architecture at dusk.",
    imageUrl: "https://placehold.co/800x400/64B5F6/FFFFFF?text=City+Skyline" // Blue background
  },
  {
    name: "Abstract Art",
    description: "Colorful abstract patterns.",
    imageUrl: "https://placehold.co/800x400/FFB74D/FFFFFF?text=Abstract+Art" // Orange background
  }
];

function Item(props: { item: { name: string; description: string; imageUrl: string } }) {
  return (
    <Paper elevation={0} sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
      <Box
        component="img"
        sx={{
          width: '100%',
          height: { xs: 250, sm: 350, md: 400 }, // Responsive height
          display: 'block',
          objectFit: 'cover', // Cover the area without distortion
        }}
        src={props.item.imageUrl}
        alt={props.item.name}
        // Basic fallback for image loading errors
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null; // Prevent infinite loop
          target.src = `https://placehold.co/800x400/cccccc/000000?text=Image+Not+Found`; // Fallback placeholder
        }}
      />
      {/* Optional: Add overlay text */}
      <Box
         sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
            color: 'white',
            padding: '10px',
            boxSizing: 'border-box' // Include padding in width
         }}
      >
         <Typography variant="h6">{props.item.name}</Typography>
         <Typography variant="body2">{props.item.description}</Typography>
      </Box>
    </Paper>
  );
}

function ImageCarousel() {
  return (
    <Carousel
      animation="slide" // "fade" or "slide"
      duration={500}    // Animation duration
      navButtonsAlwaysVisible // Show next/prev buttons always
      indicatorContainerProps={{
          style: {
              marginTop: '-20px', // Adjust indicator position if needed
              textAlign: 'center',
              position: 'relative', // Ensure it's above the overlay if used
              zIndex: 1
          }
      }}
      activeIndicatorIconButtonProps={{
          style: {
              color: '#1976d2' // Active indicator color (theme primary)
          }
      }}
       navButtonsProps={{ // Styling for Nav Buttons (Next & Prev)
            style: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
                borderRadius: '50%'
            }
        }}
    >
      {items.map((item, i) => <Item key={i} item={item} />)}
    </Carousel>
  );
}

export default ImageCarousel;
