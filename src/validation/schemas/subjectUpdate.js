const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

const subjectUpdateValidationSchema = {
  name: {
    type: 'string',
    required: false,
    length: {
      min: 1,
      max: 50
    }
  },
  category: {
    type: 'string',
    required: false,
    length: {
      min: 24,
      max: 24
    },
    regex: OBJECT_ID_REGEX
  }
}

module.exports = subjectUpdateValidationSchema
