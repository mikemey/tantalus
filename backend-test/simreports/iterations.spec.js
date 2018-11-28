require('chai').should()
const request = require('supertest')

const helpers = require('../../utils-test/helpers')

describe('GET /api/simreports/iterations endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(() => helpers.closeAll(server))

  const getIterationsData = simid => request(app).get(`/api/simreports/${simid}/iterations`)

  const testSimulationId = 'test-simid'

  const testTraderReports = [
    { simulationId: testSimulationId, iteration: 1, investDiff: 722 },
    { simulationId: testSimulationId, iteration: 1, investDiff: 20 },
    { simulationId: testSimulationId, iteration: 1, investDiff: 200 },
    { simulationId: 'other-simid', iteration: 1, investDiff: 100 },
    { simulationId: testSimulationId, iteration: 2, investDiff: 400 },
    { simulationId: testSimulationId, iteration: 2, investDiff: 300 },
    { simulationId: testSimulationId, iteration: 2, investDiff: 400 },
    { simulationId: testSimulationId, iteration: 3, investDiff: -1 },
    { simulationId: testSimulationId, iteration: 3, investDiff: 333 },
    { simulationId: 'another-simid', iteration: 4, investDiff: 999 }
  ]

  const expectedIterationsReport = [
    { iteration: 1, investDiffs: [722, 200, 20] },
    { iteration: 2, investDiffs: [400, 400, 300] },
    { iteration: 3, investDiffs: [333] }
  ]

  before(() => helpers.dropDatabase()
    .then(() => helpers.insertTraderReports(testTraderReports))
  )

  it('should aggregate trader iterations performance report', () => {
    return getIterationsData(testSimulationId)
      .expect(200)
      .then(({ body }) => {
        body.should.deep.equal(expectedIterationsReport)
      })
  })

  it('returns 404 when no simulationId', () => {
    return getIterationsData('').expect(404)
  })

  it('should return empty trader iterations performance report when unknown simulationId', () => {
    return getIterationsData('unknownid')
      .expect(200)
      .then(({ body }) => {
        body.should.deep.equal([])
      })
  })
})
