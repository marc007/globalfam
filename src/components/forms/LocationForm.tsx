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
import { MapPin, Navigation } from "lucide-react";
import type { UserLocation } from "@/types";
// Toast is now handled by the parent component (ProfilePage)
// import { useToast } from "@/hooks/use-toast"; 
// import { useState, useTransition } from "react"; // Transition is now handled by parent

const locationFormSchema = z.object({
  city: z.string().min(2, { message: "City must be at least 2 characters." }).max(50),
  country: z.string().min(2, { message: "Country must be at least 2 characters." }).max(50),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  currentLocation?: UserLocation;
  onUpdateLocation: (data: UserLocation) => Promise<void>;
  isPending: boolean; // Added prop to control button state from parent
}

export function LocationForm({ currentLocation, onUpdateLocation, isPending }: LocationFormProps) {
  // const { toast } = useToast(); // Toast handled by parent
  // const [isPending, startTransition] = useTransition(); // Transition handled by parent

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
    },
    // Reset form if currentLocation changes externally
    // This might be useful if user data is refreshed elsewhere
    values: { 
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
    }
  });

  // No startTransition here, onSubmit directly calls the prop
  async function onSubmit(data: LocationFormValues) {
    // Error handling and toast messages are now responsibility of the parent component
    // that calls onUpdateLocation.
    await onUpdateLocation(data);
  }

  return (
    <Card className="w-full max-w-lg shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <MapPin className="mr-2 h-6 w-6" /> Update Your Location
        </CardTitle>
        <CardDescription>Let your friends know where you are in the world!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">City</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tokyo, Paris, New York" {...field} className="bg-input" disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Country</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Japan, France, USA" {...field} className="bg-input" disabled={isPending}/>
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
                <span className="animate-pulse">Updating...</span>
              ) : (
                <>
                  <Navigation className="mr-2 h-5 w-5" /> Update Location
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
