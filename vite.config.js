import { defineConfig } from 'vite';
import { attachMultiplayerServer } from './server/multiplayerServer.js';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  plugins: [
    {
      name: 'multiplayer-server',
      configureServer(server) {
        if (server.httpServer) {
          attachMultiplayerServer(server.httpServer);
        }
      }
    }
  ]
});
