import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PendingApproval() {
  const { profile, signOut } = useAuthStore();
  const isSuspended = profile?.status === 'suspended';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{isSuspended ? 'Access Restricted' : 'Approval Pending'}</CardTitle>
          <CardDescription>
            {isSuspended
              ? 'Your account is currently restricted by the super admin.'
              : 'Your account is currently pending approval by the super admin.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isSuspended
              ? 'Please contact the super admin if you think this is an error.'
              : 'All admin, trainer, and student accounts require super admin approval before platform access and batch joining.'}
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
