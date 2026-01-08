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
    required: false
  }
}

module.exports = subjectUpdateValidationSchema
