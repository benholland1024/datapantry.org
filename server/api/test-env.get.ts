export default defineEventHandler((event) => {
  return {
    dbHost: process.env.DB_HOST,
    dbName: process.env.DB_NAME,
  }
})