/* global describe before beforeEach it */
const request = require('supertest')
require('chai').should()

const helpers = require('../helpers')

describe('GET /api/tickers endpoint', () => {
  let app, server

  const getTickerData = () => request(app).get('/api/tickers/latest')

  const tickerData = (dataSetDate, dataUnsetDat) => [{
    created: dataSetDate,
    tickers: [
      { name: 'solidi', buy: 3625.95, sell: 3448.17, duration: 23 },
      { name: 'lakebtc', buy: 2699.87, sell: 2689.96, duration: 42 },
      { name: 'coinfloor', buy: 3553.9, sell: 3545, duration: 51 },
      { name: 'coindesk', buy: 3577.58, duration: 32 }
    ]
  }, {
    created: dataUnsetDat,
    tickers: [
      { name: 'solidi', buy: 'N/A', sell: 'N/A', duration: 23 },
      { name: 'lakebtc', buy: 'N/A', sell: 'N/A', duration: 42 },
      { name: 'coinfloor', buy: 'N/A', sell: 'N/A', duration: 51 },
      { name: 'coindesk', buy: 'N/A', duration: 32 }
    ]
  }]

  beforeEach(() => helpers.dropDatabase())

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(done => helpers.close(server, done))

  const getYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  }
  const now = new Date().toISOString()
  const yesterday = getYesterday().toISOString()

  it('should response with full ticker', () => {
    const testData = tickerData(now, yesterday)
    return helpers.insertTickers(testData)
      .then(() => getTickerData()
        .expect(200)
        .then(({ body }) => {
          body.created.should.equal(testData[0].created)
          body.tickers.should.deep.equal(testData[0].tickers)
        }))
  })

  it('should response with empty ticker data', () => {
    const testData = tickerData(yesterday, now)
    return helpers.insertTickers(testData)
      .then(() => getTickerData()
        .expect(200)
        .then(({ body }) => {
          body.created.should.equal(testData[1].created)
          body.tickers.should.deep.equal(testData[1].tickers)
        }))
  })
})
