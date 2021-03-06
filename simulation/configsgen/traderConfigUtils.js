const clientId = (timeslotSecs, buyRatio, buySlots, sellRatio, sellSlots) => {
  const ts = padNumStart(timeslotSecs, 4)
  const bratio = padNumStart(buyRatio, 4)
  const bslots = padNumStart(buySlots, 2)
  const sratio = padNumStart(sellRatio, 5)
  const sslots = padNumStart(sellSlots, 2)
  return `T(${ts})_B(${bratio} /${bslots})_S(${sratio} /${sslots})`
}

const padNumStart = (num, len) => num.toString().padStart(len)

const countDecimals = value => {
  if (Math.floor(value) === value) return 0
  return value.toString().split('.')[1].length || 0
}

module.exports = {
  clientId,
  padNumStart,
  countDecimals
}
