const { OAuth2Client } = require('google-auth-library')
const {
  gmailCredentials: { clientId }
} = require('~/configs/config')

let oAuthClient = null

const getOAuthClient = () => {
  if (!oAuthClient) {
    oAuthClient = new OAuth2Client(clientId)
  }

  return oAuthClient
}

const verifyGoogleToken = async (token) => {
  const client = getOAuthClient()

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId
  })

  return ticket.getPayload()
}

module.exports = { verifyGoogleToken }
