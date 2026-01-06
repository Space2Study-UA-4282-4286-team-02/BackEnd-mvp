jest.mock('~/services/email', () => ({
  sendEmail: jest.fn()
}))
jest.mock('~/utils/googleAuth', () => ({
  verifyGoogleToken: jest.fn()
}))
jest.mock('~/services/googleAuth', () => ({
  verifyGoogleIdToken: jest.fn()
}))

const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const {
  lengths: { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH },
  enums: { ROLE_ENUM }
} = require('~/consts/validation')
const errors = require('~/consts/errors')
const tokenService = require('~/services/token')
const Token = require('~/models/token')
const User = require('~/models/user')
const { verifyGoogleToken } = require('~/utils/googleAuth')
const { verifyGoogleIdToken } = require('~/services/googleAuth')
const { expectError } = require('~/test/helpers')

describe('Auth controller', () => {
  let app, server, signupResponse

  beforeAll(async () => {
    ; ({ app, server } = await serverInit())
  })

  beforeEach(async () => {
    verifyGoogleToken.mockReset()
    verifyGoogleIdToken.mockReset()
    signupResponse = await app.post('/auth/signup').send(user)
  })

  afterEach(async () => {
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  const user = {
    role: 'student',
    firstName: 'test',
    lastName: 'test',
    email: 'test@gmail.com',
    password: 'testpass_135'
  }

  const getConfirmToken = async () => {
    const tokenData = await Token.findOne({ user: signupResponse.body.userId }).lean()
    return tokenData?.confirmToken
  }

  const confirmSignedUpUser = async () => {
    const confirmToken = await getConfirmToken()

    if (confirmToken) {
      await app.get(`/auth/confirm-email/${confirmToken}`)
    }
  }

  describe('Signup endpoint', () => {
    it('should throw validation errors for the firstName field', async () => {
      const responseForFormat = await app.post('/auth/signup').send({ ...user, firstName: '12345' })
      const responseForNull = await app.post('/auth/signup').send({ ...user, firstName: null })

      const formatError = errors.NAME_FIELD_IS_NOT_OF_PROPER_FORMAT('firstName')
      const nullError = errors.FIELD_IS_NOT_DEFINED('firstName')
      expectError(422, formatError, responseForFormat)
      expectError(422, nullError, responseForNull)
    })

    it('should throw validation errors for the email format', async () => {
      const responseForFormat = await app.post('/auth/signup').send({ ...user, email: 'test' })
      const responseForType = await app.post('/auth/signup').send({ ...user, email: 312938 })

      const formatError = errors.FIELD_IS_NOT_OF_PROPER_FORMAT('email')
      const typeError = errors.FIELD_IS_NOT_OF_PROPER_TYPE('email', 'string')
      expectError(422, formatError, responseForFormat)
      expectError(422, typeError, responseForType)
    })

    it('should throw validation error for the role value', async () => {
      const signupResponse = await app.post('/auth/signup').send({ ...user, role: 'test' })

      const error = errors.FIELD_IS_NOT_OF_PROPER_ENUM_VALUE('role', ROLE_ENUM)
      expectError(422, error, signupResponse)
    })

    it('should throw validation errors for the password`s length', async () => {
      const responseForMax = await app
        .post('/auth/signup')
        .send({ ...user, password: '1'.repeat(MAX_PASSWORD_LENGTH + 1) })

      const responseForMin = await app
        .post('/auth/signup')
        .send({ ...user, password: '1'.repeat(MIN_PASSWORD_LENGTH - 1) })

      const error = errors.FIELD_IS_NOT_OF_PROPER_LENGTH('password', {
        min: MIN_PASSWORD_LENGTH,
        max: MAX_PASSWORD_LENGTH
      })
      expectError(422, error, responseForMax)
      expectError(422, error, responseForMin)
    })

    it('should throw ALREADY_REGISTERED error', async () => {
      await app.post('/auth/signup').send(user)

      const response = await app.post('/auth/signup').send(user)

      expectError(409, errors.ALREADY_REGISTERED, response)
    })
  })

  describe('SendResetPasswordEmail endpoint', () => {
    it('should throw USER_NOT_FOUND error', async () => {
      const response = await app.post('/auth/forgot-password').send({ email: 'invalid@gmail.com' })

      expectError(404, errors.USER_NOT_FOUND, response)
    })
  })

  describe('UpdatePassword endpoint', () => {
    let resetToken
    let findOneSpy
    beforeEach(() => {
      const { firstName, email, role } = user

      resetToken = tokenService.generateResetToken({ id: signupResponse.body.userId, firstName, email, role })

      findOneSpy = jest.spyOn(Token, 'findOne').mockResolvedValue({ save: jest.fn().mockResolvedValue(resetToken) })
    })
    afterEach(() => {
      if (findOneSpy) {
        findOneSpy.mockRestore()
        findOneSpy = null
      }
    })

    it('should throw BAD_RESET_TOKEN error', async () => {
      const response = await app.patch('/auth/reset-password/invalid-token').send({ password: 'valid_pass1' })

      expectError(400, errors.BAD_RESET_TOKEN, response)
    })
  })


  describe('Google auth endpoint', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should log in a registered user via Google', async () => {
      const authService = require('~/services/auth')

      verifyGoogleIdToken.mockResolvedValue({
        email: user.email,
        sub: 'google-sub-123',
        email_verified: true
      })

      jest.spyOn(authService, 'googleLogin').mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456'
      })

      const response = await app.post('/auth/google-auth').send({ idToken: 'fake-token' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken', 'access-123')
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should return "You are not registered" for unregistered Google user', async () => {
      const authService = require('~/services/auth')

      verifyGoogleIdToken.mockResolvedValue({
        email: 'nouser@example.com',
        sub: 'google-sub-999',
        email_verified: true
      })

      jest.spyOn(authService, 'googleLogin').mockImplementation(() => {
        const err = new Error('You are not registered')
        err.status = 401
        err.code = 'USER_NOT_REGISTERED'
        throw err
      })

      const response = await app.post('/auth/google-auth').send({ idToken: 'fake-token' })

      expect(response.status).toBe(401)
      const errorPayload = response.body.error || response.body
      expect(errorPayload.message).toBe('You are not registered')
      expect(errorPayload.code).toBe('USER_NOT_REGISTERED')
    })

    it('should return 400 when idToken is missing', async () => {
      const response = await app.post('/auth/google-auth').send({})

      expect(response.status).toBe(400)
      const errorPayload = response.body.error || response.body
      expect(errorPayload.code).toBe('BAD_REQUEST')
      expect(errorPayload.message).toBe('The request could not be processed due to invalid or missing parameters.')
    })

    it('should return 401 for unverified Google email', async () => {
      verifyGoogleIdToken.mockImplementation(() => {
        const err = new Error('Google email is not verified')
        err.status = 401
        err.code = 'UNVERIFIED_GOOGLE_EMAIL'
        throw err
      })

      const response = await app.post('/auth/google-auth').send({ idToken: 'fake-token' })

      expect(response.status).toBe(401)
      const errorPayload = response.body.error || response.body
      expect(errorPayload.code).toBe('UNVERIFIED_GOOGLE_EMAIL')
      expect(errorPayload.message).toContain('Google email is not verified')
    })
  })

  describe('ConfirmEmail endpoint', () => {
    it('should confirm email successfully', async () => {
      const confirmToken = await getConfirmToken()

      const response = await app.get(`/auth/confirm-email/${confirmToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ message: 'Email confirmed successfully.' })

      const updatedUser = await User.findById(signupResponse.body.userId).select('+isEmailConfirmed').lean()
      expect(updatedUser.isEmailConfirmed).toBe(true)
    })

    it('should throw BAD_CONFIRM_TOKEN error for invalid token', async () => {
      const response = await app.get('/auth/confirm-email/invalid-token')

      expectError(400, errors.BAD_CONFIRM_TOKEN, response)
    })

    it('should throw EMAIL_ALREADY_CONFIRMED error when token is reused', async () => {
      const confirmToken = await getConfirmToken()

      await app.get(`/auth/confirm-email/${confirmToken}`)
      const response = await app.get(`/auth/confirm-email/${confirmToken}`)

      expectError(400, errors.EMAIL_ALREADY_CONFIRMED, response)
    })

    it('should throw DOCUMENT_NOT_FOUND error when user no longer exists', async () => {
      const confirmToken = await getConfirmToken()
      await User.findByIdAndDelete(signupResponse.body.userId)

      const response = await app.get(`/auth/confirm-email/${confirmToken}`)

      expectError(404, errors.DOCUMENT_NOT_FOUND(['User']), response)
    })
  })

  describe('GoogleAuth endpoint', () => {
    it('should login user via google when token is valid and email confirmed', async () => {
      verifyGoogleToken.mockResolvedValue({ email: user.email })
      await confirmSignedUpUser()

      const response = await app.post('/auth/google-auth').send({ token: 'google-token', role: user.role })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).not.toHaveProperty('refreshToken')
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('accessToken='), expect.stringContaining('refreshToken=')])
      )
    })

    it('should throw EMAIL_NOT_CONFIRMED error when user is not confirmed', async () => {
      verifyGoogleToken.mockResolvedValue({ email: user.email })

      const response = await app.post('/auth/google-auth').send({ token: 'google-token' })

      expectError(401, errors.EMAIL_NOT_CONFIRMED, response)
    })

    it('should throw USER_NOT_FOUND error when user does not exist', async () => {
      verifyGoogleToken.mockResolvedValue({ email: 'unknown@gmail.com' })

      await confirmSignedUpUser()
      const response = await app.post('/auth/google-auth').send({ token: 'google-token', role: user.role })

      expectError(401, errors.USER_NOT_FOUND, response)
    })

    it('should throw INCORRECT_CREDENTIALS error for invalid google token', async () => {
      verifyGoogleToken.mockRejectedValue(new Error('invalid token'))

      const response = await app.post('/auth/google-auth').send({ token: 'invalid-token' })

      expectError(400, errors.INCORRECT_CREDENTIALS, response)
    })

    it('should throw INCORRECT_CREDENTIALS error when payload has no email', async () => {
      verifyGoogleToken.mockResolvedValue({})

      const response = await app.post('/auth/google-auth').send({ token: 'google-token' })

      expectError(400, errors.INCORRECT_CREDENTIALS, response)

    })
  })
})
