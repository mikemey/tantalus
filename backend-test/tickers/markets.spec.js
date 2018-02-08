/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')

const helpers = require('../../utils-test/helpers')

describe('GET /api/markets endpoint', () => {
  let app, server

  const markets = [
    { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=ETHBTC', response: '{"symbol":"ETHBTC","price":"0.08642600"}' },
    { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=LTCBTC', response: '{"symbol":"LTCBTC","price":"0.01696400"}' },
    { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=LSKBTC', response: '{"symbol":"LSKBTC","price":"0.0020804"}' }
  ]
  const mockMarketData = market => nock(market.host).get(market.path).reply(200, market.response)

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))
  beforeEach(() => markets.forEach(mockMarketData))

  after(() => helpers.closeAll(server))
  afterEach(() => nock.cleanAll())

  const getBinanceMarketData = () => request(app).get('/api/markets/binance?symbols=ETHBTC,LTCBTC,LSKBTC')

  it('should response with available data', () => {
    const expectedMarketData = [
      { symbol: 'ETHBTC', price: 0.086426 },
      { symbol: 'LTCBTC', price: 0.016964 },
      { symbol: 'LSKBTC', price: 0.0020804 }
    ]
    return getBinanceMarketData().expect(200)
      .then(({ body }) => { body.should.deep.equal(expectedMarketData) })
  })

  it('should response with error when symbol query is missing', () => {
    return request(app).get('/api/markets/binance').expect(404, 'no symbol specified')
  })

  it('should response with error when unknown market requestes', () => {
    return request(app).get('/api/markets/other').expect(404, 'market not supported: other')
  })
})
