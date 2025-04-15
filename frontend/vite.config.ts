import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // Using SWC for faster builds

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // You can change the development port if needed
    open: true // Automatically open the app in the browser
  },
  build: {
    outDir: 'dist' // Ensure the output directory is 'dist' for Firebase Hosting
  }
})
