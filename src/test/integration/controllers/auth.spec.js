const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const {
  lengths: { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH },
  enums: { ROLE_ENUM }
} = require('~/consts/validation')
const errors = require('~/consts/errors')
const tokenService = require('~/services/token')
const Token = require('~/models/token')
const { expectError } = require('~/test/helpers')

describe('Auth controller', () => {
  let app, server, signupResponse

  beforeAll(async () => {
    ; ({ app, server } = await serverInit())
  })

  beforeEach(async () => {
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
    beforeEach(() => {
      const { firstName, email, role } = user

      resetToken = tokenService.generateResetToken({ id: signupResponse.body.userId, firstName, email, role })

      Token.findOne = jest.fn().mockResolvedValue({ save: jest.fn().mockResolvedValue(resetToken) })
    })
    afterEach(() => jest.resetAllMocks())

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
      const googleAuth = require('~/services/googleAuth')
      const authService = require('~/services/auth')

      jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockResolvedValue({
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
      const googleAuth = require('~/services/googleAuth')
      const authService = require('~/services/auth')

      jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockResolvedValue({
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
      const errMsg =
        response.body && response.body.error && (response.body.error.message || response.body.error.code)
      expect(typeof errMsg === 'string' ? errMsg.includes('You are not registered') : false).toBeTruthy()
    })

    it('should return 400 when idToken is missing', async () => {
      const response = await app.post('/auth/google-auth').send({})

      expect(response.status).toBe(400)
      const errMsg = response.body && response.body.error && (response.body.error.message || response.body.error.code)
      expect(typeof errMsg === 'string' ? errMsg.includes('Missing idToken') : false).toBeTruthy()
    })

    it('should return 401 for unverified Google email', async () => {
      const googleAuth = require('~/services/googleAuth')

      jest.spyOn(googleAuth, 'verifyGoogleIdToken').mockImplementation(() => {
        const err = new Error('Google email is not verified')
        err.status = 401
        err.code = 'UNVERIFIED_GOOGLE_EMAIL'
        throw err
      })

      const response = await app.post('/auth/google-auth').send({ idToken: 'fake-token' })

      expect(response.status).toBe(401)
      const errMsg = response.body && response.body.error && (response.body.error.message || response.body.error.code)
      expect(typeof errMsg === 'string' ? errMsg.includes('verified') || errMsg.includes('UNVERIFIED_GOOGLE_EMAIL') : false).toBeTruthy()
    })
  })
})
