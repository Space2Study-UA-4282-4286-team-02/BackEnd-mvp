const {
  INTERNAL_SERVER_ERROR,
  DOCUMENT_ALREADY_EXISTS,
  MONGO_SERVER_ERROR,
  VALIDATION_ERROR
} = require('~/consts/errors')
const logger = require('~/logger/logger')
const getUniqueFields = require('~/utils/getUniqueFields')

const errorMiddleware = (err, _req, res, _next) => {
  const { name, status, code, message } = err
  logger.error(err)

  const dataErrors = {
    MongoServerError: (message, statusCode) => {
      if (statusCode === 11000) {
        const uniqueFields = getUniqueFields(message)

        return res.status(409).json({
          status: 409,
          ...DOCUMENT_ALREADY_EXISTS(uniqueFields)
        })
      }
      return res.status(500).json({
        status: 500,
        ...MONGO_SERVER_ERROR(message)
      })
    },
    ValidationError: (message) => {
      return res.status(409).json({
        status: 409,
        ...VALIDATION_ERROR(message)
      })
    }
  }

  if (name in dataErrors) {
    const handleDataError = dataErrors[name]
    return handleDataError(message, code)
  }

  const statusCode = status || 500
  const errorCode = code || INTERNAL_SERVER_ERROR.code

  res.status(statusCode).json({
    status: statusCode,
    code: errorCode,
    message
  })
}

module.exports = errorMiddleware
