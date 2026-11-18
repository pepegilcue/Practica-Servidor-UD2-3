import { defineConfig } from 'vitest/config';

// Variables de entorno controladas para las pruebas
export default defineConfig({
  test: {
    env: {
      PORT: '3000',
      NODE_ENV: 'test',
      SESSION_SECRET: 'secreto-de-pruebas-1234567890'
    }
  }
});
