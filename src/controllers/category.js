const categoryService = require('~/services/category')

exports.createCategory = async (req, res) => {
  try {
    const created = await categoryService.createCategory(req.body)
    return res.status(201).json(created)
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        error: {
          code: 'DOCUMENT_ALREADY_EXISTS',
          message: 'Category with the same unique field already exists',
          details: err.keyValue || undefined
        }
      })
    }

    if (err && err.name === 'ValidationError') {
      const details = Object.keys(err.errors || {}).reduce((acc, k) => {
        acc[k] = err.errors[k].message
        return acc
      }, {})

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details
        }
      })
    }

    if (err && err.status) {
      return res.status(err.status).json({
        error: {
          code: err.code || 'ERROR',
          message: err.message || 'Error'
        }
      })
    }

    return res.status(500).json({
      error: {
        code: 'MONGO_SERVER_ERROR',
        message: (err && err.message) || 'Internal server error'
      }
    })
  }
}

