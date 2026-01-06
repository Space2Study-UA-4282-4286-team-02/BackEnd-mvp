const router = require('express').Router()

const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const idValidation = require('~/middlewares/idValidation')
const categoryController = require('~/controllers/category')
const {
  roles: { STUDENT, TUTOR }
} = require('~/consts/auth')

router.param('id', idValidation)

router.use(authMiddleware)
router.use(restrictTo(STUDENT, TUTOR))

router.get('/', asyncWrapper(categoryController.getCategories))
router.get('/names', asyncWrapper(categoryController.getCategoriesNames))
router.get('/:id?/subjects/names', asyncWrapper(categoryController.getSubjectNamesByCategoryId))
router.get('/:id', asyncWrapper(categoryController.getCategoryById))

module.exports = router
