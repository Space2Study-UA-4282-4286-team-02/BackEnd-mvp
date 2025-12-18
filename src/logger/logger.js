const { createLogger, transports, format } = require('winston')
const { combine, timestamp, json, metadata, errors, prettyPrint } = format
require('winston-mongodb')

const {
  config: { MONGODB_URL }
} = require('~/configs/config')

const logger = createLogger({
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'DD-MM-YYYY hh:mm:ss A' }),
    metadata(),
    json(),
    prettyPrint()
  ),
  transports: [
    new transports.Console({
      handleExceptions: true
    })
  ]
})

const shouldUseMongoTransport = process.env.NODE_ENV !== 'test' && Boolean(MONGODB_URL)

if (shouldUseMongoTransport) {
  logger.add(
    new transports.MongoDB({
      level: 'error',
      db: MONGODB_URL,
      options: { useUnifiedTopology: true },
      expireAfterSeconds: 604800,
      handleExceptions: true
    })
  )
} else if (process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn('MongoDB logger disabled: missing MONGODB_URL')
}

module.exports = logger
