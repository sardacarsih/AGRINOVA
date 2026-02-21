'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AuthDebugPanel() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>Authentication Debug Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Is Loading:</span>
              <Badge variant={isLoading ? "destructive" : "default"}>
                {isLoading ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Is Authenticated:</span>
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
          
          {user && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">User Data:</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><strong>Name:</strong> {user.name}</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div className="flex items-center gap-2">
                  <strong>Role:</strong> 
                  <Badge variant="outline">'{user.role}'</Badge>
                  <span className="text-muted-foreground">
                    (Type: {typeof user.role}, Length: {user.role?.length})
                  </span>
                </div>
                <div><strong>Company:</strong> {user.company || 'N/A'}</div>
                <div><strong>Estate:</strong> {user.estate || 'N/A'}</div>
                <div><strong>Division:</strong> {user.divisi || 'N/A'}</div>
                <div><strong>Status:</strong> {user.status || 'N/A'}</div>
                <div><strong>Employee ID:</strong> {user.employeeId || 'N/A'}</div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium">Raw User Object:</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium">Role Comparison Test:</h4>
                <div className="space-y-1 text-sm">
                  <div>user.role === 'MANDOR': <Badge variant={user.role === 'MANDOR' ? 'default' : 'destructive'}>{user.role === 'MANDOR' ? 'True' : 'False'}</Badge></div>
                  <div>['MANDOR'].includes(user.role): <Badge variant={['MANDOR'].includes(user.role) ? 'default' : 'destructive'}>{['MANDOR'].includes(user.role) ? 'True' : 'False'}</Badge></div>
                  <div>user.role.toLowerCase() === 'MANDOR': <Badge variant={user.role?.toLowerCase() === 'MANDOR' ? 'default' : 'destructive'}>{user.role?.toLowerCase() === 'MANDOR' ? 'True' : 'False'}</Badge></div>
                  <div>user.role.trim() === 'MANDOR': <Badge variant={user.role?.trim() === 'MANDOR' ? 'default' : 'destructive'}>{user.role?.trim() === 'MANDOR' ? 'True' : 'False'}</Badge></div>
                </div>
              </div>
            </div>
          )}
          
          {!user && isAuthenticated && (
            <div className="text-red-600">
              <strong>Warning:</strong> User is authenticated but user data is null
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="text-muted-foreground">
              User is not authenticated
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}