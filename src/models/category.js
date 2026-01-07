const { Schema, model } = require('mongoose')

const { CATEGORY } = require('~/consts/models')
const { FIELD_CANNOT_BE_EMPTY, FIELD_CANNOT_BE_LONGER, FIELD_CANNOT_BE_SHORTER } = require('~/consts/errors')

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
const ICON_NAME_REGEX = /^[a-z0-9-]+$/i

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, FIELD_CANNOT_BE_EMPTY('name')],
      minLength: [1, FIELD_CANNOT_BE_SHORTER('name', 1)],
      maxLength: [50, FIELD_CANNOT_BE_LONGER('name', 50)]
    },
    appearance: {
      icon: {
        type: String,
        match: [ICON_NAME_REGEX, 'Icon must contain only letters, numbers, or dashes.']
      },
      color: {
        type: String,
        match: [HEX_COLOR_REGEX, 'Color must be a valid hex value like #1E88E5.']
      }
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
  { timestamps: true, versionKey: false }
)

module.exports = model(CATEGORY, categorySchema)
