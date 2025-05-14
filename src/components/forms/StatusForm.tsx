"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";
import { addStatusUpdate } from "@/lib/firebase/statusUpdates"; // Import the function
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

const statusFormSchema = z.object({
  content: z.string().min(1, { message: "Status can't be empty." }).max(280, { message: "Status must be 280 characters or less." }),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

// Removed onPostStatus prop
interface StatusFormProps {
  // onPostStatus: (data: StatusFormValues) => Promise<void>; // Server action
}

export function StatusForm({ }: StatusFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth(); // Corrected: Get the current user using 'user'

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      content: "",
    },
  });

  async function onSubmit(data: StatusFormValues) {
    // Corrected: Check for 'user' instead of 'currentUser'
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to post a status.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        // Call the Firebase function directly, use user.uid
        await addStatusUpdate({ userId: user.uid, content: data.content });

        toast({
          title: "Status Posted! 🎉",
          description: "Your friends can now see your latest update.",
          variant: "default",
        });
        form.reset(); // Clear the form after successful submission
      } catch (error) {
        toast({
          title: "Oops! Something went wrong.",
          description: "There was a problem posting your status. Please try again.",
        variant: "destructive",
        });
        console.error("Failed to post status:", error);
      }
    });
  }

  return (
    <Card className="w-full max-w-lg shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-secondary">
          <MessageSquare className="mr-2 h-6 w-6" /> What's Your Vibe?
        </CardTitle>
        <CardDescription>Share a quick update with your GlobalFam!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Your Status</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Exploring the streets of Rome! 🇮🇹"
                      className="resize-none bg-input min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-gradient-to-r from-secondary to-pink-400 hover:from-secondary/90 hover:to-pink-400/90 text-secondary-foreground font-semibold py-3 text-lg transition-transform hover:scale-105"
            >
              {isPending ? (
                <span className="animate-pulse">Posting...</span>
              ) : (
                <>
                 <Send className="mr-2 h-5 w-5" /> Post Update
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
