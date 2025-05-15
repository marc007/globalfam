
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
import { MapPin, Navigation, Globe } from "lucide-react"; // Added Globe
import type { UserLocation } from "@/types";

const locationFormSchema = z.object({
  city: z.string().min(2, { message: "City must be at least 2 characters." }).max(50),
  country: z.string().min(2, { message: "Country must be at least 2 characters." }).max(50),
  latitude: z.preprocess(
    (val) => (val === "" ? undefined : parseFloat(String(val))),
    z.number().min(-90).max(90).optional()
  ),
  longitude: z.preprocess(
    (val) => (val === "" ? undefined : parseFloat(String(val))),
    z.number().min(-180).max(180).optional()
  ),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface LocationFormProps {
  currentLocation?: UserLocation;
  onUpdateLocation: (data: UserLocation) => Promise<void>;
  isPending: boolean;
}

export function LocationForm({ currentLocation, onUpdateLocation, isPending }: LocationFormProps) {
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
    },
    values: { 
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
    }
  });

  async function onSubmit(data: LocationFormValues) {
    const locationData: UserLocation = {
      city: data.city,
      country: data.country,
    };
    if (data.latitude !== undefined) {
      locationData.latitude = data.latitude;
    }
    if (data.longitude !== undefined) {
      locationData.longitude = data.longitude;
    }
    await onUpdateLocation(locationData);
  }

  return (
    <Card className="w-full max-w-lg shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <MapPin className="mr-2 h-6 w-6" /> Update Your Location
        </CardTitle>
        <CardDescription>Let your friends know where you are. Provide city/country or precise coordinates.</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-accent flex items-center">
                      <Globe className="mr-1 h-4 w-4" /> Latitude (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="e.g., 35.6895" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)} value={field.value ?? ""} className="bg-input" disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-accent flex items-center">
                      <Globe className="mr-1 h-4 w-4" /> Longitude (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="e.g., 139.6917" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)} value={field.value ?? ""} className="bg-input" disabled={isPending}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If latitude and longitude are provided, they will be used directly. Otherwise, location will be estimated from city/country.
            </p>
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
