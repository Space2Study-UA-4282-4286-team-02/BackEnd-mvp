const router = require('express').Router()

const ResourcesCategory = require('~/models/resourcesCategory')
const lessonController = require('~/controllers/lesson')
const asyncWrapper = require('~/middlewares/asyncWrapper')
const isEntityValid = require('~/middlewares/entityValidation')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')

const {
  roles: { TUTOR, ADMIN, SUPERADMIN }
} = require('~/consts/auth')

const body = [{ model: ResourcesCategory, idName: 'category' }]

router.use(authMiddleware)
router.use(restrictTo(TUTOR, ADMIN, SUPERADMIN))

router.post('/', isEntityValid({ body }), asyncWrapper(lessonController.createLesson))

module.exports = router
