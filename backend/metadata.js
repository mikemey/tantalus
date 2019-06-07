const express = require('express')
const mongo = require('../utils/mongoConnection')

const createMetadataRouter = () => {
  const router = express.Router()
  const metadataRepo = MetadataRepo()

  router.get('/schedule', (_, res) => metadataRepo.getSchedule()
    .then(scheduleMetadata => res.status(200).json(scheduleMetadata))
  )

  return router
}

const MetadataRepo = () => {
  const metadataCollection = () => mongo.db.collection(mongo.metadataCollectionName)

  const getSchedule = () => metadataCollection()
    .find({ type: 'schedule' }, { projection: { _id: false, type: false } })
    .toArray()
    .then(docs => docs[0])

  return { getSchedule }
}

module.exports = createMetadataRouter
