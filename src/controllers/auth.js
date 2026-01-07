const authService = require('~/services/auth')
const { oneDayInMs } = require('~/consts/auth')
const googleAuthService = require('~/services/googleAuth')
const {
  config: { COOKIE_DOMAIN }
} = require('~/configs/config')
const {
  tokenNames: { REFRESH_TOKEN, ACCESS_TOKEN }
} = require('~/consts/auth')

const COOKIE_OPTIONS = {
  maxAge: oneDayInMs,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
   ...(process.env.NODE_ENV === 'production' && COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
   path: '/'
};

const signup = async (req, res) => {
  const { role, firstName, lastName, email, password } = req.body
  const lang = req.lang

  const userData = await authService.signup(role, firstName, lastName, email, password, lang)

  res.status(201).json(userData)
}

const login = async (req, res) => {
  const { email, password } = req.body

  const tokens = await authService.login(email, password)

  res.cookie(ACCESS_TOKEN, tokens.accessToken, COOKIE_OPTIONS)
  res.cookie(REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTIONS)

  delete tokens.refreshToken

  res.status(200).json(tokens)
}

const googleLogin = async (req, res) => {
   let legacyToken = req.body.token;
  if (legacyToken && typeof legacyToken === 'object') {
  legacyToken = legacyToken.credential || legacyToken.token || legacyToken.idToken || legacyToken.id_token || legacyToken.jwt || undefined;
  }

  const idToken =
    req.body.idToken ||
    req.body.id_token ||
    req.body.credential ||
    (legacyToken && typeof legacyToken === 'string' ? legacyToken : undefined) ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
  if (!idToken && legacyToken) {
    const tokens = await authService.googleAuth(legacyToken)

    res.cookie(ACCESS_TOKEN, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTIONS)

    delete tokens.refreshToken
    return res.status(200).json(tokens)
  }

  if (!idToken) {
    return res.status(400).json({
      error: { message: 'Missing idToken' }
    })
  }

  try {
    const payload = await googleAuthService.verifyGoogleIdToken(idToken)

    if (!payload?.email || !payload?.sub) {
      return res.status(401).json({
        error: { message: 'Invalid Google token payload' }
      })
    }

    const email = payload.email.toLowerCase()
    const googleId = payload.sub

    const tokens = await authService.googleLogin(email, googleId)

    res.cookie(ACCESS_TOKEN, tokens.accessToken, COOKIE_OPTIONS)
    res.cookie(REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTIONS)

    delete tokens.refreshToken
    return res.status(200).json(tokens)
  } catch (err) {
    const status = err && err.status ? err.status : 500
    return res.status(status).json({
      error: {
        message: err && err.message ? err.message : 'Google authentication failed',
        code: err && err.code ? err.code : undefined
      }
    })
  }
}


const logout = async (req, res) => {
  const { refreshToken } = req.cookies

  await authService.logout(refreshToken)

  res.clearCookie(REFRESH_TOKEN)
  res.clearCookie(ACCESS_TOKEN)

  res.status(204).end()
}

const refreshAccessToken = async (req, res) => {
  const { refreshToken } = req.cookies

  if (!refreshToken) {
    res.clearCookie(ACCESS_TOKEN)

    return res.status(401).end()
  }

  const tokens = await authService.refreshAccessToken(refreshToken)

  res.cookie(ACCESS_TOKEN, tokens.accessToken, COOKIE_OPTIONS)
  res.cookie(REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTIONS)

  delete tokens.refreshToken

  res.status(200).json(tokens)
}

const sendResetPasswordEmail = async (req, res) => {
  const { email } = req.body
  const lang = req.lang

  await authService.sendResetPasswordEmail(email, lang)

  res.status(204).end()
}

const updatePassword = async (req, res) => {
  const { password } = req.body
  const resetToken = req.params.token
  const lang = req.lang

  await authService.updatePassword(resetToken, password, lang)

  res.status(204).end()
}

const confirmEmail = async (req, res) => {
  const { token } = req.params

  await authService.confirmEmail(token)

  res.status(200).json({ message: 'Email confirmed successfully.' })
}

const googleAuth = async (req, res) => {
  const { token } = req.body

  const tokens = await authService.googleAuth(token)

  res.cookie(ACCESS_TOKEN, tokens.accessToken, COOKIE_OPTIONS)
  res.cookie(REFRESH_TOKEN, tokens.refreshToken, COOKIE_OPTIONS)

  delete tokens.refreshToken

  res.status(200).json(tokens)
}

const googleAuthHandler = async (req, res) => {
  const { token } = req.body || {}
  const idToken =
    req.body?.idToken ||
    req.body?.id_token ||
    req.body?.credential ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1])

  if (!idToken && !token) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'The request could not be processed due to invalid or missing parameters.'
      }
    })
  }

  if (!idToken && token) {
    return googleAuth(req, res)
  }

  return googleLogin(req, res)
}

module.exports = {
  signup,
  login,
  logout,
  googleLogin,
  refreshAccessToken,
  sendResetPasswordEmail,
  updatePassword,
  confirmEmail,
  googleAuth,
  googleAuthHandler
}
