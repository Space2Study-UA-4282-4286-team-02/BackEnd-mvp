jest.mock('~/services/email', () => ({
  sendEmail: jest.fn()
}))
jest.mock('~/utils/googleAuth', () => ({
  verifyGoogleToken: jest.fn()
}))

const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const authService = require('~/services/auth')
const userService = require('~/services/user')
const Token = require('~/models/token')
const User = require('~/models/user')
const emailService = require('~/services/email')
const emailSubject = require('~/consts/emailSubject')

describe('Auth service (integration)', () => {
  let server
  let userIndex = 0

  const buildUser = (overrides = {}) => {
    userIndex += 1
    return {
      role: 'student',
      firstName: 'Test',
      lastName: 'User',
      email: `user${userIndex}@example.com`,
      password: 'Testpass1',
      appLanguage: 'en',
      ...overrides
    }
  }

  beforeAll(async () => {
    ;({ server } = await serverInit())
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await serverCleanup()
  })

  afterAll(async () => {
    await stopServer(server)
  })

  it('signup creates a user, stores confirm token, and sends email', async () => {
    const user = buildUser()

    const result = await authService.signup(
      user.role,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.appLanguage
    )

    expect(result).toMatchObject({ userEmail: user.email })

    const tokenDoc = await Token.findOne({ user: result.userId }).lean()
    expect(tokenDoc?.confirmToken).toBeTruthy()

    const createdUser = await User.findById(result.userId).select('+isEmailConfirmed').lean()
    expect(createdUser.isEmailConfirmed).toBe(false)

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      user.email,
      emailSubject.EMAIL_CONFIRMATION,
      user.appLanguage,
      expect.objectContaining({
        confirmToken: tokenDoc.confirmToken,
        email: user.email,
        firstName: user.firstName
      })
    )
  })

  it('login returns tokens, stores refresh token, and updates login metadata', async () => {
    const user = buildUser()

    const created = await userService.createUser(
      user.role,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.appLanguage,
      true
    )

    const tokens = await authService.login(user.email, user.password)

    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()

    const tokenDoc = await Token.findOne({ user: created._id }).lean()
    expect(tokenDoc.refreshToken).toBe(tokens.refreshToken)

    const updatedUser = await User.findById(created._id).select('+isFirstLogin').lean()
    expect(updatedUser.isFirstLogin).toBe(false)
    expect(updatedUser.lastLogin).toBeInstanceOf(Date)
  })

  it('login fails when email is not confirmed', async () => {
    const user = buildUser()

    await userService.createUser(
      user.role,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.appLanguage,
      false
    )

    await expect(authService.login(user.email, user.password)).rejects.toMatchObject({
      status: 401,
      code: 'EMAIL_NOT_CONFIRMED'
    })
  })

  it('refreshAccessToken rotates refresh token', async () => {
    const user = buildUser()

    const created = await userService.createUser(
      user.role,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.appLanguage,
      true
    )

    const tokens = await authService.login(user.email, user.password)

    const refreshed = await authService.refreshAccessToken(tokens.refreshToken)

    expect(refreshed.accessToken).toBeTruthy()
    expect(refreshed.refreshToken).toBeTruthy()
    expect(refreshed.refreshToken).not.toBe(tokens.refreshToken)

    const tokenDoc = await Token.findOne({ user: created._id }).lean()
    expect(tokenDoc.refreshToken).toBe(refreshed.refreshToken)
  })

  it('confirmEmail marks user as confirmed and removes confirm token', async () => {
    const user = buildUser()

    const result = await authService.signup(
      user.role,
      user.firstName,
      user.lastName,
      user.email,
      user.password,
      user.appLanguage
    )

    const tokenDoc = await Token.findOne({ user: result.userId }).lean()

    await authService.confirmEmail(tokenDoc.confirmToken)

    const updatedUser = await User.findById(result.userId).select('+isEmailConfirmed').lean()
    expect(updatedUser.isEmailConfirmed).toBe(true)

    const tokenAfter = await Token.findOne({ user: result.userId }).lean()
    expect(tokenAfter.confirmToken).toBeNull()
  })
})
