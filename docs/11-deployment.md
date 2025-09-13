# Deployment

This project is configured for easy deployment to [Vercel](https://vercel.com/).

### `vercel.json`

The `vercel.json` file in the root of the project handles the necessary configuration for Vercel's build and routing system.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/index.js"
    }
  ]
}
```

- **`builds`**: This tells Vercel that our main entry point is `src/index.js` and that it should be deployed as a Node.js serverless function.
- **`routes`**: This rewrites all requests coming to `/api/.*` to be handled by our `src/index.js` Express application.

### Deployment Steps

1.  **Push to a Git Repository:** Connect your Vercel account to a GitHub, GitLab, or Bitbucket account and push the project repository.
2.  **Import Project in Vercel:** In your Vercel dashboard, import the Git repository. Vercel will automatically detect the `vercel.json` file.
3.  **Configure Environment Variables:** Before deploying, you must add your `DATABASE_URL` and `JWT_SECRET` to Vercel's environment variables settings for the project. **Do not commit your `.env` file to Git.**
4.  **Deploy:** Trigger a deployment. Vercel will handle the build process and provide you with a live URL for your API.
