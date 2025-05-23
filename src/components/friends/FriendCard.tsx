
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

const isValidDate = (d: any) => {
  return d instanceof Date && !isNaN(d.getTime());
}

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

  let statusTimeAgo = "Date unavailable";
  if (friend.latestStatus?.timestamp) {
    const date = new Date(friend.latestStatus.timestamp);
    if (isValidDate(date)) {
      statusTimeAgo = formatDistanceToNow(date, { addSuffix: true });
    }
  }

  return (
    <Card 
      className={`bg-card/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl border-2 ${borderColorClass} cursor-pointer`}
      onClick={handleCardClick}
    >
      {/* Reduced pb-3 to pb-2, gap-4 to gap-3 */}
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        {/* Reduced avatar size h-16 w-16 to h-12 w-12, border-4 to border-2 */}
        <Avatar className="h-12 w-12 border-2 border-background shadow-md">
          <AvatarImage 
            src={(friend.photoURL && friend.photoURL.trim() !== "") ? friend.photoURL : (friend.avatarUrl && friend.avatarUrl.trim() !== "") ? friend.avatarUrl : undefined} 
            alt={friend.name || 'Friend'} 
            data-ai-hint="profile avatar" />
          {/* Adjusted fallback text size if necessary, though it might adapt */}
          <AvatarFallback className="text-lg bg-muted-foreground text-background font-bold">
            {getInitials(friend.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            {/* Reduced CardTitle from text-2xl to text-lg */}
            <CardTitle className="text-lg font-bold text-foreground">{friend.name || 'Friend'}</CardTitle>
            <Circle className={`h-3 w-3 ${statusIndicatorColor} fill-current`} />
          </div>
          {friend.location && (
            <div className="flex items-center text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 mr-1 text-accent" />
              <span>{locationDisplay}</span>
            </div>
          )}
        </div>
      </CardHeader>
      {/* CardContent pt-0 is fine, reduced padding in the inner div */}
      <CardContent className="pt-0 pb-2">
        {friend.latestStatus ? (
          /* Reduced p-3 to p-2 */
          <div className="p-2 bg-background/50 rounded-md border border-border/50">
            <div className="flex items-start text-xs text-foreground">
              {/* Reduced MessageSquare from h-5 w-5 to h-4 w-4, adjusted mr-2 to mr-1.5 */}
              <MessageSquare className="h-4 w-4 mr-1.5 mt-0.5 text-secondary flex-shrink-0" />
              <p className="italic break-words">&ldquo;{friend.latestStatus.text}&rdquo;</p>
            </div>
            {/* mt-2 to mt-1.5 for timestamp */}
            <div className="flex items-center text-xs text-muted-foreground mt-1.5">
              <CalendarDays className="h-3 w-3 mr-1" /> 
              <span>{statusTimeAgo}</span>
            </div>
          </div>
        ) : (
          /* Reduced p-3 to p-2 for consistency */
          <p className="text-xs text-muted-foreground italic p-2">No status updates yet.</p>
        )}
      </CardContent>
      {/* Reduced CardFooter pt-2 to pt-1 */}
      <CardFooter className="flex justify-end pt-1 pb-2 px-3">
        <Badge
          variant={statusBadgeVariant}
          className={`text-xs ${friend.isOnline === true ? `bg-transparent hover:bg-transparent border-current ${textColorClass}` : `border-muted-foreground/50 text-muted-foreground`}`}
        >
          {statusBadgeText}
        </Badge>
      </CardFooter>
    </Card>
  );
}

    
