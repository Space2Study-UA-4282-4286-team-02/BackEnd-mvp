const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const swaggerUi = require('swagger-ui-express')
const swaggerJSDoc = require('swagger-jsdoc')

const {
  config: { CLIENT_URL }
} = require('~/configs/config')
const router = require('~/routes')
const { createNotFoundError } = require('~/utils/errorsHelper')
const errorMiddleware = require('~/middlewares/error')

const initialization = (app) => {
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(
    cors({
      origin: process.env.NODE_ENV === 'development' ? true : CLIENT_URL,
      credentials: true,
      methods: 'GET, POST, PATCH, DELETE',
      allowedHeaders: 'Content-Type, Authorization'
    })
  )

  const docsPath = path.join(__dirname, '../../docs/swagger.yaml')
  let swaggerDocument = null

  try {
    if (fs.existsSync(docsPath)) {
      const yamlText = fs.readFileSync(docsPath, 'utf8')
      swaggerDocument = yaml.load(yamlText)
    }
  } catch (err) {}

  if (!swaggerDocument) {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'BackEnd-mvp API',
          version: '1.0.0',
          description: 'Automatically generated API docs (swagger-jsdoc)'
        },
        servers: [
          {
            url: `http://localhost:${process.env.SERVER_PORT || 8080}`
          }
        ]
      },
      apis: ['./src/routes/*.js', './src/controllers/*.js']
    }

    swaggerDocument = swaggerJSDoc(swaggerOptions)
    app.set('swaggerJSDocOptions', swaggerOptions)
  }

  app.set('swaggerDoc', swaggerDocument)
  app.set('swaggerOptions', { explorer: true })

  if (process.env.NODE_ENV !== 'production') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, app.get('swaggerOptions')))
  }

  app.use('/', router)

  app.use((_req, _res, next) => {
    next(createNotFoundError())
  })

  app.use(errorMiddleware)
}

module.exports = initialization
