const idValidation = require('~/middlewares/idValidation')
const { INVALID_ID } = require('~/consts/errors')

describe('ID validation middleware', () => {
  it('throws INVALID_ID when id is invalid', () => {
    const next = jest.fn()

    const callMiddleware = () => idValidation({}, {}, next, 'invalid-id')

    expect(callMiddleware).toThrow(
      expect.objectContaining({
        status: 400,
        code: INVALID_ID.code,
        message: INVALID_ID.message
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next when id is valid', () => {
    const next = jest.fn()

    idValidation({}, {}, next, '507f1f77bcf86cd799439011')

    expect(next).toHaveBeenCalledTimes(1)
  })
})
