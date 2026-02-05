const validationMiddleware = require('~/middlewares/validation')
const errors = require('~/consts/errors')

describe('Validation middleware', () => {
  const createNext = () => jest.fn()

  it('throws BODY_IS_NOT_DEFINED when body is missing', () => {
    const middleware = validationMiddleware({})
    const req = {}

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: errors.BODY_IS_NOT_DEFINED.code,
        message: errors.BODY_IS_NOT_DEFINED.message
      })
    )
  })

  it('throws FIELD_IS_NOT_DEFINED when required field is missing', () => {
    const middleware = validationMiddleware({ email: { required: true } })
    const req = { body: {} }

    const expected = errors.FIELD_IS_NOT_DEFINED('email')

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: expected.code,
        message: expected.message
      })
    )
  })

  it('throws FIELD_IS_NOT_OF_PROPER_TYPE when type is invalid', () => {
    const middleware = validationMiddleware({ age: { type: 'number' } })
    const req = { body: { age: '12' } }

    const expected = errors.FIELD_IS_NOT_OF_PROPER_TYPE('age', 'number')

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: expected.code,
        message: expected.message
      })
    )
  })

  it('throws FIELD_IS_NOT_OF_PROPER_LENGTH when length is invalid', () => {
    const middleware = validationMiddleware({ password: { length: { min: 2, max: 4 } } })
    const req = { body: { password: 'x' } }

    const expected = errors.FIELD_IS_NOT_OF_PROPER_LENGTH('password', { min: 2, max: 4 })

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: expected.code,
        message: expected.message
      })
    )
  })

  it('throws FIELD_IS_NOT_OF_PROPER_FORMAT when regex is invalid', () => {
    const middleware = validationMiddleware({ email: { regex: /^[^@]+@[^@]+\.[^@]+$/ } })
    const req = { body: { email: 'invalid' } }

    const expected = errors.FIELD_IS_NOT_OF_PROPER_FORMAT('email')

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: expected.code,
        message: expected.message
      })
    )
  })

  it('throws FIELD_IS_NOT_OF_PROPER_ENUM_VALUE when enum is invalid', () => {
    const middleware = validationMiddleware({ role: { enum: ['student', 'admin'] } })
    const req = { body: { role: 'guest' } }

    const expected = errors.FIELD_IS_NOT_OF_PROPER_ENUM_VALUE('role', ['student', 'admin'])

    expect(() => middleware(req, {}, createNext())).toThrow(
      expect.objectContaining({
        status: 422,
        code: expected.code,
        message: expected.message
      })
    )
  })

  it('calls next when body is valid', () => {
    const middleware = validationMiddleware({
      email: { required: true, type: 'string', regex: /^[^@]+@[^@]+\.[^@]+$/ },
      password: { required: true, length: { min: 8, max: 12 } },
      role: { enum: ['student', 'admin'] }
    })
    const req = {
      body: {
        email: 'valid@example.com',
        password: 'password1',
        role: 'student'
      }
    }
    const next = createNext()

    middleware(req, {}, next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})
