const subjectService = require('~/services/subject')
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

const getSubjects = async (req, res) => {
  const { name, skip, limit } = req.query
  const { id: categoryId } = req.params

  if (name !== undefined && typeof name !== 'string') {
    throw createBadRequestError()
  }

  const query = {
    name: name || '',
    skip: parseQueryNumber(skip, 0),
    limit: parseQueryNumber(limit, 1),
    categoryId
  }

  const subjects = await subjectService.getSubjects(query)

  res.status(200).json(subjects)
}

const getSubjectById = async (req, res) => {
  const { id } = req.params

  const subject = await subjectService.getSubjectById(id)

  res.status(200).json(subject)
}

const createSubject = async (req, res) => {
  const subject = await subjectService.createSubject(req.body)

  res.status(201).json(subject)
}

const updateSubject = async (req, res) => {
  const { id } = req.params

  await subjectService.updateSubject(id, req.body)

  res.status(204).end()
}

const deleteSubject = async (req, res) => {
  const { id } = req.params

  await subjectService.deleteSubject(id)

  res.status(204).end()
}

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
}
