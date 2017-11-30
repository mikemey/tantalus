/* global describe before beforeEach it */
const request = require('supertest')

const helpers = require('../../utils-test/helpers')

describe('GET /api/tickers endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(() => helpers.closeAll(server))

  beforeEach(helpers.dropDatabase)

  const getTickerData = () => request(app).get('/api/tickers/latest')

  const tickerData = (dataSetDate, dataUnsetDat) => [{
    created: dataSetDate,
    tickers: [
      { name: 'anyone', bid: 3625.95, ask: 3448.17 },
      { name: 'lakebtc', bid: 2699.87, ask: 2689.96 },
      { name: 'coinfloor', bid: 3553.9, ask: 3545 },
      { name: 'coindesk', ask: 3577.58 }
    ]
  }, {
    created: dataUnsetDat,
    tickers: [
      { name: 'anyone', bid: 'N/A', ask: 'N/A' },
      { name: 'lakebtc', bid: 'N/A', ask: 'N/A' },
      { name: 'coinfloor', bid: 'N/A', ask: 'N/A' },
      { name: 'coindesk', ask: 'N/A' }
    ]
  }]

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
