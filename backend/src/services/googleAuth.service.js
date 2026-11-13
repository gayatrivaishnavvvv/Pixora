import { OAuth2Client } from "google-auth-library"

const googleClient = new OAuth2Client()

export async function verifyGoogleIdentityToken(idToken, audience) {
  const ticket = await googleClient.verifyIdToken({ idToken, audience })
  return ticket.getPayload()
}
