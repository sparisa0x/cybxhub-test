import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PendingApproval() {
  const { signOut } = useAuthStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Approval Pending</CardTitle>
          <CardDescription>
            Your account is currently pending approval by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As a trainer, your account must be verified before you can access the platform. 
            Please check back later or contact support.
          </p>
          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
