'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Crown, Building2, Map, Users, Shield, UserCheck, Truck, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DemoCredential {
  role: string;
  email: string;
  username?: string;
  password: string;
  description: string;
  scope: string;
  userCount?: string;
  color: string;
  icon: React.ReactNode;
}

const demoCredentials: DemoCredential[] = [
  {
    role: 'Super Admin',
    email: 'super-admin@agrinova.com',
    username: 'superadmin',
    password: 'demo123',
    description: 'System-wide access to all companies',
    scope: 'All Companies',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <Crown className="h-4 w-4" />
  },
  {
    role: 'Company Admin',
    email: 'company-admin@agrinova.com',
    password: 'demo123',
    description: 'PT Agrinova Sentosa - Company scoped',
    scope: 'PT Agrinova',
    userCount: '17 users',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <Building2 className="h-4 w-4" />
  },
  {
    role: 'Area Manager',
    email: 'area-manager@agrinova.com',
    password: 'demo123',
    description: 'Multi-company Regional Manager',
    scope: 'Agrinova + Sawit Makmur',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: <Map className="h-4 w-4" />
  },
  {
    role: 'Manager',
    email: 'manager-agrinova@agrinova.com',
    password: 'demo123',
    description: 'Single estate - Sawit Jaya only',
    scope: 'Sawit Jaya Estate',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <Users className="h-4 w-4" />
  },
  {
    role: 'Manager Multi-Estate',
    email: 'manager-multi-agrinova@agrinova.com',
    password: 'demo123',
    description: 'Multiple estates assignment',
    scope: 'Sawit Indah + Perkebunan Utara',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <Users className="h-4 w-4" />
  }
];

const legacyCredentials: DemoCredential[] = [
  {
    role: 'Legacy Admin',
    username: 'admin',
    email: '',
    password: 'demo123',
    description: 'Quick Super Admin access',
    scope: 'All System',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <Shield className="h-4 w-4" />
  },
  {
    role: 'Legacy Manager',
    username: 'manager',
    email: '',
    password: 'demo123',
    description: 'Quick Manager access',
    scope: 'Sawit Jaya',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <UserCheck className="h-4 w-4" />
  },
  {
    role: 'Legacy Asisten',
    username: 'asisten',
    email: '',
    password: 'demo123',
    description: 'Quick Asisten access',
    scope: 'Divisi A',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <UserCheck className="h-4 w-4" />
  },
  {
    role: 'Legacy Satpam',
    username: 'satpam',
    email: '',
    password: 'demo123',
    description: 'Quick Satpam access',
    scope: 'Gate Security',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    icon: <Truck className="h-4 w-4" />
  }
];

interface DemoCredentialsProps {
  onCredentialSelect?: (email: string, username: string | undefined, password: string) => void;
}

export function DemoCredentials({ onCredentialSelect }: DemoCredentialsProps) {
  const [showPasswords, setShowPasswords] = React.useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  const handleCredentialClick = (credential: DemoCredential) => {
    if (onCredentialSelect) {
      onCredentialSelect(credential.email, credential.username, credential.password);
    }
  };

  const CredentialCard = ({ credential, isLegacy = false }: { credential: DemoCredential; isLegacy?: boolean }) => (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 group"
      onClick={() => handleCredentialClick(credential)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn(credential.color, "flex items-center gap-1")}>
              {credential.icon}
              {credential.role}
            </Badge>
            {credential.userCount && (
              <Badge variant="outline" className="text-xs">
                {credential.userCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const loginData = isLegacy 
                ? `${credential.username} / ${credential.password}`
                : `${credential.email} / ${credential.password}`;
              copyToClipboard(loginData, 'Login credentials');
            }}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        
        <div>
          <CardTitle className="text-sm font-medium">{credential.description}</CardTitle>
          <CardDescription className="text-xs">Scope: {credential.scope}</CardDescription>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs">
          {credential.email && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Email:</span>
              <code className="bg-muted px-2 py-1 rounded text-foreground">{credential.email}</code>
            </div>
          )}
          
          {credential.username && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Username:</span>
              <code className="bg-muted px-2 py-1 rounded text-foreground">{credential.username}</code>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Password:</span>
            <code className="bg-muted px-2 py-1 rounded text-foreground">
              {showPasswords ? credential.password : '••••••••'}
            </code>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="secondary" 
            size="sm" 
            className="w-full text-xs h-7"
            onClick={(e) => {
              e.stopPropagation();
              handleCredentialClick(credential);
            }}
          >
            Use This Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="sm">
          <Shield className="h-4 w-4 mr-2" />
          Kredensial Demo
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Demo Login Credentials
          </DialogTitle>
          <DialogDescription>
            Ready-to-use test accounts for hierarchical user management validation
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            Click any card to auto-fill login form
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center gap-2"
          >
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPasswords ? 'Hide' : 'Show'} Passwords
          </Button>
        </div>

        <Tabs defaultValue="hierarchical" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hierarchical" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Hierarchical Roles
            </TabsTrigger>
            <TabsTrigger value="legacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Legacy Quick Access
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="hierarchical" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {demoCredentials.map((credential, index) => (
                <CredentialCard key={index} credential={credential} />
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Scope Testing
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• <strong>Company Admin Agrinova:</strong> Should see 17 users (PT Agrinova only)</p>
                <p>• <strong>Company Admin Sawit:</strong> <code>company-admin-sawit@agrinova.com</code> - 5 users</p>
                <p>• <strong>Company Admin Palm:</strong> <code>company-admin-palm@agrinova.com</code> - 5 users</p>
                <p>• <strong>Manager Single:</strong> Users from Sawit Jaya estate only</p>
                <p>• <strong>Manager Multi:</strong> Users from Sawit Indah + Perkebunan Utara estates</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="legacy" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {legacyCredentials.map((credential, index) => (
                <CredentialCard key={index} credential={credential} isLegacy />
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Quick Testing
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Use <strong>username/password</strong> format for legacy accounts</p>
                <p>• All passwords are <code>demo123</code> for demo simplicity</p>
                <p>• Legacy accounts provide immediate access without email setup</p>
                <p>• Perfect for rapid functional testing</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>🎯 Test hierarchical filtering and role-based access</span>
            <span>Database: 20 real users from PostgreSQL across 3 companies</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}