# 🥫 datapantry.org

A Nuxt website for database management. Welcome to my crib. 👋

## 🚀 Setup

To get the database working, you'll need to add a file called `.env`. 
See `.env-example` for the format. Then...

```bash
# Install npm dependencies
npm install

# Set up database (first time only)
npm db:setup      # Creates and starts PostgreSQL container
npm db:generate   # Generates migration files from schema
npm db:migrate    # Applies migrations to database
```

## 👩‍💻 Development Server

Start the development server on `http://localhost:3000`:

```bash
# Start the database for daily development
npm db:start      # Start container (if stopped)
npm dev           # Start Nuxt development server
npm db:stop       # Stop container when done
```

## 🐛 Debugging tips

When running `npm db:setup` or `npm db:start`, if you get an error that says `ports are not available`:

```bash
sudo lsof -i :5432  # Check what's using port 5432
sudo systemctl stop postgresql # Stop local postgres, if needed
```

To look at the Postgres database data, run this, then go to the URL it suggests:

```bash
npm db:studio
```

To look at the data in an SQLite database, I recommend installing sqlitebrowser. 
Then you can run 

```bash
sqlitebrowser server/userDBs/{userID}/{dbID}.sqlite 
```

If you need to restart the database, deleting all data:

```bash
# Fresh start
npm db:reset  # Remove and recreate everything
```

Any time `server/postgresDB/schema.ts` is edited, remember to run this:
```bash
npm db:generate && npm db:migrate
```

## 🖥️ Production

Build the application for production:

```bash
# npm
npm build
```

Locally preview production build:

```bash
# npm
npm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
