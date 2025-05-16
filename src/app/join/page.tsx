
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getInviteLinkDocumentByCode, updateInviteDocumentStatus, InviteDocument } from '@/lib/firebase/invites';
// Client-side addFriendConnection is not strictly needed if Cloud Function handles it
// import { addFriendConnection } from '@/lib/firebase/users'; 
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Info, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function JoinPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  // Sanitize the invite code right after getting it
  const rawInviteCode = searchParams.get('code');
  const inviteCode = rawInviteCode ? rawInviteCode.split('?')[0] : null;

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState<string>('Verifying your invite link...');
  const [inviteDetails, setInviteDetails] = useState<InviteDocument | null>(null);

  useEffect(() => {
    if (authLoading) {
      setStatus('loading');
      setMessage('Authenticating your session...');
      return;
    }

    if (!inviteCode) {
      setStatus('invalid');
      setMessage('No invite code provided or the link is malformed. Please use a valid invite link.');
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('You need to be logged in to accept an invite. Please log in or sign up, then try the link again.');
      return;
    }

    const processInvite = async () => {
      setStatus('loading');
      // Use the cleaned inviteCode for display and processing
      setMessage(`Verifying invite code: ${inviteCode}...`); 
      try {
        const invite = await getInviteLinkDocumentByCode(inviteCode);
        setInviteDetails(invite);

        if (!invite) {
          setStatus('invalid');
          setMessage('This invite link is invalid or does not exist.');
          return;
        }

        if (invite.creatorUid === user.uid) {
          setStatus('error');
          setMessage('You cannot use your own invite link. Share it with a friend!');
          return;
        }

        if (invite.status === 'used') {
          setStatus('used');
          setMessage('This invite link has already been used.');
          return;
        }

        if (invite.expiresAt && invite.expiresAt.toDate() < new Date()) {
          if (invite.status === 'pending' && invite.id) {
             await updateInviteDocumentStatus(invite.id, 'expired');
          }
          setStatus('expired');
          setMessage('This invite link has expired.');
          return;
        }

        if (invite.status === 'pending') {
          setStatus('valid');
          setMessage('Invite link is valid! Click below to connect with the sender.');
        } else {
          setStatus('error');
          setMessage(`This invite link has an unexpected status: ${invite.status}.`);
        }
      } catch (e) {
        console.error("Error processing invite:", e);
        setStatus('error');
        setMessage('Could not verify the invite link. Please try again later.');
      }
    };

    processInvite();
  }, [inviteCode, user, authLoading, router]); // inviteCode is now stable after sanitization

  const handleJoin = async () => {
    if (!inviteDetails || !inviteDetails.id || !inviteDetails.creatorUid || !user || !user.uid) {
      toast({ title: "Error", description: "Missing critical data to process the join.", variant: "destructive" });
      return;
    }

    setStatus('loading');
    setMessage('Connecting you with your friend...');

    try {
      await updateInviteDocumentStatus(inviteDetails.id, 'used', user.uid);
      
      // The Cloud Function onInviteUsedAddFriendConnection handles the friend connection.
      // No need to call addFriendConnection from the client here.

      setStatus('success');
      setMessage(`You are now friends! You can start sharing your location and status updates.`);
      toast({
        title: "Successfully Connected! 🎉",
        description: "You're now friends. Head to your dashboard to see updates.",
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (e: any) {
      console.error("Error finalizing join process:", e);
      setStatus('error');
      setMessage(e.message || 'There was an error connecting you. Please try again.');
      toast({ title: "Join Failed", description: e.message || "Could not complete the connection.", variant: "destructive" });
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'invalid':
      case 'used':
      case 'expired':
        return <XCircle className="h-12 w-12 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      case 'valid':
        return <Users className="h-12 w-12 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] py-12 px-4">
      <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {renderStatusIcon()}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Verifying Invite'}
            {status === 'valid' && 'Invite Link Validated'}
            {status === 'invalid' && 'Invalid Invite Link'}
            {status === 'expired' && 'Invite Link Expired'}
            {status === 'used' && 'Invite Link Used'}
            {status === 'error' && 'An Error Occurred'}
            {status === 'success' && 'Connection Successful!'}
          </CardTitle>
          <CardDescription className="text-lg min-h-[40px]">{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'valid' && (
            <Button onClick={handleJoin} className="w-full mt-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground">
              Accept Invite & Connect
            </Button>
          )}
          {(status === 'invalid' || status === 'expired' || status === 'used' || status === 'error' || status === 'success') && (
            <Button asChild className="mt-4 w-full">
              <Link href={status === 'success' ? "/dashboard" : "/"}>
                {status === 'success' ? "Go to Dashboard" : "Go to Homepage"}
              </Link>
            </Button>
          )}
          {status === 'error' && !user && !authLoading && (
             <Button asChild className="mt-4 w-full" variant="outline">
              {/* Ensure rawInviteCode is used here if needed for redirect, or just the cleaned one if the login page can handle that.*/}
              <Link href={`/login?redirect=/join?code=${rawInviteCode || ''}`}>
                Login to Accept Invite
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <JoinPageContent />
    </Suspense>
  );
}
