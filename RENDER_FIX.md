# 🔧 Render Deployment Fix

## Issue
The build is failing because the `dist/index.js` file doesn't exist. This happens when the build command isn't running properly.

## Solution

### Option 1: Fix in Render Dashboard (Recommended)

1. **Go to your Render service dashboard**
2. **Click "Settings" tab**
3. **Update Build Command to**:
   ```bash
   npm install && npm run build
   ```
4. **Ensure Start Command is**:
   ```bash
   npm start
   ```
5. **Click "Save Changes"**
6. **Manually trigger a new deploy**

### Option 2: Alternative Build Script

If the above doesn't work, we can modify the package.json to include the build in the start script:

Update the `start` script in package.json to:
```json
"start": "npm run build && NODE_ENV=production node dist/index.js"
```

But this is not recommended for production as it builds on every start.

### Option 3: Check Environment Variables

Make sure these environment variables are set in Render:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `NODE_ENV=production`
- `SESSION_SECRET` - Any secure random string
- `FRONTEND_URL` - Your Netlify frontend URL

**Optional (for full functionality):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Debugging Steps

1. **Check Build Logs**: Look for any TypeScript compilation errors
2. **Verify Dependencies**: Ensure all dependencies are in package.json
3. **Test Locally**: Run `npm run build` locally to ensure it works

### Expected Build Output

After a successful build, you should see:
```
dist/index.js  [size]kb
Done in [time]ms
```

## Quick Fix Commands

If you need to update the server code:

```bash
cd server
# Make changes
git add .
git commit -m "Fix build issues"
git push origin main
```

Then redeploy in Render dashboard.