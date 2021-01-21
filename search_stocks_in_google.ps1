foreach($stock_code in Get-Content .\stocks_codes.txt) {
    if(-not ([string]::IsNullOrEmpty($stock_code))){
        start chrome "https://www.google.com/search?q=tasi+${stock_code}"
    }
}