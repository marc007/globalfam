
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
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransition } from "react";
import { addStatusUpdate } from "@/lib/firebase/statusUpdates"; 
import { useAuth } from '@/contexts/AuthContext'; 
import type { UserLocation } from "@/types";

// Updated schema to use 'text' instead of 'content'
const statusFormSchema = z.object({
  text: z.string().min(1, { message: "Status can't be empty." }).max(280, { message: "Status must be 280 characters or less." }),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

interface StatusFormProps {
  onStatusPostedSuccess?: () => void;
}

export function StatusForm({ onStatusPostedSuccess }: StatusFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth(); 

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      text: "", // Updated default value field name
    },
  });

  async function onSubmit(data: StatusFormValues) {
    if (!user || !user.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to post a status.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        await addStatusUpdate({ 
          userId: user.uid, 
          text: data.text, // Updated to use data.text
          location: user.currentLocation as UserLocation | undefined 
        });

        toast({
          title: "Status Posted! 🎉",
          description: "Your friends can now see your latest update.",
          variant: "default",
        });
        form.reset(); 
        onStatusPostedSuccess?.(); 
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
        <CardDescription>Share a quick update with your GlobalVibe!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="text" // Updated FormField name
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Your Status</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Exploring the streets of Rome! 🇮🇹"
                      className="resize-none bg-input min-h-[100px]"
                      {...field}
                      disabled={isPending}
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
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Posting...
                </>
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
