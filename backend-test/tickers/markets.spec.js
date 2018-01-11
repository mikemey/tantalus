/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')

const helpers = require('../../utils-test/helpers')

const markets = [
  { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=ETHBTC', response: '{"symbol":"ETHBTC","price":"0.06504100"}' },
  { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=XRPBTC', response: '{"symbol":"XRPBTC","price":"0.00015849"}' },
  { host: 'https://api.binance.com', path: '/api/v3/ticker/price?symbol=LSKBTC', response: '{"symbol":"LSKBTC","price":"0.0020804"}' },
  { host: 'https://api.kraken.com', path: '/0/public/Ticker?pair=XXRPXXBT,XETHXXBT', response: '{"error":[],"result":{"XETHXXBT":{"a":["0.064530","1","1.000"],"b":["0.063800","24","24.000"],"c":["0.064530","0.03559574"],"v":["16855.85969725","31268.51313018"],"p":["0.062332","0.058423"],"t":[8353,16657],"l":["0.058270","0.057830"],"h":["0.064970","0.064970"],"o":"0.058380"},"XXRPXXBT":{"a":["0.000157940","82","82.000"],"b":["0.000157350","11531","11531.000"],"c":["0.000157950","62.55708645"],"v":["2482218.99869350","8320941.23009165"],"p":["0.000158911","0.000156253"],"t":[4436,12488],"l":["0.000153000","0.000152200"],"h":["0.000163800","0.000175520"],"o":"0.000154680"}}}' }
]

const TEST_HTML = '<!DOCTYPE html></html>'

describe('GET /api/markets endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  afterEach(() => nock.cleanAll())
  after(() => helpers.closeAll(server))

  const getMarketData = () => request(app).get('/api/markets')

  const nockMarket = market => nock(market.host).get(market.path)
  const mockMarketData = market => nockMarket(market).reply(200, market.response)

  describe('valid responses', () => {
    beforeEach(() => markets.forEach(mockMarketData))

    it('should response with market data', () => {
      const expectedMarketData = [
        { name: 'Binance', trading: 'ETH/BTC', price: '0.06504100' },
        { name: 'Binance', trading: 'XRP/BTC', price: '0.00015849' },
        { name: 'Binance', trading: 'LSK/BTC', price: '0.0020804' },
        { name: 'Kraken', trading: 'ETH/BTC', price: '0.064530' },
        { name: 'Kraken', trading: 'XRP/BTC', price: '0.000157950' }
      ]

      return getMarketData().expect(200)
        .then(({ body }) => body.should.deep.equal(expectedMarketData))
    })
  })

  describe('combined apis have failing responses', () => {
    const goodMarkets = [markets[0], markets[1], markets[2]]
    beforeEach(() => goodMarkets.forEach(mockMarketData))

    it('should return markets when combined apis returns unknown data', () => {
      nockMarket(markets[3]).twice().reply(200, TEST_HTML)
      const expectedMarketData = [
        { name: 'Binance', trading: 'ETH/BTC', price: '0.06504100' },
        { name: 'Binance', trading: 'XRP/BTC', price: '0.00015849' },
        { name: 'Binance', trading: 'LSK/BTC', price: '0.0020804' },
        { name: 'Kraken', trading: 'ETH/BTC', price: 'N/A' },
        { name: 'Kraken', trading: 'XRP/BTC', price: 'N/A' }
      ]

      return getMarketData().expect(200)
        .then(({ body }) => body.should.deep.equal(expectedMarketData))
    })

    it('should return markets when combined apis returns 522', () => {
      nockMarket(markets[3]).twice().reply(522, TEST_HTML)
      const expectedMarketData = [
        { name: 'Binance', trading: 'ETH/BTC', price: '0.06504100' },
        { name: 'Binance', trading: 'XRP/BTC', price: '0.00015849' },
        { name: 'Binance', trading: 'LSK/BTC', price: '0.0020804' },
        { name: 'Kraken', trading: 'ETH/BTC', price: 'N/A' },
        { name: 'Kraken', trading: 'XRP/BTC', price: 'N/A' }
      ]

      return getMarketData().expect(200)
        .then(({ body }) => body.should.deep.equal(expectedMarketData))
    })
  })

  describe('single api query has failing responses', () => {
    const goodMarkets = [markets[0], markets[2], markets[3]]
    beforeEach(() => goodMarkets.forEach(mockMarketData))

    it('should return markets when single api query returns unknown data', () => {
      nockMarket(markets[1]).twice().reply(200, TEST_HTML)
      const expectedMarketData = [
        { name: 'Binance', trading: 'ETH/BTC', price: '0.06504100' },
        { name: 'Binance', trading: 'XRP/BTC', price: 'N/A' },
        { name: 'Binance', trading: 'LSK/BTC', price: '0.0020804' },
        { name: 'Kraken', trading: 'ETH/BTC', price: '0.064530' },
        { name: 'Kraken', trading: 'XRP/BTC', price: '0.000157950' }
      ]

      return getMarketData().expect(200)
        .then(({ body }) => body.should.deep.equal(expectedMarketData))
    })

    it('should return markets when single api query returns 522', () => {
      nockMarket(markets[1]).twice().reply(522, markets[1].response)
      const expectedMarketData = [
        { name: 'Binance', trading: 'ETH/BTC', price: '0.06504100' },
        { name: 'Binance', trading: 'XRP/BTC', price: 'N/A' },
        { name: 'Binance', trading: 'LSK/BTC', price: '0.0020804' },
        { name: 'Kraken', trading: 'ETH/BTC', price: '0.064530' },
        { name: 'Kraken', trading: 'XRP/BTC', price: '0.000157950' }
      ]

      return getMarketData().expect(200)
        .then(({ body }) => body.should.deep.equal(expectedMarketData))
    })
  })
})
