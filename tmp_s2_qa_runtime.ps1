$ErrorActionPreference = 'Stop'
$base = 'http://localhost:7000/api/v1'

function Login($email, $password) {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body $body
  if (-not $res.data.tokens.accessToken) {
    throw "LOGIN_TOKEN_MISSING for $email"
  }
  return $res.data
}

$owner = Login 'owner@daftar.com' 'owner123'
$staff2 = Login 'staff2@daftar.com' 'owner123'

"OWNER_LOGIN_OK role=$($owner.user.role) companyId=$($owner.user.companyId)"
"STAFF2_LOGIN_OK role=$($staff2.user.role) companyId=$($staff2.user.companyId)"

$ownerHeaders = @{ Authorization = "Bearer $($owner.tokens.accessToken)"; 'x-company-id' = "$($owner.user.companyId)" }
$staffHeaders = @{ Authorization = "Bearer $($staff2.tokens.accessToken)"; 'x-company-id' = "$($staff2.user.companyId)" }

$customers = Invoke-RestMethod -Uri "$base/customers?page=1&limit=50" -Headers $ownerHeaders -Method Get
$customer = @($customers.data) | Select-Object -First 1
if (-not $customer) { throw 'NO_CUSTOMERS_FOUND' }
"CUSTOMER_PICKED id=$($customer.id) name=$($customer.name)"

$invList = Invoke-RestMethod -Uri "$base/invoices?page=1&limit=100&partyType=CUSTOMER&partyId=$($customer.id)" -Headers $ownerHeaders -Method Get
$openInvoices = @($invList.data.items | Where-Object { $_.status -eq 'APPROVED' -and $_.invoicePaymentStatus -ne 'PAID' })
"OPEN_INVOICES_COUNT=$($openInvoices.Count)"

$beforePaid = 0
if ($openInvoices.Count -gt 0) {
  foreach ($inv in $openInvoices) {
    $invDetails = Invoke-RestMethod -Uri "$base/invoices/$($inv.id)" -Headers $ownerHeaders -Method Get
    $paid = [decimal]$invDetails.data.paidAmount
    $beforePaid += $paid
  }
}
"OPEN_INVOICES_TOTAL_PAID_BEFORE=$beforePaid"

$standaloneBody = @{ partyType='CUSTOMER'; partyId=$customer.id; amount=25; note='QA standalone smoke' } | ConvertTo-Json
$standaloneRes = Invoke-RestMethod -Uri "$base/payments" -Headers $ownerHeaders -Method Post -ContentType 'application/json' -Body $standaloneBody
"STANDALONE_STATUS=OK message=$($standaloneRes.message)"

$ledger = Invoke-RestMethod -Uri "$base/ledger/statement?partyType=CUSTOMER&partyId=$($customer.id)&page=1&limit=20" -Headers $ownerHeaders -Method Get
$paymentEntries = @($ledger.data.items | Where-Object { $_.entryType -eq 'PAYMENT' })
"LEDGER_PAYMENT_ENTRIES_AFTER_STANDALONE=$($paymentEntries.Count)"

if ($openInvoices.Count -gt 0) {
  $distBody = @{ customerId=$customer.id; amount=30; note='QA distribute smoke' } | ConvertTo-Json
  $distRes = Invoke-RestMethod -Uri "$base/payments/distribute" -Headers $ownerHeaders -Method Post -ContentType 'application/json' -Body $distBody
  "DISTRIBUTE_STATUS=OK totalApplied=$($distRes.data.totalApplied) invoicesUpdated=$($distRes.data.invoicesUpdated)"

  $afterPaid = 0
  foreach ($inv in $openInvoices) {
    $invDetails2 = Invoke-RestMethod -Uri "$base/invoices/$($inv.id)" -Headers $ownerHeaders -Method Get
    $paid2 = [decimal]$invDetails2.data.paidAmount
    $afterPaid += $paid2
  }
  "OPEN_INVOICES_TOTAL_PAID_AFTER=$afterPaid"
  "OPEN_INVOICES_PAID_DELTA=$([decimal]($afterPaid - $beforePaid))"
} else {
  "DISTRIBUTE_SKIPPED_NO_OPEN_INVOICES"
}

# Negative payload validation
try {
  $badStandalone = @{ partyType='CUSTOMER'; partyId=$customer.id; amount=0 } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/payments" -Headers $ownerHeaders -Method Post -ContentType 'application/json' -Body $badStandalone | Out-Null
  "NEGATIVE_VALIDATION_UNEXPECTED_SUCCESS"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  "NEGATIVE_VALIDATION_STATUS=$status"
}

# Permission check using low-privilege staff
try {
  $staffStandalone = @{ partyType='CUSTOMER'; partyId=$customer.id; amount=10 } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/payments" -Headers $staffHeaders -Method Post -ContentType 'application/json' -Body $staffStandalone | Out-Null
  "STAFF_PERMISSION_UNEXPECTED_SUCCESS"
} catch {
  $status2 = $_.Exception.Response.StatusCode.value__
  "STAFF_PERMISSION_STATUS=$status2"
}

# Reports endpoints smoke for owner with 3 date presets
$presets = @(
  @{ dateFrom = (Get-Date -Format 'yyyy-MM-01'); dateTo = (Get-Date -Format 'yyyy-MM-dd'); label='THIS_MONTH' },
  @{ dateFrom = (Get-Date).AddMonths(-3).ToString('yyyy-MM-01'); dateTo = (Get-Date -Format 'yyyy-MM-dd'); label='LAST_3_MONTHS' },
  @{ dateFrom = (Get-Date -Format 'yyyy-01-01'); dateTo = (Get-Date -Format 'yyyy-MM-dd'); label='THIS_YEAR' }
)

$reportPaths = @('profit-loss','cash-flow','customers-aging','suppliers-aging','sales-detailed','collections-followup')
foreach ($preset in $presets) {
  foreach ($rp in $reportPaths) {
    $url = "{0}/reports/{1}?dateFrom={2}&dateTo={3}" -f $base, $rp, $preset.dateFrom, $preset.dateTo
    try {
      $r = Invoke-RestMethod -Uri $url -Headers $ownerHeaders -Method Get
      $hasData = $null -ne $r.data
      "REPORT_OK preset=$($preset.label) endpoint=$rp hasData=$hasData"
    } catch {
      $st = $_.Exception.Response.StatusCode.value__
      "REPORT_FAIL preset=$($preset.label) endpoint=$rp status=$st"
    }
  }
}
