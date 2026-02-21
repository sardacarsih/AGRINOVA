# Agrinova Web Dashboard

## Project Overview

The Agrinova Web Dashboard is a Next.js 14 application built with TypeScript that serves as the web interface for the palm oil harvest management system. It provides real-time dashboards, data visualization, and administrative tools for managers and administrators.

### Key Features

- **Real-time Dashboard**: Comprehensive dashboard with metrics, charts, and data tables
- **Authentication**: Cookie-based authentication with role-based access control
- **Responsive Design**: Mobile-first design with responsive layouts
- **Real-time Updates**: WebSocket integration for live data updates

### Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and state management
- **Socket.IO**: Real-time communication
- **Recharts**: Data visualization

## Project Structure

```
apps/web/
├── app/                 # Next.js app router pages
├── components/          # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries and services
├── public/              # Static assets
├── types/               # TypeScript types
├── middleware.ts        # Next.js middleware
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Project dependencies and scripts
```

## Development

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Building

- Development build: `npm run build`
- Production build: `npm run build:prod`

### Running

- Development: `npm run dev`
- Production: `npm run start:prod`

### Testing

- Run tests: `npm run test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

## Authentication

The web dashboard uses cookie-based authentication for consistent behavior across all environments. The authentication flow is handled entirely client-side by the `AuthProvider` component.

### Key Files

- `lib/auth/auth-provider.tsx`: Main authentication provider
- `lib/auth/cookie-auth-service.ts`: Cookie-based authentication service
- `lib/api/cookie-client.ts`: Axios client configured for cookie-based auth

### Implementation Details

The authentication system supports:
- Real NestJS API integration with fallback to mock
- JWT token management with automatic refresh
- Secure token storage
- Login attempt tracking and lockout protection
- Session validation and monitoring
- Offline graceful degradation
- Multi-role support with hierarchical permissions
- Default test users for development

### Default Test Users

All users use the password `demo123` for development:

#### Super Admin
- **Email:** `super-admin@agrinova.com`
- **Role:** System-wide management
- **Access:** All companies, estates, and divisions

#### Company Admins
- **Email:** `company-admin@agrinova.com` (PT Agrinova Sentosa)
- **Email:** `company-admin2@agrinova.com` (PT Sawit Makmur)
- **Role:** Company-wide management
- **Access:** Single company administration

#### Area Managers (Multi-Company Assignment)
- **Email:** `area-manager@agrinova.com`
- **Role:** Regional oversight across multiple companies
- **Access:** PT Agrinova Sentosa + PT Sawit Makmur
- **Email:** `area-manager2@agrinova.com`
- **Access:** PT Palm Jaya only

#### Managers (Multi-Estate Assignment)
- **Email:** `manager@agrinova.com`
- **Role:** Estate management across multiple locations
- **Access:** Estate Sawit Jaya + Estate Sawit Makmur
- **Email:** `manager2@agrinova.com`
- **Access:** Estate Palm Utara only

#### Assistants (Multi-Division Assignment)
- **Email:** `asisten@agrinova.com`
- **Role:** Field operations and approval workflow
- **Access:** Divisi A + Divisi B (Estate Sawit Jaya)
- **Email:** `asisten2@agrinova.com`
- **Access:** Divisi A + Divisi C (Estate Sawit Makmur)

#### Mandors (Single Division)
- **Email:** `mandor@agrinova.com` (Divisi A, Estate Sawit Jaya)
- **Email:** `mandor2@agrinova.com` (Divisi C, Estate Sawit Makmur)
- **Email:** `mandor3@agrinova.com` (North Division, Estate Palm Utara)
- **Role:** Harvest input and field management

#### Security Guards (Single Location)
- **Email:** `satpam@agrinova.com` (Estate Sawit Jaya)
- **Email:** `satpam2@agrinova.com` (Estate Sawit Makmur)
- **Email:** `satpam3@agrinova.com` (Estate Palm Utara)
- **Role:** Gate check operations

## Configuration

Runtime configuration is determined based on the environment and hostname. The API URL is automatically set based on whether the application is running on localhost or a production domain.

### Key Files

- `lib/config/runtime-config.ts`: Runtime configuration detection

## Deployment

The application can be deployed using the `npm run deploy:prod` script, which builds the application for production and starts the production server.

## Troubleshooting

Common issues and their solutions:

1. **Authentication Issues**: Ensure cookies are enabled and the API is accessible
2. **Real-time Updates Not Working**: Check WebSocket connection and server configuration
3. **Build Errors**: Run `npm run type-check` and `npm run lint` to identify issues