jest.mock('~/logger/logger', () => ({
  error: jest.fn()
}))

const errorMiddleware = require('~/middlewares/error')
const errors = require('~/consts/errors')

describe('Error middleware', () => {
  const createRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn()
    return res
  }

  it('handles MongoServerError with duplicate key', () => {
    const res = createRes()
    const err = {
      name: 'MongoServerError',
      code: 11000,
      message: 'E11000 duplicate key error collection: db.users index: email_1 dup key: { email: "test@example.com" }'
    }

    errorMiddleware(err, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 409,
        ...errors.DOCUMENT_ALREADY_EXISTS('email')
      })
    )
  })

  it('handles MongoServerError with non-duplicate code', () => {
    const res = createRes()
    const err = {
      name: 'MongoServerError',
      code: 12345,
      message: 'Some mongo error'
    }

    errorMiddleware(err, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        ...errors.MONGO_SERVER_ERROR('Some mongo error')
      })
    )
  })

  it('handles ValidationError', () => {
    const res = createRes()
    const err = {
      name: 'ValidationError',
      message: 'User validation failed'
    }

    errorMiddleware(err, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 409,
        ...errors.VALIDATION_ERROR('User validation failed')
      })
    )
  })

  it('handles custom status and code errors', () => {
    const res = createRes()
    const err = {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid input'
    }

    errorMiddleware(err, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid input'
    })
  })

  it('defaults to internal server error when status/code missing', () => {
    const res = createRes()
    const err = {
      message: 'Boom'
    }

    errorMiddleware(err, {}, res, jest.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      status: 500,
      code: errors.INTERNAL_SERVER_ERROR.code,
      message: 'Boom'
    })
  })
})
