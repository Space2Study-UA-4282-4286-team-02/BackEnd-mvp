const lessonService = require('~/services/lesson')
const getCategoriesOptions = require('~/utils/getCategoriesOption')
const getMatchOptions = require('~/utils/getMatchOptions')
const getSortOptions = require('~/utils/getSortOptions')
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

const normalizeCategories = (value) => {
  if (value === undefined) {
    return undefined
  }

  return Array.isArray(value) ? value : [value]
}

const getLessons = async (req, res) => {
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

  const lessons = await lessonService.getLessons(
    match,
    sortOptions,
    parseQueryNumber(skip, 0),
    parseQueryNumber(limit, 1)
  )

  res.status(200).json(lessons)
}

const createLesson = async (req, res) => {
  const { id: authorId } = req.user
  const data = req.body

  const newLesson = await lessonService.createLesson(authorId, data)

  res.status(201).json(newLesson)
}

const updateLesson = async (req, res) => {
  const { id } = req.params
  const { id: currentUserId, role: currentUserRole } = req.user
  const updateData = req.body

  const updatedLesson = await lessonService.updateLesson(id, currentUserId, currentUserRole, updateData)

  res.status(200).json(updatedLesson)
}

module.exports = {
  getLessons,
  updateLesson,
  createLesson
}
