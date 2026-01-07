const bcrypt = require('bcrypt')
const { config } = require('~/configs/config')
const { createError } = require('~/utils/errorsHelper')

const MIN_ROUNDS = 10
const MAX_ROUNDS = 12

function getSaltRounds() {
  const raw = config.BCRYPT_SALT_ROUNDS || process.env.BCRYPT_SALT_ROUNDS || '12'
  const rounds = Number(raw)

  if (Number.isNaN(rounds)) {
    throw createError(500, { message: 'BCRYPT_SALT_ROUNDS must be a number', code: 'INVALID_CONFIG' })
  }

  if (rounds < MIN_ROUNDS || rounds > MAX_ROUNDS) {
    throw createError(500, { message: `BCRYPT_SALT_ROUNDS must be between ${MIN_ROUNDS} and ${MAX_ROUNDS}`, code: 'INVALID_CONFIG' })
  }

  return rounds
}

const passwordService = {
  hashPassword: async (plainPassword) => {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw createError(400, { message: 'Password must be a non-empty string', code: 'INVALID_PASSWORD' })
    }
    const rounds = getSaltRounds()
    const hashed = await bcrypt.hash(plainPassword, rounds)
    return hashed
  },

  comparePasswords: async (plainPassword, hashedPassword) => {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw createError(400, { message: 'Password must be a non-empty string', code: 'INVALID_PASSWORD' })
    }
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw createError(400, { message: 'Hashed password must be provided', code: 'INVALID_PASSWORD' })
    }
    const match = await bcrypt.compare(plainPassword, hashedPassword)
    return match
  }
}

module.exports = passwordService
