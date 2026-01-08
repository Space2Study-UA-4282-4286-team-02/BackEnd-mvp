describe('password.service', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  test('hashPassword returns a hash and comparePasswords validates it', async () => {
    const passwordService = require('~/services/password.service')
    const plain = 'MyStr0ngP@ssw0rd'
    const hashed = await passwordService.hashPassword(plain)

    expect(typeof hashed).toBe('string')
    expect(hashed.length).toBeGreaterThan(0)

    const match = await passwordService.comparePasswords(plain, hashed)
    expect(match).toBe(true)

    const wrong = await passwordService.comparePasswords('wrongpass', hashed)
    expect(wrong).toBe(false)
  })

  test('hashPassword throws on invalid plain password', async () => {
    const passwordService = require('~/services/password.service')
    await expect(passwordService.hashPassword('')).rejects.toBeTruthy()
    await expect(passwordService.hashPassword(null)).rejects.toBeTruthy()
    await expect(passwordService.hashPassword(123)).rejects.toBeTruthy()
  })

  test('invalid BCRYPT_SALT_ROUNDS (non-numeric) causes error', async () => {
    const old = process.env.BCRYPT_SALT_ROUNDS
    try {
      process.env.BCRYPT_SALT_ROUNDS = 'not-a-number'
      jest.resetModules()
      const passwordService = require('~/services/password.service')
      await expect(passwordService.hashPassword('abc')).rejects.toBeTruthy()
    } finally {
      process.env.BCRYPT_SALT_ROUNDS = old
    }
  })

  test('out-of-range BCRYPT_SALT_ROUNDS causes error', async () => {
    const old = process.env.BCRYPT_SALT_ROUNDS
    try {
      process.env.BCRYPT_SALT_ROUNDS = '1' 
      jest.resetModules()
      const passwordService = require('~/services/password.service')
      await expect(passwordService.hashPassword('abc')).rejects.toBeTruthy()
    } finally {
      process.env.BCRYPT_SALT_ROUNDS = old
    }
  })
})
