// Dependancies 
const fs = require('fs');
const csv = require('csvtojson')

// Constants
const stocksRawData = fs.readFileSync('input/stocksInput.json');
const portfolioStatementFilePath = 'input/PortfolioStatement_Input.csv';
const outPutFilePath = 'output/stocksListUpdated.json' 

// If output folde does not exist, create one!
if (!fs.existsSync('./output')) {
    fs.mkdirSync('./output');
}

// Parse stocks list
let stocksList = JSON.parse(stocksRawData);

UpdateStocksAveragePrices();

// Functions Definition
function UpdateStocksAveragePrices() {
    let newPrices = [];
    // Invoking csv returns a promise
    const converter = csv()
        .fromFile(portfolioStatementFilePath)
        .then((newPrices) => {
            newPrices.forEach((o) => {
				stocksList.find(stock => stock.code == o.SymbolName).averageCost = Number(o.CostPrice);
            })
			fs.writeFileSync(outPutFilePath, JSON.stringify(stocksList))
			console.log('Finished Updating Stocks Prices!');
        });
}