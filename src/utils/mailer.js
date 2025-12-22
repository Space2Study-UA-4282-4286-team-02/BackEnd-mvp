const nodemailer = require('nodemailer')
const logger = require('~/logger/logger')
const {
  smtpCredentials: { host, port, secure, user, pass }
} = require('~/configs/config')
const { createError } = require('~/utils/errorsHelper')
const { EMAIL_NOT_SENT } = require('~/consts/errors')

const transporter = nodemailer.createTransport({
  host,
  port: Number(port) || 465,
  secure: secure !== 'false',
  auth: {
    user,
    pass
  }
})

const sendMail = async (mailOptions) => {
  try {
    await transporter.verify()

    const result = await transporter.sendMail(mailOptions)

    return result
  } catch (err) {
    logger.error(err)
    console.error('sendMail error:', err)
    throw createError(400, EMAIL_NOT_SENT)
  }
}

module.exports = { sendMail }
