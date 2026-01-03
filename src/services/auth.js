const tokenService = require('~/services/token')
const emailService = require('~/services/email')
const { getUserByEmail, createUser, privateUpdateUser, getUserById } = require('~/services/user')
const { createError } = require('~/utils/errorsHelper')
const {
  EMAIL_NOT_CONFIRMED,
  INCORRECT_CREDENTIALS,
  BAD_RESET_TOKEN,
  BAD_REFRESH_TOKEN,
  USER_NOT_FOUND,
  BAD_CONFIRM_TOKEN,
  DOCUMENT_NOT_FOUND,
  EMAIL_ALREADY_CONFIRMED
} = require('~/consts/errors')
const emailSubject = require('~/consts/emailSubject')
const {
  tokenNames: { REFRESH_TOKEN, RESET_TOKEN, CONFIRM_TOKEN }
} = require('~/consts/auth')
const { verifyGoogleToken } = require('~/utils/googleAuth')

const authService = {
  signup: async (role, firstName, lastName, email, password, language) => {
    const user = await createUser(role, firstName, lastName, email, password, language)

    const confirmToken = tokenService.generateConfirmToken({ id: user._id, role })
    await tokenService.saveToken(user._id, confirmToken, CONFIRM_TOKEN)
    await emailService.sendEmail(email, emailSubject.EMAIL_CONFIRMATION, language, { confirmToken, email, firstName })
    return {
      userId: user._id,
      userEmail: user.email
    }
  },

  login: async (email, password, isFromGoogle) => {
    const user = await getUserByEmail(email)

    if (!user) {
      throw createError(401, USER_NOT_FOUND)
    }

    const checkedPassword = password === user.password || isFromGoogle

    if (!checkedPassword) {
      throw createError(401, INCORRECT_CREDENTIALS)
    }

    const { _id, lastLoginAs, isFirstLogin, isEmailConfirmed } = user

    if (!isEmailConfirmed) {
      throw createError(401, EMAIL_NOT_CONFIRMED)
    }

    const tokens = tokenService.generateTokens({ id: _id, role: lastLoginAs, isFirstLogin })
    await tokenService.saveToken(_id, tokens.refreshToken, REFRESH_TOKEN)

    if (isFirstLogin) {
      await privateUpdateUser(_id, { isFirstLogin: false })
    }

    await privateUpdateUser(_id, { lastLogin: new Date() })

    return tokens
  },
  
  googleLogin: async (email, googleId, opts = {}) => {
    let user = await getUserByEmail(email)

    if (!user) {
      throw createError(401, {
        code: 'USER_NOT_REGISTERED',
        message: 'You are not registered',
      })
    }

    if (!user.googleId) {
      await privateUpdateUser(user._id, { googleId })
      user.googleId = googleId
    } else if (user.googleId !== googleId) {
      throw createError(403, {
        code: 'GOOGLE_ACCOUNT_MISMATCH',
        message: 'Google account mismatch',
      })
    }

    const { _id, lastLoginAs, isFirstLogin } = user

    const tokens = tokenService.generateTokens({
      id: _id,
      role: lastLoginAs || 'student',
      isFirstLogin,
    })

    await tokenService.saveToken(
      _id,
      tokens.refreshToken,
      REFRESH_TOKEN
    )

    if (isFirstLogin) {
      await privateUpdateUser(_id, { isFirstLogin: false })
    }

    await privateUpdateUser(_id, { lastLogin: new Date() })

    return tokens
  },
  

  logout: async (refreshToken) => {
    await tokenService.removeRefreshToken(refreshToken)
  },

  refreshAccessToken: async (refreshToken) => {
    const tokenData = tokenService.validateRefreshToken(refreshToken)
    const tokenFromDB = await tokenService.findToken(refreshToken, REFRESH_TOKEN)

    if (!tokenData || !tokenFromDB) {
      throw createError(400, BAD_REFRESH_TOKEN)
    }

    const { _id, lastLoginAs, isFirstLogin } = await getUserById(tokenData.id)

    const tokens = tokenService.generateTokens({ id: _id, role: lastLoginAs, isFirstLogin })
    await tokenService.saveToken(_id, tokens.refreshToken, REFRESH_TOKEN)

    return tokens
  },

  sendResetPasswordEmail: async (email, language) => {
    const user = await getUserByEmail(email)

    if (!user) {
      throw createError(404, USER_NOT_FOUND)
    }

    const { _id, firstName } = user

    const resetToken = tokenService.generateResetToken({ id: _id, firstName, email })
    await tokenService.saveToken(_id, resetToken, RESET_TOKEN)

    await emailService.sendEmail(email, emailSubject.RESET_PASSWORD, language, { resetToken, email, firstName })
  },

  updatePassword: async (resetToken, password, language) => {
    const tokenData = tokenService.validateResetToken(resetToken)
    const tokenFromDB = await tokenService.findToken(resetToken, RESET_TOKEN)

    if (!tokenData || !tokenFromDB) {
      throw createError(400, BAD_RESET_TOKEN)
    }

    const { id: userId, firstName, email } = tokenData
    await privateUpdateUser(userId, { password })

    await tokenService.removeResetToken(userId)

    await emailService.sendEmail(email, emailSubject.SUCCESSFUL_PASSWORD_RESET, language, {
      firstName
    })
  },

  confirmEmail: async (confirmToken) => {
    const tokenData = tokenService.validateConfirmToken(confirmToken)

    if (!tokenData) {
      throw createError(400, BAD_CONFIRM_TOKEN)
    }

    const user = await getUserById(tokenData.id)

    if (!user) {
      throw createError(404, DOCUMENT_NOT_FOUND(['User']))
    }

    if (user.isEmailConfirmed) {
      throw createError(400, EMAIL_ALREADY_CONFIRMED)
    }

    const confirmTokenData = await tokenService.findToken(confirmToken, CONFIRM_TOKEN)

    if (!confirmTokenData) {
      throw createError(400, BAD_CONFIRM_TOKEN)
    }

    await privateUpdateUser(user._id, { isEmailConfirmed: true })
    await tokenService.removeConfirmToken(confirmToken)
  },

  getMe: async (userId) => {
    const user = await getUserById(userId)

    if (!user) {
      throw createError(404, USER_NOT_FOUND)
    }

    return user
  },

  googleAuth: async (token) => {
    let payload

    try {
      payload = await verifyGoogleToken(token)
    } catch (error) {
      throw createError(400, INCORRECT_CREDENTIALS)
    }

    const { email } = payload || {}

    if (!email) {
      throw createError(400, INCORRECT_CREDENTIALS)
    }

    return authService.login(email, undefined, true)
  }
}

module.exports = authService
