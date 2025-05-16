"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Link as LinkIcon, Copy, CheckCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Import the new Firebase invite function
import { createInviteLinkDocument } from '@/lib/firebase/invites';

export default function InvitePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  const handleGenerateLink = async () => {
    if (!user || !user.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to generate an invite link.",
        variant: "destructive",
      });
      return;
    }
    setIsGenerating(true);
    setCopied(false);
    try {
      // Call the Firebase function to create the invite document
      const inviteCode = await createInviteLinkDocument(user.uid);
      const fullLink = `${window.location.origin}/join?code=${inviteCode}`; // Construct the link with the code
      setInviteLink(fullLink);
      toast({
        title: "Invite Link Generated! 🔗",
        description: "Share this link with your friends to join GlobalFam.",
      });
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast({
        title: "Error Generating Link",
        description: "Could not generate an invite link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        setCopied(true);
        toast({ title: "Link Copied!", description: "Invite link copied to clipboard." });
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy link. Please try manually.", variant: "destructive" });
      });
    }
  };

  if (isLoading || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-muted-foreground">Loading Invites...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Or redirect, handled by useEffect
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-12 py-12 px-4">
      <section className="text-center">
        <Mail className="h-20 w-20 text-accent mx-auto mb-6 animate-bounce" style={{animationDuration: '1.5s'}} />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
          Invite Your Friends
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Grow your GlobalFam! Generate a unique link to invite your friends to join the adventure.
        </p>
      </section>

      <Card className="w-full max-w-lg shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-primary">
            <Users className="mr-2 h-6 w-6" /> Generate Invite Link
          </CardTitle>
          <CardDescription>
            Each link is unique and can be used by one friend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share this link with a friend:</p>
              <div className="flex items-center space-x-2">
                <Input type="text" value={inviteLink} readOnly className="bg-input text-accent font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button onClick={() => { setInviteLink(null); setCopied(false); }} variant="link" className="text-accent">
                Generate a new link
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleGenerateLink} 
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 text-lg transition-transform hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-5 w-5" /> Create Invite Link
                </>
              )}
            </Button>
          )}
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                Links are valid for 7 days. Invite responsibly!
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
