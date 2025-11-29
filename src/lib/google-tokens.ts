import { google } from "googleapis";
import { db } from "@/db";
import { account } from "@/db/schema";
import { eq } from "drizzle-orm";

type AccountRecord = typeof account.$inferSelect;

const EXPIRY_BUFFER_SECONDS = 60;

export async function ensureGoogleAccessToken(userAccount: AccountRecord) {
  const now = Math.floor(Date.now() / 1000);
  const hasValidAccessToken =
    !!userAccount.accessToken &&
    (!!userAccount.accessTokenExpiresAt
      ? userAccount.accessTokenExpiresAt > now + EXPIRY_BUFFER_SECONDS
      : true);

  if (hasValidAccessToken) {
    return {
      accessToken: userAccount.accessToken!,
      refreshToken: userAccount.refreshToken ?? undefined,
    };
  }

  if (!userAccount.refreshToken) {
    throw new Error("Missing refresh token for Google account");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: userAccount.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  const refreshedAccessToken =
    credentials.access_token ?? userAccount.accessToken ?? "";
  const refreshedRefreshToken =
    credentials.refresh_token ?? userAccount.refreshToken;
  const refreshedExpiry = credentials.expiry_date
    ? Math.floor(credentials.expiry_date / 1000)
    : userAccount.accessTokenExpiresAt ?? null;

  await db
    .update(account)
    .set({
      accessToken: refreshedAccessToken,
      refreshToken: refreshedRefreshToken,
      accessTokenExpiresAt: refreshedExpiry,
      updatedAt: now,
    })
    .where(eq(account.id, userAccount.id));

  return {
    accessToken: refreshedAccessToken,
    refreshToken: refreshedRefreshToken ?? undefined,
  };
}
