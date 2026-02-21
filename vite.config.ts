import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    https: true, // FIX #10: enforce HTTPS — Web Speech API requires a secure context
  },
  optimizeDeps: {
    include: ['exceljs'],
  },
});
