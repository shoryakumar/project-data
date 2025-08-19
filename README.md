# Project Data Website

A minimal website to display project data from NeonDB with Clerk authentication.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Clerk Authentication:
   - Go to [https://clerk.com](https://clerk.com) and create an account
   - Create a new application
   - Get your Publishable Key and Secret Key from the dashboard
   - Update `.env.local` with your Clerk keys

3. Set up your NeonDB connection:
   - Copy your NeonDB connection string
   - Update `.env.local` with your actual DATABASE_URL

4. Make sure your NeonDB has a `projects` table with these columns:
   - `id` (primary key)
   - `project_name` (text)
   - `location` (text) 
   - `project_type` (text)
   - `stage` (text)
   - `stakeholders` (text)
   - `source_link` (text)
   - `date_of_extraction` (text/date)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.
7. Sign in to access your project data.

## Environment Variables

Your `.env.local` file should contain:
```env
# NeonDB Connection
DATABASE_URL=your_neon_connection_string

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## Database Schema

Your NeonDB table should look like this:

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  project_name TEXT,
  location TEXT,
  project_type TEXT,
  stage TEXT,
  stakeholders TEXT,
  source_link TEXT,
  date_of_extraction TEXT
);
```

## Features

- **Authentication**: Secure login with Clerk
- **Protected Routes**: Only signed-in users can access project data
- **Modern UI**: Clean, professional table design
- **Responsive**: Works on all device sizes

The website will display all your project data in a simple table format, but only after users sign in.