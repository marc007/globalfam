"use client";

import { useState, useTransition } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, Mail, User, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { signUp, signIn } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (!isLoginMode && !name.trim())) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        if (isLoginMode) {
          await signIn(email, password);
        } else {
          await signUp(name, email, password);
        }
        toast({ title: isLoginMode ? "Login Successful!" : "Sign Up Successful!", description: "Redirecting to dashboard..." });
        router.push('/dashboard');
      } catch (error: any) {
        console.error(error);
        let errorMessage = "An unexpected error occurred.";
        if (error.code) {
          switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              errorMessage = "Invalid email or password.";
              break;
            case 'auth/email-already-in-use':
              errorMessage = "This email is already registered. Try logging in.";
              break;
            case 'auth/weak-password':
              errorMessage = "Password should be at least 6 characters.";
              break;
            default:
              errorMessage = error.message || "Authentication failed.";
          }
        }
        toast({ title: "Authentication Failed", description: errorMessage, variant: "destructive" });
      }
    });
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    // Clear form fields when switching modes for better UX, optional
    // setName(''); 
    // setEmail('');
    // setPassword('');
  };

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
          {isLoginMode ? "Welcome Back!" : "Join GlobalFam!"}
        </CardTitle>
        <CardDescription className="text-muted-foreground pt-2">
          {isLoginMode ? "Log in to connect with your friends." : "Create an account to get started."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-accent">Your Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="Alex Wanderlust" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLoginMode} 
                  className="pl-10"
                  disabled={isPending}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-accent">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="alex@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-accent">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 text-lg transition-transform hover:scale-105"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            {isPending ? 'Processing...' : (isLoginMode ? "Connect Now" : "Create Account")}
          </Button>
          <Button variant="link" type="button" onClick={toggleMode} className="text-accent" disabled={isPending}>
            {isLoginMode ? "Need an account? Sign Up" : "Already have an account? Log In"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
