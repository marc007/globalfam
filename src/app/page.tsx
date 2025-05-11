"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Loader2, Globe, Users, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Loading GlobalFam...</p>
      </div>
    );
  }

  if (user) {
    // This content will be briefly visible during redirect, or if redirect fails.
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 150 + 50}px`,
              height: `${Math.random() * 150 + 50}px`,
              backgroundColor: `hsla(${Math.random() * 360}, 100%, 70%, 0.1)`,
              borderRadius: '50%',
              filter: 'blur(20px)',
              animationDuration: `${Math.random() * 5 + 5}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent via-primary to-secondary">
            GlobalFam
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Your friends, one map away. Share your world, see theirs. Stay connected, no matter the distance.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-4xl w-full">
        <div className="flex flex-col items-center p-6 bg-card/50 backdrop-blur-sm rounded-xl shadow-lg border border-border/50">
          <Globe className="h-12 w-12 text-accent mb-4"/>
          <h3 className="text-xl font-semibold mb-2 text-primary">See the World</h3>
          <p className="text-sm text-muted-foreground text-center">View all your friends on an interactive global map.</p>
        </div>
        <div className="flex flex-col items-center p-6 bg-card/50 backdrop-blur-sm rounded-xl shadow-lg border border-border/50">
          <Users className="h-12 w-12 text-secondary mb-4"/>
          <h3 className="text-xl font-semibold mb-2 text-primary">Stay Updated</h3>
          <p className="text-sm text-muted-foreground text-center">Share your location and status updates effortlessly.</p>
        </div>
        <div className="flex flex-col items-center p-6 bg-card/50 backdrop-blur-sm rounded-xl shadow-lg border border-border/50">
          <MessageSquare className="h-12 w-12 text-green-400 mb-4"/> {/* Neon Green example */}
          <h3 className="text-xl font-semibold mb-2 text-primary">Vibe Together</h3>
          <p className="text-sm text-muted-foreground text-center">Invite friends and build your global family.</p>
        </div>
      </div>
      
      <LoginForm />
    </div>
  );
}
