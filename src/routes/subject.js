const router = require('express').Router()

const asyncWrapper = require('~/middlewares/asyncWrapper')
const { authMiddleware, restrictTo } = require('~/middlewares/auth')
const idValidation = require('~/middlewares/idValidation')
const subjectController = require('~/controllers/subject')
const {
  roles: { STUDENT, TUTOR }
} = require('~/consts/auth')

router.param('id', idValidation)

router.use(authMiddleware)
router.use(restrictTo(STUDENT, TUTOR))

router.get('/:id', asyncWrapper(subjectController.getSubjectById))

module.exports = router
