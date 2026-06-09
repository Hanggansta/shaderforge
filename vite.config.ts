import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vercel often sets OPENAI_API_KEY; Vite client needs VITE_* at build time.
  const env = loadEnv(mode, process.cwd(), '')
  const openaiKey = env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || ''
  const openaiModel = env.VITE_OPENAI_MODEL || 'gpt-5.4-mini'

  return {
  plugins: [react()],
  define: {
    ...(openaiKey ? { 'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(openaiKey) } : {}),
    'import.meta.env.VITE_OPENAI_MODEL': JSON.stringify(openaiModel),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/shader-agent/')) return 'shader-agent';
            return undefined;
          }
          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) return 'monaco';
          if (id.includes('@clerk')) return 'clerk';
          if (id.includes('framer-motion')) return 'motion';
          if (
            id.includes('react-router')
            || id.includes('react-dom')
            || /[/\\]react[/\\]/.test(id)
          ) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
  }
})