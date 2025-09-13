# Setup and Installation

Follow these steps to get the backend server running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A [PostgreSQL](https://www.postgresql.org/) database. We recommend using a free cloud provider like [Neon](https://neon.tech/).

### 1. Clone the Repository

```bash
git clone <repository_url>
cd joantee-backend
```

### 2. Install Dependencies

Install all the required packages using npm.

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of the project and add the following variables.

```env
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_strong_jwt_secret_key"
```

- `DATABASE_URL`: Your full PostgreSQL connection string. If you're using Neon, you can find this in your project dashboard.
- `JWT_SECRET`: A long, random, and secret string used for signing authentication tokens.

### 4. Run Database Migrations

Before starting the server, you need to create the database tables. The migration script will create all necessary tables if they don't exist.

```bash
npm run db:migrate
```

You should see a success message indicating that the migrations have been applied.

### 5. Start the Development Server

Now you can start the server. It will run in development mode with auto-reloading powered by `nodemon`.

```bash
npm run dev
```

The API server should now be running at `http://localhost:5000`. The console will display a list of all available API endpoints.
