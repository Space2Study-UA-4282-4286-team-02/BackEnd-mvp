const { serverInit, serverCleanup, stopServer } = require('~/test/setup')
const { expectError } = require('~/test/helpers')
const {
  UNAUTHORIZED,
  FORBIDDEN,
  BAD_REQUEST,
  DOCUMENT_NOT_FOUND,
  INVALID_ID,
  FIELD_IS_NOT_DEFINED
} = require('~/consts/errors')
const testUserAuthentication = require('~/utils/testUserAuth')
const Category = require('~/models/category')
const Subject = require('~/models/subject')
const mongoose = require('mongoose')
const {
  roles: { STUDENT, ADMIN }
} = require('~/consts/auth')

const endpointUrl = '/categories'

describe('Subject controller', () => {
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

  const seedSubjects = async () => {
    const categoryOne = await Category.create({
      name: 'Mathematics',
      appearance: { icon: 'math', color: '#111111' }
    })
    const categoryTwo = await Category.create({
      name: 'History'
    })

    await Subject.create([
      { name: 'Algebra', category: categoryOne._id, totalOffers: { student: 2, tutor: 1 } },
      { name: 'Geometry', category: categoryOne._id },
      { name: 'World History', category: categoryTwo._id }
    ])

    return { categoryOne, categoryTwo }
  }

  describe(`GET ${endpointUrl}/subjects`, () => {
    it('should return all subjects', async () => {
      await seedSubjects()

      const response = await app.get(`${endpointUrl}/subjects`).set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(3)
      expect(response.body.items).toHaveLength(3)
    })

    it('should return subjects with pagination', async () => {
      await seedSubjects()

      const response = await app
        .get(`${endpointUrl}/subjects?limit=2&skip=1`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(3)
      expect(response.body.items).toHaveLength(2)
    })

    it('should filter subjects by name', async () => {
      await seedSubjects()

      const response = await app
        .get(`${endpointUrl}/subjects?name=Geo`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(1)
      expect(response.body.items[0].name).toBe('Geometry')
    })

    it('should throw BAD_REQUEST for invalid query params', async () => {
      const response = await app
        .get(`${endpointUrl}/subjects?limit=not-a-number`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, BAD_REQUEST, response)
    })

    it('should throw BAD_REQUEST for zero limit', async () => {
      const response = await app.get(`${endpointUrl}/subjects?limit=0`).set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, BAD_REQUEST, response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/subjects`)

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

      const response = await app.get(`${endpointUrl}/subjects`).set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe(`GET ${endpointUrl}/:id/subjects`, () => {
    it('should return subjects by category id', async () => {
      const { categoryOne } = await seedSubjects()

      const response = await app
        .get(`${endpointUrl}/${categoryOne._id}/subjects`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body.count).toBe(2)
      expect(response.body.items).toHaveLength(2)
    })

    it('should throw INVALID_ID', async () => {
      const response = await app
        .get(`${endpointUrl}/not-a-mongo-id/subjects`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, INVALID_ID, response)
    })

    it('should throw DOCUMENT_NOT_FOUND', async () => {
      const nonExistingId = new mongoose.Types.ObjectId()
      const response = await app
        .get(`${endpointUrl}/${nonExistingId}/subjects`)
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get(`${endpointUrl}/1234567890abcdef12345678/subjects`)

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
        .get(`${endpointUrl}/1234567890abcdef12345678/subjects`)
        .set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe('GET /subjects/:id', () => {
    it('should return subject by id', async () => {
      const { categoryOne } = await seedSubjects()
      const subject = await Subject.findOne({ category: categoryOne._id }).lean().exec()

      const response = await app.get(`/subjects/${subject._id}`).set('Cookie', [`accessToken=${accessToken}`])

      expect(response.statusCode).toBe(200)
      expect(response.body._id.toString()).toBe(subject._id.toString())
      expect(response.body.name).toBe(subject.name)
    })

    it('should throw INVALID_ID', async () => {
      const response = await app.get('/subjects/not-a-mongo-id').set('Cookie', [`accessToken=${accessToken}`])

      expectError(400, INVALID_ID, response)
    })

    it('should throw DOCUMENT_NOT_FOUND', async () => {
      const nonExistingId = new mongoose.Types.ObjectId()
      const response = await app.get(`/subjects/${nonExistingId}`).set('Cookie', [`accessToken=${accessToken}`])

      expectError(404, DOCUMENT_NOT_FOUND(['Subject']), response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.get('/subjects/1234567890abcdef12345678')

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

      const response = await app.get('/subjects/1234567890abcdef12345678').set('Cookie', [
        `accessToken=${adminAccessToken}`
      ])

      expectError(403, FORBIDDEN, response)
    })
  })

  describe('POST /subjects', () => {
    it('should create subject', async () => {
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

      const category = await Category.create({
        name: 'Mathematics',
        appearance: { icon: 'math', color: '#111111' }
      })

      const payload = { name: 'Algebra', category: category._id.toString() }

      const response = await app.post('/subjects').send(payload).set('Cookie', [`accessToken=${adminAccessToken}`])

      expect(response.statusCode).toBe(201)
      expect(response.body).toMatchObject(payload)
      expect(response.body).toHaveProperty('_id')
    })

    it('should throw validation error for missing name', async () => {
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

      const response = await app.post('/subjects').send({ category: '123' }).set('Cookie', [
        `accessToken=${adminAccessToken}`
      ])

      expectError(422, FIELD_IS_NOT_DEFINED('name'), response)
    })

    it('should throw INVALID_ID for bad category', async () => {
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
        .post('/subjects')
        .send({ name: 'Algebra', category: 'bad-id' })
        .set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(400, INVALID_ID, response)
    })

    it('should throw DOCUMENT_NOT_FOUND for missing category', async () => {
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
        .post('/subjects')
        .send({ name: 'Algebra', category: new mongoose.Types.ObjectId().toString() })
        .set('Cookie', [`accessToken=${adminAccessToken}`])

      expectError(404, DOCUMENT_NOT_FOUND(['Category']), response)
    })

    it('should throw UNAUTHORIZED', async () => {
      const response = await app.post('/subjects').send({ name: 'Algebra', category: '1234567890abcdef12345678' })

      expectError(401, UNAUTHORIZED, response)
    })

    it('should throw FORBIDDEN', async () => {
      const response = await app
        .post('/subjects')
        .send({ name: 'Algebra', category: '1234567890abcdef12345678' })
        .set('Cookie', [`accessToken=${accessToken}`])

      expectError(403, FORBIDDEN, response)
    })
  })
})
