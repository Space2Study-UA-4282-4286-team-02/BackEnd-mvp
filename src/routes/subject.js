const router = require('express').Router()

const asyncWrapper = require('~/middlewares/asyncWrapper')
const validationMiddleware = require('~/middlewares/validation')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const idValidation = require('~/middlewares/idValidation')
const subjectController = require('~/controllers/subject')
const subjectValidation = require('~/validation/schemas/subject')
const subjectUpdateValidation = require('~/validation/schemas/subjectUpdate')
const {
  roles: { ADMIN, STUDENT, TUTOR }
} = require('~/consts/auth')

router.param('id', idValidation)

router.use(authMiddleware)

router.post('/', restrictTo(ADMIN), validationMiddleware(subjectValidation), asyncWrapper(subjectController.createSubject))
router.patch(
  '/:id',
  restrictTo(ADMIN),
  validationMiddleware(subjectUpdateValidation),
  asyncWrapper(subjectController.updateSubject)
)

router.use(restrictTo(STUDENT, TUTOR))
router.get('/:id', asyncWrapper(subjectController.getSubjectById))

module.exports = router
