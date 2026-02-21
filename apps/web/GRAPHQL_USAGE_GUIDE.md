# GraphQL Usage Guide

This document explains how to use the pure GraphQL implementation in the Agrinova web dashboard.

## Overview

The frontend has been migrated from REST API calls to pure GraphQL, providing:
- Type-safe queries and mutations
- Real-time subscriptions via WebSocket
- Comprehensive error handling
- Automatic caching and state management
- Better performance and developer experience

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  React          │    │  Apollo Client   │    │  Go GraphQL    │
│  Components     │◄──►│  (HTTP + WS)     │◄──►│  Server         │
│                 │    │                  │    │  (:8080)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  GraphQL Hooks  │    │  Error Handling  │    │  WebSocket      │
│  & Services     │    │  & Caching       │    │  Subscriptions  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Getting Started

### 1. Dependencies

Ensure these packages are installed:
```json
{
  "@apollo/client": "^4.0.4",
  "graphql": "^16.11.0", 
  "graphql-ws": "^5.14.0"
}
```

Install missing dependencies:
```bash
npm install graphql-ws@^5.14.0
```

### 2. Environment Variables

Set the GraphQL endpoint URLs in your `.env.local`:
```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:8080/graphql
```

### 3. Apollo Provider

The Apollo Provider is already configured in `app/providers.tsx`:
```tsx
<GraphQLProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</GraphQLProvider>
```

## Usage Examples

### 1. Authentication (Login)

```tsx
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { WEB_LOGIN_MUTATION } from '@/lib/apollo/queries/auth';

function LoginForm() {
  const { mutate: login, state } = useGraphQLMutation(
    WEB_LOGIN_MUTATION,
    {
      context: 'Login Form',
      onSuccess: (data) => {
        console.log('Login successful:', data);
        // Handle successful login
      },
      onError: (error, validationErrors) => {
        console.error('Login failed:', error);
        // Handle login error
      }
    }
  );

  const handleLogin = async (username: string, password: string) => {
    await login({
      input: {
        identifier: username,
        password: password
      }
    });
  };

  return (
    <div>
      {state.loading && <p>Logging in...</p>}
      {state.error && <p>Error: {state.error}</p>}
      {state.validationErrors && (
        <div>
          {Object.entries(state.validationErrors).map(([field, errors]) => (
            <p key={field}>{field}: {errors.join(', ')}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2. Fetching Data (Assignments)

```tsx
import { useQuery } from '@apollo/client';
import { GET_ASSIGNMENTS } from '@/lib/apollo/queries/assignments';
import type { AssignmentFilters } from '@/lib/apollo/queries/assignments';

function AssignmentList() {
  const filters: AssignmentFilters = {
    role: 'manager',
    isActive: true,
    page: 1,
    limit: 10
  };

  const { data, loading, error, refetch } = useQuery(GET_ASSIGNMENTS, {
    variables: { filters },
    errorPolicy: 'all'
  });

  if (loading) return <div>Loading assignments...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {data?.assignments?.data?.map(assignment => (
        <div key={assignment.id}>
          <h3>{assignment.user.nama}</h3>
          <p>Company: {assignment.company.nama}</p>
          <p>Estates: {assignment.estates.map(e => e.nama).join(', ')}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3. Using GraphQL Services

```tsx
import { GraphQLAssignmentService } from '@/lib/apollo/services/assignment-service';

async function updateUserAssignment() {
  const result = await GraphQLAssignmentService.updateUserAssignment(
    'user-id-123',
    {
      companyId: 'company-1',
      estateIds: ['estate-1', 'estate-2'],
      divisionIds: ['division-1']
    }
  );

  if (result.success) {
    console.log('Assignment updated:', result.data);
  } else {
    console.error('Update failed:', result.message);
  }
}
```

### 4. Real-time Subscriptions

```tsx
import { useApprovalUpdates } from '@/hooks/use-graphql-subscriptions';

function ApprovalNotifications({ userId }: { userId: string }) {
  const { approvalUpdate, error, loading } = useApprovalUpdates(userId);

  useEffect(() => {
    if (approvalUpdate) {
      console.log('New approval update:', approvalUpdate);
      // Show notification, update UI, etc.
    }
  }, [approvalUpdate]);

  if (error) {
    console.error('Subscription error:', error);
  }

  return (
    <div>
      {loading && <p>Connecting to real-time updates...</p>}
      {approvalUpdate && (
        <div className="notification">
          Approval {approvalUpdate.id} status: {approvalUpdate.status}
        </div>
      )}
    </div>
  );
}
```

### 5. Error Handling

```tsx
import { handleGraphQLError, parseGraphQLError } from '@/lib/apollo/error-handler';

function handleError(error: ApolloError) {
  const errorInfo = handleGraphQLError(error, 'User Management');
  
  if (errorInfo.shouldRedirectToLogin) {
    // User is not authenticated
    window.location.href = '/login';
    return;
  }

  if (errorInfo.validationErrors) {
    // Show validation errors
    Object.entries(errorInfo.validationErrors).forEach(([field, errors]) => {
      console.log(`${field}: ${errors.join(', ')}`);
    });
  }

  if (errorInfo.shouldRetry) {
    // Retry the operation
    setTimeout(() => {
      // Retry logic here
    }, 2000);
  }
}
```

## Available Queries and Mutations

### Authentication
- `WEB_LOGIN_MUTATION` - Web-based login with cookies
- `LOGIN_MUTATION` - Standard login with JWT tokens  
- `LOGOUT_MUTATION` - Logout user
- `ME_QUERY` - Get current user info
- `CHANGE_PASSWORD_MUTATION` - Change user password

### Assignments
- `GET_ASSIGNMENTS` - Get assignments with filters
- `GET_USER_ASSIGNMENT` - Get assignment for specific user
- `UPDATE_ASSIGNMENT` - Update user assignment
- `BULK_UPDATE_ASSIGNMENTS` - Update multiple assignments
- `GET_ASSIGNMENT_CONFLICTS` - Get assignment conflicts
- `GET_ASSIGNMENT_ANALYTICS` - Get assignment analytics

### Super Admin
- `GET_SYSTEM_STATISTICS` - Get system statistics
- `GET_MULTI_ASSIGNMENT_ANALYTICS` - Get multi-assignment analytics
- `GET_SYSTEM_ACTIVITIES` - Get system activities
- `GLOBAL_SEARCH` - Perform global search
- `GET_SYSTEM_HEALTH` - Get system health status

### Approvals
- `GET_PENDING_APPROVALS` - Get pending approvals
- `PROCESS_APPROVAL` - Process an approval
- `GET_APPROVAL_STATISTICS` - Get approval statistics
- `APPROVAL_UPDATES_SUBSCRIPTION` - Subscribe to approval updates

### Real-time Subscriptions
- `APPROVAL_UPDATES_SUBSCRIPTION` - Real-time approval updates
- `HIERARCHY_CHANGES_SUBSCRIPTION` - Real-time hierarchy changes

## GraphQL Services

Pre-built service classes for common operations:

### GraphQLAssignmentService
```tsx
import { GraphQLAssignmentService } from '@/lib/apollo/services/assignment-service';

// Get assignments
const assignments = await GraphQLAssignmentService.getAssignments(filters);

// Update assignment  
const result = await GraphQLAssignmentService.updateUserAssignment(userId, assignment);

// Get conflicts
const conflicts = await GraphQLAssignmentService.getAssignmentConflicts();
```

### GraphQLSuperAdminService  
```tsx
import { GraphQLSuperAdminService } from '@/lib/apollo/services/super-admin-service';

// Get system statistics
const stats = await GraphQLSuperAdminService.getSystemStatistics(filters);

// Perform maintenance
const result = await GraphQLSuperAdminService.performSystemMaintenance(['cleanup_logs']);
```

## Best Practices

### 1. Error Handling
Always use the error handling utilities:
```tsx
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';

const { mutate, state } = useGraphQLMutation(MUTATION, {
  context: 'Component Name', // For better error logging
  onError: (error, validationErrors) => {
    // Handle errors appropriately
  }
});
```

### 2. Loading States
Handle loading states properly:
```tsx
const { data, loading, error } = useQuery(QUERY);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataComponent data={data} />;
```

### 3. Caching
Use appropriate cache policies:
```tsx
const { data } = useQuery(QUERY, {
  fetchPolicy: 'cache-first', // Default - use cache if available
  // fetchPolicy: 'network-only', // Always fetch from network  
  // fetchPolicy: 'cache-and-network', // Use cache + fetch in background
});
```

### 4. Optimistic Updates
For better UX, use optimistic updates:
```tsx
const [mutate] = useMutation(MUTATION, {
  optimisticResponse: {
    updateAssignment: {
      id: assignmentId,
      status: 'updated',
      __typename: 'Assignment'
    }
  }
});
```

## Migration from REST

Old REST API calls have been replaced:

### Before (REST)
```tsx
const response = await cookieApiClient.get('/assignments');
const assignments = response.data;
```

### After (GraphQL)
```tsx
const result = await GraphQLAssignmentService.getAssignments(filters);
const assignments = result.data;
```

The legacy API classes still exist but now use GraphQL internally for backward compatibility.

## Debugging

### 1. Apollo Client DevTools
Install the Apollo Client DevTools browser extension to inspect queries, mutations, and cache.

### 2. GraphQL Playground
Access the GraphQL playground at `http://localhost:8080/playground` when the Go server is running.

### 3. Console Logging
GraphQL operations are logged to the console with appropriate prefixes:
- `🔍` - Query/mutation attempts
- `✅` - Successful operations  
- `❌` - Error operations
- `📡` - WebSocket events

### 4. Test Script
Run the implementation test:
```bash
node test-graphql-implementation.js
```

## Troubleshooting

### Common Issues

1. **"graphql-ws not found"**
   ```bash
   npm install graphql-ws@^5.14.0
   ```

2. **WebSocket connection fails**
   - Check if Go GraphQL server is running on `:8080`
   - Verify `NEXT_PUBLIC_GRAPHQL_WS_URL` environment variable

3. **Authentication errors**
   - Clear browser cache and localStorage
   - Check JWT token validity
   - Verify cookie settings

4. **Query/Mutation not found**
   - Check if the query is imported correctly
   - Verify the query is exported from the queries file
   - Check for typos in query names

### Getting Help

1. Check the browser console for detailed error messages
2. Use Apollo Client DevTools to inspect network requests
3. Run the test script to validate setup
4. Check the Go GraphQL server logs for backend issues

## Performance Tips

1. **Use fragments** for reusable query parts
2. **Implement pagination** for large data sets  
3. **Use subscriptions** instead of polling for real-time data
4. **Cache query results** appropriately
5. **Batch mutations** when possible using bulk operations

---

This guide covers the essential patterns for using GraphQL in the Agrinova web dashboard. The implementation provides a robust, type-safe, and efficient way to interact with the Go GraphQL backend.