const categoryValidationSchema = {
  name: { type: 'string', required: true, length: { min: 1, max: 255 } },
  appearance: {
    type: 'object',
    required: true,
    props: {
      icon: { type: 'string', required: true, empty: false },
      color: { type: 'string', required: true, empty: false }
    }
  }
}

module.exports = categoryValidationSchema
