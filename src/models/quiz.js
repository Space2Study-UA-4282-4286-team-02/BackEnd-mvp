const { Schema, model } = require('mongoose')

const {
  enums: { QUIZ_VIEW_ENUM, RESOURCES_TYPES_ENUM }
} = require('~/consts/validation')
const { QUIZ, USER, RESOURCES_CATEGORY, QUESTION } = require('~/consts/models')
const {
  FIELD_CANNOT_BE_EMPTY,
  FIELD_CANNOT_BE_LONGER,
  FIELD_CANNOT_BE_SHORTER,
  ENUM_CAN_BE_ONE_OF
} = require('~/consts/errors')

const quizSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('title')],
      minLength: [1, FIELD_CANNOT_BE_SHORTER('title', 1)],
      maxLength: [100, FIELD_CANNOT_BE_LONGER('title', 100)]
    },
    description: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('description')],
      minLength: [1, FIELD_CANNOT_BE_SHORTER('description', 1)],
      maxLength: [1000, FIELD_CANNOT_BE_LONGER('description', 1000)]
    },
    items: {
      type: [{ type: Schema.Types.ObjectId, ref: QUESTION }],
      default: []
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: RESOURCES_CATEGORY,
      default: null
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, FIELD_CANNOT_BE_EMPTY('author')]
    },
    quizView: {
      type: String,
      enum: {
        values: QUIZ_VIEW_ENUM,
        message: ENUM_CAN_BE_ONE_OF('quiz view', QUIZ_VIEW_ENUM)
      },
      default: QUIZ_VIEW_ENUM[1]
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    pointValues: {
      type: Boolean,
      default: false
    },
    scoredUnscoredResponses: {
      type: Boolean,
      default: false
    },
    correctAnswers: {
      type: Boolean,
      default: false
    },
    resourceType: {
      type: String,
      enum: {
        values: RESOURCES_TYPES_ENUM,
        message: ENUM_CAN_BE_ONE_OF('resource type', RESOURCES_TYPES_ENUM)
      },
      default: RESOURCES_TYPES_ENUM[3]
    }
  },
  { timestamps: true, versionKey: false }
)

module.exports = model(QUIZ, quizSchema)
