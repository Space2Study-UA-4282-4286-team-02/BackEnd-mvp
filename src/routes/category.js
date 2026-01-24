const router = require('express').Router()

const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const isEntityValid = require('~/middlewares/entityValidation')
const idValidation = require('~/middlewares/idValidation')
const categoryController = require('~/controllers/category')
const subjectController = require('~/controllers/subject')
const categoryValidation = require('~/validation/schemas/category')
const {
  roles: { ADMIN, STUDENT, TUTOR }
} = require('~/consts/auth')

router.post(
  '/',
  authMiddleware,
  restrictTo(ADMIN),
  isEntityValid({ body: categoryValidation }),
  asyncWrapper(categoryController.createCategory)
)

router.param('id', idValidation)

router.use(authMiddleware)
router.use(restrictTo(STUDENT, TUTOR))

router.get('/', asyncWrapper(categoryController.getCategories))
router.get('/names', asyncWrapper(categoryController.getCategoriesNames))
router.get('/subjects', asyncWrapper(subjectController.getSubjects))
router.get('/:id/subjects', asyncWrapper(subjectController.getSubjects))
router.get('/:id?/subjects/names', asyncWrapper(categoryController.getSubjectNamesByCategoryId))
router.get('/:id', asyncWrapper(categoryController.getCategoryById))

module.exports = router
