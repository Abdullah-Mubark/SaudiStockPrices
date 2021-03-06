// Dependancies 
const excel = require('excel4node');
const axios = require('axios');
const fs = require('fs');

// Constants
const url = 'https://www.tadawul.com.sa/Charts/ChartGenerator?chart-type=SQL_CI_DV&chart-parameter={STOCK_CODE}&methodType=parsingMethod';
const stocksRawdata = fs.readFileSync('config/stocks.json');

// If output folder does not exist, create one!
if (!fs.existsSync('./output')){
    fs.mkdirSync('./output');
}

// Parse stocks list & filter stocks list with only the active stocks
let stocksList = JSON.parse(stocksRawdata).filter(stock => stock.isActive);

let requestsList = setUpHttpRequests(stocksList);

axios.all(requestsList).then(axios.spread((...responses) => {
  stocksList.forEach((stock, index) => {
    if (responses[index] == null || responses[index].data == null) return;
    stock.data = responses[index].data;
  })
  console.log('Successfuly Retrieved All Stocks Data.')
  printAllStocksTextFile();
  printAllStocksJsonFile();
  printAllStocksExcelFile();
  console.log('Successfuly Wrote Stocks Data To The File System.')
}))


// Functions Definition
function printAllStocksTextFile() {
  let textData = 'السهم | السعر\n'
  textData += '-----------------\n'
  stocksList.forEach((stock) => {
    let line = stock.name + ' --> ' + getLatestStockPrice(stock.data);
    textData += line + '\n';
    textData += '-----------------\n';
  })
  
  fs.writeFileSync('output/stocksOutput.text', textData)
}

function printAllStocksJsonFile() {
  let jsonData = [];
  stocksList.forEach((stock) => {
    const stockObject = {};
    stockObject[stock.name] = getLatestStockPrice(stock.data);
    jsonData.push(stockObject);
  })
  
  fs.writeFileSync('output/stocksOutput.json', JSON.stringify(jsonData))
}

function printAllStocksExcelFile(){
	// Initialize Excel File Workbook & WorkSheet 
	const workbook = new excel.Workbook();
	const worksheet = workbook.addWorksheet('StocksSheet');
	
	// Create a reusable styles
	const headersStyle_Static = workbook.createStyle({
	  font: {
		bold: true,
		color: '#ff0000',
		size: 16
	  },
	   alignment: { 
			 horizontal: ['center'],
			 readingorder: ['righttoleft'], 
			 vertical: ['center']
	  },
	   border: {
		   bottom: {
            style: 'medium',
            color: '#000000'
        }
	   }
	});
	const headersStyle_Calculated = workbook.createStyle({
	  font: {
		bold: true,
		color: '#000000',
		size: 16
	  },
	   alignment: { 
			 horizontal: ['center'],
			 readingorder: ['righttoleft'], 
			 vertical: ['center']
	  },
	   border: {
		   bottom: {
            style: 'medium',
            color: '#000000'
        }
	   }
	});
	
	const rowsStyle = workbook.createStyle({
	  font: {
		bold: false,
		color: '#000000',
		size: 12
	  },
	   alignment: { 
			 horizontal: ['center'],
			 readingorder: ['righttoleft'], 
			 vertical: ['center']
	  }
	});

	// First row is static:
	// Stock Market Type
	worksheet.cell(1,1).string('القطاع').style(headersStyle_Static);
	// Company Name
	worksheet.cell(1,2).string('الشركة').style(headersStyle_Static);
	// Stock Price
	worksheet.cell(1,3).string('سعر السهم').style(headersStyle_Calculated);
	// Dividend Average for the last three years
	worksheet.cell(1,4).string('متوسط التوزيعات').style(headersStyle_Static);
	// Dividend Yield
	worksheet.cell(1,5).string('مكرر التوزيعات').style(headersStyle_Calculated);
	// Average Cost
	worksheet.cell(1,6).string('متوسط الشراء').style(headersStyle_Static);
	// Current stock cost to its average cost
	worksheet.cell(1,7).string('نسبة الفرق عن متوسط الشراء').style(headersStyle_Calculated);
	
	// Set First row  hieght and is its cells as a filtrable headers
	worksheet.row(1).setHeight(35);
	worksheet.row(1).filter(1, 2, 3, 4, 5);

	// Set Columns widths.
	worksheet.column(1).setWidth(30);
	worksheet.column(2).setWidth(30);
    worksheet.column(3).setWidth(20);
	worksheet.column(4).setWidth(25);
	worksheet.column(5).setWidth(25);
	worksheet.column(6).setWidth(25);
	worksheet.column(7).setWidth(35);
	
	// Loop over the stocks list
	stocksList.forEach((stock,index) => {
	let rowNumber = index + 2;
	let latestPrice = getLatestStockPrice(stock.data);
	let dividendYield = 0;
	let stockCostToItsAverageCost = 0;
	let stockAverageCost = 0;
	
	if(stock.dividendAverage != null && stock.dividendAverage != 0){
		dividendYield = latestPrice / stock.dividendAverage;
		dividendYield = roundToX(dividendYield,2)
	}
	
	if(stock.averageCost != null && stock.averageCost != 0) {
		stockAverageCost = stock.averageCost;
		stockCostToItsAverageCost = (latestPrice-stock.averageCost)/stock.averageCost;
		stockCostToItsAverageCost = roundToX(stockCostToItsAverageCost,4)
	};
	
	worksheet.cell(rowNumber,1).string(stock.market).style(rowsStyle);
	worksheet.cell(rowNumber,2).string(stock.name).style(rowsStyle);
	worksheet.cell(rowNumber,3).number(latestPrice).style(rowsStyle);
	worksheet.cell(rowNumber,4).number(stock.dividendAverage).style(rowsStyle);
	worksheet.cell(rowNumber,5).number(dividendYield).style(rowsStyle);
	worksheet.cell(rowNumber,6).number(stockAverageCost).style(rowsStyle);
	worksheet.cell(rowNumber,7).number(stockCostToItsAverageCost).style(rowsStyle).style({numberFormat: '#.00%; -#.00%; -'});
  })
  workbook.write('output/stocksOutputExcel.xlsx');
}

function setUpHttpRequests(stocksList) {
  let requestsList = [];
  stocksList.forEach(stock => {
	  let requiestUrl = url.replace('{STOCK_CODE}', stock.code);
	  requestsList.push(axios.get(requiestUrl));
  })
  return requestsList;
}

function getLatestStockPrice(stockData) {
  let stockLatestPrice = stockData[stockData.length - 1].indexPrice;
  return roundToX(stockLatestPrice,2);
}

function convertNumberToSpecificPercision(num,percision){
  const s = num.toString().split('.');
  const numberOfDigitsBeforeDecimal = s[0].length;
  const convertedNumber = num.toPrecision(numberOfDigitsBeforeDecimal+percision);
  return parseFloat(convertedNumber);
}

function roundToX(num,x) {
    return +(Math.round(num + `e+${x}`)  + `e-${x}`);
}