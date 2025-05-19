
"use client";

import type { Friend } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, MessageSquare, CalendarDays, Circle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

interface FriendCardProps {
  friend: Friend;
  onCardClick?: (friend: Friend) => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export function FriendCard({ friend, onCardClick }: FriendCardProps) {
  const [borderColorClass, setBorderColorClass] = useState('border-muted-foreground');
  const [textColorClass, setTextColorClass] = useState('text-muted-foreground');

  useEffect(() => {
    if (friend.isOnline === true) {
      const cardColors = [
        { border: 'border-accent', text: 'text-accent' },
        { border: 'border-secondary', text: 'text-secondary' },
        { border: 'border-green-400', text: 'text-green-400' },
        { border: 'border-primary', text: 'text-primary' }
      ];
      const choiceIndex = friend.id.charCodeAt(friend.id.length - 1) % cardColors.length;
      const randomChoice = cardColors[choiceIndex];
      setBorderColorClass(randomChoice.border);
      setTextColorClass(randomChoice.text);
    } else {
      // Offline or undefined status
      setBorderColorClass('border-muted-foreground');
      setTextColorClass('text-muted-foreground');
    }
  }, [friend.isOnline, friend.id]);


  const locationDisplay = friend.location
    ? `${friend.location.city}, ${friend.location.country}`
    : 'Location not set';

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(friend);
    }
  };
  
  const statusBadgeText = friend.isOnline === true ? "Vibing" : "Contemplating";
  const statusBadgeVariant = friend.isOnline === true ? "default" : "outline";
  const statusIndicatorColor = friend.isOnline === true ? "text-green-500" : "text-muted-foreground";

  return (
    <Card 
      className={`bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-2 ${borderColorClass} cursor-pointer`}
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-start gap-4 pb-3">
        <Avatar className="h-16 w-16 border-4 border-background shadow-md">
          <AvatarImage 
            src={(friend.photoURL && friend.photoURL.trim() !== "") ? friend.photoURL : (friend.avatarUrl && friend.avatarUrl.trim() !== "") ? friend.avatarUrl : undefined} 
            alt={friend.name || 'Friend'} 
            data-ai-hint="profile avatar" />
          <AvatarFallback className="text-xl bg-muted-foreground text-background font-bold">
            {getInitials(friend.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-foreground">{friend.name || 'Friend'}</CardTitle>
            <Circle className={`h-3 w-3 ${statusIndicatorColor} fill-current`} />
          </div>
          {friend.location && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4 mr-1.5 text-accent" />
              <span>{locationDisplay}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {friend.latestStatus ? (
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="flex items-start text-sm text-foreground">
              <MessageSquare className="h-5 w-5 mr-2 mt-0.5 text-secondary flex-shrink-0" />
              <p className="italic break-words">&ldquo;{friend.latestStatus.content}&rdquo;</p>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <CalendarDays className="h-3 w-3 mr-1.5" />
              <span>{formatDistanceToNow(new Date(friend.latestStatus.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic p-3">No status updates yet.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        <Badge
          variant={statusBadgeVariant}
          className={friend.isOnline === true ? `bg-transparent hover:bg-transparent border-current ${textColorClass}` : `border-muted-foreground/50 text-muted-foreground`}
        >
          {statusBadgeText}
        </Badge>
      </CardFooter>
    </Card>
  );
}

    
