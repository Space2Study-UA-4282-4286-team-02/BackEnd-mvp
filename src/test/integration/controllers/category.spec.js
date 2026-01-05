jest.mock('~/middlewares/auth', () => {
  const authMiddleware = (req, res, next) => {
    const cookie = req.headers.cookie || ''
    const match = cookie.match(/accessToken=([^;]+)/)
    const token = match ? match[1] : null

    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No token' } })
    }

    req.user = { token }
    return next()
  }

  const restrictTo = () => (req, res, next) => {
    const token = req.user && req.user.token
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED' } })
    }
    if (token !== 'admin-token') {
      return res.status(403).json({ error: { code: 'FORBIDDEN' } })
    }
    return next()
  }

  return { authMiddleware, restrictTo }
})

jest.mock('~/middlewares/entityValidation', () => {
  return jest.fn(() => (req, res, next) => next())
})

const mockCategoryCtor = jest.fn()
jest.mock('~/models/category', () => mockCategoryCtor)

const express = require('express')
const request = require('supertest')
const categoryRouter = require('../../../routes/category')
const Category = require('../../../models/category')

describe('POST /categories (integration, mocked model)', () => {
  let serverApp

  const adminToken = 'admin-token'
  const userToken = 'user-token'

  beforeAll(() => {
    serverApp = express()
    serverApp.use(express.json())
    serverApp.use('/categories', categoryRouter)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('201 — admin can create category', async () => {
    Category.mockImplementation(function (data) {
      this.data = data
      this.save = jest.fn().mockResolvedValue({
        _id: '1',
        name: data.name,
        toObject: () => ({ _id: '1', name: data.name })
      })
    })

    const res = await request(serverApp)
      .post('/categories')
      .set('Cookie', [`accessToken=${adminToken}`])
      .send({
        name: 'Integration Category'
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('_id')
    expect(res.body.name).toBe('Integration Category')
  })

  test('400 — invalid body returns validation error', async () => {
    const validationErr = new Error('Category validation failed')
    validationErr.name = 'ValidationError'
    validationErr.message = 'Category validation failed: name: Path `name` is required.'
    validationErr.errors = {
      name: { message: 'The name field cannot be empty.' }
    }

    Category.mockImplementation(function (data) {
      this.data = data
      this.save = jest.fn().mockRejectedValue(validationErr)
    })

    const res = await request(serverApp)
      .post('/categories')
      .set('Cookie', [`accessToken=${adminToken}`])
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toBeDefined()
    expect(Object.keys(res.body.error.details).length).toBeGreaterThan(0)
  })

  test('403 — non-admin cannot create category', async () => {
    const res = await request(serverApp)
      .post('/categories')
      .set('Cookie', [`accessToken=${userToken}`])
      .send({
        name: 'Should Not Create'
      })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('error')
  })

  test('409 — duplicate category (same name) returns conflict', async () => {
    const mongoErr = new Error('E11000 duplicate key error')
    mongoErr.code = 11000
    mongoErr.keyValue = { name: 'dup-name' }

    Category.mockImplementation(function (data) {
      this.data = data
      this.save = jest.fn().mockRejectedValue(mongoErr)
    })

    const res = await request(serverApp)
      .post('/categories')
      .set('Cookie', [`accessToken=${adminToken}`])
      .send({ name: 'Dup' })

    expect(res.status).toBe(409)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error.code).toBe('DOCUMENT_ALREADY_EXISTS')
    expect(res.body.error.details).toBeDefined()
  })
})
