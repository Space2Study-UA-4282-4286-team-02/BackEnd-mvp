const { Schema, model } = require('mongoose')

const { CATEGORY } = require('~/consts/models')
const { FIELD_CANNOT_BE_EMPTY, FIELD_CANNOT_BE_LONGER, FIELD_CANNOT_BE_SHORTER } = require('~/consts/errors')

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
        type: String
      },
      color: {
        type: String
      }
    },
    totalOffers: {
      student: {
        type: Number,
        default: 0
      },
      tutor: {
        type: Number,
        default: 0
      }
    }
  },
  { timestamps: true, versionKey: false }
)

module.exports = model(CATEGORY, categorySchema)
