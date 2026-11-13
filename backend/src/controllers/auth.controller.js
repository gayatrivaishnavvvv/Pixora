import bcrypt from "bcryptjs"
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_MS,
  createAuthSession,
  verifyAuthSession,
} from "../services/authSession.service.js"
import {
  GUEST_SESSION_COOKIE,
  verifyGuestSession,
} from "../services/guestSession.service.js"
import { verifyGoogleIdentityToken } from "../services/googleAuth.service.js"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_BYTES = 72

function getGoogleAccount(payload) {
  const email =
    typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : ""
  const googleSubject = typeof payload?.sub === "string" ? payload.sub : ""
  const displayName =
    typeof payload?.name === "string" ? payload.name.trim().slice(0, 80) : ""
  if (
    payload?.email_verified !== true ||
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    !googleSubject ||
    googleSubject.length > 255
  ) {
    return null
  }
  const fallbackName = email.split("@")[0]
  return {
    email,
    googleSubject,
    displayName:
      displayName.length >= 2
        ? displayName
        : fallbackName.length >= 2
          ? fallbackName.slice(0, 80)
          : "Google User",
  }
}

async function linkGoogleAccount(user, googleSubject) {
  if (user.googleSubject && user.googleSubject !== googleSubject) {
    const error = new Error("This email is already linked to a different Google account.")
    error.statusCode = 409
    throw error
  }
  if (!user.googleSubject) {
    user.googleSubject = googleSubject
    await user.save()
  }
  return user
}

async function findOrCreateGoogleUser(userModel, googleAccount) {
  const selectGoogleFields = "+googleSubject tokenVersion"
  let user = await userModel
    .findOne({ googleSubject: googleAccount.googleSubject })
    .select(selectGoogleFields)
  if (user) return linkGoogleAccount(user, googleAccount.googleSubject)

  user = await userModel
    .findOne({ email: googleAccount.email })
    .select(selectGoogleFields)
  if (user) return linkGoogleAccount(user, googleAccount.googleSubject)

  try {
    return await userModel.create(googleAccount)
  } catch (error) {
    if (error.code !== 11000) throw error
    user = await userModel
      .findOne({
        $or: [
          { googleSubject: googleAccount.googleSubject },
          { email: googleAccount.email },
        ],
      })
      .select(selectGoogleFields)
    if (!user) throw error
    return linkGoogleAccount(user, googleAccount.googleSubject)
  }
}

function getGuestSessionId(req, secret) {
  const cookie = (req.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_SESSION_COOKIE}=`))
  if (!cookie) return null
  try {
    return verifyGuestSession(
      decodeURIComponent(cookie.slice(GUEST_SESSION_COOKIE.length + 1)),
      secret,
    ).sessionId
  } catch {
    return null
  }
}

function getPublicUser(user) {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.email,
    createdAt: user.createdAt,
  }
}

function setAuthCookie(res, config, user) {
  const session = createAuthSession(
    user._id.toString(),
    config.authSessionSecret,
    user.tokenVersion ?? 0,
  )
  res.cookie(AUTH_SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: Boolean(config.cookieSecure),
    sameSite: config.cookieSameSite ?? "lax",
    path: "/api/v1",
    maxAge: AUTH_SESSION_MAX_AGE_MS,
  })
}

async function claimGuestImages(req, userId, config, imageModel) {
  const sessionId = getGuestSessionId(req, config.uploadSessionSecret)
  if (!sessionId) return
  await imageModel.updateMany(
    {
      ownerSessionId: sessionId,
      ownerUserId: { $exists: false },
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { ownerUserId: userId },
      $unset: { expiresAt: 1 },
    },
  )
}

function getRegistrationData(body) {
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (
    displayName.length < 2 ||
    displayName.length > 80 ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email) ||
    password.length < PASSWORD_MIN_LENGTH ||
    Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES
  ) {
    return null
  }
  return { displayName, email, password }
}

export function createAuthController(
  config,
  userModel,
  imageModel,
  verifyGoogleToken = verifyGoogleIdentityToken,
) {
  return {
    async register(req, res) {
      const registration = getRegistrationData(req.body)
      if (!registration) {
        return res.status(400).json({
          error:
            "Enter a name, valid email, and a password of at least 12 characters (maximum 72 UTF-8 bytes).",
        })
      }

      let user
      try {
        user = await userModel.create({
          displayName: registration.displayName,
          email: registration.email,
          passwordHash: await bcrypt.hash(registration.password, 12),
        })
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ error: "An account with this email already exists." })
        }
        throw error
      }

      await claimGuestImages(req, user._id, config, imageModel)
      setAuthCookie(res, config, user)
      res.status(201).json({ user: getPublicUser(user) })
    },

    async login(req, res) {
      const email =
        typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
      const password = typeof req.body?.password === "string" ? req.body.password : ""
      if (!EMAIL_PATTERN.test(email) || !password || Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
        return res.status(401).json({ error: "Email or password is incorrect." })
      }

      const user = await userModel
        .findOne({ email })
        .select("+passwordHash tokenVersion")
      if (
        !user?.passwordHash ||
        !(await bcrypt.compare(password, user.passwordHash))
      ) {
        return res.status(401).json({ error: "Email or password is incorrect." })
      }

      await claimGuestImages(req, user._id, config, imageModel)
      setAuthCookie(res, config, user)
      res.json({ user: getPublicUser(user) })
    },

    async googleLogin(req, res) {
      if (!config.googleClientId) {
        return res.status(503).json({
          error: "Google sign-in is not configured for this application.",
        })
      }
      const credential =
        typeof req.body?.credential === "string" ? req.body.credential.trim() : ""
      if (!credential || credential.length > 16_384) {
        return res.status(400).json({ error: "A valid Google credential is required." })
      }

      let identity
      try {
        identity = await verifyGoogleToken(
          credential,
          config.googleClientId,
        )
      } catch {
        return res.status(401).json({ error: "Google sign-in could not be verified." })
      }
      const googleAccount = getGoogleAccount(identity)
      if (!googleAccount) {
        return res.status(401).json({
          error: "Google did not provide a verified email address.",
        })
      }

      const user = await findOrCreateGoogleUser(userModel, googleAccount)
      await claimGuestImages(req, user._id, config, imageModel)
      setAuthCookie(res, config, user)
      res.json({ user: getPublicUser(user) })
    },

    async logout(req, res) {
      const authCookie = (req.get("cookie") ?? "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`))
      if (authCookie) {
        let session = null
        try {
          session = verifyAuthSession(
            decodeURIComponent(authCookie.slice(AUTH_SESSION_COOKIE.length + 1)),
            config.authSessionSecret,
          )
        } catch {
          session = null
        }
        if (session) {
          await userModel.findByIdAndUpdate(
            session.userId,
            { $inc: { tokenVersion: 1 } },
            { new: true },
          )
        }
      }
      res.clearCookie(AUTH_SESSION_COOKIE, {
        httpOnly: true,
        secure: Boolean(config.cookieSecure),
        sameSite: config.cookieSameSite ?? "lax",
        path: "/api/v1",
      })
      res.status(204).end()
    },

    async me(req, res) {
      const user = await userModel.findById(req.authUserId)
      if (!user) {
        return res.status(404).json({ error: "User profile not found." })
      }
      res.json({ user: getPublicUser(user) })
    },

    async dashboard(req, res) {
      const [user, imageCount] = await Promise.all([
        userModel.findById(req.authUserId),
        imageModel.countDocuments({ ownerUserId: req.authUserId }),
      ])
      if (!user) {
        return res.status(404).json({ error: "User profile not found." })
      }
      res.json({ user: getPublicUser(user), imageCount })
    },

    async updateProfile(req, res) {
      const displayName =
        typeof req.body?.displayName === "string" ? req.body.displayName.trim() : ""
      if (displayName.length < 2 || displayName.length > 80) {
        return res
          .status(400)
          .json({ error: "Your name must be between 2 and 80 characters." })
      }

      const user = await userModel.findByIdAndUpdate(
        req.authUserId,
        { $set: { displayName } },
        { new: true, runValidators: true },
      )
      if (!user) {
        return res.status(404).json({ error: "User profile not found." })
      }
      res.json({ user: getPublicUser(user) })
    },
  }
}
