# PillCart Backend API

A Node.js/Express backend API for the PillCart pharmacy management system.

## Features

- 🏥 Pharmacy product management
- 👥 User authentication and authorization
- 💊 Prescription management
- 🛒 Order processing
- 🔐 Admin dashboard
- 📦 File upload support
- 💳 Stripe payment integration

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js + Sessions
- **Validation**: Zod
- **File Storage**: Google Cloud Storage
- **Payments**: Stripe

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.example .env
```

Fill in your environment variables:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=development
PORT=5000
FRONTEND_URL=https://your-frontend.netlify.app
SESSION_SECRET=your_super_secure_session_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Push the database schema:
```bash
npm run db:push
```

Test database connection:
```bash
npm run db:test
```

### 4. Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### 5. Production Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Products
- `GET /api/products` - Get products (with filtering)
- `GET /api/admin/products` - Admin: Get all products
- `POST /api/admin/products` - Admin: Create product
- `PUT /api/admin/products/:id` - Admin: Update product
- `DELETE /api/admin/products/:id` - Admin: Delete product

### Prescriptions
- `POST /api/prescriptions/submit` - Submit prescription
- `GET /api/admin/prescriptions` - Admin: Get all prescriptions
- `PUT /api/admin/prescriptions/:id/status` - Admin: Update prescription status

### File Upload
- `POST /api/admin/objects/upload` - Admin: Get upload URL
- `PUT /api/admin/product-images` - Admin: Set product image

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)
- `SESSION_SECRET` - Session encryption secret
- `FRONTEND_URL` - Frontend URL for CORS

### Optional
- `PORT` - Server port (default: 5000)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `GOOGLE_CLOUD_PROJECT_ID` - Google Cloud project ID
- `GOOGLE_CLOUD_STORAGE_BUCKET` - GCS bucket name

## Deployment

### Render

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Configure environment variables
5. Deploy

### Railway/Heroku

1. Connect repository
2. Configure environment variables
3. Deploy

## Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM.

Main tables:
- `users` - User accounts
- `products` - Pharmacy products
- `categories` - Product categories
- `brands` - Product brands
- `prescriptions` - Prescription submissions
- `admin_permissions` - Admin role permissions

## Security

- CORS configured for frontend domain
- Session-based authentication
- Password hashing with bcrypt
- Input validation with Zod
- Admin permission system

## Development

### Code Structure
```
├── index.ts          # Main server file
├── routes.ts         # API routes
├── db.ts            # Database connection
├── storage.ts       # Database operations
├── replitAuth.ts    # Authentication middleware
├── objectStorage.ts # File upload handling
└── shared/
    └── schema.ts    # Database schema
```

### Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema
- `npm run db:test` - Test database connection

## License

MIT