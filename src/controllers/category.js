const categoryService = require('~/services/category')
const { createBadRequestError } = require('~/utils/errorsHelper')

const parseQueryNumber = (value, minValue = 0) => {
  if (value === undefined) {
    return undefined
  }

  const parsed = parseInt(value, 10)

  if (Number.isNaN(parsed) || parsed < minValue) {
    throw createBadRequestError()
  }

  return parsed
}

const createCategory = async (req, res) => {
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

const getCategories = async (req, res) => {
  const { name, skip, limit } = req.query

  if (name !== undefined && typeof name !== 'string') {
    throw createBadRequestError()
  }

  const query = {
    name: name || '',
    skip: parseQueryNumber(skip, 0),
    limit: parseQueryNumber(limit, 1)
  }

  const categories = await categoryService.getCategories(query)

  res.status(200).json(categories)
}

const getCategoriesNames = async (_req, res) => {
  const categories = await categoryService.getCategoriesNames()

  res.status(200).json(categories)
}

const getCategoryById = async (req, res) => {
  const { id } = req.params

  const category = await categoryService.getCategoryById(id)

  res.status(200).json(category)
}

const getSubjectNamesByCategoryId = async (req, res) => {
  const { id } = req.params

  if (!id) {
    throw createBadRequestError()
  }

  const subjects = await categoryService.getSubjectNamesByCategoryId(id)

  res.status(200).json(subjects)
}

module.exports = {
  createCategory,
  getCategories,
  getCategoriesNames,
  getCategoryById,
  getSubjectNamesByCategoryId
}
