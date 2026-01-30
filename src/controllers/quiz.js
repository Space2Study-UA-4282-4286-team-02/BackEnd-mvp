const quizService = require('~/services/quiz')
const getCategoriesOptions = require('~/utils/getCategoriesOption')
const getMatchOptions = require('~/utils/getMatchOptions')
const getSortOptions = require('~/utils/getSortOptions')
const { createBadRequestError } = require('~/utils/errorsHelper')

const parseQueryNumber = (value, minValue = 0) => {
  if (value === undefined) {
    return undefined
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < minValue) {
    throw createBadRequestError()
  }

  return parsed
}

const normalizeCategories = (value) => {
  if (value === undefined) {
    return undefined
  }

  return Array.isArray(value) ? value : [value]
}

const getQuizzes = async (req, res) => {
  const { id: author } = req.user
  const { title, sort, skip, limit, categories } = req.query

  if (title !== undefined && typeof title !== 'string') {
    throw createBadRequestError()
  }

  const categoriesOptions = getCategoriesOptions(normalizeCategories(categories))

  const match = getMatchOptions({
    author,
    title,
    category: categoriesOptions
  })
  const sortOptions = getSortOptions(sort)

  const quizzes = await quizService.getQuizzes(
    match,
    sortOptions,
    parseQueryNumber(skip, 0),
    parseQueryNumber(limit, 1)
  )

  res.status(200).json(quizzes)
}

const getQuizById = async (req, res) => {
  const { id } = req.params
  const { id: currentUserId, role: currentUserRole } = req.user

  const quiz = await quizService.getQuizById(id, currentUserId, currentUserRole)

  res.status(200).json(quiz)
}

const updateQuiz = async (req, res) => {
  const { id } = req.params
  const { id: currentUserId, role: currentUserRole } = req.user
  const updateData = req.body

  const updatedQuiz = await quizService.updateQuiz(id, currentUserId, currentUserRole, updateData)

  res.status(200).json(updatedQuiz)
}

const deleteQuiz = async (req, res) => {
  const { id } = req.params
  const { id: currentUserId, role: currentUserRole } = req.user

  await quizService.deleteQuiz(id, currentUserId, currentUserRole)

  res.status(204).end()
}

module.exports = {
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz
}
