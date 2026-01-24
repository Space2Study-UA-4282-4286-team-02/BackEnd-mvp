const router = require('express').Router()

const ResourcesCategory = require('~/models/resourcesCategory')
const Lesson = require('~/models/lesson')
const lessonController = require('~/controllers/lesson')
const asyncWrapper = require('~/middlewares/asyncWrapper')
const isEntityValid = require('~/middlewares/entityValidation')
const idValidation = require('~/middlewares/idValidation')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')

const {
  roles: { TUTOR, ADMIN, SUPERADMIN }
} = require('~/consts/auth')

const body = [{ model: ResourcesCategory, idName: 'category' }]
const params = [{ model: Lesson, idName: 'id' }]

router.use(authMiddleware)
router.use(restrictTo(TUTOR, ADMIN, SUPERADMIN))

router.param('id', idValidation)

router.get('/', asyncWrapper(lessonController.getLessons))
router.get('/:id', isEntityValid({ params }), asyncWrapper(lessonController.getLessonById))
router.post('/', isEntityValid({ body }), asyncWrapper(lessonController.createLesson))
router.patch('/:id', isEntityValid({ body }), asyncWrapper(lessonController.updateLesson))
router.delete('/:id', asyncWrapper(lessonController.deleteLesson))

module.exports = router
