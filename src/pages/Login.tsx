import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Login() {
  const navigate = useNavigate();
  const { user, profile, signOut, fetchProfile } = useAuthStore();
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'shravpconnect@gmail.com';
  const allowSuperAdminBootstrap = import.meta.env.VITE_ALLOW_SUPER_ADMIN_BOOTSTRAP === 'true';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'trainer'>('student');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in and profile exists
  useEffect(() => {
    if (user && profile) {
      if (profile.status === 'pending') {
        navigate('/pending-approval');
      } else {
        navigate('/');
      }
    }
  }, [user, profile, navigate]);

  const withTimeout = <T,>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timed out. Please check your internet connection or Supabase URL.')), ms)
    );
    return Promise.race([promise, timeout]);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
        },
      }));
      if (error) setError(error.message);
      else setSuccess('Success! Check your email for the confirmation link, or try logging in if email confirmation is disabled.');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSuperAdminOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await withTimeout(supabase.auth.signInWithOtp({
        email: superAdminEmail,
        options: {
          shouldCreateUser: allowSuperAdminBootstrap,
          emailRedirectTo: window.location.origin,
        },
      }));
      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
        setSuccess(`OTP sent to ${superAdminEmail}. Enter the code to continue.`);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuperAdminOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error } = await withTimeout(supabase.auth.verifyOtp({
        email: superAdminEmail,
        token: otp.trim(),
        type: 'email',
      }));

      if (error) {
        setError(error.message);
      } else {
        const verifiedUser = data?.user;
        if (verifiedUser?.id) {
          const { error: profileError } = await supabase
            .from('users')
            .upsert(
              [{
                id: verifiedUser.id,
                email: verifiedUser.email || superAdminEmail,
                name: verifiedUser.user_metadata?.full_name || 'Super Admin',
                role: 'super_admin',
                status: 'active',
              }],
              { onConflict: 'id' }
            );

          if (profileError) {
            setError(`OTP verified, but role update failed: ${profileError.message}`);
          } else {
            await fetchProfile(verifiedUser.id);
            setSuccess('Super Admin login successful. Redirecting...');
            navigate('/');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      }));
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Handle the case where the user is authenticated but the database trigger failed to create their profile
  if (user && !profile && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Account Incomplete</CardTitle>
            <CardDescription>Your account was created, but your database profile is missing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This usually happens if the database trigger failed during registration. 
              Please sign out, ensure you have run the SQL schema fix in Supabase, and try registering again.
            </p>
            <Button onClick={() => signOut()} className="w-full">Sign Out & Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Cybxhub</CardTitle>
          <CardDescription>
            Cybersecurity Learning & Training Management
          </CardDescription>
        </CardHeader>
        {!isSupabaseConfigured && (
          <div className="mx-6 mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            <strong>Missing Configuration:</strong> Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.
          </div>
        )}
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="superadmin">Super Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4 pt-4">
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  Sign in with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4 pt-4">
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  Sign up with Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
                      Student
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="role" value="trainer" checked={role === 'trainer'} onChange={() => setRole('trainer')} />
                      Trainer
                    </label>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? 'Registering...' : 'Register'}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          <TabsContent value="superadmin">
            <form onSubmit={otpSent ? handleVerifySuperAdminOtp : handleSendSuperAdminOtp}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="super-admin-email">Super Admin Email</Label>
                  <Input id="super-admin-email" type="email" value={superAdminEmail} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="super-admin-otp">OTP Code</Label>
                  <Input
                    id="super-admin-otp"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={!otpSent}
                    required={otpSent}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button className="w-full" type="button" variant="outline" onClick={() => setOtpSent(false)} disabled={loading || !otpSent}>
                  Reset
                </Button>
                {!otpSent ? (
                  <Button className="w-full" type="submit" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </Button>
                ) : (
                  <Button className="w-full" type="submit" disabled={loading || !otp}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                )}
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
