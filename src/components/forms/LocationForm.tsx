
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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Search, Globe, Sigma } from "lucide-react";
import type { UserLocation } from "@/types";
import React, { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from '@vis.gl/react-google-maps';

const locationFormSchema = z.object({
  searchQuery: z.string().optional(), 
  city: z.string().min(1, { message: "City is required after selection." }).max(100),
  country: z.string().min(1, { message: "Country is required after selection." }).max(100),
  latitude: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : parseFloat(String(val))),
    z.number().min(-90).max(90).optional()
  ),
  longitude: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : parseFloat(String(val))),
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
      searchQuery: currentLocation ? `${currentLocation.city}, ${currentLocation.country}` : "",
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
    },
    values: {
      searchQuery: currentLocation ? `${currentLocation.city}, ${currentLocation.country}` : "",
      city: currentLocation?.city || "",
      country: currentLocation?.country || "",
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
    }
  });

  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const places = useMapsLibrary('places'); 

  useEffect(() => {
    if (places && autocompleteInputRef.current && !autocomplete) {
      const options: google.maps.places.AutocompleteOptions = {
        types: ['(regions)'], 
        fields: ['address_components', 'geometry', 'name'],
      };
      const autocompleteInstance = new places.Autocomplete(
        autocompleteInputRef.current,
        options
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (place && place.geometry && place.geometry.location && place.address_components) {
          let city = '';
          let country = '';

          for (const component of place.address_components) {
            if (component.types.includes('locality') || component.types.includes('postal_town')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1') && !city) { 
              city = component.long_name;
            }
            if (component.types.includes('country')) {
              country = component.long_name;
            }
          }
          
          if (!city && place.name) {
            city = place.name;
          }

          form.setValue('city', city, { shouldValidate: true });
          form.setValue('country', country, { shouldValidate: true });
          form.setValue('latitude', place.geometry.location.lat(), { shouldValidate: true });
          form.setValue('longitude', place.geometry.location.lng(), { shouldValidate: true });
          form.setValue('searchQuery', `${city}, ${country}`, {shouldValidate: false}); 
        }
      });
      setAutocomplete(autocompleteInstance);
    }
  }, [places, autocompleteInputRef, form, autocomplete]); 


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
    // Removed max-w-lg from this Card to allow full width
    <Card className="w-full shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl text-primary">
          <MapPin className="mr-2 h-6 w-6" /> Update Your Location
        </CardTitle>
        <CardDescription>Search for your location below. Details will be auto-filled.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="searchQuery"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent flex items-center">
                     <Search className="mr-1 h-4 w-4" /> Search Location
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Tokyo, Japan or Paris"
                      {...field}
                      ref={autocompleteInputRef}
                      className="bg-input"
                      disabled={isPending || !places} 
                    />
                  </FormControl>
                  {!places && <FormDescription className="text-muted-foreground/70">Location search is initializing...</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">City (Auto-filled)</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-input/50 border-input/50" disabled />
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
                    <FormLabel className="text-muted-foreground">Country (Auto-filled)</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-input/50 border-input/50" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground flex items-center">
                      <Sigma className="mr-1 h-4 w-4" /> Latitude (Auto-filled)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} className="bg-input/50 border-input/50" disabled />
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
                    <FormLabel className="text-muted-foreground flex items-center">
                      <Sigma className="mr-1 h-4 w-4" /> Longitude (Auto-filled)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} value={field.value ?? ""} className="bg-input/50 border-input/50" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Selected location details will appear above. Click update to save.
            </p>
            <Button
              type="submit"
              disabled={isPending || !form.formState.isValid || !form.getValues("city") || !places } 
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
