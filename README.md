# 🥫 datapantry.org

A Nuxt website for database management. Welcome to my crib. 👋

## 🚀 Setup

To get the database working, you'll need to add a file called `.env`. 
See `.env-example` for the format. Then...

```bash
# Install npm dependencies
npm install

# Set up database (first time only)
npm run db:setup      # Creates and starts PostgreSQL container
npm run db:generate   # Generates migration files from schema
npm run db:migrate    # Applies migrations to database
```

## 👩‍💻 Development Server

Start the development server on `http://localhost:3000`:

```bash
# Start the database for daily development
npm run db:start      # Start container (if stopped)
npm run dev           # Start Nuxt development server
npm run db:stop       # Stop container when done
```

## 🐛 Debugging tips

When running `npm run db:setup` or `npm run db:start`, if you get an error that says `ports are not available`:

```bash
sudo lsof -i :5432  # Check what's using port 5432
sudo systemctl stop postgresql # Stop local postgres, if needed
```

To look at the Postgres database data, run this, then go to the URL it suggests:

```bash
npm run db:studio
```

To look at the data in an SQLite database, I recommend installing sqlitebrowser. 
Then you can run 

```bash
sqlitebrowser server/userDBs/{userID}/{dbID}.sqlite 
```

If you need to restart the database, deleting all data:

```bash
# Fresh start
npm run db:reset  # Remove and recreate everything
```

Any time `server/postgresDB/schema.ts` is edited, remember to run this:
```bash
npm run db:generate && npm run db:migrate
```

## 🖥️ Production

Build the application for production:

```bash
# npm
npm run build
```

Locally preview production build:

```bash
# npm
npm run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
