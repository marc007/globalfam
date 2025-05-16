// Use v2 specific imports
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger"; // v2 logger
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to establish a mutual friend
 * connection when an invite is used.
 * Triggered when an 'invites' document is updated using v2 syntax.
 */
export const onInviteUsedAddFriendConnection = onDocumentUpdated(
  "invites/{inviteId}", // Document path (same as v1)
  async (event) => {
    // event.data contains before and after snapshots
    if (!event.data) {
      logger.warn("Event data is undefined, skipping operation.", {
        structuredData: true,
      });
      return;
    }

    const beforeSnapshot = event.data.before;
    const afterSnapshot = event.data.after;

    const beforeData = beforeSnapshot.data();
    const afterData = afterSnapshot.data();
    const inviteId = event.params.inviteId; // Access params from event object

    // Ensure data exists (it should for onUpdated)
    if (!beforeData || !afterData) {
      logger.warn(
        "Before or after data is missing for onUpdated event, skipping.",
        {inviteId}
      );
      return;
    }

    // Check if the status changed to 'used' and was not 'used' before
    if (
      afterData.status === "used" &&
      beforeData.status !== "used" &&
      afterData.creatorUid &&
      afterData.usedByUid
    ) {
      const inviterUid = afterData.creatorUid;
      const inviteeUid = afterData.usedByUid;

      logger.log(
        `Invite ${inviteId} used by ${inviteeUid} (invited by \
${inviterUid}). Attempting to create friend connection.`,
        {structuredData: true}
      );

      if (inviterUid === inviteeUid) {
        logger.warn(
          `User ${inviteeUid} attempted to use their own invite ${inviteId}. \
No friend connection created.`,
          {inviterUid, inviteeUid, inviteId}
        );
        return; // Or handle as an error if this shouldn't happen
      }

      const inviterRef = db.collection("users").doc(inviterUid);
      const inviteeRef = db.collection("users").doc(inviteeUid);

      try {
        const batch = db.batch();

        batch.update(inviterRef, {
          friends: admin.firestore.FieldValue.arrayUnion(inviteeUid),
        });

        batch.update(inviteeRef, {
          friends: admin.firestore.FieldValue.arrayUnion(inviterUid),
        });

        await batch.commit();
        logger.log(
          `Successfully created friend connection between ${inviterUid} \
and ${inviteeUid} via invite ${inviteId}.`,
          {inviterUid, inviteeUid, inviteId}
        );

        // Optional: update the invite doc itself using the afterSnapshot's ref
        // await afterSnapshot.ref.update({
        //   friendConnectionProcessed: true,
        //   processedAt: admin.firestore.FieldValue.serverTimestamp()
        // });
      } catch (error) {
        logger.error(
          `Error creating friend connection for invite ${inviteId} between \
${inviterUid} and ${inviteeUid}:`,
          error, // Log the actual error object
          {inviterUid, inviteeUid, inviteId}
        );
      }
    } else if (afterData.status === "used" && beforeData.status === "used") {
      logger.info(
        `Invite ${inviteId} was already processed (status 'used' did not \
change to 'used'), function triggered again but no action taken.`,
        {
          inviteId,
          afterDataStatus: afterData.status,
          beforeDataStatus: beforeData.status,
        }
      );
    }
  }
);
