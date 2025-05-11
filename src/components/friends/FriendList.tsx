"use client";

import type { Friend } from '@/types';
import { FriendCard } from './FriendCard';

interface FriendListProps {
  friends: Friend[];
}

export function FriendList({ friends }: FriendListProps) {
  if (friends.length === 0) {
    return <p className="text-center text-muted-foreground text-lg py-8">No friends yet. Start by inviting some!</p>;
  }

  return (
    <div 
      className="grid gap-6"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))',
      }}
    >
      {friends.map((friend) => (
        <FriendCard key={friend.id} friend={friend} />
      ))}
    </div>
  );
}
