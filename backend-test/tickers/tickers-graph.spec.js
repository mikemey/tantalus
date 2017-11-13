/* global describe before beforeEach it */

const request = require('supertest')
require('chai').should()

const helpers = require('../helpers')
const { supportedPeriods } = require('../../backend/tickers/graphPeriods')

describe('GET /api/tickers/graph endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(() => helpers.closeAll(server))

  beforeEach(helpers.dropDatabase)

  const getGraphData = period => request(app).get(`/api/tickers/graph?period=${period}`)

  describe('data responses', () => {
    const testData = [{
      period: '1w',
      graphData: [
        {
          label: 'coindesk bid',
          data: [
            { x: 'bla', y: 3906.82 },
            { x: 'bla', y: 3915.58 },
            { x: 'bla', y: 3904.59 },
            { x: 'bla', y: 3675.14 }
          ]
        }
      ]
    }, {
      period: 'other',
      graphData: []
    }]

    beforeEach(() => helpers.insertGraphData(testData))

    it('respond with graph data', () => getGraphData('1w')
      .expect(200)
      .then(({ body }) => body.should.deep.equal(testData[0].graphData))
    )

    it('response 400 for invalid period parameter', () => getGraphData('test')
      .expect(400, { error: "Unsupported period: 'test'" })
    )
  })

  describe('supported period parameter', () => {
    const testGraphData = [{
      abc: 'def'
    }]
    const testData = supportedPeriods.map(period => {
      return {
        period,
        graphData: testGraphData
      }
    })

    beforeEach(() => helpers.insertGraphData(testData))

    it('1 day report', () => getGraphData('1d').expect(200)
      .then(({ body }) => body.should.deep.equal(testGraphData))
    )

    it('1 week report', () => getGraphData('1w').expect(200)
      .then(({ body }) => body.should.deep.equal(testGraphData))
    )

    it('1 month report', () => getGraphData('1m').expect(200)
      .then(({ body }) => body.should.deep.equal(testGraphData))
    )

    it('3 month report', () => getGraphData('3m').expect(200)
      .then(({ body }) => body.should.deep.equal(testGraphData))
    )

    it('1 year report', () => getGraphData('1y').expect(200)
      .then(({ body }) => body.should.deep.equal(testGraphData))
    )
  })
})
