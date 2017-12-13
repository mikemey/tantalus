const express = require('express')

const SimReportRepo = require('./simreportRepo')

const createSimReportRouter = (tantalusLogger) => {
  const router = express.Router()
  const simReports = SimReportRepo()

  router.get('/:simulationId/iterations', (req, res) => {
    return simReports.getIterationsReport(req.params.simulationId)
      .then((simReport) => res.status(200).json(simReport))
  })

  return router
}

module.exports = createSimReportRouter
