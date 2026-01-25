const { Schema, model } = require('mongoose')

const {
  enums: { MAIN_ROLE_ENUM, SPOKEN_LANG_ENUM, PROFICIENCY_LEVEL_ENUM, OFFER_STATUS_ENUM }
} = require('~/consts/validation')
const { USER, OFFER, SUBJECT, CATEGORY } = require('~/consts/models')
const { ENUM_CAN_BE_ONE_OF } = require('~/consts/errors')

const offerSchema = new Schema(
  {
    price: {
      type: Number,
      required: [true, 'price is required'],
      min: [1, 'price must be at least 1']
    },
    proficiencyLevel: {
      type: String,
      required: [true, 'proficiency level is required'],
      enum: {
        values: PROFICIENCY_LEVEL_ENUM,
        message: ENUM_CAN_BE_ONE_OF('proficiency level', PROFICIENCY_LEVEL_ENUM)
      }
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      minlength: [1, 'title must be at least 1 character'],
      maxlength: [100, 'title must be at most 100 characters']
    },
    description: {
      type: String,
      required: [true, 'description is required'],
      trim: true,
      minlength: [1, 'description must be at least 1 character'],
      maxlength: [1000, 'description must be at most 1000 characters']
    },
    languages: {
      type: [String],
      required: [true, 'languages is required'],
      enum: {
        values: SPOKEN_LANG_ENUM,
        message: ENUM_CAN_BE_ONE_OF('language', SPOKEN_LANG_ENUM)
      },
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'languages must contain at least one language'
      }
    },
    authorRole: {
      type: String,
      required: [true, 'author role is required'],
      enum: {
        values: MAIN_ROLE_ENUM,
        message: ENUM_CAN_BE_ONE_OF('author role', MAIN_ROLE_ENUM)
      }
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: USER,
      required: [true, 'author is required']
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: SUBJECT,
      required: [true, 'subject is required']
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: CATEGORY,
      required: [true, 'category is required']
    },

    status: {
      type: String,
      enum: {
        values: OFFER_STATUS_ENUM,
        message: ENUM_CAN_BE_ONE_OF('offer status', OFFER_STATUS_ENUM)
      },
      default: OFFER_STATUS_ENUM[0]
    },
    FAQ: {
      type: [
        {
          question: {
            type: String,
            required: [true, 'FAQ question is required'],
            trim: true
          },
          answer: {
            type: String,
            required: [true, 'FAQ answer is required'],
            trim: true
          }
        }
      ],
      required: [true, 'FAQ is required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'FAQ must contain at least one question and answer'
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

offerSchema.index({ category: 1 })
offerSchema.index({ subject: 1 })
offerSchema.index({ author: 1 })
offerSchema.index({ createdAt: -1 })
offerSchema.index({ price: 1 })
offerSchema.index({ category: 1, createdAt: -1 })

module.exports = model(OFFER, offerSchema)
