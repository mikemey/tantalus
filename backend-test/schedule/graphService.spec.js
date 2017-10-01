/* global describe before beforeEach it */
require('chai').should()
const moment = require('moment')

const helpers = require('../helpers')
const GraphService = require('../../backend/schedule/graphService')
const { _1w, _1y } = require('../../backend/tickers/graphPeriods')

describe('Graph service', () => {
  const graphService = GraphService(console)

  beforeEach(helpers.dropDatabase)

  const datePast = daysPast => moment.utc().subtract(daysPast, 'd').toDate()

  const _8daysAgo = datePast(8)
  const _6daysAgo = datePast(6)
  const _5daysAgo = datePast(5)
  const _4daysAgo = datePast(4)
  const _3daysAgo = datePast(3)

  const testData = [{
    created: _6daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 3856.08, ask: 3879.06 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'solidi', bid: 3906.82, ask: 'N/A' },
      { name: 'cex', bid: 1234.82, ask: 2345.67 },
      { name: 'coindesk', ask: 3821.79 }]
  }, {
    created: _5daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 3857.84, ask: 3865.78 },
      { name: 'coinfloor', bid: 2222 },
      { name: 'solidi', bid: 3915.58, ask: 'N/A' },
      { name: 'cex', bid: 1235.82, ask: 2346.67 },
      { name: 'coindesk', ask: 3802.64 }]
  }, {
    created: _4daysAgo,
    tickers: [
      { name: 'solidi', bid: 3904.59, ask: 0 },
      { name: 'lakebtc', bid: 'N/A', ask: 'N/A' },
      { name: 'coindesk', ask: 3814.19 }]
  }, {
    created: _3daysAgo,
    tickers: [
      { name: 'solidi', bid: 3675.14, ask: 3454.12 },
      { name: 'lakebtc', bid: 3490, ask: 3567 },
      { name: 'coindesk', ask: 3584.93 }]
  }, {
    created: _8daysAgo,
    tickers: [
      { name: 'lakebtc', bid: 999999, ask: 999999 },
      { name: 'solidi', bid: 999999, ask: 999999 },
      { name: 'coindesk', ask: 999999 }]
  }]

  const expectedGraphData = [{
    label: 'solidi bid',
    data: [
      { x: _6daysAgo, y: 3906.82 },
      { x: _5daysAgo, y: 3915.58 },
      { x: _4daysAgo, y: 3904.59 },
      { x: _3daysAgo, y: 3675.14 }
    ]
  }, {
    label: 'solidi ask',
    data: [
      { x: _6daysAgo, y: null },
      { x: _5daysAgo, y: null },
      { x: _4daysAgo, y: null },
      { x: _3daysAgo, y: 3454.12 }
    ]
  }, {
    label: 'coinfloor bid',
    data: [
      { x: _6daysAgo, y: 2222 },
      { x: _5daysAgo, y: 2222 }
    ]
  }, {
    label: 'coinfloor ask',
    data: [
      { x: _6daysAgo, y: null },
      { x: _5daysAgo, y: null }
    ]
  }, {
    label: 'lakebtc bid',
    data: [
      { x: _6daysAgo, y: 3856.08 },
      { x: _5daysAgo, y: 3857.84 },
      { x: _4daysAgo, y: null },
      { x: _3daysAgo, y: 3490 }
    ]
  }, {
    label: 'lakebtc ask',
    data: [
      { x: _6daysAgo, y: 3879.06 },
      { x: _5daysAgo, y: 3865.78 },
      { x: _4daysAgo, y: null },
      { x: _3daysAgo, y: 3567 }
    ]
  }, {
    label: 'cex bid',
    data: [
      { x: _6daysAgo, y: 1234.82 },
      { x: _5daysAgo, y: 1235.82 }
    ]
  }, {
    label: 'cex ask',
    data: [
      { x: _6daysAgo, y: 2345.67 },
      { x: _5daysAgo, y: 2346.67 }
    ]
  }, {
    label: 'coindesk',
    data: [
      { x: _6daysAgo, y: 3821.79 },
      { x: _5daysAgo, y: 3802.64 },
      { x: _4daysAgo, y: 3814.19 },
      { x: _3daysAgo, y: 3584.93 }
    ]
  }]

  it('should store sorted graph data', () => {
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1w))
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.period.should.equal(_1w)
        doc.graphData.should.deep.equal(expectedGraphData)
      })
  })

  it('should overwrite graph data', () => {
    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1w))
      .then(docs => docs.length.should.equal(1))
  })

  it(`should store the average of at most ${graphService.LIMIT_RESULTS} data points`, () => {
    const length = 500
    const cutoffIx = length - 365

    const createTicker = (created, ix) => {
      return {
        created,
        tickers: [
          { name: 'solidi', bid: ix, ask: ix },
          { name: 'lakebtc', bid: ix, ask: ix },
          { name: 'coindesk', ask: ix }]
      }
    }

    const testData = Array.from({ length }, (_, ix) => createTicker(datePast(length - 1 - ix), (ix + 1 - cutoffIx)))

    const sliceLen = (length - cutoffIx) / graphService.LIMIT_RESULTS
    const oldestSliceDistance = sliceLen * (graphService.LIMIT_RESULTS - 1) + sliceLen / 2
    const oldestSliceStartIx = length - Math.floor(oldestSliceDistance) - 1
    const oldestDateExpected = moment.utc(testData[oldestSliceStartIx].created).toJSON()

    const newestDateExpected = moment.utc(testData[length - Math.floor(sliceLen / 2) - 2].created).toJSON()

    return helpers.insertTickers(testData)
      .then(() => graphService.createGraphDatasets())
      .then(() => helpers.getGraphData(_1y))
      .then(docs => {
        const result = docs[0]
        result.period.should.equal(_1y)
        result.graphData.should.have.length(5)
        result.graphData.forEach(chart => {
          const chartData = chart.data
          chartData.should.have.length(graphService.LIMIT_RESULTS)

          chartData[0].x.toJSON().should.equal(oldestDateExpected)
          chartData[chartData.length - 1].x.toJSON().should.equal(newestDateExpected)
          chartData.forEach((datapoint, ix) => {
            const expectedAverage = (Math.floor(ix * sliceLen + 1) + Math.floor((ix + 1) * sliceLen)) / 2
            datapoint.y.should.be.closeTo(expectedAverage, 1.0)
          })
        })
      })
  })
})
