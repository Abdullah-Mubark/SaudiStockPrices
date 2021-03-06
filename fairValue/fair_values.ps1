foreach($stock_code in Get-Content .\stocks_codes.txt) {
    if(-not ([string]::IsNullOrEmpty($stock_code))){
        start chrome https://finbox.com/${stock_code}/models/dcf-growth-exit-5yr
    }
}