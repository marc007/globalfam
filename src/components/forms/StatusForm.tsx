
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
import { Input } from "@/components/ui/input"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription from imports
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTransition, useRef } from "react"; 
import { addStatusUpdate } from "@/lib/firebase/statusUpdates"; 
import { useAuth } from '@/contexts/AuthContext'; 
import type { UserLocation } from "@/types";

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
  const submitButtonRef = useRef<HTMLButtonElement>(null); 

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      text: "", 
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
    if (isPending) return; 

    startTransition(async () => {
      try {
        await addStatusUpdate({ 
          userId: user.uid, 
          text: data.text, 
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); 
      const textValue = form.getValues("text");
      if (!isPending && textValue && textValue.trim().length > 0) {
         form.handleSubmit(onSubmit)();
      }
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg bg-card/80 backdrop-blur-sm">
      {/* Added pb-3 to reduce space after removing CardDescription */}
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-xl text-secondary">
          <MessageSquare className="mr-2 h-5 w-5" /> What's Your Vibe?
        </CardTitle>
        {/* CardDescription removed */}
      </CardHeader>
      <CardContent className="pt-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent sr-only">Your Status</FormLabel> {/* Made label sr-only as title is descriptive enough */}
                  <FormControl>
                    <Input 
                      placeholder="Share a quick vibe..."
                      className="bg-input"
                      {...field}
                      disabled={isPending}
                      onKeyDown={handleKeyDown} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              ref={submitButtonRef}
              type="submit" 
              disabled={isPending || !form.watch("text")?.trim()} 
              className="w-full bg-gradient-to-r from-secondary to-pink-400 hover:from-secondary/90 hover:to-pink-400/90 text-secondary-foreground font-semibold py-2.5 text-md transition-transform hover:scale-105"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                </>
              ) : (
                <>
                 <Send className="mr-2 h-4 w-4" /> Post Vibe
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
