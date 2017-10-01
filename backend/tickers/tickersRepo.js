const mongo = require('../utils/mongoConnection')

const TickerRepo = () => {
  const tickerCollection = () => mongo.db.collection(mongo.tickersCollectionName)
  const graphCollection = () => mongo.db.collection(mongo.graphsCollectionName)

  const getLatest = () => tickerCollection().find()
    .sort({ created: -1 }).limit(1).toArray()
    .then(docs => docs[0])

  const getGraphData = period => graphCollection().find({ period }, { graphData: 1 }).limit(1).next()
    .then(graphPeriod => graphPeriod.graphData)

  return {
    getLatest,
    getGraphData
  }
}

module.exports = TickerRepo
