# Environment Variables Configuration

This document lists all required and optional environment variables for the Joantee backend application.

## Required Environment Variables

### Database Configuration

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/joantee_db
```

### JWT Configuration

```bash
JWT_SECRET=your-super-secret-jwt-key-here
```

### Google OAuth Configuration

```bash
# Google OAuth 2.0 credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Session Configuration

```bash
SESSION_SECRET=your-session-secret-key-here
```

### Resend Configuration (for password reset emails)

```bash
RESEND_API_KEY=your-resend-api-key
RESEND_DOMAIN=your-domain.com
```

## Optional Environment Variables

### Server Configuration

```bash
PORT=5000
NODE_ENV=development
```

### Frontend Configuration

```bash
FRONTEND_URL=http://localhost:3000
```

## Setting Up Google OAuth

### 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Choose "Web application" as the application type
7. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`

### 2. Set Up Resend (for password reset emails)

1. Go to [Resend](https://resend.com/)
2. Sign up for a free account (3,000 emails/month)
3. Get your API key from the dashboard
4. Add your domain (optional - can use onboarding@resend.dev for testing)

### 3. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/joantee_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session
SESSION_SECRET=your-session-secret-key-here

# Resend (for password reset emails)
RESEND_API_KEY=your-resend-api-key-here
RESEND_DOMAIN=your-domain.com

# Server
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 3. Production Environment Variables

For production deployment, set these environment variables in your hosting platform:

```bash
# Database (use your production database URL)
DATABASE_URL=postgresql://username:password@your-production-db:5432/joantee_db

# JWT (use a strong, unique secret)
JWT_SECRET=your-production-jwt-secret-key

# Google OAuth (use production callback URL)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# Session (use a strong, unique secret)
SESSION_SECRET=your-production-session-secret

# Resend (use production domain)
RESEND_API_KEY=your-production-resend-api-key
RESEND_DOMAIN=your-production-domain.com

# Server
PORT=5000
NODE_ENV=production

# Frontend
FRONTEND_URL=https://yourdomain.com
```

## Security Best Practices

### 1. JWT Secret

- Use a strong, random string (at least 32 characters)
- Never commit this to version control
- Use different secrets for development and production

### 2. Session Secret

- Use a strong, random string (at least 32 characters)
- Never commit this to version control
- Use different secrets for development and production

### 3. Database URL

- Use strong passwords for database users
- Consider using connection pooling
- Use SSL in production

### 4. Google OAuth

- Keep client secrets secure
- Use different OAuth apps for development and production
- Regularly rotate client secrets

## Environment Variable Validation

The application will validate required environment variables on startup. Missing variables will cause the application to fail to start.

### Required Variables Check

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `RESEND_DOMAIN`

## Troubleshooting

### Common Issues

1. **"Missing required environment variable"**

   - Check that all required variables are set
   - Verify the `.env` file is in the correct location
   - Restart the application after adding variables

2. **"Google OAuth failed"**

   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
   - Check that `GOOGLE_CALLBACK_URL` matches your Google OAuth configuration
   - Ensure the Google+ API is enabled in Google Cloud Console

3. **"Database connection failed"**

   - Verify `DATABASE_URL` is correct
   - Check that the database server is running
   - Ensure the database user has proper permissions

4. **"JWT verification failed"**
   - Verify `JWT_SECRET` is set correctly
   - Ensure the same secret is used for signing and verification
   - Check that tokens haven't expired

## Example .env File

```bash
# ===========================================
# Joantee Backend Environment Variables
# ===========================================

# Database Configuration
DATABASE_URL=postgresql://joantee_user:secure_password@localhost:5432/joantee_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session Configuration
SESSION_SECRET=your-session-secret-key-here-make-it-long-and-random

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
```

## Notes

- Never commit `.env` files to version control
- Use different values for development and production
- Regularly rotate secrets and credentials
- Monitor environment variable usage in logs
- Consider using a secrets management service for production
