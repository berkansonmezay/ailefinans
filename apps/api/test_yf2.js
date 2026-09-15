const { YahooFinance } = require('yahoo-finance2');
const yf = new YahooFinance();
yf.search("THYAO").then(console.log).catch(console.error);
