jest.resetModules()
jest.isolateModules(() => {
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
})

jest.resetModules()
jest.isolateModules(() => {
  const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
  const { expectError } = require('~/test/helpers')
  const { UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, DOCUMENT_NOT_FOUND, INVALID_ID } = require('~/consts/errors')
  const testUserAuthentication = require('~/utils/testUserAuth')
  const Category = require('~/models/category')
  const Subject = require('~/models/subject')
  const mongoose = require('mongoose')
  const {
    roles: { STUDENT, ADMIN }
  } = require('~/consts/auth')

  const endpointUrl = '/categories'

  describe('Category controller', () => {
    let app, server, accessToken
    let userIndex = 0

    beforeAll(async () => {
      ;({ app, server } = await serverInit())
    })

    beforeEach(async () => {
      accessToken = await testUserAuthentication(app, { role: STUDENT })
    })

    afterEach(async () => {
      await serverCleanup()
    })

    afterAll(async () => {
      await stopServer(server)
    })

    const seedCategories = async () => {
      const categoryWithSubject = await Category.create({
        name: 'Mathematics',
        appearance: { icon: 'math', color: '#111111' }
      })
      await Category.create({
        name: 'History'
      })
      await Subject.create({
        name: 'Algebra',
        category: categoryWithSubject._id
      })

      return categoryWithSubject
    }

    describe(`GET ${endpointUrl}`, () => {
      it('should return categories with subjects', async () => {
        const categoryWithSubject = await seedCategories()

        const response = await app.get(endpointUrl).set('Cookie', [`accessToken=${accessToken}`])

        expect(response.statusCode).toBe(200)
        expect(response.body.count).toBe(1)
        expect(response.body.items).toHaveLength(1)
        expect(response.body.items[0]._id.toString()).toBe(categoryWithSubject._id.toString())
        expect(response.body.items[0].name).toBe(categoryWithSubject.name)
      })

      it('should throw BAD_REQUEST for invalid query params', async () => {
        const response = await app.get(`${endpointUrl}?limit=not-a-number`).set('Cookie', [`accessToken=${accessToken}`])

        expectError(400, BAD_REQUEST, response)
      })

      it('should throw BAD_REQUEST for zero limit', async () => {
        const response = await app.get(`${endpointUrl}?limit=0`).set('Cookie', [`accessToken=${accessToken}`])

        expectError(400, BAD_REQUEST, response)
      })

      it('should throw UNAUTHORIZED', async () => {
        const response = await app.get(endpointUrl)

        expectError(401, UNAUTHORIZED, response)
      })

      it('should throw FORBIDDEN', async () => {
        userIndex += 1
        const adminAccessToken = await testUserAuthentication(app, {
          role: ADMIN,
          firstName: 'Admin',
          lastName: `User${userIndex}`,
          email: `admin${userIndex}@example.com`,
          password: 'Password1@',
          appLanguage: 'en',
          isEmailConfirmed: true,
          lastLoginAs: ADMIN
        })

        const response = await app.get(endpointUrl).set('Cookie', [`accessToken=${adminAccessToken}`])

        expectError(403, FORBIDDEN, response)
      })
    })

    describe(`GET ${endpointUrl}/names`, () => {
      it('should return category names with subjects', async () => {
        const categoryWithSubject = await seedCategories()

        const response = await app.get(`${endpointUrl}/names`).set('Cookie', [`accessToken=${accessToken}`])

        expect(response.statusCode).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0]._id.toString()).toBe(categoryWithSubject._id.toString())
        expect(response.body[0].name).toBe(categoryWithSubject.name)
      })

      it('should throw UNAUTHORIZED', async () => {
        const response = await app.get(`${endpointUrl}/names`)

        expectError(401, UNAUTHORIZED, response)
      })

      it('should throw FORBIDDEN', async () => {
        userIndex += 1
        const adminAccessToken = await testUserAuthentication(app, {
          role: ADMIN,
          firstName: 'Admin',
          lastName: `User${userIndex}`,
          email: `admin${userIndex}@example.com`,
          password: 'Password1@',
          appLanguage: 'en',
          isEmailConfirmed: true,
          lastLoginAs: ADMIN
        })

        const response = await app.get(`${endpointUrl}/names`).set('Cookie', [`accessToken=${adminAccessToken}`])

        expectError(403, FORBIDDEN, response)
      })
    })

    describe(`GET ${endpointUrl}/:id`, () => {
      it('should return category by id', async () => {
        const categoryWithSubject = await seedCategories()

        const response = await app.get(`${endpointUrl}/${categoryWithSubject._id}`).set('Cookie', [
          `accessToken=${accessToken}`
        ])

        expect(response.statusCode).toBe(200)
        expect(response.body._id.toString()).toBe(categoryWithSubject._id.toString())
        expect(response.body.name).toBe(categoryWithSubject.name)
      })

      it('should throw INVALID_ID', async () => {
        const response = await app.get(`${endpointUrl}/not-a-mongo-id`).set('Cookie', [
          `accessToken=${accessToken}`
        ])

        expectError(400, INVALID_ID, response)
      })

      it('should throw DOCUMENT_NOT_FOUND', async () => {
        const nonExistingId = new mongoose.Types.ObjectId()
        const response = await app.get(`${endpointUrl}/${nonExistingId}`).set('Cookie', [
          `accessToken=${accessToken}`
        ])

        expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
      })

      it('should throw UNAUTHORIZED', async () => {
        const response = await app.get(`${endpointUrl}/1234567890abcdef12345678`)

        expectError(401, UNAUTHORIZED, response)
      })

      it('should throw FORBIDDEN', async () => {
        userIndex += 1
        const adminAccessToken = await testUserAuthentication(app, {
          role: ADMIN,
          firstName: 'Admin',
          lastName: `User${userIndex}`,
          email: `admin${userIndex}@example.com`,
          password: 'Password1@',
          appLanguage: 'en',
          isEmailConfirmed: true,
          lastLoginAs: ADMIN
        })

        const response = await app.get(`${endpointUrl}/1234567890abcdef12345678`).set('Cookie', [
          `accessToken=${adminAccessToken}`
        ])

        expectError(403, FORBIDDEN, response)
      })
    })

    describe(`GET ${endpointUrl}/:id/subjects/names`, () => {
      it('should return subject names by category id', async () => {
        const categoryWithSubject = await seedCategories()
        const subject = await Subject.findOne({ category: categoryWithSubject._id }).lean().exec()

        const response = await app
          .get(`${endpointUrl}/${categoryWithSubject._id}/subjects/names`)
          .set('Cookie', [`accessToken=${accessToken}`])

        expect(response.statusCode).toBe(200)
        expect(response.body).toHaveLength(1)
        expect(response.body[0]._id.toString()).toBe(subject._id.toString())
        expect(response.body[0].name).toBe(subject.name)
      })

      it('should throw INVALID_ID', async () => {
        const response = await app
          .get(`${endpointUrl}/not-a-mongo-id/subjects/names`)
          .set('Cookie', [`accessToken=${accessToken}`])

        expectError(400, INVALID_ID, response)
      })

      it('should throw BAD_REQUEST when category id is missing', async () => {
        const response = await app.get(`${endpointUrl}/subjects/names`).set('Cookie', [`accessToken=${accessToken}`])

        expectError(400, BAD_REQUEST, response)
      })

      it('should throw DOCUMENT_NOT_FOUND', async () => {
        const nonExistingId = new mongoose.Types.ObjectId()
        const response = await app
          .get(`${endpointUrl}/${nonExistingId}/subjects/names`)
          .set('Cookie', [`accessToken=${accessToken}`])

        expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
      })

      it('should throw UNAUTHORIZED', async () => {
        const response = await app.get(`${endpointUrl}/1234567890abcdef12345678/subjects/names`)

        expectError(401, UNAUTHORIZED, response)
      })

      it('should throw FORBIDDEN', async () => {
        userIndex += 1
        const adminAccessToken = await testUserAuthentication(app, {
          role: ADMIN,
          firstName: 'Admin',
          lastName: `User${userIndex}`,
          email: `admin${userIndex}@example.com`,
          password: 'Password1@',
          appLanguage: 'en',
          isEmailConfirmed: true,
          lastLoginAs: ADMIN
        })

        const response = await app
          .get(`${endpointUrl}/1234567890abcdef12345678/subjects/names`)
          .set('Cookie', [`accessToken=${adminAccessToken}`])

        expectError(403, FORBIDDEN, response)
      })
    })
  })
})
