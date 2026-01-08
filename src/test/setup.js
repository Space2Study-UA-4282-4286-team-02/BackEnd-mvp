const express = require('express')
const mongoose = require('mongoose')
const mongooseDriver = require('mongoose/lib/driver')
const request = require('supertest')
require('~/initialization/envSetup')

const serverSetup = require('~/initialization/serverSetup')

const serverInit = async () => {
  if (!mongooseDriver.get()) {
    mongooseDriver.set(require('mongoose/lib/drivers/node-mongodb-native'))
  }
  const app = express()
  const server = await serverSetup(app)
  return { app: request(app), server }
}

const serverCleanup = async () => {
  const { db } = mongoose.connection || {}

  if (!db) {
    return
  }

  try {
    await db.dropDatabase()
  } catch (error) {
    const unauthorizedDrop =
      error?.codeName === 'Unauthorized' || error?.message?.includes('not allowed to do action [dropDatabase]')

    if (!unauthorizedDrop) {
      throw error
    }

    const collections = await db.collections()
    await Promise.all(collections.map((collection) => collection.deleteMany({})))
  }
}

const stopServer = async (server) => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }

  if (server && server.listening) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
}

module.exports = { serverInit, serverCleanup, stopServer }
