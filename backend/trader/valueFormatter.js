const mBTC = 10000

const amountString = amount => `Ƀ ${(amount / mBTC).toFixed(4)}`
const priceString = (price, unit = '£/Ƀ') => `${unit} ${(price / 100).toFixed(2)}`

const volumeString = volume => priceString(volume, '£')

const amountPriceString = (prefix, amount, price) =>
  `${prefix}: ${amountString(amount)} - ${priceString(price)}`

module.exports = {
  amountString,
  priceString,
  volumeString,
  amountPriceString
}
