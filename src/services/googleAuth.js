const { OAuth2Client } = require('google-auth-library')

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    const err = new Error('No idToken provided')
    err.status = 400
    throw err
  }

  if (typeof idToken !== 'string') {
    if (typeof idToken === 'object' && idToken !== null) {
      idToken = idToken.credential || idToken.token || idToken.idToken || idToken.jwt
    }
  }

  if (typeof idToken !== 'string') {
    const err = new Error('Invalid idToken type — expected string (JWT).')
    err.status = 400
    throw err
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()

    if (!payload) {
      const error = new Error('Invalid token payload')
      error.status = 401
      throw error
    }

    if (!payload.email_verified) {
      const error = new Error('Google email is not verified')
      error.status = 401
      error.code = 'UNVERIFIED_GOOGLE_EMAIL'
      throw error
    }

    return payload
  } catch (err) {
    const message = err && err.message ? err.message : 'Google token verification failed'
    const error = new Error(`Google token verification failed: ${message}`)
    error.status = err && err.status ? err.status : 401
    error.code = err && err.code ? err.code : 'BAD_GOOGLE_TOKEN'
    throw error
  }
}

module.exports = { verifyGoogleIdToken }
