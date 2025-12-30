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

module.exports = {
  getCategories,
  getCategoriesNames
}
