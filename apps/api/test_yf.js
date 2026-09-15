const yf = require('yahoo-finance2').default;
yf.search("THYAO").then(console.log).catch(console.error);
