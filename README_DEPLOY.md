# Book Inventory App Deployment

This app has:
- React/Vite frontend: `artifacts/book-inventory`
- Express API backend: `artifacts/api-server`
- PostgreSQL database via Drizzle: `lib/db`

## Best simple deploy: Render + Neon PostgreSQL

### 1. Put the project on GitHub
Upload this whole folder to a GitHub repository.

### 2. Create a PostgreSQL database
Use Neon, Supabase, Railway Postgres, or Render Postgres. Copy the database connection string.
It should look like:

```txt
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

### 3. Create the database tables
Option A: run Drizzle from your computer:

```bash
corepack enable
pnpm install
DATABASE_URL="your_database_url_here" pnpm run db:push
```

Option B: open your database SQL editor and run:

```sql
-- Copy/paste everything from migrations/init.sql
```

### 4. Deploy on Render
Create a new **Web Service** from your GitHub repo.

Use these settings:

```txt
Build Command:
corepack enable && pnpm install --frozen-lockfile=false && BASE_PATH=/ pnpm run build:deploy

Start Command:
NODE_ENV=production pnpm start
```

Add environment variables:

```txt
DATABASE_URL=your_database_url_here
NODE_ENV=production
BASE_PATH=/
```

Render automatically provides `PORT`, so do not hard-code it.

### 5. Test it
Open the deployed URL and test:
- Dashboard loads
- Add a book manually
- Add a member
- Borrow/return a book
- Barcode scanner works only on HTTPS, so it should work on Render but not always on plain local HTTP

## Local development

```bash
corepack enable
pnpm install
DATABASE_URL="your_database_url_here" pnpm run db:push
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/book-inventory dev
```

In another terminal:

```bash
DATABASE_URL="your_database_url_here" PORT=3000 pnpm --filter @workspace/api-server dev
```

## Production local test

```bash
corepack enable
pnpm install
DATABASE_URL="your_database_url_here" BASE_PATH=/ pnpm run build:deploy
DATABASE_URL="your_database_url_here" NODE_ENV=production PORT=3000 pnpm start
```

Then open `http://localhost:3000`.
