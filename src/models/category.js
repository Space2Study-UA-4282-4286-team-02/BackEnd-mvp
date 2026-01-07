const { Schema, model } = require('mongoose')
const { CATEGORY } = require('~/consts/models')
const {
  FIELD_CANNOT_BE_EMPTY,
  DOCUMENT_ALREADY_EXISTS,
  MONGO_SERVER_ERROR,
  FIELD_CANNOT_BE_SHORTER,
  FIELD_CANNOT_BE_LONGER
} = require('~/consts/errors')

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const ICON_NAME_REGEX = /^[a-z0-9-]+$/i

const AppearanceSchema = new Schema(
  {
    icon: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('icon')],
      default: 'mocked-path-to-icon',
      match: [ICON_NAME_REGEX, 'Icon must contain only letters, numbers, or dashes.']
    },
    color: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('color')],
      default: '#66C42C',
      match: [HEX_COLOR_REGEX, 'Color must be a valid hex value like #1E88E5.']
    }
  },
  { _id: false }
)

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('name')],
      unique: true,
      trim: true,
      minLength: [1, FIELD_CANNOT_BE_SHORTER('name', 1)],
      maxLength: [255, FIELD_CANNOT_BE_LONGER('name', 255)]
    },
    appearance: {
      type: AppearanceSchema,
      required: true,
      default: () => ({})
    },

    totalOffers: {
      student: {
        type: Number,
        default: 0,
        min: 0
      },
      tutor: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
    id: false
  }
)


categorySchema.index({ name: 1 }, { unique: true })

categorySchema.post('save', function (error, doc, next) {
  if (error && error.name === 'MongoServerError' && error.code === 11000) {
    return next(new Error(DOCUMENT_ALREADY_EXISTS('name').message || 'Document already exists'))
  }
  if (error) {
    return next(new Error(MONGO_SERVER_ERROR(error.message).message || 'Mongo server error'))
  }
  next(error)
})

module.exports = model(CATEGORY || 'Category', categorySchema)
