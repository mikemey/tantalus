const mongo = require('../../utils/mongoConnection')

const SimRepo = () => {
  const simulationReportsCollection = () => mongo.db.collection(mongo.simulationReportsCollectionName)
  const traderReportsCollection = () => mongo.db.collection(mongo.traderReportsCollectionName)

  const storeSimulationReport = simReport => simulationReportsCollection().insertOne(simReport)
    .then(result => {
      if (result.insertedCount !== 1) throw Error('insert simulation failed: ' + result.message)
    })

  const storeTraderReports = traderReports => traderReportsCollection().insertMany(traderReports)

  return {
    storeSimulationReport,
    storeTraderReports
  }
}

module.exports = SimRepo
