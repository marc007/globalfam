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
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";

const locationFormSchema = z.object({
  city: z.string().min(2, { message: "City must be at least 2 characters." }).max(50),
  country: z.string().min(2, { message: "Country must be at least 2 characters." }).max(50),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  currentLocation?: UserLocation;
  onUpdateLocation: (data: UserLocation) => Promise<void>; // Server action
}

export function LocationForm({ currentLocation, onUpdateLocation }: LocationFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
    },
  });

  async function onSubmit(data: LocationFormValues) {
    startTransition(async () => {
      try {
        await onUpdateLocation(data); // This will be a server action
        toast({
          title: "Location Updated! 🌍",
          description: `Your location is now set to ${data.city}, ${data.country}.`,
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Uh oh! Something went wrong.",
          description: "There was a problem updating your location. Please try again.",
          variant: "destructive",
        });
        console.error("Failed to update location:", error);
      }
    });
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
                    <Input placeholder="e.g., Tokyo, Paris, New York" {...field} className="bg-input" />
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
                    <Input placeholder="e.g., Japan, France, USA" {...field} className="bg-input" />
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
