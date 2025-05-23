
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, KeyRound, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useState, useTransition } from "react";

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmNewPassword: z.string().min(6, { message: "Confirm new password must be at least 6 characters." }),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"], // path of error
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function ChangePasswordForm() {
  const { toast } = useToast();
  const { changePassword } = useAuth();
  const [isPending, startTransition] = useTransition();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(data: PasswordFormValues) {
    startTransition(async () => {
      try {
        await changePassword(data.currentPassword, data.newPassword);
        toast({
          title: "Password Changed Successfully!",
          description: "Your password has been updated.",
        });
        form.reset();
      } catch (error: any) {
        let errorMessage = "Failed to change password. Please try again.";
        if (error.code) {
          switch (error.code) {
            case 'auth/wrong-password':
              errorMessage = "Incorrect current password. Please try again.";
              form.setError("currentPassword", { type: "manual", message: errorMessage });
              break;
            case 'auth/weak-password':
              errorMessage = "The new password is too weak.";
              form.setError("newPassword", { type: "manual", message: errorMessage });
              break;
            case 'auth/requires-recent-login':
                errorMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in before trying again.";
                break;
            default:
              errorMessage = error.message || "An unexpected error occurred.";
          }
        }
        toast({
          title: "Password Change Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    });
  }

  return (
    // Removed max-w-lg from this Card to allow full width
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <KeyRound className="mr-2 h-6 w-6" /> Change Password
        </CardTitle>
        <CardDescription>Update your account password. Make sure it's strong!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Current Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10 bg-input" disabled={isPending} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">New Password</FormLabel>
                  <FormControl>
                     <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10 bg-input" disabled={isPending} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10 bg-input" disabled={isPending} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-3 text-lg transition-transform hover:scale-105"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-5 w-5" /> Update Password
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
