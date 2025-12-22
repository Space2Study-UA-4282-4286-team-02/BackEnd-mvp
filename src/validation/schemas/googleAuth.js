const {
  enums: { ROLE_ENUM }
} = require('~/consts/validation')

const googleAuthValidationSchema = {
  token: {
    type: 'string',
    required: true
  },
  role: {
    type: 'string',
    enum: ROLE_ENUM
  }
}

module.exports = googleAuthValidationSchema
