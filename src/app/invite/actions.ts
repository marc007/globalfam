\
"use server";

import { createInviteLinkDocument } from "@/lib/firebase/invites";
// In a real-world scenario, you'd get the user's UID from a server-side session 
// or by verifying an ID token passed from the client to ensure security.
// For this implementation, we'll accept creatorUid as a parameter,
// assuming the client-side (Next.js page) will pass the authenticated user's UID.

export async function generateInviteLink(creatorUid: string): Promise<string> {
  if (!creatorUid) {
    // This check is more for robustness; the client should ensure UID is passed.
    throw new Error("User UID is required to generate an invite link.");
  }

  try {
    console.log(`Generating invite link for creator UID: ${creatorUid}`);
    const code = await createInviteLinkDocument(creatorUid);
    console.log(`Successfully generated invite code: ${code} for UID: ${creatorUid}`);
    return code;
  } catch (error) {
    console.error("Error in generateInviteLink server action:", error);
    // It's good practice to not expose raw error messages to the client.
    // Throw a generic error or a more specific, user-friendly one.
    if (error instanceof Error) {
        throw new Error(`Failed to generate invite link: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the invite link.");
  }
}
