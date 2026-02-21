# Agrinova Role-Based System Implementation

## Overview

This document describes the comprehensive role-based authentication and authorization system implemented for the Agrinova web application. The system provides persistent user roles, role-specific dashboards, navigation, and permissions.

## System Features

### 1. **Fixed User Roles**

Each user has a permanently assigned role that cannot be changed during login:

- **Mandor**: Field supervisor for harvest operations
- **Asisten**: Assistant manager for approvals and monitoring
- **Satpam**: Gate security for vehicle control
- **Manager**: Estate manager for reporting and management
- **Area Manager**: Regional manager for multi-estate oversight

### 2. **Authentication System**

- **No Role Selection**: Users login with email/password only
- **Automatic Role Detection**: System determines role from user profile
- **Persistent Sessions**: Role information stored in browser localStorage
- **Mock Authentication**: Complete demo system with test users

### 3. **Role-Based Dashboards**

Each role has a custom dashboard with role-specific:

- **UI Layout**: Tailored interface design
- **Navigation Menu**: Role-appropriate menu items
- **Widgets**: Relevant data and metrics
- **Actions**: Available operations and features

### 4. **Permission System**

- **Granular Permissions**: Fine-grained access control
- **Permission Groups**: Role-based permission assignment
- **Route Protection**: Page-level access control
- **Component Guards**: UI element visibility control

### 5. **Indonesian Localization**

- **Complete Translation**: All UI text in Indonesian
- **Role Names**: Localized role descriptions
- **Content**: Indonesian business terminology
- **Date/Time**: Indonesian formatting

## Technical Architecture

### Authentication Components

#### `auth-provider.tsx`

- Central authentication state management
- Session persistence and validation
- Login/logout functionality

#### `mock-auth.ts`

- Demo authentication service
- User database with fixed roles
- Login validation and error handling

#### `permissions.ts`

- Permission management system
- Role-based access control
- Route and action validation

#### `protected-route.tsx`

- Route protection component
- Role and permission validation
- Unauthorized access handling

### Dashboard Components

#### Role-Specific Pages

- `/dashboard/mandor` - Harvest input and worker management
- `/dashboard/asisten` - Approval workflow and monitoring
- `/dashboard/satpam` - Gate check and vehicle tracking
- `/dashboard/manager` - Estate overview and reporting
- `/dashboard/area-manager` - Regional analytics and comparison

#### Shared Components

- `dashboard-layout.tsx` - Common layout structure
- `role-sidebar.tsx` - Role-specific navigation
- `notification-center.tsx` - Real-time notifications

## User Roles & Permissions

### Mandor

**Permissions:**

- `harvest:create` - Input new harvest data
- `harvest:read` - View harvest information
- `harvest:update` - Edit harvest records
- `user:read` - View worker information

**Dashboard Features:**

- Daily harvest statistics
- Worker performance tracking
- Recent harvest history
- Harvest input forms

### Asisten

**Permissions:**

- `harvest:read` - View harvest data
- `approval:view` - Access approval queue
- `approval:approve` - Approve harvest data
- `approval:reject` - Reject harvest data
- `gate_check:read` - Monitor gate activities
- `report:view` - Access reports
- `user:read` - View user information

**Dashboard Features:**

- Pending approval queue
- Recent approval activity
- Gate check alerts
- Approval workflow management

### Satpam

**Permissions:**

- `gate_check:create` - Create gate check entries
- `gate_check:read` - View gate check data
- `gate_check:update` - Update vehicle status
- `harvest:read` - View harvest information

**Dashboard Features:**

- Vehicle entry/exit logging
- QR code scanning
- Vehicle status monitoring
- Daily activity reports

### Manager

**Permissions:**

- `harvest:read` - View harvest data
- `approval:view` - Monitor approvals
- `gate_check:read` - View gate activities
- `report:view` - Access reports
- `report:export` - Export data
- `user:read` - View users
- `user:manage` - Manage users

**Dashboard Features:**

- Estate performance metrics
- Top performer analytics
- Executive reports
- User management

### Area Manager

**Permissions:**

- `harvest:read` - View harvest data
- `approval:view` - Monitor approvals
- `gate_check:read` - View gate activities
- `report:view` - Access reports
- `report:export` - Export data
- `user:read` - View users
- `user:manage` - Manage users
- `system:logs` - Access system logs

**Dashboard Features:**

- Regional overview
- Multi-estate comparison
- Executive insights
- Strategic analytics

## Demo Credentials

### Test Users

```
Super Admin: super-admin@agrinova.com / superadmin123
Company Admin: company-admin@agrinova.com / companyadmin123
Manager: manager@agrinova.com / manager123
Area Manager: area-manager@agrinova.com / area123
Mandor: mandor@agrinova.com / mandor123
Asisten: asisten@agrinova.com / asisten123
Satpam: satpam@agrinova.com / satpam123
```

Additional test users:

```
mandor2@agrinova.com / mandor123
asisten2@agrinova.com / asisten123
company-admin2@agrinova.com / companyadmin123
```

## Usage Instructions

### 1. **Login Process**

1. Navigate to `/login`
2. Enter email and password (no role selection)
3. System automatically detects user role
4. Redirected to role-specific dashboard

### 2. **Role-Based Navigation**

- Each role sees different sidebar menu items
- Navigation items match role permissions
- Unauthorized pages show access denied message

### 3. **Dashboard Features**

- Role-specific widgets and data
- Contextual actions and buttons
- Real-time notifications
- Quick access to common tasks

### 4. **Permission Checking**

```typescript
// Check user permissions in components
const { hasPermission, canPerformAction } = usePermissions();

if (hasPermission(PERMISSIONS.HARVEST_CREATE)) {
  // Show harvest input form
}

if (canPerformAction("approve_harvest")) {
  // Show approval button
}
```

## Development Server

The application runs on **http://localhost:3000**

### Quick Start

```bash
cd apps/web
npm run dev -- -p 3000
```

## Key Implementation Details

### 1. **Route Protection**

All dashboard routes are protected by role-based access control:

```typescript
<ProtectedRoute
  allowedRoles={["mandor"]}
  requiredPermissions={[PERMISSIONS.HARVEST_READ]}
>
  <MandorDashboardContent />
</ProtectedRoute>
```

### 2. **Automatic Redirects**

- Login redirects to role-specific dashboard
- Main `/dashboard` route redirects based on user role
- Unauthorized access redirects to appropriate page

### 3. **State Management**

- Authentication state in React Context
- Session persistence in localStorage
- Real-time updates via WebSocket simulation

### 4. **Mock Data**

- Comprehensive mock data for each role
- Realistic business scenarios
- Indonesian business terminology

## Future Enhancements

1. **Real API Integration**

   - Replace mock authentication with actual backend
   - Implement real-time WebSocket connections
   - Connect to actual database

2. **Advanced Features**

   - Two-factor authentication
   - Password reset functionality
   - Audit logs
   - Advanced reporting

3. **Mobile Integration**

   - QR code login integration
   - Mobile app synchronization
   - Offline mode support

4. **Enterprise Features**
   - Multi-tenant support
   - Advanced role management
   - Custom permission sets
   - Compliance reporting

## Security Considerations

1. **Session Management**

   - Automatic session expiration
   - Secure token storage
   - Login attempt limiting

2. **Access Control**

   - Fine-grained permissions
   - Route-level protection
   - Component-level guards

3. **Data Protection**
   - Role-based data filtering
   - Audit trails
   - Input validation

## Support

For questions or issues with the role-based system:

1. Check user permissions configuration
2. Verify route protection settings
3. Review mock user data
4. Test with different demo accounts
