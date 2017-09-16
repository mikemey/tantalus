/* global describe before beforeEach it */

const request = require('supertest')
const moment = require('moment')
require('chai').should()

const helpers = require('../helpers')
const { LIMIT_RESULTS } = require('../../backend/tickers/tickersService')()

describe('GET /api/tickers/graph endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(() => helpers.closeAll(server))

  beforeEach(helpers.dropDatabase)

  const getGraphData = period => request(app).get(`/api/tickers/graph?period=${period}`)

  const datePast = daysPast => moment.utc().subtract(daysPast, 'd').subtract(1, 'h').toDate()
  const createTicker = (created, tickValue = 3821) => {
    return { created, tickers: [{ name: 'coindesk', ask: tickValue }] }
  }

  describe('data responses', () => {
    const testData = [
      createTicker(datePast(2), 3821),
      createTicker(datePast(1), 3802),
      createTicker(datePast(0), 3490)
    ]
    const expectedResult = dbData => [{
      label: 'coindesk',
      data: [
        { x: dbData[0].created.toJSON(), y: 3821 },
        { x: dbData[1].created.toJSON(), y: 3802 },
        { x: dbData[2].created.toJSON(), y: 3490 }
      ]
    }]
    it('respond with graph data', () => helpers.insertTickers(testData)
      .then(() => getGraphData('1w')
        .expect(200)
        .then(({ body }) => body.should.deep.equal(expectedResult(testData)))
      ))

    it('response 400 for invalid period parameter', () => helpers.insertTickers(testData)
      .then(() => getGraphData('test')
        .expect(400, { error: "Unsupported period: 'test'" }))
    )
  })

  describe('supported period parameter', () => {
    const length = 2000
    const testData = Array.from({ length }, (_, i) => createTicker(datePast(length - (i + 1))))

    beforeEach(() => helpers.insertTickers(testData))

    const daysSince = start => moment.utc().diff(start, 'd')

    const expectGraphDataLength = (body, expectedLength) => {
      body[0].data.should.have.length(expectedLength)
    }

    it('1 day report', () => getGraphData('1d').expect(200)
      .then(({ body }) => expectGraphDataLength(body, 1))
    )

    it('1 week report', () => getGraphData('1w').expect(200)
      .then(({ body }) => expectGraphDataLength(body, 7))
    )

    it('1 month report', () => getGraphData('1m').expect(200)
      .then(({ body }) => {
        const monthAgo = moment.utc().subtract(1, 'M')
        expectGraphDataLength(body, daysSince(monthAgo))
      })
    )

    it('3 month report', () => getGraphData('3m').expect(200)
      .then(({ body }) => {
        const monthAgo = moment.utc().subtract(3, 'M')
        expectGraphDataLength(body, daysSince(monthAgo))
      })
    )

    it('1 year report', () => getGraphData('1y').expect(200)
      .then(({ body }) => expectGraphDataLength(body, LIMIT_RESULTS))
    )
  })
})
