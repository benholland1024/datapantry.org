import 'dotenv/config'  // This automatically looks for .env in current directory

console.log('Loaded env vars:', {
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  hasPassword: !!process.env.DB_PASSWORD
})

// Import and start the server
await import('./.output/server/index.mjs')