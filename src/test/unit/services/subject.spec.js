const subjectService = require('~/services/subject')
const SubjectModel = require('~/models/subject')
const CategoryModel = require('~/models/category')
const { INVALID_ID, DOCUMENT_NOT_FOUND } = require('~/consts/errors')

jest.mock('~/models/subject')
jest.mock('~/models/category')

describe('services/subject.createSubject (unit)', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  test('should create subject and return object', async () => {
    const payload = { name: 'Algebra', category: '64b1c4f4e3a2b1c0d1e2f3a1' }
    CategoryModel.exists.mockResolvedValue(true)
    SubjectModel.create.mockResolvedValue({
      toObject: () => ({ _id: '1', ...payload })
    })

    const result = await subjectService.createSubject(payload)

    expect(result).toEqual({ _id: '1', ...payload })
    expect(CategoryModel.exists).toHaveBeenCalledWith({ _id: payload.category })
  })

  test('should throw INVALID_ID for bad category', async () => {
    const payload = { name: 'Algebra', category: 'bad-id' }

    await expect(subjectService.createSubject(payload)).rejects.toMatchObject({
      status: 400,
      code: INVALID_ID.code
    })
  })

  test('should throw DOCUMENT_NOT_FOUND when category missing', async () => {
    const payload = { name: 'Algebra', category: '64b1c4f4e3a2b1c0d1e2f3a1' }
    CategoryModel.exists.mockResolvedValue(false)

    await expect(subjectService.createSubject(payload)).rejects.toMatchObject({
      status: 404,
      code: DOCUMENT_NOT_FOUND(['Category']).code
    })
  })
})
