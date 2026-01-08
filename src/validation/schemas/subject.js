const subjectValidationSchema = {
  name: {
    type: 'string',
    required: true,
    length: {
      min: 1,
      max: 50
    }
  },
  category: {
    type: 'string',
    required: true
  }
}

module.exports = subjectValidationSchema
