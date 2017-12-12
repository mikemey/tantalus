const mongo = require('../../utils/mongoConnection')

const SimReportRepo = () => {
  const traderReportsCollection = () => mongo.db.collection(mongo.traderReportsCollectionName)

  const getIterationsReport = simulationId => traderReportsCollection().aggregate([
    { $match: { simulationId, investDiff: { $gt: 0 } } },
    { $project: { _id: 0, iteration: 1, investDiff: 1 } },
    { $sort: { investDiff: -1 } },
    {
      $group: {
        _id: '$iteration',
        investDiffs: { $push: '$investDiff' }
      }
    },
    { $project: { _id: 0, iteration: '$_id', investDiffs: 1 } },
    { $sort: { iteration: 1 } }
  ]).toArray()

  return {
    getIterationsReport
  }
}

module.exports = SimReportRepo
