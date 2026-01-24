const { Schema, model } = require('mongoose')
const {
  enums: { RESOURCES_TYPES_ENUM }
     } = require('~/consts/validation')
const {   QUIZ,
          QUESTION,
          USER,
          RESOURCES_CATEGORY
       } = require('~/consts/models')
const {     FIELD_CANNOT_BE_EMPTY,
            FIELD_CANNOT_BE_SHORTER,
            FIELD_CANNOT_BE_LONGER,
            ENUM_CAN_BE_ONE_OF
       } = require('~/consts/errors')

const quizSchema = new Schema(
{
 title:{
    type: String,
    required: [true, FIELD_CANNOT_BE_EMPTY('title')],
    minlength: [1, FIELD_CANNOT_BE_SHORTER('title',1)],
    maxlength: [100, FIELD_CANNOT_BE_LONGER('title',100)]
 },
 description:{
     type: String,
     default: '',
     maxlength: [150, FIELD_CANNOT_BE_LONGER('description',150)]
 },
 items:{
    type: [{type: Schema.Types.ObjectId, ref : QUESTION}],
    required: [true, FIELD_CANNOT_BE_EMPTY('items')],
    validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: FIELD_CANNOT_BE_EMPTY('items')
      }
 },
 author:{
    type: Schema.Types.ObjectId,
    ref: USER,
    required: [true, FIELD_CANNOT_BE_EMPTY('author')]
 },
 category:{
    type: Schema.Types.ObjectId,
    ref: RESOURCES_CATEGORY,
    default: null
},
 resourceType: {
      type: String,
      enum: {
        values: RESOURCES_TYPES_ENUM,
        message: ENUM_CAN_BE_ONE_OF('resourceType', RESOURCES_TYPES_ENUM)
      },
      default: RESOURCES_TYPES_ENUM[0] 
    },
 settings: {
      scoredUnscoredResponses: { type: Boolean, default: false },
      showCorrectAnswers: { type: Boolean, default: false },
      shuffleQuestions: { type: Boolean, default: false },
      quizView: {
        type: String,
        enum: {
          values: ['Stepper', 'Scroll'],
          message: ENUM_CAN_BE_ONE_OF('quiz view', ['Stepper', 'Scroll'])
        },
        default: 'Scroll'
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

module.exports = model(QUIZ, quizSchema)
