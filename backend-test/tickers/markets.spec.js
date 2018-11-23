/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')

const helpers = require('../../utils-test/helpers')
const priceResponse = require('./priceData.json')

describe('GET /api/markets endpoint', () => {
  let app, server

  const priceUrlHost = 'https://api.binance.com'
  const priceUrlPath = '/api/v3/ticker/price'

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))
  beforeEach(() => nock(priceUrlHost).get(priceUrlPath).reply(200, priceResponse))

  after(() => helpers.closeAll(server))
  afterEach(() => nock.cleanAll())

  const getBinanceMarketData = () => request(app).get('/api/markets/binance?symbols=ETHBTC,LTCBTC,LSKBTC')

  it('should response with available data', () => {
    const expectedMarketData = [
      { symbol: 'ETHBTC', price: 0.086426 },
      { symbol: 'LTCBTC', price: 0.016964 },
      { symbol: 'LSKBTC', price: 0.0020804 }
    ]
    return getBinanceMarketData().expect(200, expectedMarketData)
  })

  it('should response with error when symbol query is missing', () => {
    return request(app).get('/api/markets/binance').expect(404, 'no symbol specified')
  })

  it('should response with error when unknown market requests', () => {
    return request(app).get('/api/markets/other').expect(404, 'market not supported: other')
  })

  it('should response with available symbols', () => {
    const infoPath = '/api/v1/exchangeInfo'
    const response = '{"symbols":[{"symbol":"ETHBTC"},{"symbol":"LTCBTC"}]}'
    nock(priceUrlHost).get(infoPath).reply(200, response)
    return request(app).get('/api/markets/binance/symbols').expect(200, {
      symbols: ['ETHBTC', 'LTCBTC']
    })
  })

  it('should response with error when unknown market symbol requests', () => {
    return request(app).get('/api/markets/other/symbols').expect(404, 'market not supported: other')
  })
})
