const request = require('supertest')

const helpers = require('../../utils-test/helpers')

describe('/api/balance endpoint', () => {
  let app, server

  const testUser = {
    username: 'eeeeee'
  }

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, true, testUser))

  after(() => helpers.closeAll(server))

  const balancePath = '/api/balance'
  const getBalance = () => request(app).get(balancePath)
  const putBalanceEntry = balanceEntry => request(app).put(balancePath).send(balanceEntry)
  const postBalanceEntry = newBalanceEntry => request(app).post(balancePath).send(newBalanceEntry)

  describe('error responses', () => {
    before(() => helpers.dropDatabase()
      .then(() => helpers.insertAccounts([testUser]))
    )

    it('400 when PUT has no data', () => putBalanceEntry({})
      .expect(400, { error: 'no data provided' })
    )

    it('400 when no amount', () => postBalanceEntry({ amount: 0.0, price: 4700, asset: 'BTC' })
      .expect(400, { error: 'amount is missing' })
    )

    it('400 when amount is missing', () => putBalanceEntry([{ price: 4700, asset: 'BTC' }])
      .expect(400, { error: 'amount is missing' })
    )

    it('400 when no price', () => postBalanceEntry({ amount: 1, price: 0, asset: 'BTC' })
      .expect(400, { error: 'price is missing' })
    )

    it('400 when price is missing', () => putBalanceEntry([{ amount: 1.0, asset: 'BTC' }])
      .expect(400, { error: 'price is missing' })
    )

    it('400 when no asset', () => postBalanceEntry({ amount: 10.0, price: 4700, asset: '' })
      .expect(400, { error: 'asset is missing' })
    )

    it('400 when asset is missing', () => putBalanceEntry([{ amount: 10.0, price: 4700 }])
      .expect(400, { error: 'asset is missing' })
    )

    it('400 when additional key', () => putBalanceEntry([{
      amount: 10.0, price: 4700, asset: 'BTC', other: 'hello', one: 'world'
    }])
      .expect(400, { error: 'invalid parameters: other,one' })
    )
  })

  describe('valid data responses', () => {
    beforeEach(() => helpers.dropDatabase()
      .then(() => helpers.insertAccounts([testUser]))
    )

    it('stores new bitcoin balance entry and returns new balance entry', () => {
      const newBalanceEntry = { amount: 2.3, price: 4700, asset: 'BTC' }
      return postBalanceEntry(newBalanceEntry)
        .expect(204)
        .then(() => getBalance().expect(200)
          .then(({ body }) => {
            body.should.deep.equal({ entries: [newBalanceEntry] })
          }))
    })

    it('stores multiple balance entries', () => {
      const entry0 = { amount: 12.3, price: 0.03322, asset: 'ETH' }
      const entry1 = { amount: 1.3, price: 3000, asset: 'BTC' }
      const entry2 = { amount: 1.3, price: 0.04, asset: 'ETH' }
      return postBalanceEntry(entry0).expect(204)
        .then(() => postBalanceEntry(entry1).expect(204))
        .then(() => postBalanceEntry(entry2).expect(204))
        .then(() => getBalance().expect(200)
          .then(({ body }) => {
            body.should.deep.equal({ entries: [entry0, entry1, entry2] })
          }))
    })

    it('stores optional link location and returns it', () => {
      const entry0 = { amount: 12.3, price: 0.03322, asset: 'ETH', link: 'bla-di-blah' }
      const entry1 = { amount: 1.3, price: 3000, asset: 'BTC' }
      return postBalanceEntry(entry0).expect(204)
        .then(() => postBalanceEntry(entry1).expect(204))
        .then(() => getBalance().expect(200)
          .then(({ body }) => {
            body.should.deep.equal({ entries: [entry0, entry1] })
          }))
    })

    it('overwrites existing entries', () => {
      const entry0 = { amount: 5.2, price: 0.03322, asset: 'ETH' }
      const entry1 = { amount: 1.3, price: 3000, asset: 'BTC' }
      const entryUpdate = [
        { amount: 1.3, price: 0.04, asset: 'ETH' },
        { amount: 1.0, price: 2000, asset: 'BTC' }
      ]
      return postBalanceEntry(entry0).expect(204)
        .then(() => postBalanceEntry(entry1).expect(204))
        .then(() => putBalanceEntry(entryUpdate).expect(204))
        .then(() => getBalance().expect(200)
          .then(({ body }) => {
            body.should.deep.equal({ entries: entryUpdate })
          }))
    })
  })
})
