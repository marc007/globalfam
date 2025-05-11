"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, UserCircle, LogIn, LogOut, Users, Mail, MapPin, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

export function AppHeader() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'GF';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 transition-transform hover:scale-105">
          <Globe className="h-8 w-8 text-accent" />
          <span className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-accent via-primary to-secondary">
            GlobalFam
          </span>
        </Link>
        
        <nav className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-accent transition-colors">
                <Link href="/dashboard"><Home className="mr-1 h-4 w-4" /> Dashboard</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-accent transition-colors">
                <Link href="/invite"><Mail className="mr-1 h-4 w-4" /> Invite</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary hover:border-accent transition-colors">
                      <AvatarImage src={user.avatarUrl} alt={user.name ?? 'User'} data-ai-hint="profile avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/profile#location')}>
                    <MapPin className="mr-2 h-4 w-4" />
                    My Location
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/30 focus:text-destructive-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
             <Button onClick={() => router.push('/')} variant="gooeyLeft" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <LogIn className="mr-2 h-4 w-4" /> Get Started
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
