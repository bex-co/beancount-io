export const simpleLedgerTemplate: Record<string, string> = {
  "main.bean": `
* Options

option "title" "Example Beancount file"
option "operating_currency" "USD"
option "inferred_tolerance_default" "*:0.001"

plugin "beancount.plugins.auto_accounts"

* Accounts

1970-01-01 open Assets:Cash
1970-01-01 open Assets:Crypto
1970-01-01 open Assets:RealEstate
1970-01-01 open Assets:Stock

1970-01-01 open Income:Bonus
1970-01-01 open Income:InterestIncome
1970-01-01 open Income:Paycheck
1970-01-01 open Income:Reimbursement
1970-01-01 open Income:RetailIncome
1970-01-01 open Income:ReturnedPurchase

1970-01-01 open Expenses:AutoAndTransport
1970-01-01 open Expenses:BillsAndUtilities
1970-01-01 open Expenses:BusinessServices
1970-01-01 open Expenses:Education
1970-01-01 open Expenses:Entertainment
1970-01-01 open Expenses:FeesAndCharges
1970-01-01 open Expenses:Financial
1970-01-01 open Expenses:FoodAndDining
1970-01-01 open Expenses:GiftsAndDonations
1970-01-01 open Expenses:HealthAndFitness
1970-01-01 open Expenses:Housing
1970-01-01 open Expenses:Kids
1970-01-01 open Expenses:Misc
1970-01-01 open Expenses:PersonalCare
1970-01-01 open Expenses:Pets
1970-01-01 open Expenses:Shopping
1970-01-01 open Expenses:Taxes
1970-01-01 open Expenses:Travel

1970-01-01 open Liabilities:CreditCard

1970-01-01 open Equity:Initial

* Transactions

2021-10-11 * "Example Payee" "Example Memo"
  Equity:Initial                                     -14.99 USD
  Assets:Cash                                         14.99 USD

`,
};

export const ledgerWithMultipleFilesTemplate: Record<string, string> = {
  "main.bean": `
;; -*- mode: org; mode: beancount; -*-
;; Birth: 1980-05-12
;; Dates: 2023-01-01 - 2025-10-12
;; THIS FILE HAS BEEN AUTO-GENERATED.
* Options

option "title" "Example Beancount file"
option "operating_currency" "USD"

include "./prices.bean"
include "./commodities.bean"

* Equity Accounts

1980-05-12 open Equity:Opening-Balances
1980-05-12 open Liabilities:AccountsPayable



* Banking

2023-01-01 open Assets:US:BofA
  institution: "Bank of America"
  address: "123 America Street, LargeTown, USA"
  phone: "+1.012.345.6789"
2023-01-01 open Assets:US:BofA:Checking                        USD
  account: "00234-48574897"

2023-01-01 * "Opening Balance for checking account"
  Assets:US:BofA:Checking                         3663.93 USD
  Equity:Opening-Balances                        -3663.93 USD

2023-01-02 balance Assets:US:BofA:Checking        3663.93 USD

2023-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-01-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-01-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-01-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -57.52 USD
  Expenses:Home:Phone                               57.52 USD

2023-01-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2023-01-30 balance Assets:US:BofA:Checking        3618.96 USD

2023-02-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-02-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-02-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -61.32 USD
  Expenses:Home:Phone                               61.32 USD

2023-02-20 balance Assets:US:BofA:Checking        3181.67 USD

2023-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.96 USD
  Expenses:Home:Internet                            79.96 USD

2023-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-03-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-03-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.42 USD
  Expenses:Home:Phone                               59.42 USD

2023-03-21 balance Assets:US:BofA:Checking        2716.52 USD

2023-03-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.22 USD
  Expenses:Home:Internet                            80.22 USD

2023-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-04-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-04-14 balance Assets:US:BofA:Checking        2314.32 USD

2023-04-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -58.55 USD
  Expenses:Home:Phone                               58.55 USD

2023-04-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.18 USD
  Expenses:Home:Internet                            80.18 USD

2023-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-05-06 balance Assets:US:BofA:Checking        3522.19 USD

2023-05-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-05-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-05-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -66.73 USD
  Expenses:Home:Phone                               66.73 USD

2023-05-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.00 USD
  Expenses:Home:Internet                            80.00 USD

2023-06-03 balance Assets:US:BofA:Checking        3045.44 USD

2023-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-06-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-06-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-06-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -36.58 USD
  Expenses:Home:Phone                               36.58 USD

2023-06-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.15 USD
  Expenses:Home:Internet                            80.15 USD

2023-07-01 balance Assets:US:BofA:Checking        2519.47 USD

2023-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-07-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-07-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.93 USD
  Expenses:Home:Phone                               60.93 USD

2023-07-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.92 USD
  Expenses:Home:Internet                            79.92 USD

2023-07-26 balance Assets:US:BofA:Checking        1979.24 USD

2023-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-08-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-08-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -58.57 USD
  Expenses:Home:Phone                               58.57 USD

2023-08-22 balance Assets:US:BofA:Checking        3571.24 USD

2023-08-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.87 USD
  Expenses:Home:Internet                            79.87 USD

2023-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-09-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-09-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-09-11 balance Assets:US:BofA:Checking        2815.01 USD

2023-09-15 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2023-09-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.09 USD
  Expenses:Home:Phone                               59.09 USD

2023-09-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.81 USD
  Expenses:Home:Internet                            79.81 USD

2023-10-04 balance Assets:US:BofA:Checking        3777.31 USD

2023-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-10-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-10-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-10-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -51.35 USD
  Expenses:Home:Phone                               51.35 USD

2023-10-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2023-10-27 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -3000 USD
  Assets:US:ETrade:Cash                              3000 USD

2023-10-29 balance Assets:US:BofA:Checking        2663.76 USD

2023-11-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-11-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-11-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-11-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -66.88 USD
  Expenses:Home:Phone                               66.88 USD

2023-11-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.09 USD
  Expenses:Home:Internet                            80.09 USD

2023-11-27 balance Assets:US:BofA:Checking        4275.74 USD

2023-12-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-12-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-12-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-12-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -54.53 USD
  Expenses:Home:Phone                               54.53 USD

2023-12-22 balance Assets:US:BofA:Checking        6501.66 USD

2023-12-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.00 USD
  Expenses:Home:Internet                            80.00 USD

2024-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-01-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-01-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-01-13 balance Assets:US:BofA:Checking        4344.65 USD

2024-01-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -55.44 USD
  Expenses:Home:Phone                               55.44 USD

2024-01-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2024-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-02-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-02-06 balance Assets:US:BofA:Checking        4506.40 USD

2024-02-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-02-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -64.41 USD
  Expenses:Home:Phone                               64.41 USD

2024-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.95 USD
  Expenses:Home:Internet                            79.95 USD

2024-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-03-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-03-07 balance Assets:US:BofA:Checking        4003.73 USD

2024-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-03-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -41.89 USD
  Expenses:Home:Phone                               41.89 USD

2024-03-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.13 USD
  Expenses:Home:Internet                            80.13 USD

2024-03-29 balance Assets:US:BofA:Checking        5777.34 USD

2024-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-04-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-04-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.05 USD
  Expenses:Home:Phone                               60.05 USD

2024-04-23 balance Assets:US:BofA:Checking        3743.09 USD

2024-04-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.05 USD
  Expenses:Home:Internet                            80.05 USD

2024-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-05-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-05-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-05-13 balance Assets:US:BofA:Checking        3321.57 USD

2024-05-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.43 USD
  Expenses:Home:Phone                               59.43 USD

2024-05-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2024-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-06-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-06-09 balance Assets:US:BofA:Checking        2702.11 USD

2024-06-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-06-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -57.43 USD
  Expenses:Home:Phone                               57.43 USD

2024-06-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.82 USD
  Expenses:Home:Internet                            79.82 USD

2024-06-30 balance Assets:US:BofA:Checking        3850.46 USD

2024-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-07-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-07-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -73.09 USD
  Expenses:Home:Phone                               73.09 USD

2024-07-20 balance Assets:US:BofA:Checking        3457.42 USD

2024-07-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.16 USD
  Expenses:Home:Internet                            80.16 USD

2024-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-08-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-08-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-08-10 balance Assets:US:BofA:Checking        2958.86 USD

2024-08-16 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2024-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.33 USD
  Expenses:Home:Phone                               60.33 USD

2024-08-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.99 USD
  Expenses:Home:Internet                            79.99 USD

2024-08-31 balance Assets:US:BofA:Checking        3369.21 USD

2024-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-09-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-09-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-09-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -76.54 USD
  Expenses:Home:Phone                               76.54 USD

2024-09-20 balance Assets:US:BofA:Checking        2753.36 USD

2024-09-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.76 USD
  Expenses:Home:Internet                            79.76 USD

2024-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-10-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-10-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-10-11 balance Assets:US:BofA:Checking        4710.12 USD

2024-10-11 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2024-10-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -63.09 USD
  Expenses:Home:Phone                               63.09 USD

2024-10-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2024-11-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-11-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-11-09 balance Assets:US:BofA:Checking        3264.22 USD

2024-11-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-11-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -49.57 USD
  Expenses:Home:Phone                               49.57 USD

2024-11-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.90 USD
  Expenses:Home:Internet                            79.90 USD

2024-11-29 balance Assets:US:BofA:Checking        4895.27 USD

2024-12-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-12-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-12-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-12-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -56.01 USD
  Expenses:Home:Phone                               56.01 USD

2024-12-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.89 USD
  Expenses:Home:Internet                            79.89 USD

2024-12-26 balance Assets:US:BofA:Checking        7015.36 USD

2025-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-01-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-01-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-01-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -64.17 USD
  Expenses:Home:Phone                               64.17 USD

2025-01-23 balance Assets:US:BofA:Checking        6334.53 USD

2025-01-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.93 USD
  Expenses:Home:Internet                            79.93 USD

2025-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-02-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-02-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-02-15 balance Assets:US:BofA:Checking        5887.87 USD

2025-02-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -61.33 USD
  Expenses:Home:Phone                               61.33 USD

2025-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.99 USD
  Expenses:Home:Internet                            79.99 USD

2025-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-03-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-03-09 balance Assets:US:BofA:Checking        4628.15 USD

2025-03-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -65.11 USD
  Expenses:Home:Phone                               65.11 USD

2025-03-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2025-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-04-06 balance Assets:US:BofA:Checking        3837.99 USD

2025-04-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-04-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -46.82 USD
  Expenses:Home:Phone                               46.82 USD

2025-04-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.09 USD
  Expenses:Home:Internet                            80.09 USD

2025-05-04 balance Assets:US:BofA:Checking        5573.45 USD

2025-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-05-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-05-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-05-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -54.05 USD
  Expenses:Home:Phone                               54.05 USD

2025-05-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.20 USD
  Expenses:Home:Internet                            80.20 USD

2025-05-30 balance Assets:US:BofA:Checking        4986.41 USD

2025-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-06-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-06-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-06-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -44.24 USD
  Expenses:Home:Phone                               44.24 USD

2025-06-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.27 USD
  Expenses:Home:Internet                            80.27 USD

2025-06-24 balance Assets:US:BofA:Checking        4349.09 USD

2025-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-07-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-07-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -44.92 USD
  Expenses:Home:Phone                               44.92 USD

2025-07-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.82 USD
  Expenses:Home:Internet                            79.82 USD

2025-07-23 balance Assets:US:BofA:Checking        3778.65 USD

2025-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-08-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-08-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-08-12 balance Assets:US:BofA:Checking        2614.50 USD

2025-08-15 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4500 USD
  Assets:US:ETrade:Cash                              4500 USD

2025-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -82.76 USD
  Expenses:Home:Phone                               82.76 USD

2025-08-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2025-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-09-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-09-08 balance Assets:US:BofA:Checking         648.93 USD

2025-09-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-09-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -72.76 USD
  Expenses:Home:Phone                               72.76 USD

2025-09-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.88 USD
  Expenses:Home:Internet                            79.88 USD

2025-09-26 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -5000 USD
  Assets:US:ETrade:Cash                              5000 USD

2025-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-10-08 balance Assets:US:BofA:Checking         206.91 USD



* Credit-Cards

1980-05-12 open Liabilities:US:Chase:Slate                      USD

2023-01-02 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.89 USD
  Expenses:Food:Restaurant                          32.89 USD

2023-01-05 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -25.85 USD
  Expenses:Food:Restaurant                          25.85 USD

2023-01-06 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -46.18 USD
  Expenses:Food:Restaurant                          46.18 USD

2023-01-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       139.64 USD
  Assets:US:BofA:Checking                         -139.64 USD

2023-01-10 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -34.72 USD
  Expenses:Food:Restaurant                          34.72 USD

2023-01-11 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -85.47 USD
  Expenses:Food:Groceries                           85.47 USD

2023-01-15 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -26.73 USD
  Expenses:Food:Restaurant                          26.73 USD

2023-01-20 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -15.16 USD
  Expenses:Food:Restaurant                          15.16 USD

2023-01-23 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -36.54 USD
  Expenses:Food:Restaurant                          36.54 USD

2023-01-25 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -90.57 USD
  Expenses:Food:Groceries                           90.57 USD

2023-01-27 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -45.84 USD
  Expenses:Food:Restaurant                          45.84 USD

2023-01-28 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -20.62 USD
  Expenses:Food:Restaurant                          20.62 USD

2023-01-30 balance Liabilities:US:Chase:Slate     -320.93 USD

2023-01-31 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-02-01 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -31.47 USD
  Expenses:Food:Restaurant                          31.47 USD

2023-02-05 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -10.43 USD
  Expenses:Food:Restaurant                          10.43 USD

2023-02-08 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.28 USD
  Expenses:Food:Restaurant                          29.28 USD

2023-02-09 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.06 USD
  Expenses:Food:Groceries                           96.06 USD

2023-02-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       608.17 USD
  Assets:US:BofA:Checking                         -608.17 USD

2023-02-13 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -26.74 USD
  Expenses:Food:Restaurant                          26.74 USD

2023-02-14 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.13 USD
  Expenses:Food:Restaurant                          41.13 USD

2023-02-16 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -12.37 USD
  Expenses:Food:Restaurant                          12.37 USD

2023-02-20 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -44.74 USD
  Expenses:Food:Restaurant                          44.74 USD

2023-02-21 balance Liabilities:US:Chase:Slate     -124.98 USD

2023-02-22 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -46.18 USD
  Expenses:Food:Restaurant                          46.18 USD

2023-02-25 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.66 USD
  Expenses:Food:Restaurant                          23.66 USD

2023-02-28 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -57.48 USD
  Expenses:Food:Restaurant                          57.48 USD

2023-03-01 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.17 USD
  Expenses:Food:Groceries                           62.17 USD

2023-03-03 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.52 USD
  Expenses:Food:Restaurant                          20.52 USD

2023-03-04 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.47 USD
  Expenses:Food:Restaurant                          14.47 USD

2023-03-05 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -32.76 USD
  Expenses:Food:Restaurant                          32.76 USD

2023-03-05 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-03-08 * "Jewel of Morroco" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.25 USD
  Expenses:Food:Restaurant                          17.25 USD

2023-03-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       557.97 USD
  Assets:US:BofA:Checking                         -557.97 USD

2023-03-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -38.50 USD
  Expenses:Food:Groceries                           38.50 USD

2023-03-13 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -19.91 USD
  Expenses:Food:Restaurant                          19.91 USD

2023-03-16 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -75.44 USD
  Expenses:Food:Restaurant                          75.44 USD

2023-03-17 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.48 USD
  Expenses:Food:Restaurant                          35.48 USD

2023-03-21 balance Liabilities:US:Chase:Slate     -130.83 USD

2023-03-22 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.92 USD
  Expenses:Food:Restaurant                          17.92 USD

2023-03-25 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -37.95 USD
  Expenses:Food:Restaurant                          37.95 USD

2023-03-25 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.59 USD
  Expenses:Food:Groceries                           82.59 USD

2023-03-30 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -39.52 USD
  Expenses:Food:Restaurant                          39.52 USD

2023-04-01 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -17.70 USD
  Expenses:Food:Restaurant                          17.70 USD

2023-04-02 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-04-04 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -45.86 USD
  Expenses:Food:Restaurant                          45.86 USD

2023-04-07 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -31.40 USD
  Expenses:Food:Restaurant                          31.40 USD

2023-04-11 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.41 USD
  Expenses:Food:Restaurant                          30.41 USD

2023-04-11 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -110.42 USD
  Expenses:Food:Groceries                          110.42 USD

2023-04-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       554.18 USD
  Assets:US:BofA:Checking                         -554.18 USD

2023-04-16 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.29 USD
  Expenses:Food:Restaurant                          21.29 USD

2023-04-18 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -25.39 USD
  Expenses:Food:Restaurant                          25.39 USD

2023-04-19 balance Liabilities:US:Chase:Slate     -157.10 USD

2023-04-21 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -35.52 USD
  Expenses:Food:Restaurant                          35.52 USD

2023-04-22 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.36 USD
  Expenses:Food:Restaurant                          23.36 USD

2023-04-24 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -23.68 USD
  Expenses:Food:Restaurant                          23.68 USD

2023-04-27 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -17.08 USD
  Expenses:Food:Restaurant                          17.08 USD

2023-04-27 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -80.91 USD
  Expenses:Food:Groceries                           80.91 USD

2023-05-02 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -18.52 USD
  Expenses:Food:Restaurant                          18.52 USD

2023-05-05 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-05-06 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -24.51 USD
  Expenses:Food:Restaurant                          24.51 USD

2023-05-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       566.22 USD
  Assets:US:BofA:Checking                         -566.22 USD

2023-05-10 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -65.54 USD
  Expenses:Food:Restaurant                          65.54 USD

2023-05-11 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -10.36 USD
  Expenses:Food:Restaurant                          10.36 USD

2023-05-12 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.25 USD
  Expenses:Food:Restaurant                          35.25 USD

2023-05-12 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -124.00 USD
  Expenses:Food:Groceries                          124.00 USD

2023-05-14 balance Liabilities:US:Chase:Slate     -169.61 USD

2023-05-15 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.66 USD
  Expenses:Food:Restaurant                          21.66 USD

2023-05-18 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -30.17 USD
  Expenses:Food:Restaurant                          30.17 USD

2023-05-21 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.87 USD
  Expenses:Food:Restaurant                          21.87 USD

2023-05-24 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -19.26 USD
  Expenses:Food:Restaurant                          19.26 USD

2023-05-25 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -46.42 USD
  Expenses:Food:Restaurant                          46.42 USD

2023-05-29 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -22.36 USD
  Expenses:Food:Restaurant                          22.36 USD

2023-05-30 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -61.47 USD
  Expenses:Food:Groceries                           61.47 USD

2023-05-31 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.13 USD
  Expenses:Food:Restaurant                          30.13 USD

2023-06-01 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.83 USD
  Expenses:Food:Restaurant                          31.83 USD

2023-06-03 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.19 USD
  Expenses:Food:Restaurant                          35.19 USD

2023-06-03 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-06-07 balance Liabilities:US:Chase:Slate     -609.97 USD

2023-06-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       641.44 USD
  Assets:US:BofA:Checking                         -641.44 USD

2023-06-08 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -31.47 USD
  Expenses:Food:Restaurant                          31.47 USD

2023-06-12 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -24.74 USD
  Expenses:Food:Restaurant                          24.74 USD

2023-06-14 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -27.54 USD
  Expenses:Food:Restaurant                          27.54 USD

2023-06-18 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -48.66 USD
  Expenses:Food:Groceries                           48.66 USD

2023-06-19 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -37.09 USD
  Expenses:Food:Restaurant                          37.09 USD

2023-06-20 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.10 USD
  Expenses:Food:Restaurant                          30.10 USD

2023-06-21 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -51.19 USD
  Expenses:Food:Restaurant                          51.19 USD

2023-06-23 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -29.01 USD
  Expenses:Food:Restaurant                          29.01 USD

2023-06-27 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -37.96 USD
  Expenses:Food:Restaurant                          37.96 USD

2023-06-30 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -42.30 USD
  Expenses:Food:Restaurant                          42.30 USD

2023-07-01 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-07-03 balance Liabilities:US:Chase:Slate     -448.59 USD

2023-07-03 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2023-07-06 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -83.99 USD
  Expenses:Food:Groceries                           83.99 USD

2023-07-07 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.73 USD
  Expenses:Food:Restaurant                          30.73 USD

2023-07-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       631.58 USD
  Assets:US:BofA:Checking                         -631.58 USD

2023-07-11 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -35.52 USD
  Expenses:Food:Restaurant                          35.52 USD

2023-07-14 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.23 USD
  Expenses:Food:Restaurant                          26.23 USD

2023-07-19 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -16.98 USD
  Expenses:Food:Restaurant                          16.98 USD

2023-07-23 balance Liabilities:US:Chase:Slate      -43.21 USD

2023-07-24 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.55 USD
  Expenses:Food:Restaurant                          41.55 USD

2023-07-26 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -75.30 USD
  Expenses:Food:Groceries                           75.30 USD

2023-07-29 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -23.56 USD
  Expenses:Food:Restaurant                          23.56 USD

2023-07-31 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-08-01 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -35.00 USD
  Expenses:Food:Restaurant                          35.00 USD

2023-08-03 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -34.02 USD
  Expenses:Food:Restaurant                          34.02 USD

2023-08-08 * "Uncle Boons" "Eating out with Julie"
  Liabilities:US:Chase:Slate                      -108.99 USD
  Expenses:Food:Restaurant                         108.99 USD

2023-08-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       481.63 USD
  Assets:US:BofA:Checking                         -481.63 USD

2023-08-10 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -26.35 USD
  Expenses:Food:Restaurant                          26.35 USD

2023-08-10 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -73.08 USD
  Expenses:Food:Groceries                           73.08 USD

2023-08-11 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -33.51 USD
  Expenses:Food:Restaurant                          33.51 USD

2023-08-14 balance Liabilities:US:Chase:Slate     -132.94 USD

2023-08-14 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -39.60 USD
  Expenses:Food:Restaurant                          39.60 USD

2023-08-17 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -33.20 USD
  Expenses:Food:Restaurant                          33.20 USD

2023-08-19 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -40.64 USD
  Expenses:Food:Restaurant                          40.64 USD

2023-08-22 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -56.30 USD
  Expenses:Food:Restaurant                          56.30 USD

2023-08-24 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.27 USD
  Expenses:Food:Restaurant                          14.27 USD

2023-08-26 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.47 USD
  Expenses:Food:Restaurant                          41.47 USD

2023-08-29 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -68.69 USD
  Expenses:Food:Groceries                           68.69 USD

2023-08-29 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-08-31 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -59.52 USD
  Expenses:Food:Restaurant                          59.52 USD

2023-09-02 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.23 USD
  Expenses:Food:Restaurant                          35.23 USD

2023-09-06 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -39.44 USD
  Expenses:Food:Restaurant                          39.44 USD

2023-09-09 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -35.02 USD
  Expenses:Food:Restaurant                          35.02 USD

2023-09-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       757.96 USD
  Assets:US:BofA:Checking                         -757.96 USD

2023-09-12 balance Liabilities:US:Chase:Slate       41.64 USD

2023-09-14 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.64 USD
  Expenses:Food:Restaurant                          41.64 USD

2023-09-17 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -31.89 USD
  Expenses:Food:Restaurant                          31.89 USD

2023-09-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -90.53 USD
  Expenses:Food:Groceries                           90.53 USD

2023-09-20 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -92.75 USD
  Expenses:Food:Restaurant                          92.75 USD

2023-09-25 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.95 USD
  Expenses:Food:Restaurant                          20.95 USD

2023-09-26 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -52.07 USD
  Expenses:Food:Groceries                           52.07 USD

2023-09-29 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.55 USD
  Expenses:Food:Restaurant                          30.55 USD

2023-09-29 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-10-01 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -16.17 USD
  Expenses:Food:Restaurant                          16.17 USD

2023-10-03 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -40.04 USD
  Expenses:Food:Restaurant                          40.04 USD

2023-10-04 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -64.82 USD
  Expenses:Food:Restaurant                          64.82 USD

2023-10-05 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -19.24 USD
  Expenses:Food:Restaurant                          19.24 USD

2023-10-07 balance Liabilities:US:Chase:Slate     -579.01 USD

2023-10-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       614.33 USD
  Assets:US:BofA:Checking                         -614.33 USD

2023-10-10 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -35.32 USD
  Expenses:Food:Restaurant                          35.32 USD

2023-10-10 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.81 USD
  Expenses:Food:Groceries                           99.81 USD

2023-10-13 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -19.06 USD
  Expenses:Food:Restaurant                          19.06 USD

2023-10-17 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -28.28 USD
  Expenses:Food:Restaurant                          28.28 USD

2023-10-18 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -65.31 USD
  Expenses:Food:Groceries                           65.31 USD

2023-10-19 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -51.60 USD
  Expenses:Food:Restaurant                          51.60 USD

2023-10-20 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.83 USD
  Expenses:Food:Restaurant                          23.83 USD

2023-10-23 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.79 USD
  Expenses:Food:Restaurant                          23.79 USD

2023-10-24 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -51.24 USD
  Expenses:Food:Restaurant                          51.24 USD

2023-10-27 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -16.37 USD
  Expenses:Food:Restaurant                          16.37 USD

2023-10-27 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-10-29 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -35.76 USD
  Expenses:Food:Restaurant                          35.76 USD

2023-10-30 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -122.87 USD
  Expenses:Food:Groceries                          122.87 USD

2023-11-03 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -58.59 USD
  Expenses:Food:Restaurant                          58.59 USD

2023-11-04 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -25.84 USD
  Expenses:Food:Restaurant                          25.84 USD

2023-11-05 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -37.72 USD
  Expenses:Food:Restaurant                          37.72 USD

2023-11-06 balance Liabilities:US:Chase:Slate     -780.07 USD

2023-11-07 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -59.56 USD
  Expenses:Food:Groceries                           59.56 USD

2023-11-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       873.25 USD
  Assets:US:BofA:Checking                         -873.25 USD

2023-11-10 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -33.62 USD
  Expenses:Food:Restaurant                          33.62 USD

2023-11-11 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.26 USD
  Expenses:Food:Restaurant                          23.26 USD

2023-11-12 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.73 USD
  Expenses:Food:Restaurant                          23.73 USD

2023-11-16 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -31.06 USD
  Expenses:Food:Restaurant                          31.06 USD

2023-11-17 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -51.76 USD
  Expenses:Food:Restaurant                          51.76 USD

2023-11-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.52 USD
  Expenses:Food:Groceries                           78.52 USD

2023-11-21 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -46.27 USD
  Expenses:Food:Restaurant                          46.27 USD

2023-11-23 * "China Garden" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.95 USD
  Expenses:Food:Restaurant                          29.95 USD

2023-11-27 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-11-28 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.12 USD
  Expenses:Food:Restaurant                          30.12 USD

2023-11-30 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.61 USD
  Expenses:Food:Restaurant                          32.61 USD

2023-12-01 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -19.50 USD
  Expenses:Food:Restaurant                          19.50 USD

2023-12-02 balance Liabilities:US:Chase:Slate     -486.78 USD

2023-12-03 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -37.47 USD
  Expenses:Food:Restaurant                          37.47 USD

2023-12-04 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -131.78 USD
  Expenses:Food:Groceries                          131.78 USD

2023-12-07 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.72 USD
  Expenses:Food:Restaurant                          15.72 USD

2023-12-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       671.75 USD
  Assets:US:BofA:Checking                         -671.75 USD

2023-12-12 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -55.31 USD
  Expenses:Food:Restaurant                          55.31 USD

2023-12-14 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -41.38 USD
  Expenses:Food:Restaurant                          41.38 USD

2023-12-15 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -132.93 USD
  Expenses:Food:Groceries                          132.93 USD

2023-12-17 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -41.74 USD
  Expenses:Food:Restaurant                          41.74 USD

2023-12-19 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -32.46 USD
  Expenses:Food:Restaurant                          32.46 USD

2023-12-24 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -29.17 USD
  Expenses:Food:Restaurant                          29.17 USD

2023-12-25 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-12-26 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -97.38 USD
  Expenses:Food:Groceries                           97.38 USD

2023-12-27 balance Liabilities:US:Chase:Slate     -550.37 USD

2023-12-27 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -26.26 USD
  Expenses:Food:Restaurant                          26.26 USD

2023-12-29 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.53 USD
  Expenses:Food:Restaurant                          21.53 USD

2023-12-30 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -36.60 USD
  Expenses:Food:Restaurant                          36.60 USD

2023-12-31 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -83.58 USD
  Expenses:Food:Groceries                           83.58 USD

2024-01-01 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -24.47 USD
  Expenses:Food:Restaurant                          24.47 USD

2024-01-02 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -27.09 USD
  Expenses:Food:Restaurant                          27.09 USD

2024-01-05 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -28.20 USD
  Expenses:Food:Restaurant                          28.20 USD

2024-01-05 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -105.68 USD
  Expenses:Food:Groceries                          105.68 USD

2024-01-10 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -25.36 USD
  Expenses:Food:Restaurant                          25.36 USD

2024-01-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       958.61 USD
  Assets:US:BofA:Checking                         -958.61 USD

2024-01-14 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.47 USD
  Expenses:Food:Restaurant                          29.47 USD

2024-01-15 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -88.58 USD
  Expenses:Food:Groceries                           88.58 USD

2024-01-17 balance Liabilities:US:Chase:Slate      -88.58 USD

2024-01-19 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.50 USD
  Expenses:Food:Restaurant                          27.50 USD

2024-01-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -67.38 USD
  Expenses:Food:Groceries                           67.38 USD

2024-01-21 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.01 USD
  Expenses:Food:Restaurant                          31.01 USD

2024-01-24 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -35.34 USD
  Expenses:Food:Restaurant                          35.34 USD

2024-01-26 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-01-28 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -38.53 USD
  Expenses:Food:Restaurant                          38.53 USD

2024-01-28 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -60.72 USD
  Expenses:Food:Groceries                           60.72 USD

2024-02-01 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.65 USD
  Expenses:Food:Restaurant                          22.65 USD

2024-02-04 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.48 USD
  Expenses:Food:Restaurant                          33.48 USD

2024-02-07 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -40.75 USD
  Expenses:Food:Restaurant                          40.75 USD

2024-02-10 balance Liabilities:US:Chase:Slate     -565.94 USD

2024-02-10 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -24.57 USD
  Expenses:Food:Restaurant                          24.57 USD

2024-02-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       590.51 USD
  Assets:US:BofA:Checking                         -590.51 USD

2024-02-12 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.58 USD
  Expenses:Food:Restaurant                          27.58 USD

2024-02-15 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -69.44 USD
  Expenses:Food:Groceries                           69.44 USD

2024-02-16 event "location" "Boston"

2024-02-18 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -26.07 USD
  Expenses:Food:Restaurant                          26.07 USD

2024-02-20 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.53 USD
  Expenses:Food:Restaurant                          40.53 USD

2024-02-20 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2024-02-22 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -44.34 USD
  Expenses:Food:Restaurant                          44.34 USD

2024-02-22 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -35.07 USD
  Expenses:Food:Restaurant                          35.07 USD

2024-02-22 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.49 USD
  Expenses:Food:Restaurant                          32.49 USD

2024-02-23 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -38.56 USD
  Expenses:Food:Restaurant                          38.56 USD

2024-02-23 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -29.38 USD
  Expenses:Food:Restaurant                          29.38 USD

2024-02-23 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.02 USD
  Expenses:Food:Restaurant                          32.02 USD

2024-02-23 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.27 USD
  Expenses:Food:Coffee                               6.27 USD

2024-02-24 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.98 USD
  Expenses:Food:Restaurant                          32.98 USD

2024-02-24 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.48 USD
  Expenses:Food:Coffee                               6.48 USD

2024-02-25 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.44 USD
  Expenses:Food:Restaurant                          42.44 USD

2024-02-25 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2024-02-26 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.70 USD
  Expenses:Food:Coffee                               5.70 USD

2024-02-27 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -34.06 USD
  Expenses:Food:Restaurant                          34.06 USD

2024-02-28 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.47 USD
  Expenses:Food:Restaurant                          40.47 USD

2024-02-28 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.93 USD
  Expenses:Food:Restaurant                          37.93 USD

2024-02-29 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.97 USD
  Expenses:Food:Restaurant                          40.97 USD

2024-02-29 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -36.30 USD
  Expenses:Food:Restaurant                          36.30 USD

2024-03-02 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.23 USD
  Expenses:Food:Coffee                               5.23 USD

2024-03-03 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.75 USD
  Expenses:Food:Restaurant                          40.75 USD

2024-03-04 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.66 USD
  Expenses:Food:Coffee                               6.66 USD

2024-03-05 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.35 USD
  Expenses:Food:Restaurant                          42.35 USD

2024-03-05 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -33.02 USD
  Expenses:Food:Restaurant                          33.02 USD

2024-03-06 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.35 USD
  Expenses:Food:Restaurant                          37.35 USD

2024-03-07 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.09 USD
  Expenses:Food:Restaurant                          37.09 USD

2024-03-07 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -20.65 USD
  Expenses:Food:Restaurant                          20.65 USD

2024-03-08 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.39 USD
  Expenses:Food:Restaurant                          42.39 USD

2024-03-08 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -28.99 USD
  Expenses:Food:Restaurant                          28.99 USD

2024-03-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       133.56 USD
  Assets:US:BofA:Checking                         -133.56 USD

2024-03-09 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2024-03-09 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -176 VACHR
  Expenses:Vacation                                   176 VACHR

2024-03-09 event "location" "New Metropolis"

2024-03-10 balance Liabilities:US:Chase:Slate     -863.81 USD

2024-03-10 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -36.54 USD
  Expenses:Food:Restaurant                          36.54 USD

2024-03-12 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -19.01 USD
  Expenses:Food:Restaurant                          19.01 USD

2024-03-16 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -45.32 USD
  Expenses:Food:Restaurant                          45.32 USD

2024-03-16 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.45 USD
  Expenses:Food:Groceries                           78.45 USD

2024-03-21 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -37.95 USD
  Expenses:Food:Restaurant                          37.95 USD

2024-03-22 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -22.83 USD
  Expenses:Food:Restaurant                          22.83 USD

2024-03-25 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-03-26 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -27.42 USD
  Expenses:Food:Restaurant                          27.42 USD

2024-03-27 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.49 USD
  Expenses:Food:Restaurant                          33.49 USD

2024-03-30 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -112.48 USD
  Expenses:Food:Groceries                          112.48 USD

2024-04-01 balance Liabilities:US:Chase:Slate    -1397.30 USD

2024-04-01 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.89 USD
  Expenses:Food:Restaurant                          23.89 USD

2024-04-04 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -48.83 USD
  Expenses:Food:Restaurant                          48.83 USD

2024-04-06 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -34.53 USD
  Expenses:Food:Restaurant                          34.53 USD

2024-04-07 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -20.07 USD
  Expenses:Food:Restaurant                          20.07 USD

2024-04-08 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.71 USD
  Expenses:Food:Groceries                           82.71 USD

2024-04-09 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -25.21 USD
  Expenses:Food:Restaurant                          25.21 USD

2024-04-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       855.80 USD
  Assets:US:BofA:Checking                         -855.80 USD

2024-04-13 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -123.61 USD
  Expenses:Food:Groceries                          123.61 USD

2024-04-14 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -58.33 USD
  Expenses:Food:Restaurant                          58.33 USD

2024-04-15 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -15.58 USD
  Expenses:Food:Restaurant                          15.58 USD

2024-04-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -48.12 USD
  Expenses:Food:Groceries                           48.12 USD

2024-04-19 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.74 USD
  Expenses:Food:Restaurant                          27.74 USD

2024-04-20 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -22.70 USD
  Expenses:Food:Restaurant                          22.70 USD

2024-04-22 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -42.39 USD
  Expenses:Food:Restaurant                          42.39 USD

2024-04-22 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-04-26 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -23.91 USD
  Expenses:Food:Restaurant                          23.91 USD

2024-04-27 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.75 USD
  Expenses:Food:Restaurant                          17.75 USD

2024-04-29 balance Liabilities:US:Chase:Slate    -1276.87 USD

2024-04-29 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.06 USD
  Expenses:Food:Restaurant                          20.06 USD

2024-05-01 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -52.38 USD
  Expenses:Food:Restaurant                          52.38 USD

2024-05-05 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -19.03 USD
  Expenses:Food:Restaurant                          19.03 USD

2024-05-06 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.15 USD
  Expenses:Food:Groceries                           82.15 USD

2024-05-10 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.53 USD
  Expenses:Food:Restaurant                          23.53 USD

2024-05-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       573.67 USD
  Assets:US:BofA:Checking                         -573.67 USD

2024-05-12 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -22.26 USD
  Expenses:Food:Restaurant                          22.26 USD

2024-05-12 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -84.08 USD
  Expenses:Food:Groceries                           84.08 USD

2024-05-16 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.11 USD
  Expenses:Food:Restaurant                          30.11 USD

2024-05-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.00 USD
  Expenses:Food:Groceries                           96.00 USD

2024-05-20 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -26.50 USD
  Expenses:Food:Restaurant                          26.50 USD

2024-05-21 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-05-25 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -13.95 USD
  Expenses:Food:Restaurant                          13.95 USD

2024-05-27 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -61.85 USD
  Expenses:Food:Restaurant                          61.85 USD

2024-05-28 balance Liabilities:US:Chase:Slate    -1355.10 USD

2024-05-28 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -45.75 USD
  Expenses:Food:Groceries                           45.75 USD

2024-05-29 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -55.96 USD
  Expenses:Food:Restaurant                          55.96 USD

2024-06-02 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.39 USD
  Expenses:Food:Restaurant                          30.39 USD

2024-06-03 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.10 USD
  Expenses:Food:Restaurant                          30.10 USD

2024-06-03 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -55.86 USD
  Expenses:Food:Groceries                           55.86 USD

2024-06-05 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -45.07 USD
  Expenses:Food:Restaurant                          45.07 USD

2024-06-06 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -22.64 USD
  Expenses:Food:Restaurant                          22.64 USD

2024-06-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       777.16 USD
  Assets:US:BofA:Checking                         -777.16 USD

2024-06-10 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -36.64 USD
  Expenses:Food:Restaurant                          36.64 USD

2024-06-15 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.21 USD
  Expenses:Food:Restaurant                          26.21 USD

2024-06-19 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -36.10 USD
  Expenses:Food:Restaurant                          36.10 USD

2024-06-21 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-06-22 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.82 USD
  Expenses:Food:Groceries                           62.82 USD

2024-06-23 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.03 USD
  Expenses:Food:Restaurant                          20.03 USD

2024-06-25 balance Liabilities:US:Chase:Slate    -1165.51 USD

2024-06-27 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -32.58 USD
  Expenses:Food:Restaurant                          32.58 USD

2024-06-30 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -74.53 USD
  Expenses:Food:Restaurant                          74.53 USD

2024-07-02 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.42 USD
  Expenses:Food:Restaurant                          33.42 USD

2024-07-05 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -71.08 USD
  Expenses:Food:Groceries                           71.08 USD

2024-07-07 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.86 USD
  Expenses:Food:Restaurant                          33.86 USD

2024-07-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       552.15 USD
  Assets:US:BofA:Checking                         -552.15 USD

2024-07-09 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -41.52 USD
  Expenses:Food:Restaurant                          41.52 USD

2024-07-14 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -25.02 USD
  Expenses:Food:Restaurant                          25.02 USD

2024-07-18 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.37 USD
  Expenses:Food:Restaurant                          26.37 USD

2024-07-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -68.03 USD
  Expenses:Food:Groceries                           68.03 USD

2024-07-19 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-07-21 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -52.50 USD
  Expenses:Food:Restaurant                          52.50 USD

2024-07-22 balance Liabilities:US:Chase:Slate    -1192.27 USD

2024-07-25 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -15.71 USD
  Expenses:Food:Restaurant                          15.71 USD

2024-07-27 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -26.48 USD
  Expenses:Food:Restaurant                          26.48 USD

2024-07-28 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.90 USD
  Expenses:Food:Restaurant                          23.90 USD

2024-08-02 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -24.84 USD
  Expenses:Food:Restaurant                          24.84 USD

2024-08-03 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -20.02 USD
  Expenses:Food:Restaurant                          20.02 USD

2024-08-04 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -65.17 USD
  Expenses:Food:Groceries                           65.17 USD

2024-08-07 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -26.07 USD
  Expenses:Food:Restaurant                          26.07 USD

2024-08-10 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -41.45 USD
  Expenses:Food:Restaurant                          41.45 USD

2024-08-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       550.53 USD
  Assets:US:BofA:Checking                         -550.53 USD

2024-08-12 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -14.97 USD
  Expenses:Food:Restaurant                          14.97 USD

2024-08-13 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -30.21 USD
  Expenses:Food:Restaurant                          30.21 USD

2024-08-15 balance Liabilities:US:Chase:Slate     -930.56 USD

2024-08-15 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -29.37 USD
  Expenses:Food:Restaurant                          29.37 USD

2024-08-19 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.52 USD
  Expenses:Food:Restaurant                          27.52 USD

2024-08-20 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -24.54 USD
  Expenses:Food:Restaurant                          24.54 USD

2024-08-20 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-08-21 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.49 USD
  Expenses:Food:Groceries                           79.49 USD

2024-08-24 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -41.64 USD
  Expenses:Food:Restaurant                          41.64 USD

2024-08-27 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -54.24 USD
  Expenses:Food:Restaurant                          54.24 USD

2024-08-29 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -93.44 USD
  Expenses:Food:Groceries                           93.44 USD

2024-08-31 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -66.04 USD
  Expenses:Food:Restaurant                          66.04 USD

2024-09-04 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -29.79 USD
  Expenses:Food:Restaurant                          29.79 USD

2024-09-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       620.91 USD
  Assets:US:BofA:Checking                         -620.91 USD

2024-09-08 balance Liabilities:US:Chase:Slate     -875.72 USD

2024-09-09 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -24.63 USD
  Expenses:Food:Restaurant                          24.63 USD

2024-09-11 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.39 USD
  Expenses:Food:Restaurant                          22.39 USD

2024-09-12 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -80.41 USD
  Expenses:Food:Groceries                           80.41 USD

2024-09-13 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -20.60 USD
  Expenses:Food:Restaurant                          20.60 USD

2024-09-14 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -17.37 USD
  Expenses:Food:Restaurant                          17.37 USD

2024-09-19 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -21.23 USD
  Expenses:Food:Restaurant                          21.23 USD

2024-09-20 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -75.39 USD
  Expenses:Food:Restaurant                          75.39 USD

2024-09-20 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-09-23 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -15.89 USD
  Expenses:Food:Restaurant                          15.89 USD

2024-09-26 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -16.35 USD
  Expenses:Food:Restaurant                          16.35 USD

2024-09-27 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -98.49 USD
  Expenses:Food:Groceries                           98.49 USD

2024-09-28 * "Jewel of Morroco" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.17 USD
  Expenses:Food:Restaurant                          21.17 USD

2024-09-30 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -34.48 USD
  Expenses:Food:Restaurant                          34.48 USD

2024-10-02 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.19 USD
  Expenses:Food:Restaurant                          23.19 USD

2024-10-07 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.71 USD
  Expenses:Food:Restaurant                          17.71 USD

2024-10-08 balance Liabilities:US:Chase:Slate    -1485.02 USD

2024-10-09 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -11.01 USD
  Expenses:Food:Restaurant                          11.01 USD

2024-10-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       595.68 USD
  Assets:US:BofA:Checking                         -595.68 USD

2024-10-10 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -89.51 USD
  Expenses:Food:Groceries                           89.51 USD

2024-10-13 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -21.91 USD
  Expenses:Food:Restaurant                          21.91 USD

2024-10-14 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -44.94 USD
  Expenses:Food:Restaurant                          44.94 USD

2024-10-15 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -16.95 USD
  Expenses:Food:Restaurant                          16.95 USD

2024-10-17 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -18.02 USD
  Expenses:Food:Restaurant                          18.02 USD

2024-10-20 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.78 USD
  Expenses:Food:Restaurant                          15.78 USD

2024-10-22 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-10-23 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -66.73 USD
  Expenses:Food:Groceries                           66.73 USD

2024-10-25 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.29 USD
  Expenses:Food:Restaurant                          21.29 USD

2024-10-28 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -25.92 USD
  Expenses:Food:Restaurant                          25.92 USD

2024-10-30 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.52 USD
  Expenses:Food:Restaurant                          23.52 USD

2024-10-31 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -56.17 USD
  Expenses:Food:Restaurant                          56.17 USD

2024-11-01 balance Liabilities:US:Chase:Slate    -1421.09 USD

2024-11-01 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -30.60 USD
  Expenses:Food:Restaurant                          30.60 USD

2024-11-05 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.05 USD
  Expenses:Food:Restaurant                          14.05 USD

2024-11-08 * "China Garden" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -28.17 USD
  Expenses:Food:Restaurant                          28.17 USD

2024-11-09 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -131.52 USD
  Expenses:Food:Groceries                          131.52 USD

2024-11-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       725.08 USD
  Assets:US:BofA:Checking                         -725.08 USD

2024-11-11 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -28.52 USD
  Expenses:Food:Restaurant                          28.52 USD

2024-11-14 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -54.60 USD
  Expenses:Food:Restaurant                          54.60 USD

2024-11-16 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -19.39 USD
  Expenses:Food:Restaurant                          19.39 USD

2024-11-18 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-11-20 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -90.51 USD
  Expenses:Food:Restaurant                          90.51 USD

2024-11-25 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.86 USD
  Expenses:Food:Restaurant                          23.86 USD

2024-11-25 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -63.39 USD
  Expenses:Food:Groceries                           63.39 USD

2024-11-27 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -41.20 USD
  Expenses:Food:Restaurant                          41.20 USD

2024-11-28 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.88 USD
  Expenses:Food:Restaurant                          33.88 USD

2024-11-29 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.64 USD
  Expenses:Food:Restaurant                          25.64 USD

2024-12-01 balance Liabilities:US:Chase:Slate    -1401.34 USD

2024-12-02 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -34.49 USD
  Expenses:Food:Restaurant                          34.49 USD

2024-12-03 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -86.60 USD
  Expenses:Food:Groceries                           86.60 USD

2024-12-04 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -16.15 USD
  Expenses:Food:Restaurant                          16.15 USD

2024-12-05 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.83 USD
  Expenses:Food:Restaurant                          27.83 USD

2024-12-10 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -30.15 USD
  Expenses:Food:Restaurant                          30.15 USD

2024-12-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       696.21 USD
  Assets:US:BofA:Checking                         -696.21 USD

2024-12-11 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -32.50 USD
  Expenses:Food:Restaurant                          32.50 USD

2024-12-12 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -76.36 USD
  Expenses:Food:Groceries                           76.36 USD

2024-12-15 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -42.82 USD
  Expenses:Food:Restaurant                          42.82 USD

2024-12-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-12-17 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -16.64 USD
  Expenses:Food:Restaurant                          16.64 USD

2024-12-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -64.87 USD
  Expenses:Food:Groceries                           64.87 USD

2024-12-21 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.68 USD
  Expenses:Food:Restaurant                          17.68 USD

2024-12-23 balance Liabilities:US:Chase:Slate    -1271.22 USD

2024-12-23 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -112.67 USD
  Expenses:Food:Groceries                          112.67 USD

2024-12-25 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.99 USD
  Expenses:Food:Restaurant                          15.99 USD

2024-12-26 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.04 USD
  Expenses:Food:Restaurant                          31.04 USD

2024-12-27 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -44.09 USD
  Expenses:Food:Restaurant                          44.09 USD

2024-12-28 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.87 USD
  Expenses:Food:Restaurant                          21.87 USD

2024-12-29 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.30 USD
  Expenses:Food:Restaurant                          32.30 USD

2024-12-30 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -33.47 USD
  Expenses:Food:Restaurant                          33.47 USD

2024-12-30 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.36 USD
  Expenses:Food:Groceries                           78.36 USD

2025-01-02 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -70.64 USD
  Expenses:Food:Restaurant                          70.64 USD

2025-01-07 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -37.56 USD
  Expenses:Food:Restaurant                          37.56 USD

2025-01-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       848.86 USD
  Assets:US:BofA:Checking                         -848.86 USD

2025-01-12 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -23.65 USD
  Expenses:Food:Restaurant                          23.65 USD

2025-01-13 balance Liabilities:US:Chase:Slate     -924.00 USD

2025-01-14 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-01-16 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -18.20 USD
  Expenses:Food:Restaurant                          18.20 USD

2025-01-16 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -111.57 USD
  Expenses:Food:Groceries                          111.57 USD

2025-01-19 * "Uncle Boons" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.98 USD
  Expenses:Food:Restaurant                          30.98 USD

2025-01-21 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -53.08 USD
  Expenses:Food:Restaurant                          53.08 USD

2025-01-23 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -13.71 USD
  Expenses:Food:Restaurant                          13.71 USD

2025-01-25 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.82 USD
  Expenses:Food:Restaurant                          20.82 USD

2025-01-30 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -13.57 USD
  Expenses:Food:Restaurant                          13.57 USD

2025-02-03 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -44.36 USD
  Expenses:Food:Restaurant                          44.36 USD

2025-02-04 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -104.49 USD
  Expenses:Food:Groceries                          104.49 USD

2025-02-07 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -32.09 USD
  Expenses:Food:Restaurant                          32.09 USD

2025-02-08 event "location" "Boston"

2025-02-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       598.93 USD
  Assets:US:BofA:Checking                         -598.93 USD

2025-02-09 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -27.39 USD
  Expenses:Food:Restaurant                          27.39 USD

2025-02-11 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -37.25 USD
  Expenses:Food:Restaurant                          37.25 USD

2025-02-12 balance Liabilities:US:Chase:Slate     -952.58 USD

2025-02-12 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -44.33 USD
  Expenses:Food:Restaurant                          44.33 USD

2025-02-12 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.71 USD
  Expenses:Food:Coffee                               6.71 USD

2025-02-13 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -36.45 USD
  Expenses:Food:Restaurant                          36.45 USD

2025-02-13 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.65 USD
  Expenses:Food:Restaurant                          32.65 USD

2025-02-15 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.58 USD
  Expenses:Food:Coffee                               5.58 USD

2025-02-16 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -38.39 USD
  Expenses:Food:Restaurant                          38.39 USD

2025-02-16 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -41.00 USD
  Expenses:Food:Restaurant                          41.00 USD

2025-02-16 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -7.35 USD
  Expenses:Food:Coffee                               7.35 USD

2025-02-17 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -42.94 USD
  Expenses:Food:Restaurant                          42.94 USD

2025-02-17 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.58 USD
  Expenses:Food:Coffee                               5.58 USD

2025-02-18 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -37.25 USD
  Expenses:Food:Restaurant                          37.25 USD

2025-02-18 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -23.80 USD
  Expenses:Food:Restaurant                          23.80 USD

2025-02-18 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.66 USD
  Expenses:Food:Coffee                               6.66 USD

2025-02-19 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2025-02-19 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.26 USD
  Expenses:Food:Coffee                               5.26 USD

2025-02-22 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -31.02 USD
  Expenses:Food:Restaurant                          31.02 USD

2025-02-22 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.98 USD
  Expenses:Food:Coffee                               5.98 USD

2025-02-24 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -41.50 USD
  Expenses:Food:Restaurant                          41.50 USD

2025-02-24 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -27.53 USD
  Expenses:Food:Restaurant                          27.53 USD

2025-02-25 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2025-02-26 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.63 USD
  Expenses:Food:Restaurant                          32.63 USD

2025-02-27 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -29.89 USD
  Expenses:Food:Restaurant                          29.89 USD

2025-02-27 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.63 USD
  Expenses:Food:Coffee                               6.63 USD

2025-02-28 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -31.93 USD
  Expenses:Food:Restaurant                          31.93 USD

2025-03-01 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.69 USD
  Expenses:Food:Restaurant                          32.69 USD

2025-03-01 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -30.59 USD
  Expenses:Food:Restaurant                          30.59 USD

2025-03-01 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -168 VACHR
  Expenses:Vacation                                   168 VACHR

2025-03-01 event "location" "New Metropolis"

2025-03-05 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -12.41 USD
  Expenses:Food:Restaurant                          12.41 USD

2025-03-06 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.94 USD
  Expenses:Food:Restaurant                          21.94 USD

2025-03-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                        98.67 USD
  Assets:US:BofA:Checking                          -98.67 USD

2025-03-10 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -76.73 USD
  Expenses:Food:Groceries                           76.73 USD

2025-03-11 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -64.87 USD
  Expenses:Food:Restaurant                          64.87 USD

2025-03-13 balance Liabilities:US:Chase:Slate    -1672.48 USD

2025-03-14 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -34.68 USD
  Expenses:Food:Restaurant                          34.68 USD

2025-03-17 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-03-18 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -69.64 USD
  Expenses:Food:Restaurant                          69.64 USD

2025-03-19 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.96 USD
  Expenses:Food:Restaurant                          30.96 USD

2025-03-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -93.95 USD
  Expenses:Food:Groceries                           93.95 USD

2025-03-22 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -31.51 USD
  Expenses:Food:Restaurant                          31.51 USD

2025-03-23 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -28.39 USD
  Expenses:Food:Restaurant                          28.39 USD

2025-03-26 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -25.56 USD
  Expenses:Food:Restaurant                          25.56 USD

2025-03-27 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -52.28 USD
  Expenses:Food:Restaurant                          52.28 USD

2025-03-30 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -77.44 USD
  Expenses:Food:Groceries                           77.44 USD

2025-03-31 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -27.37 USD
  Expenses:Food:Restaurant                          27.37 USD

2025-04-04 balance Liabilities:US:Chase:Slate    -2264.26 USD

2025-04-04 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -12.78 USD
  Expenses:Food:Restaurant                          12.78 USD

2025-04-07 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -63.49 USD
  Expenses:Food:Restaurant                          63.49 USD

2025-04-09 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -40.91 USD
  Expenses:Food:Restaurant                          40.91 USD

2025-04-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       773.83 USD
  Assets:US:BofA:Checking                         -773.83 USD

2025-04-10 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -44.86 USD
  Expenses:Food:Groceries                           44.86 USD

2025-04-11 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -22.51 USD
  Expenses:Food:Restaurant                          22.51 USD

2025-04-15 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -21.12 USD
  Expenses:Food:Restaurant                          21.12 USD

2025-04-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-04-17 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -64.45 USD
  Expenses:Food:Restaurant                          64.45 USD

2025-04-18 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -23.83 USD
  Expenses:Food:Restaurant                          23.83 USD

2025-04-19 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -12.50 USD
  Expenses:Food:Restaurant                          12.50 USD

2025-04-21 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.14 USD
  Expenses:Food:Groceries                           99.14 USD

2025-04-24 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -18.16 USD
  Expenses:Food:Restaurant                          18.16 USD

2025-04-25 balance Liabilities:US:Chase:Slate    -2034.18 USD

2025-04-29 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -28.86 USD
  Expenses:Food:Restaurant                          28.86 USD

2025-05-01 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -98.56 USD
  Expenses:Food:Groceries                           98.56 USD

2025-05-02 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -18.81 USD
  Expenses:Food:Restaurant                          18.81 USD

2025-05-04 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -49.42 USD
  Expenses:Food:Restaurant                          49.42 USD

2025-05-05 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.04 USD
  Expenses:Food:Restaurant                          23.04 USD

2025-05-07 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -39.73 USD
  Expenses:Food:Restaurant                          39.73 USD

2025-05-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       684.99 USD
  Assets:US:BofA:Checking                         -684.99 USD

2025-05-10 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -45.33 USD
  Expenses:Food:Restaurant                          45.33 USD

2025-05-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.59 USD
  Expenses:Food:Groceries                           79.59 USD

2025-05-15 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.78 USD
  Expenses:Food:Restaurant                          21.78 USD

2025-05-18 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-05-19 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.09 USD
  Expenses:Food:Restaurant                          35.09 USD

2025-05-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -60.97 USD
  Expenses:Food:Groceries                           60.97 USD

2025-05-22 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -70.66 USD
  Expenses:Food:Restaurant                          70.66 USD

2025-05-23 balance Liabilities:US:Chase:Slate    -2041.03 USD

2025-05-24 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.99 USD
  Expenses:Food:Restaurant                          25.99 USD

2025-05-27 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -39.99 USD
  Expenses:Food:Restaurant                          39.99 USD

2025-05-28 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -28.50 USD
  Expenses:Food:Restaurant                          28.50 USD

2025-05-28 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.42 USD
  Expenses:Food:Groceries                           96.42 USD

2025-06-01 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -47.94 USD
  Expenses:Food:Restaurant                          47.94 USD

2025-06-02 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.18 USD
  Expenses:Food:Restaurant                          20.18 USD

2025-06-05 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -20.73 USD
  Expenses:Food:Restaurant                          20.73 USD

2025-06-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       745.01 USD
  Assets:US:BofA:Checking                         -745.01 USD

2025-06-09 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.84 USD
  Expenses:Food:Restaurant                          31.84 USD

2025-06-11 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -10.82 USD
  Expenses:Food:Restaurant                          10.82 USD

2025-06-15 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -22.35 USD
  Expenses:Food:Restaurant                          22.35 USD

2025-06-15 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -91.27 USD
  Expenses:Food:Groceries                           91.27 USD

2025-06-16 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -29.56 USD
  Expenses:Food:Restaurant                          29.56 USD

2025-06-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-06-17 balance Liabilities:US:Chase:Slate    -1881.61 USD

2025-06-19 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.35 USD
  Expenses:Food:Restaurant                          21.35 USD

2025-06-21 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -41.80 USD
  Expenses:Food:Restaurant                          41.80 USD

2025-06-22 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.57 USD
  Expenses:Food:Restaurant                          27.57 USD

2025-06-26 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -18.36 USD
  Expenses:Food:Restaurant                          18.36 USD

2025-06-26 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -61.05 USD
  Expenses:Food:Groceries                           61.05 USD

2025-06-29 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.93 USD
  Expenses:Food:Restaurant                          35.93 USD

2025-07-04 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -28.58 USD
  Expenses:Food:Restaurant                          28.58 USD

2025-07-06 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.83 USD
  Expenses:Food:Groceries                           79.83 USD

2025-07-07 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.40 USD
  Expenses:Food:Restaurant                          30.40 USD

2025-07-08 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -34.23 USD
  Expenses:Food:Restaurant                          34.23 USD

2025-07-09 balance Liabilities:US:Chase:Slate    -2260.71 USD

2025-07-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       677.90 USD
  Assets:US:BofA:Checking                         -677.90 USD

2025-07-11 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -24.80 USD
  Expenses:Food:Restaurant                          24.80 USD

2025-07-12 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -52.97 USD
  Expenses:Food:Restaurant                          52.97 USD

2025-07-15 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -34.43 USD
  Expenses:Food:Restaurant                          34.43 USD

2025-07-15 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-07-17 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -55.58 USD
  Expenses:Food:Restaurant                          55.58 USD

2025-07-21 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -33.85 USD
  Expenses:Food:Restaurant                          33.85 USD

2025-07-22 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.69 USD
  Expenses:Food:Restaurant                          22.69 USD

2025-07-23 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -22.54 USD
  Expenses:Food:Restaurant                          22.54 USD

2025-07-23 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -72.93 USD
  Expenses:Food:Groceries                           72.93 USD

2025-07-27 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.59 USD
  Expenses:Food:Restaurant                          20.59 USD

2025-07-29 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -21.83 USD
  Expenses:Food:Restaurant                          21.83 USD

2025-07-30 balance Liabilities:US:Chase:Slate    -2065.02 USD

2025-07-31 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -37.59 USD
  Expenses:Food:Restaurant                          37.59 USD

2025-07-31 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.03 USD
  Expenses:Food:Groceries                           99.03 USD

2025-08-05 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -24.44 USD
  Expenses:Food:Restaurant                          24.44 USD

2025-08-10 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.93 USD
  Expenses:Food:Restaurant                          25.93 USD

2025-08-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       745.75 USD
  Assets:US:BofA:Checking                         -745.75 USD

2025-08-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -101.35 USD
  Expenses:Food:Groceries                          101.35 USD

2025-08-15 event "location" "New York"

2025-08-16 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.16 USD
  Expenses:Food:Coffee                               6.16 USD

2025-08-17 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -38.61 USD
  Expenses:Food:Restaurant                          38.61 USD

2025-08-17 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -29.83 USD
  Expenses:Food:Restaurant                          29.83 USD

2025-08-19 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -42.14 USD
  Expenses:Food:Restaurant                          42.14 USD

2025-08-19 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -32.18 USD
  Expenses:Food:Restaurant                          32.18 USD

2025-08-19 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -9.61 USD
  Expenses:Food:Coffee                               9.61 USD

2025-08-20 balance Liabilities:US:Chase:Slate    -1766.14 USD

2025-08-21 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -27.32 USD
  Expenses:Food:Restaurant                          27.32 USD

2025-08-21 * "Laut" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.70 USD
  Expenses:Food:Restaurant                          36.70 USD

2025-08-21 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.95 USD
  Expenses:Food:Coffee                               5.95 USD

2025-08-22 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -44.65 USD
  Expenses:Food:Restaurant                          44.65 USD

2025-08-22 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -45.20 USD
  Expenses:Food:Restaurant                          45.20 USD

2025-08-23 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.91 USD
  Expenses:Food:Restaurant                          36.91 USD

2025-08-23 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.27 USD
  Expenses:Food:Coffee                               5.27 USD

2025-08-24 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -48.45 USD
  Expenses:Food:Restaurant                          48.45 USD

2025-08-24 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.20 USD
  Expenses:Food:Coffee                               6.20 USD

2025-08-25 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -40.21 USD
  Expenses:Food:Restaurant                          40.21 USD

2025-08-25 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -34.44 USD
  Expenses:Food:Restaurant                          34.44 USD

2025-08-25 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -56.03 USD
  Expenses:Food:Restaurant                          56.03 USD

2025-08-25 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.90 USD
  Expenses:Food:Coffee                               6.90 USD

2025-08-27 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -44.41 USD
  Expenses:Food:Restaurant                          44.41 USD

2025-08-27 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.23 USD
  Expenses:Food:Coffee                               6.23 USD

2025-08-28 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -25.86 USD
  Expenses:Food:Restaurant                          25.86 USD

2025-08-28 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.60 USD
  Expenses:Food:Coffee                               5.60 USD

2025-08-29 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.53 USD
  Expenses:Food:Restaurant                          36.53 USD

2025-08-30 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -42.11 USD
  Expenses:Food:Restaurant                          42.11 USD

2025-08-30 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -56.12 USD
  Expenses:Food:Restaurant                          56.12 USD

2025-08-31 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -51.26 USD
  Expenses:Food:Restaurant                          51.26 USD

2025-08-31 * "Laut" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.97 USD
  Expenses:Food:Restaurant                          36.97 USD

2025-09-01 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -136 VACHR
  Expenses:Vacation                                   136 VACHR

2025-09-01 event "location" "New Metropolis"

2025-09-02 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -30.95 USD
  Expenses:Food:Restaurant                          30.95 USD

2025-09-05 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -35.62 USD
  Expenses:Food:Restaurant                          35.62 USD

2025-09-05 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -151.18 USD
  Expenses:Food:Groceries                          151.18 USD

2025-09-06 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.42 USD
  Expenses:Food:Restaurant                          20.42 USD

2025-09-07 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -21.19 USD
  Expenses:Food:Restaurant                          21.19 USD

2025-09-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       321.58 USD
  Assets:US:BofA:Checking                         -321.58 USD

2025-09-11 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.22 USD
  Expenses:Food:Groceries                           62.22 USD

2025-09-12 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.68 USD
  Expenses:Food:Restaurant                          33.68 USD

2025-09-13 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-09-15 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.23 USD
  Expenses:Food:Restaurant                          26.23 USD

2025-09-17 balance Liabilities:US:Chase:Slate    -2645.37 USD

2025-09-17 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -43.08 USD
  Expenses:Food:Restaurant                          43.08 USD

2025-09-21 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -27.95 USD
  Expenses:Food:Restaurant                          27.95 USD

2025-09-25 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.34 USD
  Expenses:Food:Restaurant                          32.34 USD

2025-09-26 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -58.58 USD
  Expenses:Food:Groceries                           58.58 USD

2025-09-27 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -53.62 USD
  Expenses:Food:Restaurant                          53.62 USD

2025-09-30 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -24.86 USD
  Expenses:Food:Restaurant                          24.86 USD

2025-10-02 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -30.49 USD
  Expenses:Food:Restaurant                          30.49 USD

2025-10-06 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -46.38 USD
  Expenses:Food:Restaurant                          46.38 USD

2025-10-07 balance Liabilities:US:Chase:Slate    -2962.67 USD

2025-10-07 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.48 USD
  Expenses:Food:Restaurant                          30.48 USD

2025-10-09 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -41.89 USD
  Expenses:Food:Restaurant                          41.89 USD

2025-10-10 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -119.10 USD
  Expenses:Food:Groceries                          119.10 USD

2025-10-11 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -45.19 USD
  Expenses:Food:Restaurant                          45.19 USD



* Taxable Investments

2023-01-01 open Assets:US:ETrade:Cash                       USD
2023-01-01 open Assets:US:ETrade:ITOT                       ITOT
2023-01-01 open Assets:US:ETrade:VEA                       VEA
2023-01-01 open Assets:US:ETrade:VHT                       VHT
2023-01-01 open Assets:US:ETrade:GLD                       GLD
2023-01-01 open Income:US:ETrade:PnL                        USD
2023-01-01 open Income:US:ETrade:ITOT:Dividend              USD
2023-01-01 open Income:US:ETrade:VEA:Dividend              USD
2023-01-01 open Income:US:ETrade:VHT:Dividend              USD
2023-01-01 open Income:US:ETrade:GLD:Dividend              USD

2023-09-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                              0.00 USD
  Income:US:ETrade:VEA:Dividend                      0.00 USD

2023-10-22 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1274.85 USD
  Assets:US:ETrade:ITOT                                10 ITOT {126.59 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-10-22 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1298.81 USD
  Assets:US:ETrade:VEA                                 22 VEA {58.63 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-10-22 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1308.95 USD
  Assets:US:ETrade:VHT                                 26 VHT {50.00 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                           -635.50 USD
  Assets:US:ETrade:ITOT                                 5 ITOT {125.31 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                           -705.91 USD
  Assets:US:ETrade:VEA                                 11 VEA {63.36 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                           -659.65 USD
  Assets:US:ETrade:GLD                                  6 GLD {108.45 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                           -669.55 USD
  Assets:US:ETrade:VHT                                 15 VHT {44.04 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-17 * "Sell shares of VEA"
  Assets:US:ETrade:VEA                                -22 VEA {58.63 USD, 2023-10-22} @ 63.36 USD
  Assets:US:ETrade:Cash                           1384.97 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                            -104.06 USD

2023-12-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             25.96 USD
  Income:US:ETrade:GLD:Dividend                    -25.96 USD

2023-12-22 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -26 VHT {50.00 USD, 2023-10-22} @ 43.48 USD
  Assets:US:ETrade:Cash                           1121.53 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             169.52 USD

2023-12-26 * "Sell shares of VEA"
  Assets:US:ETrade:VEA                                -11 VEA {63.36 USD, 2023-12-16} @ 66.57 USD
  Assets:US:ETrade:Cash                            723.32 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             -35.31 USD

2024-01-01 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -3578.95 USD
  Assets:US:ETrade:VHT                                 85 VHT {42.00 USD, 2024-01-01}
  Expenses:Financial:Commissions                     8.95 USD

2024-03-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             40.24 USD
  Income:US:ETrade:VEA:Dividend                    -40.24 USD

2024-06-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             40.24 USD
  Income:US:ETrade:GLD:Dividend                    -40.24 USD

2024-07-05 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -85 VHT {42.00 USD, 2024-01-01} @ 41.09 USD
  Assets:US:ETrade:Cash                           3483.70 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              77.35 USD

2024-07-06 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1706.70 USD
  Assets:US:ETrade:VEA                                 25 VEA {67.91 USD, 2024-07-06}
  Expenses:Financial:Commissions                     8.95 USD

2024-07-06 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1697.49 USD
  Assets:US:ETrade:GLD                                 14 GLD {120.61 USD, 2024-07-06}
  Expenses:Financial:Commissions                     8.95 USD

2024-08-07 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -15 VHT {44.04 USD, 2023-12-16} @ 39.15 USD
  Assets:US:ETrade:Cash                            578.30 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              73.35 USD

2024-09-04 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -2276.05 USD
  Assets:US:ETrade:VEA                                 33 VEA {68.70 USD, 2024-09-04}
  Expenses:Financial:Commissions                     8.95 USD

2024-09-04 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -2191.45 USD
  Assets:US:ETrade:GLD                                 18 GLD {121.25 USD, 2024-09-04}
  Expenses:Financial:Commissions                     8.95 USD

2024-09-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             71.59 USD
  Income:US:ETrade:VEA:Dividend                    -71.59 USD

2024-10-30 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -4139.27 USD
  Assets:US:ETrade:GLD                                 34 GLD {121.48 USD, 2024-10-30}
  Expenses:Financial:Commissions                     8.95 USD

2024-12-03 * "Sell shares of ITOT"
  Assets:US:ETrade:ITOT                               -10 ITOT {126.59 USD, 2023-10-22} @ 115.63 USD
  Assets:US:ETrade:Cash                           1147.35 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             109.60 USD

2024-12-08 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1188.79 USD
  Assets:US:ETrade:VHT                                 24 VHT {49.16 USD, 2024-12-08}
  Expenses:Financial:Commissions                     8.95 USD

2024-12-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             92.83 USD
  Income:US:ETrade:VHT:Dividend                    -92.83 USD

2025-01-06 * "Sell shares of ITOT"
  Assets:US:ETrade:ITOT                                -5 ITOT {125.31 USD, 2023-12-16} @ 112.46 USD
  Assets:US:ETrade:Cash                            553.35 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              64.25 USD

2025-03-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             92.83 USD
  Income:US:ETrade:VHT:Dividend                    -92.83 USD

2025-04-11 * "Sell shares of GLD"
  Assets:US:ETrade:GLD                                -34 GLD {121.48 USD, 2024-10-30} @ 131.74 USD
  Assets:US:ETrade:Cash                           4470.21 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                            -348.84 USD

2025-04-28 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1672.00 USD
  Assets:US:ETrade:ITOT                                15 ITOT {110.87 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-04-28 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1708.63 USD
  Assets:US:ETrade:VEA                                 24 VEA {70.82 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-04-28 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1674.23 USD
  Assets:US:ETrade:VHT                                 32 VHT {52.04 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-06-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                            112.94 USD
  Income:US:ETrade:VEA:Dividend                   -112.94 USD

2025-08-18 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1076.18 USD
  Assets:US:ETrade:VHT                                 19 VHT {56.17 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1001.65 USD
  Assets:US:ETrade:ITOT                                 9 ITOT {110.30 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1058.35 USD
  Assets:US:ETrade:VEA                                 15 VEA {69.96 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1055.75 USD
  Assets:US:ETrade:GLD                                  8 GLD {130.85 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                            129.56 USD
  Income:US:ETrade:ITOT:Dividend                  -129.56 USD

2025-09-27 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1696.35 USD
  Assets:US:ETrade:GLD                                 13 GLD {129.80 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-27 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1704.55 USD
  Assets:US:ETrade:ITOT                                15 ITOT {113.04 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-27 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1665.43 USD
  Assets:US:ETrade:VHT                                 29 VHT {57.12 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD



* Vanguard Investments

2023-01-01 open Assets:US:Vanguard:VBMPX                     VBMPX
  number: "882882"
2023-01-01 open Assets:US:Vanguard:RGAGX                     RGAGX
  number: "882882"
2023-01-01 open Assets:US:Vanguard                            USD
  institution: "Vanguard Group"
  address: "P.O. Box 1110, Valley Forge, PA 19482-1110"
  phone: "+1.800.523.1188"
2023-01-01 open Income:US:Hooli:Match401k                   USD
2023-01-01 open Assets:US:Vanguard:Cash                       USD
  number: "882882"

2023-01-06 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-01-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.122 VBMPX {47.42 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-01-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.614 RGAGX {156.05 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -720.01 USD

2023-01-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.061 VBMPX {47.42 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -239.99 USD

2023-01-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.307 RGAGX {156.05 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -360.01 USD

2023-01-20 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-01-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.988 VBMPX {48.06 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -480.02 USD

2023-01-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.593 RGAGX {156.75 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -719.95 USD

2023-01-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.994 VBMPX {48.06 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -240.01 USD

2023-01-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.297 RGAGX {156.75 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -360.05 USD

2023-02-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-02-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.998 VBMPX {48.01 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-02-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.576 RGAGX {157.34 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -719.99 USD

2023-02-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.999 VBMPX {48.01 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-02-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.288 RGAGX {157.34 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -359.99 USD

2023-02-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-02-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.069 VBMPX {47.67 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-02-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.680 RGAGX {153.85 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -720.02 USD

2023-02-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.034 VBMPX {47.67 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -239.97 USD

2023-02-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.340 RGAGX {153.85 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -360.01 USD

2023-03-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-03-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.082 VBMPX {47.61 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-03-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.589 RGAGX {156.90 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -720.01 USD

2023-03-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.041 VBMPX {47.61 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-03-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.294 RGAGX {156.90 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -359.93 USD

2023-03-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-03-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.001 VBMPX {48.00 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -480.05 USD

2023-03-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.500 RGAGX {160.01 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-03-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.000 VBMPX {48.00 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-03-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.250 RGAGX {160.01 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -360.02 USD

2023-03-31 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-04-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.044 VBMPX {47.79 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-04-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.509 RGAGX {159.69 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-04-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.021 VBMPX {47.79 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -239.95 USD

2023-04-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.254 RGAGX {159.69 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -359.94 USD

2023-04-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-04-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.984 VBMPX {48.08 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -480.03 USD

2023-04-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.409 RGAGX {163.31 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -720.03 USD

2023-04-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.991 VBMPX {48.08 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -239.97 USD

2023-04-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.204 RGAGX {163.31 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -359.94 USD

2023-04-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.885 VBMPX {48.56 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -480.02 USD

2023-05-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.381 RGAGX {164.37 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -720.10 USD

2023-05-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.942 VBMPX {48.56 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -239.98 USD

2023-05-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.190 RGAGX {164.37 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -359.97 USD

2023-05-12 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.913 VBMPX {48.42 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-05-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.317 RGAGX {166.77 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -719.95 USD

2023-05-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.957 VBMPX {48.42 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -240.02 USD

2023-05-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.159 RGAGX {166.77 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -360.06 USD

2023-05-26 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.808 VBMPX {48.94 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-05-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.222 RGAGX {170.53 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -719.98 USD

2023-05-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.904 VBMPX {48.94 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-05-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.111 RGAGX {170.53 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -359.99 USD

2023-06-09 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-06-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.810 VBMPX {48.93 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-06-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.227 RGAGX {170.33 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -719.98 USD

2023-06-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.905 VBMPX {48.93 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-06-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.114 RGAGX {170.33 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -360.08 USD

2023-06-23 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-06-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.811 VBMPX {48.92 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -479.95 USD

2023-06-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.089 RGAGX {176.06 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -719.91 USD

2023-06-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.907 VBMPX {48.92 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -240.05 USD

2023-06-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.045 RGAGX {176.06 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -360.04 USD

2023-07-07 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-07-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.714 VBMPX {49.41 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -479.97 USD

2023-07-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.972 RGAGX {181.27 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -720.00 USD

2023-07-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.857 VBMPX {49.41 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -239.98 USD

2023-07-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.986 RGAGX {181.27 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -360.00 USD

2023-07-21 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-07-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.788 VBMPX {49.04 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-07-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.052 RGAGX {177.70 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-07-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.894 VBMPX {49.04 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-07-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.026 RGAGX {177.70 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -360.02 USD

2023-08-04 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2023-08-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.062 VBMPX {49.23 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -199.97 USD

2023-08-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.689 RGAGX {177.64 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -300.03 USD

2023-08-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          2.031 VBMPX {49.23 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                          -99.99 USD

2023-08-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.844 RGAGX {177.64 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -149.93 USD

2024-01-05 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-01-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.105 VBMPX {52.72 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -480.02 USD

2024-01-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.778 RGAGX {190.59 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -720.05 USD

2024-01-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.552 VBMPX {52.72 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -239.98 USD

2024-01-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.889 RGAGX {190.59 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -360.02 USD

2024-01-19 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-01-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.141 VBMPX {52.51 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -479.99 USD

2024-01-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.763 RGAGX {191.31 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -719.90 USD

2024-01-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.571 VBMPX {52.51 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -240.02 USD

2024-01-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.882 RGAGX {191.31 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -360.05 USD

2024-02-02 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-02-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.041 VBMPX {53.09 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -479.99 USD

2024-02-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.901 RGAGX {184.58 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -720.05 USD

2024-02-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.520 VBMPX {53.09 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-02-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.950 RGAGX {184.58 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -359.93 USD

2024-02-16 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-02-19 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.035 VBMPX {53.13 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -480.03 USD

2024-02-19 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.856 RGAGX {186.75 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -720.11 USD

2024-02-19 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.517 VBMPX {53.13 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -239.99 USD

2024-02-19 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.928 RGAGX {186.75 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -360.05 USD

2024-03-01 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-03-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.203 VBMPX {52.15 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -479.94 USD

2024-03-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.982 RGAGX {180.78 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -719.87 USD

2024-03-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.603 VBMPX {52.15 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -240.05 USD

2024-03-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.992 RGAGX {180.78 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -360.11 USD

2024-03-15 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-03-18 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.160 VBMPX {52.40 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -479.98 USD

2024-03-18 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.919 RGAGX {183.69 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -719.88 USD

2024-03-18 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.581 VBMPX {52.40 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -240.04 USD

2024-03-18 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.960 RGAGX {183.69 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -360.03 USD

2024-03-29 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.138 VBMPX {52.53 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -480.02 USD

2024-04-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.800 RGAGX {189.45 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -719.91 USD

2024-04-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.569 VBMPX {52.53 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -240.01 USD

2024-04-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.900 RGAGX {189.45 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -359.96 USD

2024-04-12 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.118 VBMPX {52.65 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -480.06 USD

2024-04-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.743 RGAGX {192.39 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -720.12 USD

2024-04-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.558 VBMPX {52.65 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -239.98 USD

2024-04-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.871 RGAGX {192.39 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -359.96 USD

2024-04-26 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.118 VBMPX {52.64 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -479.97 USD

2024-04-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.618 RGAGX {199.01 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -720.02 USD

2024-04-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.559 VBMPX {52.64 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -239.99 USD

2024-04-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.809 RGAGX {199.01 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -360.01 USD

2024-05-10 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-05-13 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.129 VBMPX {52.58 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -480.00 USD

2024-05-13 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.530 RGAGX {203.94 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -719.91 USD

2024-05-13 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.565 VBMPX {52.58 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -240.03 USD

2024-05-13 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.765 RGAGX {203.94 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -359.95 USD

2024-05-24 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-05-27 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.179 VBMPX {52.30 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -480.06 USD

2024-05-27 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.498 RGAGX {205.85 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -720.06 USD

2024-05-27 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.589 VBMPX {52.30 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -240.00 USD

2024-05-27 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.749 RGAGX {205.85 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -360.03 USD

2024-06-07 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-06-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.146 VBMPX {52.48 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -479.98 USD

2024-06-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.489 RGAGX {206.38 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -720.06 USD

2024-06-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.572 VBMPX {52.48 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -239.94 USD

2024-06-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.744 RGAGX {206.38 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -359.93 USD

2024-06-21 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-06-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.154 VBMPX {52.44 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -480.04 USD

2024-06-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.564 RGAGX {202.04 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -720.07 USD

2024-06-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.576 VBMPX {52.44 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-06-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.782 RGAGX {202.04 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -360.04 USD

2024-07-05 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-07-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.182 VBMPX {52.27 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -479.94 USD

2024-07-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.552 RGAGX {202.70 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -719.99 USD

2024-07-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.591 VBMPX {52.27 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-07-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.776 RGAGX {202.70 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -360.00 USD

2024-07-19 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-07-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.126 VBMPX {52.60 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -480.03 USD

2024-07-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.511 RGAGX {205.07 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -720.00 USD

2024-07-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.563 VBMPX {52.60 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -240.01 USD

2024-07-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.755 RGAGX {205.07 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -359.90 USD

2024-08-02 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2024-08-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.791 VBMPX {52.77 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -200.05 USD

2024-08-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.414 RGAGX {212.16 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -299.99 USD

2024-08-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          1.895 VBMPX {52.77 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -100.00 USD

2024-08-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.707 RGAGX {212.16 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -150.00 USD

2025-01-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-01-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.379 VBMPX {57.29 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -480.03 USD

2025-01-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.328 RGAGX {216.33 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -719.95 USD

2025-01-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.190 VBMPX {57.29 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -240.05 USD

2025-01-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.664 RGAGX {216.33 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -359.97 USD

2025-01-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-01-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.259 VBMPX {58.12 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -480.01 USD

2025-01-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.273 RGAGX {219.98 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -719.99 USD

2025-01-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.130 VBMPX {58.12 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -240.04 USD

2025-01-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.637 RGAGX {219.98 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -360.11 USD

2025-01-31 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-02-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.245 VBMPX {58.21 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -479.94 USD

2025-02-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.229 RGAGX {222.97 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-02-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.123 VBMPX {58.21 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -240.00 USD

2025-02-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.615 RGAGX {222.97 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -360.10 USD

2025-02-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-02-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.156 VBMPX {58.85 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-02-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.115 RGAGX {231.12 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -719.94 USD

2025-02-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.078 VBMPX {58.85 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -239.99 USD

2025-02-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.558 RGAGX {231.12 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -360.08 USD

2025-02-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.009 VBMPX {59.93 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-03-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.136 RGAGX {229.60 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -720.03 USD

2025-03-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.004 VBMPX {59.93 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-03-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.568 RGAGX {229.60 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -360.01 USD

2025-03-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.001 VBMPX {59.99 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-03-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.224 RGAGX {223.34 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -720.05 USD

2025-03-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.000 VBMPX {59.99 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-03-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.612 RGAGX {223.34 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -360.02 USD

2025-03-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-31 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.902 VBMPX {60.74 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-03-31 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.212 RGAGX {224.16 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -720.00 USD

2025-03-31 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.951 VBMPX {60.74 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -239.98 USD

2025-03-31 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.606 RGAGX {224.16 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -360.00 USD

2025-04-11 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-04-14 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.871 VBMPX {60.98 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-04-14 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.232 RGAGX {222.76 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -719.96 USD

2025-04-14 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.936 VBMPX {60.98 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -240.02 USD

2025-04-14 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.616 RGAGX {222.76 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -359.98 USD

2025-04-25 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-04-28 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.765 VBMPX {61.82 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -480.03 USD

2025-04-28 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.201 RGAGX {224.92 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-04-28 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.882 VBMPX {61.82 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -239.99 USD

2025-04-28 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.601 RGAGX {224.92 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -360.10 USD

2025-05-09 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-05-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.688 VBMPX {62.43 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -479.96 USD

2025-05-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.260 RGAGX {220.85 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-05-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.844 VBMPX {62.43 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -239.98 USD

2025-05-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.630 RGAGX {220.85 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -359.99 USD

2025-05-23 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-05-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.711 VBMPX {62.25 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -480.01 USD

2025-05-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.321 RGAGX {216.78 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -719.93 USD

2025-05-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.856 VBMPX {62.25 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -240.04 USD

2025-05-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.661 RGAGX {216.78 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -360.07 USD

2025-06-06 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-06-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.698 VBMPX {62.35 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-06-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.299 RGAGX {218.23 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -719.94 USD

2025-06-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.850 VBMPX {62.35 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -240.05 USD

2025-06-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.650 RGAGX {218.23 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -360.08 USD

2025-06-20 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-06-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.683 VBMPX {62.47 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -479.96 USD

2025-06-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.339 RGAGX {215.60 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -719.89 USD

2025-06-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.842 VBMPX {62.47 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -240.01 USD

2025-06-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.670 RGAGX {215.60 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -360.05 USD

2025-07-04 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-07-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.616 VBMPX {63.03 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -480.04 USD

2025-07-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.318 RGAGX {217.02 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -720.07 USD

2025-07-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.807 VBMPX {63.03 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-07-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.659 RGAGX {217.02 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -360.04 USD

2025-07-18 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-07-21 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.673 VBMPX {62.55 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -479.95 USD

2025-07-21 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.252 RGAGX {221.38 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -719.93 USD

2025-07-21 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.837 VBMPX {62.55 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -240.00 USD

2025-07-21 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.626 RGAGX {221.38 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -359.96 USD

2025-08-01 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2025-08-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.205 VBMPX {62.41 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -200.02 USD

2025-08-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.321 RGAGX {227.19 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -300.12 USD

2025-08-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          1.602 VBMPX {62.41 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                          -99.98 USD

2025-08-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.660 RGAGX {227.19 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -149.95 USD



* Sources of Income

2023-01-01 open Income:US:Hooli:Salary                      USD
2023-01-01 open Income:US:Hooli:GroupTermLife               USD
2023-01-01 open Income:US:Hooli:Vacation                    VACHR
2023-01-01 open Assets:US:Hooli:Vacation                    VACHR
2023-01-01 open Expenses:Vacation                               VACHR
2023-01-01 open Expenses:Health:Life:GroupTermLife
2023-01-01 open Expenses:Health:Medical:Insurance
2023-01-01 open Expenses:Health:Dental:Insurance
2023-01-01 open Expenses:Health:Vision:Insurance

2023-01-01 event "employer" "Hooli, 1 Carloston Rd, Mountain Beer, CA"

2023-01-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-01-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-02-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-02-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-30 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-04-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-04-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-05-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-05-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-06-08 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-06-22 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-07-06 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-07-20 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-03 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-17 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-31 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-09-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-09-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-10-12 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-10-26 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-11-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-11-23 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-12-07 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2589.06 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   243.08 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-12-21 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2832.14 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                     0.00 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-01-04 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-01-18 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-01 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-15 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-29 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-03-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-03-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-04-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-04-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-05-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-05-23 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-06-06 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-06-20 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-07-04 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-07-18 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-01 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-15 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-29 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-09-12 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-09-26 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-10-10 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-10-24 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-11-07 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-11-21 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-12-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2589.06 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   243.08 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-12-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2832.14 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                     0.00 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-30 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-02-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-02-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-03-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-03-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-04-10 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-04-24 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-05-08 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-05-22 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-06-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-06-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-03 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-17 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-31 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-08-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-08-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-09-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-09-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-10-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR



* Taxes

1980-05-12 open Income:US:Federal:PreTax401k                    IRAUSD
1980-05-12 open Assets:US:Federal:PreTax401k                    IRAUSD



** Tax Year 2023

2023-01-01 open Expenses:Taxes:Y2023:US:Federal:PreTax401k      IRAUSD
2023-01-01 open Expenses:Taxes:Y2023:US:Medicare                USD
2023-01-01 open Expenses:Taxes:Y2023:US:Federal                 USD
2023-01-01 open Expenses:Taxes:Y2023:US:CityNYC                 USD
2023-01-01 open Expenses:Taxes:Y2023:US:SDI                     USD
2023-01-01 open Expenses:Taxes:Y2023:US:State                   USD
2023-01-01 open Expenses:Taxes:Y2023:US:SocSec                  USD

2023-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2023-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD

2024-03-21 * "Filing taxes for 2023"
  Expenses:Taxes:Y2023:US:Federal                  439.85 USD
  Expenses:Taxes:Y2023:US:State                    167.16 USD
  Liabilities:AccountsPayable                     -607.01 USD

2024-03-21 * "STATE TAX & FINANC PYMT"
  Assets:US:BofA:Checking                         -167.16 USD
  Liabilities:AccountsPayable                      167.16 USD

2024-03-24 * "FEDERAL TAXPYMT"
  Assets:US:BofA:Checking                         -439.85 USD
  Liabilities:AccountsPayable                      439.85 USD



** Tax Year 2024

2024-01-01 open Expenses:Taxes:Y2024:US:Federal:PreTax401k      IRAUSD
2024-01-01 open Expenses:Taxes:Y2024:US:Medicare                USD
2024-01-01 open Expenses:Taxes:Y2024:US:Federal                 USD
2024-01-01 open Expenses:Taxes:Y2024:US:CityNYC                 USD
2024-01-01 open Expenses:Taxes:Y2024:US:SDI                     USD
2024-01-01 open Expenses:Taxes:Y2024:US:State                   USD
2024-01-01 open Expenses:Taxes:Y2024:US:SocSec                  USD

2024-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2024-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD

2025-03-25 * "Filing taxes for 2024"
  Expenses:Taxes:Y2024:US:Federal                  467.37 USD
  Expenses:Taxes:Y2024:US:State                    376.14 USD
  Liabilities:AccountsPayable                     -843.51 USD

2025-03-25 * "STATE TAX & FINANC PYMT"
  Assets:US:BofA:Checking                         -376.14 USD
  Liabilities:AccountsPayable                      376.14 USD

2025-03-27 * "FEDERAL TAXPYMT"
  Assets:US:BofA:Checking                         -467.37 USD
  Liabilities:AccountsPayable                      467.37 USD



** Tax Year 2025

2025-01-01 open Expenses:Taxes:Y2025:US:Federal:PreTax401k      IRAUSD
2025-01-01 open Expenses:Taxes:Y2025:US:Medicare                USD
2025-01-01 open Expenses:Taxes:Y2025:US:Federal                 USD
2025-01-01 open Expenses:Taxes:Y2025:US:CityNYC                 USD
2025-01-01 open Expenses:Taxes:Y2025:US:SDI                     USD
2025-01-01 open Expenses:Taxes:Y2025:US:State                   USD
2025-01-01 open Expenses:Taxes:Y2025:US:SocSec                  USD

2025-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2025-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD



* Expenses

1980-05-12 open Expenses:Food:Groceries
1980-05-12 open Expenses:Food:Restaurant
1980-05-12 open Expenses:Food:Coffee
1980-05-12 open Expenses:Food:Alcohol
1980-05-12 open Expenses:Transport:Tram
1980-05-12 open Expenses:Home:Rent
1980-05-12 open Expenses:Home:Electricity
1980-05-12 open Expenses:Home:Internet
1980-05-12 open Expenses:Home:Phone
1980-05-12 open Expenses:Financial:Fees
1980-05-12 open Expenses:Financial:Commissions

`,
  "prices.bean": `
* Prices

2023-01-06 price VBMPX                              47.42 USD
2023-01-06 price RGAGX                             156.05 USD
2023-01-06 price ITOT                              123.64 USD
2023-01-06 price VEA                                55.80 USD
2023-01-06 price VHT                                45.24 USD
2023-01-06 price GLD                                96.26 USD
2023-01-13 price VBMPX                              47.64 USD
2023-01-13 price RGAGX                             157.74 USD
2023-01-13 price ITOT                              125.51 USD
2023-01-13 price VEA                                56.58 USD
2023-01-13 price VHT                                43.68 USD
2023-01-13 price GLD                                97.17 USD
2023-01-20 price VBMPX                              48.06 USD
2023-01-20 price RGAGX                             156.75 USD
2023-01-20 price ITOT                              123.87 USD
2023-01-20 price VEA                                57.76 USD
2023-01-20 price VHT                                41.73 USD
2023-01-20 price GLD                                97.53 USD
2023-01-27 price VBMPX                              47.99 USD
2023-01-27 price RGAGX                             156.58 USD
2023-01-27 price ITOT                              125.43 USD
2023-01-27 price VEA                                55.34 USD
2023-01-27 price VHT                                41.78 USD
2023-01-27 price GLD                                98.64 USD
2023-02-03 price VBMPX                              48.01 USD
2023-02-03 price RGAGX                             157.34 USD
2023-02-03 price ITOT                              125.38 USD
2023-02-03 price VEA                                55.13 USD
2023-02-03 price VHT                                41.07 USD
2023-02-03 price GLD                                99.21 USD
2023-02-10 price VBMPX                              47.74 USD
2023-02-10 price RGAGX                             154.62 USD
2023-02-10 price ITOT                              122.46 USD
2023-02-10 price VEA                                54.65 USD
2023-02-10 price VHT                                40.41 USD
2023-02-10 price GLD                                99.87 USD
2023-02-17 price VBMPX                              47.67 USD
2023-02-17 price RGAGX                             153.85 USD
2023-02-17 price ITOT                              123.81 USD
2023-02-17 price VEA                                55.78 USD
2023-02-17 price VHT                                40.94 USD
2023-02-17 price GLD                               100.96 USD
2023-02-24 price VBMPX                              47.61 USD
2023-02-24 price RGAGX                             153.68 USD
2023-02-24 price ITOT                              123.11 USD
2023-02-24 price VEA                                58.06 USD
2023-02-24 price VHT                                41.11 USD
2023-02-24 price GLD                               100.37 USD
2023-03-03 price VBMPX                              47.61 USD
2023-03-03 price RGAGX                             156.90 USD
2023-03-03 price ITOT                              121.47 USD
2023-03-03 price VEA                                60.07 USD
2023-03-03 price VHT                                42.25 USD
2023-03-03 price GLD                                99.56 USD
2023-03-10 price VBMPX                              47.94 USD
2023-03-10 price RGAGX                             160.27 USD
2023-03-10 price ITOT                              124.97 USD
2023-03-10 price VEA                                60.46 USD
2023-03-10 price VHT                                41.86 USD
2023-03-10 price GLD                                99.14 USD
2023-03-17 price VBMPX                              48.00 USD
2023-03-17 price RGAGX                             160.01 USD
2023-03-17 price ITOT                              123.76 USD
2023-03-17 price VEA                                60.43 USD
2023-03-17 price VHT                                41.86 USD
2023-03-17 price GLD                                99.60 USD
2023-03-24 price VBMPX                              48.07 USD
2023-03-24 price RGAGX                             159.58 USD
2023-03-24 price ITOT                              126.05 USD
2023-03-24 price VEA                                59.21 USD
2023-03-24 price VHT                                42.80 USD
2023-03-24 price GLD                               100.78 USD
2023-03-31 price VBMPX                              47.79 USD
2023-03-31 price RGAGX                             159.69 USD
2023-03-31 price ITOT                              126.66 USD
2023-03-31 price VEA                                58.81 USD
2023-03-31 price VHT                                42.85 USD
2023-03-31 price GLD                               101.58 USD
2023-04-07 price VBMPX                              48.30 USD
2023-04-07 price RGAGX                             162.28 USD
2023-04-07 price ITOT                              127.72 USD
2023-04-07 price VEA                                59.61 USD
2023-04-07 price VHT                                43.49 USD
2023-04-07 price GLD                               101.93 USD
2023-04-14 price VBMPX                              48.08 USD
2023-04-14 price RGAGX                             163.31 USD
2023-04-14 price ITOT                              128.12 USD
2023-04-14 price VEA                                61.04 USD
2023-04-14 price VHT                                43.32 USD
2023-04-14 price GLD                               102.48 USD
2023-04-21 price VBMPX                              48.28 USD
2023-04-21 price RGAGX                             164.28 USD
2023-04-21 price ITOT                              126.94 USD
2023-04-21 price VEA                                60.93 USD
2023-04-21 price VHT                                43.71 USD
2023-04-21 price GLD                               102.03 USD
2023-04-28 price VBMPX                              48.56 USD
2023-04-28 price RGAGX                             164.37 USD
2023-04-28 price ITOT                              125.10 USD
2023-04-28 price VEA                                60.93 USD
2023-04-28 price VHT                                42.51 USD
2023-04-28 price GLD                               103.35 USD
2023-05-05 price VBMPX                              48.73 USD
2023-05-05 price RGAGX                             163.17 USD
2023-05-05 price ITOT                              125.93 USD
2023-05-05 price VEA                                60.15 USD
2023-05-05 price VHT                                43.67 USD
2023-05-05 price GLD                               102.77 USD
2023-05-12 price VBMPX                              48.42 USD
2023-05-12 price RGAGX                             166.77 USD
2023-05-12 price ITOT                              123.15 USD
2023-05-12 price VEA                                60.52 USD
2023-05-12 price VHT                                43.67 USD
2023-05-12 price GLD                               103.90 USD
2023-05-19 price VBMPX                              48.25 USD
2023-05-19 price RGAGX                             171.12 USD
2023-05-19 price ITOT                              121.64 USD
2023-05-19 price VEA                                60.74 USD
2023-05-19 price VHT                                44.19 USD
2023-05-19 price GLD                               104.13 USD
2023-05-26 price VBMPX                              48.94 USD
2023-05-26 price RGAGX                             170.53 USD
2023-05-26 price ITOT                              122.42 USD
2023-05-26 price VEA                                60.18 USD
2023-05-26 price VHT                                44.54 USD
2023-05-26 price GLD                               104.06 USD
2023-06-02 price VBMPX                              48.73 USD
2023-06-02 price RGAGX                             173.13 USD
2023-06-02 price ITOT                              122.31 USD
2023-06-02 price VEA                                60.76 USD
2023-06-02 price VHT                                45.90 USD
2023-06-02 price GLD                               103.93 USD
2023-06-09 price VBMPX                              48.93 USD
2023-06-09 price RGAGX                             170.33 USD
2023-06-09 price ITOT                              124.05 USD
2023-06-09 price VEA                                60.24 USD
2023-06-09 price VHT                                46.19 USD
2023-06-09 price GLD                               103.87 USD
2023-06-16 price VBMPX                              48.72 USD
2023-06-16 price RGAGX                             172.16 USD
2023-06-16 price ITOT                              125.18 USD
2023-06-16 price VEA                                59.51 USD
2023-06-16 price VHT                                48.21 USD
2023-06-16 price GLD                               105.13 USD
2023-06-23 price VBMPX                              48.92 USD
2023-06-23 price RGAGX                             176.06 USD
2023-06-23 price ITOT                              127.18 USD
2023-06-23 price VEA                                58.55 USD
2023-06-23 price VHT                                48.29 USD
2023-06-23 price GLD                               106.45 USD
2023-06-30 price VBMPX                              49.39 USD
2023-06-30 price RGAGX                             176.46 USD
2023-06-30 price ITOT                              126.20 USD
2023-06-30 price VEA                                60.10 USD
2023-06-30 price VHT                                48.79 USD
2023-06-30 price GLD                               106.04 USD
2023-07-07 price VBMPX                              49.41 USD
2023-07-07 price RGAGX                             181.27 USD
2023-07-07 price ITOT                              129.12 USD
2023-07-07 price VEA                                60.93 USD
2023-07-07 price VHT                                48.18 USD
2023-07-07 price GLD                               106.16 USD
2023-07-14 price VBMPX                              49.16 USD
2023-07-14 price RGAGX                             179.91 USD
2023-07-14 price ITOT                              128.53 USD
2023-07-14 price VEA                                60.64 USD
2023-07-14 price VHT                                46.44 USD
2023-07-14 price GLD                               106.59 USD
2023-07-21 price VBMPX                              49.04 USD
2023-07-21 price RGAGX                             177.70 USD
2023-07-21 price ITOT                              127.01 USD
2023-07-21 price VEA                                58.96 USD
2023-07-21 price VHT                                45.39 USD
2023-07-21 price GLD                               106.18 USD
2023-07-28 price VBMPX                              49.31 USD
2023-07-28 price RGAGX                             177.37 USD
2023-07-28 price ITOT                              126.18 USD
2023-07-28 price VEA                                57.90 USD
2023-07-28 price VHT                                44.20 USD
2023-07-28 price GLD                               105.84 USD
2023-08-04 price VBMPX                              49.23 USD
2023-08-04 price RGAGX                             177.64 USD
2023-08-04 price ITOT                              127.20 USD
2023-08-04 price VEA                                59.05 USD
2023-08-04 price VHT                                46.04 USD
2023-08-04 price GLD                               107.31 USD
2023-08-11 price VBMPX                              49.91 USD
2023-08-11 price RGAGX                             176.65 USD
2023-08-11 price ITOT                              125.56 USD
2023-08-11 price VEA                                59.76 USD
2023-08-11 price VHT                                45.97 USD
2023-08-11 price GLD                               107.58 USD
2023-08-18 price VBMPX                              50.19 USD
2023-08-18 price RGAGX                             176.39 USD
2023-08-18 price ITOT                              121.73 USD
2023-08-18 price VEA                                59.27 USD
2023-08-18 price VHT                                46.80 USD
2023-08-18 price GLD                               106.29 USD
2023-08-25 price VBMPX                              50.93 USD
2023-08-25 price RGAGX                             177.36 USD
2023-08-25 price ITOT                              121.13 USD
2023-08-25 price VEA                                60.04 USD
2023-08-25 price VHT                                47.91 USD
2023-08-25 price GLD                               107.17 USD
2023-09-01 price VBMPX                              51.04 USD
2023-09-01 price RGAGX                             176.04 USD
2023-09-01 price ITOT                              122.96 USD
2023-09-01 price VEA                                58.66 USD
2023-09-01 price VHT                                48.30 USD
2023-09-01 price GLD                               106.59 USD
2023-09-08 price VBMPX                              51.08 USD
2023-09-08 price RGAGX                             173.90 USD
2023-09-08 price ITOT                              124.54 USD
2023-09-08 price VEA                                59.71 USD
2023-09-08 price VHT                                48.10 USD
2023-09-08 price GLD                               108.42 USD
2023-09-15 price VBMPX                              51.71 USD
2023-09-15 price RGAGX                             173.03 USD
2023-09-15 price ITOT                              123.96 USD
2023-09-15 price VEA                                61.26 USD
2023-09-15 price VHT                                48.65 USD
2023-09-15 price GLD                               108.91 USD
2023-09-22 price VBMPX                              51.91 USD
2023-09-22 price RGAGX                             174.64 USD
2023-09-22 price ITOT                              125.70 USD
2023-09-22 price VEA                                62.04 USD
2023-09-22 price VHT                                49.33 USD
2023-09-22 price GLD                               110.03 USD
2023-09-29 price VBMPX                              52.08 USD
2023-09-29 price RGAGX                             178.57 USD
2023-09-29 price ITOT                              128.09 USD
2023-09-29 price VEA                                61.41 USD
2023-09-29 price VHT                                50.14 USD
2023-09-29 price GLD                               109.93 USD
2023-10-06 price VBMPX                              51.76 USD
2023-10-06 price RGAGX                             176.15 USD
2023-10-06 price ITOT                              126.90 USD
2023-10-06 price VEA                                59.23 USD
2023-10-06 price VHT                                50.69 USD
2023-10-06 price GLD                               108.76 USD
2023-10-13 price VBMPX                              52.04 USD
2023-10-13 price RGAGX                             181.95 USD
2023-10-13 price ITOT                              127.83 USD
2023-10-13 price VEA                                58.29 USD
2023-10-13 price VHT                                49.78 USD
2023-10-13 price GLD                               107.56 USD
2023-10-20 price VBMPX                              51.76 USD
2023-10-20 price RGAGX                             185.56 USD
2023-10-20 price ITOT                              126.59 USD
2023-10-20 price VEA                                58.63 USD
2023-10-20 price VHT                                50.00 USD
2023-10-20 price GLD                               108.77 USD
2023-10-27 price VBMPX                              51.98 USD
2023-10-27 price RGAGX                             187.85 USD
2023-10-27 price ITOT                              127.87 USD
2023-10-27 price VEA                                59.08 USD
2023-10-27 price VHT                                47.92 USD
2023-10-27 price GLD                               108.91 USD
2023-11-03 price VBMPX                              52.07 USD
2023-11-03 price RGAGX                             189.69 USD
2023-11-03 price ITOT                              130.56 USD
2023-11-03 price VEA                                59.83 USD
2023-11-03 price VHT                                49.12 USD
2023-11-03 price GLD                               107.44 USD
2023-11-10 price VBMPX                              52.38 USD
2023-11-10 price RGAGX                             190.86 USD
2023-11-10 price ITOT                              131.93 USD
2023-11-10 price VEA                                61.01 USD
2023-11-10 price VHT                                48.27 USD
2023-11-10 price GLD                               107.36 USD
2023-11-17 price VBMPX                              52.24 USD
2023-11-17 price RGAGX                             191.09 USD
2023-11-17 price ITOT                              129.48 USD
2023-11-17 price VEA                                60.53 USD
2023-11-17 price VHT                                47.71 USD
2023-11-17 price GLD                               106.79 USD
2023-11-24 price VBMPX                              52.53 USD
2023-11-24 price RGAGX                             188.43 USD
2023-11-24 price ITOT                              130.13 USD
2023-11-24 price VEA                                61.27 USD
2023-11-24 price VHT                                46.48 USD
2023-11-24 price GLD                               106.29 USD
2023-12-01 price VBMPX                              52.43 USD
2023-12-01 price RGAGX                             190.57 USD
2023-12-01 price ITOT                              132.11 USD
2023-12-01 price VEA                                61.13 USD
2023-12-01 price VHT                                46.80 USD
2023-12-01 price GLD                               107.21 USD
2023-12-08 price VBMPX                              52.58 USD
2023-12-08 price RGAGX                             186.97 USD
2023-12-08 price ITOT                              129.55 USD
2023-12-08 price VEA                                61.95 USD
2023-12-08 price VHT                                45.54 USD
2023-12-08 price GLD                               107.78 USD
2023-12-15 price VBMPX                              52.81 USD
2023-12-15 price RGAGX                             188.71 USD
2023-12-15 price ITOT                              125.31 USD
2023-12-15 price VEA                                63.36 USD
2023-12-15 price VHT                                44.04 USD
2023-12-15 price GLD                               108.45 USD
2023-12-22 price VBMPX                              52.75 USD
2023-12-22 price RGAGX                             191.03 USD
2023-12-22 price ITOT                              126.65 USD
2023-12-22 price VEA                                66.57 USD
2023-12-22 price VHT                                43.48 USD
2023-12-22 price GLD                               109.10 USD
2023-12-29 price VBMPX                              52.89 USD
2023-12-29 price RGAGX                             194.06 USD
2023-12-29 price ITOT                              129.32 USD
2023-12-29 price VEA                                66.23 USD
2023-12-29 price VHT                                42.00 USD
2023-12-29 price GLD                               109.88 USD
2024-01-05 price VBMPX                              52.72 USD
2024-01-05 price RGAGX                             190.59 USD
2024-01-05 price ITOT                              129.20 USD
2024-01-05 price VEA                                65.93 USD
2024-01-05 price VHT                                41.49 USD
2024-01-05 price GLD                               109.97 USD
2024-01-12 price VBMPX                              52.25 USD
2024-01-12 price RGAGX                             189.41 USD
2024-01-12 price ITOT                              129.34 USD
2024-01-12 price VEA                                67.97 USD
2024-01-12 price VHT                                42.55 USD
2024-01-12 price GLD                               109.75 USD
2024-01-19 price VBMPX                              52.51 USD
2024-01-19 price RGAGX                             191.31 USD
2024-01-19 price ITOT                              126.55 USD
2024-01-19 price VEA                                68.55 USD
2024-01-19 price VHT                                41.99 USD
2024-01-19 price GLD                               109.73 USD
2024-01-26 price VBMPX                              53.01 USD
2024-01-26 price RGAGX                             184.67 USD
2024-01-26 price ITOT                              124.70 USD
2024-01-26 price VEA                                68.82 USD
2024-01-26 price VHT                                41.03 USD
2024-01-26 price GLD                               109.10 USD
2024-02-02 price VBMPX                              53.09 USD
2024-02-02 price RGAGX                             184.58 USD
2024-02-02 price ITOT                              124.24 USD
2024-02-02 price VEA                                68.65 USD
2024-02-02 price VHT                                42.10 USD
2024-02-02 price GLD                               109.33 USD
2024-02-09 price VBMPX                              53.05 USD
2024-02-09 price RGAGX                             185.91 USD
2024-02-09 price ITOT                              121.27 USD
2024-02-09 price VEA                                69.94 USD
2024-02-09 price VHT                                41.26 USD
2024-02-09 price GLD                               111.21 USD
2024-02-16 price VBMPX                              53.13 USD
2024-02-16 price RGAGX                             186.75 USD
2024-02-16 price ITOT                              122.22 USD
2024-02-16 price VEA                                69.04 USD
2024-02-16 price VHT                                41.48 USD
2024-02-16 price GLD                               111.80 USD
2024-02-23 price VBMPX                              52.37 USD
2024-02-23 price RGAGX                             185.92 USD
2024-02-23 price ITOT                              121.14 USD
2024-02-23 price VEA                                69.51 USD
2024-02-23 price VHT                                41.74 USD
2024-02-23 price GLD                               112.77 USD
2024-03-01 price VBMPX                              52.15 USD
2024-03-01 price RGAGX                             180.78 USD
2024-03-01 price ITOT                              118.84 USD
2024-03-01 price VEA                                68.35 USD
2024-03-01 price VHT                                42.22 USD
2024-03-01 price GLD                               111.07 USD
2024-03-08 price VBMPX                              52.38 USD
2024-03-08 price RGAGX                             181.83 USD
2024-03-08 price ITOT                              122.47 USD
2024-03-08 price VEA                                68.22 USD
2024-03-08 price VHT                                42.75 USD
2024-03-08 price GLD                               111.47 USD
2024-03-15 price VBMPX                              52.40 USD
2024-03-15 price RGAGX                             183.69 USD
2024-03-15 price ITOT                              120.56 USD
2024-03-15 price VEA                                66.21 USD
2024-03-15 price VHT                                41.50 USD
2024-03-15 price GLD                               112.20 USD
2024-03-22 price VBMPX                              52.49 USD
2024-03-22 price RGAGX                             185.58 USD
2024-03-22 price ITOT                              123.73 USD
2024-03-22 price VEA                                68.05 USD
2024-03-22 price VHT                                40.84 USD
2024-03-22 price GLD                               112.79 USD
2024-03-29 price VBMPX                              52.53 USD
2024-03-29 price RGAGX                             189.45 USD
2024-03-29 price ITOT                              124.37 USD
2024-03-29 price VEA                                66.77 USD
2024-03-29 price VHT                                39.97 USD
2024-03-29 price GLD                               113.53 USD
2024-04-05 price VBMPX                              52.18 USD
2024-04-05 price RGAGX                             188.85 USD
2024-04-05 price ITOT                              127.06 USD
2024-04-05 price VEA                                65.32 USD
2024-04-05 price VHT                                39.13 USD
2024-04-05 price GLD                               115.54 USD
2024-04-12 price VBMPX                              52.65 USD
2024-04-12 price RGAGX                             192.39 USD
2024-04-12 price ITOT                              126.61 USD
2024-04-12 price VEA                                66.21 USD
2024-04-12 price VHT                                38.76 USD
2024-04-12 price GLD                               115.55 USD
2024-04-19 price VBMPX                              52.41 USD
2024-04-19 price RGAGX                             195.10 USD
2024-04-19 price ITOT                              125.01 USD
2024-04-19 price VEA                                66.14 USD
2024-04-19 price VHT                                38.61 USD
2024-04-19 price GLD                               115.06 USD
2024-04-26 price VBMPX                              52.64 USD
2024-04-26 price RGAGX                             199.01 USD
2024-04-26 price ITOT                              126.35 USD
2024-04-26 price VEA                                65.22 USD
2024-04-26 price VHT                                38.75 USD
2024-04-26 price GLD                               116.79 USD
2024-05-03 price VBMPX                              52.41 USD
2024-05-03 price RGAGX                             199.93 USD
2024-05-03 price ITOT                              129.05 USD
2024-05-03 price VEA                                67.01 USD
2024-05-03 price VHT                                38.80 USD
2024-05-03 price GLD                               116.31 USD
2024-05-10 price VBMPX                              52.58 USD
2024-05-10 price RGAGX                             203.94 USD
2024-05-10 price ITOT                              131.22 USD
2024-05-10 price VEA                                67.18 USD
2024-05-10 price VHT                                39.07 USD
2024-05-10 price GLD                               115.89 USD
2024-05-17 price VBMPX                              52.36 USD
2024-05-17 price RGAGX                             205.45 USD
2024-05-17 price ITOT                              131.41 USD
2024-05-17 price VEA                                68.97 USD
2024-05-17 price VHT                                38.53 USD
2024-05-17 price GLD                               117.44 USD
2024-05-24 price VBMPX                              52.30 USD
2024-05-24 price RGAGX                             205.85 USD
2024-05-24 price ITOT                              131.92 USD
2024-05-24 price VEA                                68.96 USD
2024-05-24 price VHT                                38.46 USD
2024-05-24 price GLD                               117.47 USD
2024-05-31 price VBMPX                              52.75 USD
2024-05-31 price RGAGX                             208.51 USD
2024-05-31 price ITOT                              131.51 USD
2024-05-31 price VEA                                70.42 USD
2024-05-31 price VHT                                38.81 USD
2024-05-31 price GLD                               117.45 USD
2024-06-07 price VBMPX                              52.48 USD
2024-06-07 price RGAGX                             206.38 USD
2024-06-07 price ITOT                              128.71 USD
2024-06-07 price VEA                                69.10 USD
2024-06-07 price VHT                                39.69 USD
2024-06-07 price GLD                               118.90 USD
2024-06-14 price VBMPX                              52.55 USD
2024-06-14 price RGAGX                             203.95 USD
2024-06-14 price ITOT                              126.33 USD
2024-06-14 price VEA                                67.39 USD
2024-06-14 price VHT                                38.86 USD
2024-06-14 price GLD                               120.86 USD
2024-06-21 price VBMPX                              52.44 USD
2024-06-21 price RGAGX                             202.04 USD
2024-06-21 price ITOT                              126.11 USD
2024-06-21 price VEA                                67.95 USD
2024-06-21 price VHT                                39.40 USD
2024-06-21 price GLD                               120.11 USD
2024-06-28 price VBMPX                              52.36 USD
2024-06-28 price RGAGX                             203.11 USD
2024-06-28 price ITOT                              127.70 USD
2024-06-28 price VEA                                68.64 USD
2024-06-28 price VHT                                40.75 USD
2024-06-28 price GLD                               120.17 USD
2024-07-05 price VBMPX                              52.27 USD
2024-07-05 price RGAGX                             202.70 USD
2024-07-05 price ITOT                              127.85 USD
2024-07-05 price VEA                                67.91 USD
2024-07-05 price VHT                                41.09 USD
2024-07-05 price GLD                               120.61 USD
2024-07-12 price VBMPX                              52.89 USD
2024-07-12 price RGAGX                             203.56 USD
2024-07-12 price ITOT                              129.70 USD
2024-07-12 price VEA                                67.60 USD
2024-07-12 price VHT                                41.49 USD
2024-07-12 price GLD                               120.54 USD
2024-07-19 price VBMPX                              52.60 USD
2024-07-19 price RGAGX                             205.07 USD
2024-07-19 price ITOT                              125.48 USD
2024-07-19 price VEA                                66.45 USD
2024-07-19 price VHT                                41.07 USD
2024-07-19 price GLD                               121.43 USD
2024-07-26 price VBMPX                              52.81 USD
2024-07-26 price RGAGX                             207.66 USD
2024-07-26 price ITOT                              124.50 USD
2024-07-26 price VEA                                66.33 USD
2024-07-26 price VHT                                40.78 USD
2024-07-26 price GLD                               120.12 USD
2024-08-02 price VBMPX                              52.77 USD
2024-08-02 price RGAGX                             212.16 USD
2024-08-02 price ITOT                              122.67 USD
2024-08-02 price VEA                                65.73 USD
2024-08-02 price VHT                                39.15 USD
2024-08-02 price GLD                               121.16 USD
2024-08-09 price VBMPX                              53.14 USD
2024-08-09 price RGAGX                             215.54 USD
2024-08-09 price ITOT                              121.42 USD
2024-08-09 price VEA                                67.05 USD
2024-08-09 price VHT                                39.94 USD
2024-08-09 price GLD                               121.30 USD
2024-08-16 price VBMPX                              53.42 USD
2024-08-16 price RGAGX                             212.19 USD
2024-08-16 price ITOT                              120.77 USD
2024-08-16 price VEA                                67.25 USD
2024-08-16 price VHT                                39.84 USD
2024-08-16 price GLD                               121.21 USD
2024-08-23 price VBMPX                              53.67 USD
2024-08-23 price RGAGX                             208.40 USD
2024-08-23 price ITOT                              124.59 USD
2024-08-23 price VEA                                68.96 USD
2024-08-23 price VHT                                40.20 USD
2024-08-23 price GLD                               121.55 USD
2024-08-30 price VBMPX                              53.97 USD
2024-08-30 price RGAGX                             209.33 USD
2024-08-30 price ITOT                              123.20 USD
2024-08-30 price VEA                                68.70 USD
2024-08-30 price VHT                                39.91 USD
2024-08-30 price GLD                               121.25 USD
2024-09-06 price VBMPX                              54.77 USD
2024-09-06 price RGAGX                             211.12 USD
2024-09-06 price ITOT                              123.19 USD
2024-09-06 price VEA                                68.65 USD
2024-09-06 price VHT                                41.78 USD
2024-09-06 price GLD                               121.00 USD
2024-09-13 price VBMPX                              55.39 USD
2024-09-13 price RGAGX                             212.50 USD
2024-09-13 price ITOT                              124.68 USD
2024-09-13 price VEA                                68.78 USD
2024-09-13 price VHT                                43.23 USD
2024-09-13 price GLD                               121.33 USD
2024-09-20 price VBMPX                              55.56 USD
2024-09-20 price RGAGX                             208.41 USD
2024-09-20 price ITOT                              122.31 USD
2024-09-20 price VEA                                69.20 USD
2024-09-20 price VHT                                44.93 USD
2024-09-20 price GLD                               121.13 USD
2024-09-27 price VBMPX                              55.92 USD
2024-09-27 price RGAGX                             212.94 USD
2024-09-27 price ITOT                              125.02 USD
2024-09-27 price VEA                                69.34 USD
2024-09-27 price VHT                                45.33 USD
2024-09-27 price GLD                               121.37 USD
2024-10-04 price VBMPX                              55.76 USD
2024-10-04 price RGAGX                             212.29 USD
2024-10-04 price ITOT                              124.47 USD
2024-10-04 price VEA                                68.02 USD
2024-10-04 price VHT                                46.68 USD
2024-10-04 price GLD                               121.05 USD
2024-10-11 price VBMPX                              55.62 USD
2024-10-11 price RGAGX                             215.94 USD
2024-10-11 price ITOT                              119.91 USD
2024-10-11 price VEA                                69.19 USD
2024-10-11 price VHT                                46.06 USD
2024-10-11 price GLD                               120.72 USD
2024-10-18 price VBMPX                              55.68 USD
2024-10-18 price RGAGX                             217.85 USD
2024-10-18 price ITOT                              119.47 USD
2024-10-18 price VEA                                66.99 USD
2024-10-18 price VHT                                45.50 USD
2024-10-18 price GLD                               120.36 USD
2024-10-25 price VBMPX                              56.26 USD
2024-10-25 price RGAGX                             216.01 USD
2024-10-25 price ITOT                              116.15 USD
2024-10-25 price VEA                                66.48 USD
2024-10-25 price VHT                                47.45 USD
2024-10-25 price GLD                               121.48 USD
2024-11-01 price VBMPX                              56.89 USD
2024-11-01 price RGAGX                             215.53 USD
2024-11-01 price ITOT                              116.87 USD
2024-11-01 price VEA                                65.29 USD
2024-11-01 price VHT                                47.43 USD
2024-11-01 price GLD                               123.64 USD
2024-11-08 price VBMPX                              57.85 USD
2024-11-08 price RGAGX                             219.52 USD
2024-11-08 price ITOT                              114.91 USD
2024-11-08 price VEA                                65.30 USD
2024-11-08 price VHT                                48.12 USD
2024-11-08 price GLD                               122.99 USD
2024-11-15 price VBMPX                              58.14 USD
2024-11-15 price RGAGX                             218.13 USD
2024-11-15 price ITOT                              117.24 USD
2024-11-15 price VEA                                66.02 USD
2024-11-15 price VHT                                47.60 USD
2024-11-15 price GLD                               123.59 USD
2024-11-22 price VBMPX                              57.87 USD
2024-11-22 price RGAGX                             218.17 USD
2024-11-22 price ITOT                              117.12 USD
2024-11-22 price VEA                                66.34 USD
2024-11-22 price VHT                                47.22 USD
2024-11-22 price GLD                               123.50 USD
2024-11-29 price VBMPX                              57.95 USD
2024-11-29 price RGAGX                             216.22 USD
2024-11-29 price ITOT                              115.63 USD
2024-11-29 price VEA                                66.71 USD
2024-11-29 price VHT                                48.31 USD
2024-11-29 price GLD                               124.95 USD
2024-12-06 price VBMPX                              58.01 USD
2024-12-06 price RGAGX                             216.50 USD
2024-12-06 price ITOT                              115.00 USD
2024-12-06 price VEA                                67.77 USD
2024-12-06 price VHT                                49.16 USD
2024-12-06 price GLD                               124.99 USD
2024-12-13 price VBMPX                              57.79 USD
2024-12-13 price RGAGX                             215.68 USD
2024-12-13 price ITOT                              114.04 USD
2024-12-13 price VEA                                68.12 USD
2024-12-13 price VHT                                48.70 USD
2024-12-13 price GLD                               124.01 USD
2024-12-20 price VBMPX                              57.53 USD
2024-12-20 price RGAGX                             216.30 USD
2024-12-20 price ITOT                              113.71 USD
2024-12-20 price VEA                                68.44 USD
2024-12-20 price VHT                                49.41 USD
2024-12-20 price GLD                               124.43 USD
2024-12-27 price VBMPX                              57.40 USD
2024-12-27 price RGAGX                             214.87 USD
2024-12-27 price ITOT                              113.88 USD
2024-12-27 price VEA                                67.83 USD
2024-12-27 price VHT                                48.27 USD
2024-12-27 price GLD                               124.93 USD
2025-01-03 price VBMPX                              57.29 USD
2025-01-03 price RGAGX                             216.33 USD
2025-01-03 price ITOT                              112.46 USD
2025-01-03 price VEA                                68.66 USD
2025-01-03 price VHT                                48.43 USD
2025-01-03 price GLD                               125.47 USD
2025-01-10 price VBMPX                              57.82 USD
2025-01-10 price RGAGX                             221.41 USD
2025-01-10 price ITOT                              112.45 USD
2025-01-10 price VEA                                71.61 USD
2025-01-10 price VHT                                47.08 USD
2025-01-10 price GLD                               127.07 USD
2025-01-17 price VBMPX                              58.12 USD
2025-01-17 price RGAGX                             219.98 USD
2025-01-17 price ITOT                              110.23 USD
2025-01-17 price VEA                                72.21 USD
2025-01-17 price VHT                                46.11 USD
2025-01-17 price GLD                               125.07 USD
2025-01-24 price VBMPX                              57.87 USD
2025-01-24 price RGAGX                             221.50 USD
2025-01-24 price ITOT                              109.26 USD
2025-01-24 price VEA                                71.97 USD
2025-01-24 price VHT                                46.18 USD
2025-01-24 price GLD                               126.80 USD
2025-01-31 price VBMPX                              58.21 USD
2025-01-31 price RGAGX                             222.97 USD
2025-01-31 price ITOT                              106.75 USD
2025-01-31 price VEA                                71.50 USD
2025-01-31 price VHT                                46.22 USD
2025-01-31 price GLD                               128.63 USD
2025-02-07 price VBMPX                              58.35 USD
2025-02-07 price RGAGX                             228.22 USD
2025-02-07 price ITOT                              108.43 USD
2025-02-07 price VEA                                73.76 USD
2025-02-07 price VHT                                46.61 USD
2025-02-07 price GLD                               129.64 USD
2025-02-14 price VBMPX                              58.85 USD
2025-02-14 price RGAGX                             231.12 USD
2025-02-14 price ITOT                              108.67 USD
2025-02-14 price VEA                                73.25 USD
2025-02-14 price VHT                                46.93 USD
2025-02-14 price GLD                               128.27 USD
2025-02-21 price VBMPX                              59.18 USD
2025-02-21 price RGAGX                             231.80 USD
2025-02-21 price ITOT                              106.02 USD
2025-02-21 price VEA                                73.11 USD
2025-02-21 price VHT                                47.48 USD
2025-02-21 price GLD                               129.00 USD
2025-02-28 price VBMPX                              59.93 USD
2025-02-28 price RGAGX                             229.60 USD
2025-02-28 price ITOT                              108.37 USD
2025-02-28 price VEA                                73.03 USD
2025-02-28 price VHT                                48.70 USD
2025-02-28 price GLD                               128.83 USD
2025-03-07 price VBMPX                              60.10 USD
2025-03-07 price RGAGX                             223.09 USD
2025-03-07 price ITOT                              108.06 USD
2025-03-07 price VEA                                75.21 USD
2025-03-07 price VHT                                48.46 USD
2025-03-07 price GLD                               129.70 USD
2025-03-14 price VBMPX                              59.99 USD
2025-03-14 price RGAGX                             223.34 USD
2025-03-14 price ITOT                              107.07 USD
2025-03-14 price VEA                                74.03 USD
2025-03-14 price VHT                                49.23 USD
2025-03-14 price GLD                               130.08 USD
2025-03-21 price VBMPX                              60.61 USD
2025-03-21 price RGAGX                             223.27 USD
2025-03-21 price ITOT                              109.41 USD
2025-03-21 price VEA                                73.00 USD
2025-03-21 price VHT                                49.46 USD
2025-03-21 price GLD                               131.58 USD
2025-03-28 price VBMPX                              60.74 USD
2025-03-28 price RGAGX                             224.16 USD
2025-03-28 price ITOT                              108.67 USD
2025-03-28 price VEA                                73.13 USD
2025-03-28 price VHT                                50.97 USD
2025-03-28 price GLD                               131.11 USD
2025-04-04 price VBMPX                              61.09 USD
2025-04-04 price RGAGX                             223.61 USD
2025-04-04 price ITOT                              108.70 USD
2025-04-04 price VEA                                73.19 USD
2025-04-04 price VHT                                50.44 USD
2025-04-04 price GLD                               132.24 USD
2025-04-11 price VBMPX                              60.98 USD
2025-04-11 price RGAGX                             222.76 USD
2025-04-11 price ITOT                              109.92 USD
2025-04-11 price VEA                                72.00 USD
2025-04-11 price VHT                                50.64 USD
2025-04-11 price GLD                               131.74 USD
2025-04-18 price VBMPX                              61.34 USD
2025-04-18 price RGAGX                             220.66 USD
2025-04-18 price ITOT                              108.71 USD
2025-04-18 price VEA                                71.57 USD
2025-04-18 price VHT                                51.63 USD
2025-04-18 price GLD                               131.66 USD
2025-04-25 price VBMPX                              61.82 USD
2025-04-25 price RGAGX                             224.92 USD
2025-04-25 price ITOT                              110.87 USD
2025-04-25 price VEA                                70.82 USD
2025-04-25 price VHT                                52.04 USD
2025-04-25 price GLD                               131.94 USD
2025-05-02 price VBMPX                              61.90 USD
2025-05-02 price RGAGX                             222.13 USD
2025-05-02 price ITOT                              111.22 USD
2025-05-02 price VEA                                69.91 USD
2025-05-02 price VHT                                51.97 USD
2025-05-02 price GLD                               134.18 USD
2025-05-09 price VBMPX                              62.43 USD
2025-05-09 price RGAGX                             220.85 USD
2025-05-09 price ITOT                              107.67 USD
2025-05-09 price VEA                                69.81 USD
2025-05-09 price VHT                                52.89 USD
2025-05-09 price GLD                               134.95 USD
2025-05-16 price VBMPX                              62.52 USD
2025-05-16 price RGAGX                             218.03 USD
2025-05-16 price ITOT                              107.42 USD
2025-05-16 price VEA                                70.31 USD
2025-05-16 price VHT                                53.04 USD
2025-05-16 price GLD                               135.94 USD
2025-05-23 price VBMPX                              62.25 USD
2025-05-23 price RGAGX                             216.78 USD
2025-05-23 price ITOT                              107.18 USD
2025-05-23 price VEA                                66.13 USD
2025-05-23 price VHT                                53.35 USD
2025-05-23 price GLD                               138.52 USD
2025-05-30 price VBMPX                              62.15 USD
2025-05-30 price RGAGX                             216.76 USD
2025-05-30 price ITOT                              108.34 USD
2025-05-30 price VEA                                65.53 USD
2025-05-30 price VHT                                55.53 USD
2025-05-30 price GLD                               136.91 USD
2025-06-06 price VBMPX                              62.35 USD
2025-06-06 price RGAGX                             218.23 USD
2025-06-06 price ITOT                              106.76 USD
2025-06-06 price VEA                                67.50 USD
2025-06-06 price VHT                                56.81 USD
2025-06-06 price GLD                               136.23 USD
2025-06-13 price VBMPX                              62.75 USD
2025-06-13 price RGAGX                             220.18 USD
2025-06-13 price ITOT                              106.49 USD
2025-06-13 price VEA                                68.26 USD
2025-06-13 price VHT                                57.10 USD
2025-06-13 price GLD                               135.62 USD
2025-06-20 price VBMPX                              62.47 USD
2025-06-20 price RGAGX                             215.60 USD
2025-06-20 price ITOT                              108.57 USD
2025-06-20 price VEA                                68.93 USD
2025-06-20 price VHT                                56.51 USD
2025-06-20 price GLD                               134.69 USD
2025-06-27 price VBMPX                              62.65 USD
2025-06-27 price RGAGX                             217.76 USD
2025-06-27 price ITOT                              110.15 USD
2025-06-27 price VEA                                69.35 USD
2025-06-27 price VHT                                56.41 USD
2025-06-27 price GLD                               133.97 USD
2025-07-04 price VBMPX                              63.03 USD
2025-07-04 price RGAGX                             217.02 USD
2025-07-04 price ITOT                              109.89 USD
2025-07-04 price VEA                                70.98 USD
2025-07-04 price VHT                                56.23 USD
2025-07-04 price GLD                               134.09 USD
2025-07-11 price VBMPX                              63.11 USD
2025-07-11 price RGAGX                             221.12 USD
2025-07-11 price ITOT                              112.19 USD
2025-07-11 price VEA                                70.73 USD
2025-07-11 price VHT                                55.63 USD
2025-07-11 price GLD                               133.87 USD
2025-07-18 price VBMPX                              62.55 USD
2025-07-18 price RGAGX                             221.38 USD
2025-07-18 price ITOT                              111.26 USD
2025-07-18 price VEA                                70.05 USD
2025-07-18 price VHT                                56.22 USD
2025-07-18 price GLD                               133.92 USD
2025-07-25 price VBMPX                              62.18 USD
2025-07-25 price RGAGX                             219.31 USD
2025-07-25 price ITOT                              112.40 USD
2025-07-25 price VEA                                69.48 USD
2025-07-25 price VHT                                54.31 USD
2025-07-25 price GLD                               134.81 USD
2025-08-01 price VBMPX                              62.41 USD
2025-08-01 price RGAGX                             227.19 USD
2025-08-01 price ITOT                              112.30 USD
2025-08-01 price VEA                                71.07 USD
2025-08-01 price VHT                                54.89 USD
2025-08-01 price GLD                               134.21 USD
2025-08-08 price VBMPX                              62.32 USD
2025-08-08 price RGAGX                             228.98 USD
2025-08-08 price ITOT                              110.17 USD
2025-08-08 price VEA                                70.30 USD
2025-08-08 price VHT                                55.02 USD
2025-08-08 price GLD                               132.47 USD
2025-08-15 price VBMPX                              62.46 USD
2025-08-15 price RGAGX                             230.09 USD
2025-08-15 price ITOT                              110.30 USD
2025-08-15 price VEA                                69.96 USD
2025-08-15 price VHT                                56.17 USD
2025-08-15 price GLD                               130.85 USD
2025-08-22 price VBMPX                              62.17 USD
2025-08-22 price RGAGX                             230.29 USD
2025-08-22 price ITOT                              109.85 USD
2025-08-22 price VEA                                69.26 USD
2025-08-22 price VHT                                56.60 USD
2025-08-22 price GLD                               130.40 USD
2025-08-29 price VBMPX                              62.90 USD
2025-08-29 price RGAGX                             227.20 USD
2025-08-29 price ITOT                              110.33 USD
2025-08-29 price VEA                                69.17 USD
2025-08-29 price VHT                                55.67 USD
2025-08-29 price GLD                               131.79 USD
2025-09-05 price VBMPX                              63.73 USD
2025-09-05 price RGAGX                             232.98 USD
2025-09-05 price ITOT                              110.26 USD
2025-09-05 price VEA                                70.80 USD
2025-09-05 price VHT                                56.96 USD
2025-09-05 price GLD                               131.32 USD
2025-09-12 price VBMPX                              64.25 USD
2025-09-12 price RGAGX                             230.78 USD
2025-09-12 price ITOT                              110.87 USD
2025-09-12 price VEA                                72.12 USD
2025-09-12 price VHT                                56.92 USD
2025-09-12 price GLD                               130.54 USD
2025-09-19 price VBMPX                              64.61 USD
2025-09-19 price RGAGX                             231.77 USD
2025-09-19 price ITOT                              111.92 USD
2025-09-19 price VEA                                70.90 USD
2025-09-19 price VHT                                55.68 USD
2025-09-19 price GLD                               129.93 USD
2025-09-26 price VBMPX                              65.03 USD
2025-09-26 price RGAGX                             238.96 USD
2025-09-26 price ITOT                              113.04 USD
2025-09-26 price VEA                                71.92 USD
2025-09-26 price VHT                                57.12 USD
2025-09-26 price GLD                               129.80 USD
2025-10-03 price VBMPX                              64.71 USD
2025-10-03 price RGAGX                             237.42 USD
2025-10-03 price ITOT                              112.19 USD
2025-10-03 price VEA                                71.35 USD
2025-10-03 price VHT                                57.51 USD
2025-10-03 price GLD                               129.32 USD
2025-10-10 price VBMPX                              65.12 USD
2025-10-10 price RGAGX                             241.06 USD
2025-10-10 price ITOT                              112.46 USD
2025-10-10 price VEA                                71.55 USD
2025-10-10 price VHT                                56.97 USD
2025-10-10 price GLD                               132.14 USD
`,
  "commodities.bean": `
* Commodities


1792-01-01 commodity USD
  name: "US Dollar"
  export: "CASH"

1900-01-01 commodity VMMXX
  export: "MUTF:VMMXX (MONEY:USD)"

1980-05-12 commodity VACHR
  name: "Employer Vacation Hours"
  export: "IGNORE"

1980-05-12 commodity IRAUSD
  name: "US 401k and IRA Contributions"
  export: "IGNORE"

1995-09-18 commodity VBMPX
  name: "Vanguard Total Bond Market Index Fund Institutional Plus Shares"
  export: "MUTF:VBMPX"
  price: "USD:google/MUTF:VBMPX"

2004-01-20 commodity ITOT
  name: "iShares Core S&P Total U.S. Stock Market ETF"
  export: "NYSEARCA:ITOT"
  price: "USD:google/NYSEARCA:ITOT"

2004-01-26 commodity VHT
  name: "Vanguard Health Care ETF"
  export: "NYSEARCA:VHT"
  price: "USD:google/NYSEARCA:VHT"

2004-11-01 commodity GLD
  name: "SPDR Gold Trust (ETF)"
  export: "NYSEARCA:GLD"
  price: "USD:google/NYSEARCA:GLD"

2007-07-20 commodity VEA
  name: "Vanguard FTSE Developed Markets ETF"
  export: "NYSEARCA:VEA"
  price: "USD:google/NYSEARCA:VEA"

2009-05-01 commodity RGAGX
  name: "American Funds The Growth Fund of America Class R-6"
  export: "MUTF:RGAGX"
  price: "USD:google/MUTF:RGAGX"
`,
};

export const ledgerWithcomprehensiveSingleFileTemplate: Record<string, string> =
  {
    "main.bean": `
;; -*- mode: org; mode: beancount; -*-
;; Birth: 1980-05-12
;; Dates: 2023-01-01 - 2025-10-12
;; THIS FILE HAS BEEN AUTO-GENERATED.
* Options

option "title" "Example Beancount file"
option "operating_currency" "USD"




* Commodities


1792-01-01 commodity USD
  name: "US Dollar"
  export: "CASH"

1900-01-01 commodity VMMXX
  export: "MUTF:VMMXX (MONEY:USD)"

1980-05-12 commodity VACHR
  name: "Employer Vacation Hours"
  export: "IGNORE"

1980-05-12 commodity IRAUSD
  name: "US 401k and IRA Contributions"
  export: "IGNORE"

1995-09-18 commodity VBMPX
  name: "Vanguard Total Bond Market Index Fund Institutional Plus Shares"
  export: "MUTF:VBMPX"
  price: "USD:google/MUTF:VBMPX"

2004-01-20 commodity ITOT
  name: "iShares Core S&P Total U.S. Stock Market ETF"
  export: "NYSEARCA:ITOT"
  price: "USD:google/NYSEARCA:ITOT"

2004-01-26 commodity VHT
  name: "Vanguard Health Care ETF"
  export: "NYSEARCA:VHT"
  price: "USD:google/NYSEARCA:VHT"

2004-11-01 commodity GLD
  name: "SPDR Gold Trust (ETF)"
  export: "NYSEARCA:GLD"
  price: "USD:google/NYSEARCA:GLD"

2007-07-20 commodity VEA
  name: "Vanguard FTSE Developed Markets ETF"
  export: "NYSEARCA:VEA"
  price: "USD:google/NYSEARCA:VEA"

2009-05-01 commodity RGAGX
  name: "American Funds The Growth Fund of America Class R-6"
  export: "MUTF:RGAGX"
  price: "USD:google/MUTF:RGAGX"



* Equity Accounts

1980-05-12 open Equity:Opening-Balances
1980-05-12 open Liabilities:AccountsPayable



* Banking

2023-01-01 open Assets:US:BofA
  institution: "Bank of America"
  address: "123 America Street, LargeTown, USA"
  phone: "+1.012.345.6789"
2023-01-01 open Assets:US:BofA:Checking                        USD
  account: "00234-48574897"

2023-01-01 * "Opening Balance for checking account"
  Assets:US:BofA:Checking                         3663.93 USD
  Equity:Opening-Balances                        -3663.93 USD

2023-01-02 balance Assets:US:BofA:Checking        3663.93 USD

2023-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-01-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-01-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-01-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -57.52 USD
  Expenses:Home:Phone                               57.52 USD

2023-01-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2023-01-30 balance Assets:US:BofA:Checking        3618.96 USD

2023-02-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-02-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-02-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -61.32 USD
  Expenses:Home:Phone                               61.32 USD

2023-02-20 balance Assets:US:BofA:Checking        3181.67 USD

2023-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.96 USD
  Expenses:Home:Internet                            79.96 USD

2023-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-03-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-03-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.42 USD
  Expenses:Home:Phone                               59.42 USD

2023-03-21 balance Assets:US:BofA:Checking        2716.52 USD

2023-03-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.22 USD
  Expenses:Home:Internet                            80.22 USD

2023-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-04-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-04-14 balance Assets:US:BofA:Checking        2314.32 USD

2023-04-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -58.55 USD
  Expenses:Home:Phone                               58.55 USD

2023-04-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.18 USD
  Expenses:Home:Internet                            80.18 USD

2023-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-05-06 balance Assets:US:BofA:Checking        3522.19 USD

2023-05-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-05-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-05-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -66.73 USD
  Expenses:Home:Phone                               66.73 USD

2023-05-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.00 USD
  Expenses:Home:Internet                            80.00 USD

2023-06-03 balance Assets:US:BofA:Checking        3045.44 USD

2023-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-06-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-06-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-06-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -36.58 USD
  Expenses:Home:Phone                               36.58 USD

2023-06-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.15 USD
  Expenses:Home:Internet                            80.15 USD

2023-07-01 balance Assets:US:BofA:Checking        2519.47 USD

2023-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-07-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-07-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.93 USD
  Expenses:Home:Phone                               60.93 USD

2023-07-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.92 USD
  Expenses:Home:Internet                            79.92 USD

2023-07-26 balance Assets:US:BofA:Checking        1979.24 USD

2023-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-08-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-08-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -58.57 USD
  Expenses:Home:Phone                               58.57 USD

2023-08-22 balance Assets:US:BofA:Checking        3571.24 USD

2023-08-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.87 USD
  Expenses:Home:Internet                            79.87 USD

2023-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-09-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-09-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-09-11 balance Assets:US:BofA:Checking        2815.01 USD

2023-09-15 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2023-09-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.09 USD
  Expenses:Home:Phone                               59.09 USD

2023-09-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.81 USD
  Expenses:Home:Internet                            79.81 USD

2023-10-04 balance Assets:US:BofA:Checking        3777.31 USD

2023-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-10-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-10-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-10-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -51.35 USD
  Expenses:Home:Phone                               51.35 USD

2023-10-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2023-10-27 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -3000 USD
  Assets:US:ETrade:Cash                              3000 USD

2023-10-29 balance Assets:US:BofA:Checking        2663.76 USD

2023-11-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-11-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-11-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-11-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -66.88 USD
  Expenses:Home:Phone                               66.88 USD

2023-11-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.09 USD
  Expenses:Home:Internet                            80.09 USD

2023-11-27 balance Assets:US:BofA:Checking        4275.74 USD

2023-12-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2023-12-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2023-12-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2023-12-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -54.53 USD
  Expenses:Home:Phone                               54.53 USD

2023-12-22 balance Assets:US:BofA:Checking        6501.66 USD

2023-12-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.00 USD
  Expenses:Home:Internet                            80.00 USD

2024-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-01-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-01-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-01-13 balance Assets:US:BofA:Checking        4344.65 USD

2024-01-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -55.44 USD
  Expenses:Home:Phone                               55.44 USD

2024-01-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2024-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-02-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-02-06 balance Assets:US:BofA:Checking        4506.40 USD

2024-02-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-02-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -64.41 USD
  Expenses:Home:Phone                               64.41 USD

2024-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.95 USD
  Expenses:Home:Internet                            79.95 USD

2024-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-03-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-03-07 balance Assets:US:BofA:Checking        4003.73 USD

2024-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-03-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -41.89 USD
  Expenses:Home:Phone                               41.89 USD

2024-03-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.13 USD
  Expenses:Home:Internet                            80.13 USD

2024-03-29 balance Assets:US:BofA:Checking        5777.34 USD

2024-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-04-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-04-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.05 USD
  Expenses:Home:Phone                               60.05 USD

2024-04-23 balance Assets:US:BofA:Checking        3743.09 USD

2024-04-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.05 USD
  Expenses:Home:Internet                            80.05 USD

2024-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-05-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-05-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-05-13 balance Assets:US:BofA:Checking        3321.57 USD

2024-05-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -59.43 USD
  Expenses:Home:Phone                               59.43 USD

2024-05-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2024-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-06-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-06-09 balance Assets:US:BofA:Checking        2702.11 USD

2024-06-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-06-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -57.43 USD
  Expenses:Home:Phone                               57.43 USD

2024-06-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.82 USD
  Expenses:Home:Internet                            79.82 USD

2024-06-30 balance Assets:US:BofA:Checking        3850.46 USD

2024-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-07-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-07-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -73.09 USD
  Expenses:Home:Phone                               73.09 USD

2024-07-20 balance Assets:US:BofA:Checking        3457.42 USD

2024-07-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.16 USD
  Expenses:Home:Internet                            80.16 USD

2024-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-08-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-08-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-08-10 balance Assets:US:BofA:Checking        2958.86 USD

2024-08-16 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2024-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -60.33 USD
  Expenses:Home:Phone                               60.33 USD

2024-08-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.99 USD
  Expenses:Home:Internet                            79.99 USD

2024-08-31 balance Assets:US:BofA:Checking        3369.21 USD

2024-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-09-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-09-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-09-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -76.54 USD
  Expenses:Home:Phone                               76.54 USD

2024-09-20 balance Assets:US:BofA:Checking        2753.36 USD

2024-09-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.76 USD
  Expenses:Home:Internet                            79.76 USD

2024-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-10-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-10-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-10-11 balance Assets:US:BofA:Checking        4710.12 USD

2024-10-11 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4000 USD
  Assets:US:ETrade:Cash                              4000 USD

2024-10-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -63.09 USD
  Expenses:Home:Phone                               63.09 USD

2024-10-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2024-11-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-11-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-11-09 balance Assets:US:BofA:Checking        3264.22 USD

2024-11-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-11-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -49.57 USD
  Expenses:Home:Phone                               49.57 USD

2024-11-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.90 USD
  Expenses:Home:Internet                            79.90 USD

2024-11-29 balance Assets:US:BofA:Checking        4895.27 USD

2024-12-03 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2024-12-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2024-12-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2024-12-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -56.01 USD
  Expenses:Home:Phone                               56.01 USD

2024-12-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.89 USD
  Expenses:Home:Internet                            79.89 USD

2024-12-26 balance Assets:US:BofA:Checking        7015.36 USD

2025-01-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-01-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-01-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-01-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -64.17 USD
  Expenses:Home:Phone                               64.17 USD

2025-01-23 balance Assets:US:BofA:Checking        6334.53 USD

2025-01-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.93 USD
  Expenses:Home:Internet                            79.93 USD

2025-02-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-02-04 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-02-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-02-15 balance Assets:US:BofA:Checking        5887.87 USD

2025-02-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -61.33 USD
  Expenses:Home:Phone                               61.33 USD

2025-02-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.99 USD
  Expenses:Home:Internet                            79.99 USD

2025-03-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-03-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-03-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-03-09 balance Assets:US:BofA:Checking        4628.15 USD

2025-03-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -65.11 USD
  Expenses:Home:Phone                               65.11 USD

2025-03-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.07 USD
  Expenses:Home:Internet                            80.07 USD

2025-04-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-04-05 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-04-06 balance Assets:US:BofA:Checking        3837.99 USD

2025-04-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-04-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -46.82 USD
  Expenses:Home:Phone                               46.82 USD

2025-04-22 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.09 USD
  Expenses:Home:Internet                            80.09 USD

2025-05-04 balance Assets:US:BofA:Checking        5573.45 USD

2025-05-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-05-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-05-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-05-19 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -54.05 USD
  Expenses:Home:Phone                               54.05 USD

2025-05-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.20 USD
  Expenses:Home:Internet                            80.20 USD

2025-05-30 balance Assets:US:BofA:Checking        4986.41 USD

2025-06-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-06-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-06-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-06-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -44.24 USD
  Expenses:Home:Phone                               44.24 USD

2025-06-23 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.27 USD
  Expenses:Home:Internet                            80.27 USD

2025-06-24 balance Assets:US:BofA:Checking        4349.09 USD

2025-07-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-07-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-07-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-07-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -44.92 USD
  Expenses:Home:Phone                               44.92 USD

2025-07-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.82 USD
  Expenses:Home:Internet                            79.82 USD

2025-07-23 balance Assets:US:BofA:Checking        3778.65 USD

2025-08-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-08-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-08-09 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-08-12 balance Assets:US:BofA:Checking        2614.50 USD

2025-08-15 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -4500 USD
  Assets:US:ETrade:Cash                              4500 USD

2025-08-20 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -82.76 USD
  Expenses:Home:Phone                               82.76 USD

2025-08-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -80.01 USD
  Expenses:Home:Internet                            80.01 USD

2025-09-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-09-06 * "RiverBank Properties" "Paying the rent"
  Assets:US:BofA:Checking                        -2400.00 USD
  Expenses:Home:Rent                              2400.00 USD

2025-09-08 balance Assets:US:BofA:Checking         648.93 USD

2025-09-08 * "EDISON POWER" ""
  Assets:US:BofA:Checking                          -65.00 USD
  Expenses:Home:Electricity                         65.00 USD

2025-09-18 * "Verizon Wireless" ""
  Assets:US:BofA:Checking                          -72.76 USD
  Expenses:Home:Phone                               72.76 USD

2025-09-21 * "Wine-Tarner Cable" ""
  Assets:US:BofA:Checking                          -79.88 USD
  Expenses:Home:Internet                            79.88 USD

2025-09-26 * "Transfering accumulated savings to other account"
  Assets:US:BofA:Checking                           -5000 USD
  Assets:US:ETrade:Cash                              5000 USD

2025-10-04 * "BANK FEES" "Monthly bank fee"
  Assets:US:BofA:Checking                           -4.00 USD
  Expenses:Financial:Fees                            4.00 USD

2025-10-08 balance Assets:US:BofA:Checking         206.91 USD



* Credit-Cards

1980-05-12 open Liabilities:US:Chase:Slate                      USD

2023-01-02 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.89 USD
  Expenses:Food:Restaurant                          32.89 USD

2023-01-05 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -25.85 USD
  Expenses:Food:Restaurant                          25.85 USD

2023-01-06 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -46.18 USD
  Expenses:Food:Restaurant                          46.18 USD

2023-01-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       139.64 USD
  Assets:US:BofA:Checking                         -139.64 USD

2023-01-10 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -34.72 USD
  Expenses:Food:Restaurant                          34.72 USD

2023-01-11 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -85.47 USD
  Expenses:Food:Groceries                           85.47 USD

2023-01-15 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -26.73 USD
  Expenses:Food:Restaurant                          26.73 USD

2023-01-20 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -15.16 USD
  Expenses:Food:Restaurant                          15.16 USD

2023-01-23 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -36.54 USD
  Expenses:Food:Restaurant                          36.54 USD

2023-01-25 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -90.57 USD
  Expenses:Food:Groceries                           90.57 USD

2023-01-27 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -45.84 USD
  Expenses:Food:Restaurant                          45.84 USD

2023-01-28 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -20.62 USD
  Expenses:Food:Restaurant                          20.62 USD

2023-01-30 balance Liabilities:US:Chase:Slate     -320.93 USD

2023-01-31 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-02-01 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -31.47 USD
  Expenses:Food:Restaurant                          31.47 USD

2023-02-05 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -10.43 USD
  Expenses:Food:Restaurant                          10.43 USD

2023-02-08 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.28 USD
  Expenses:Food:Restaurant                          29.28 USD

2023-02-09 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.06 USD
  Expenses:Food:Groceries                           96.06 USD

2023-02-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       608.17 USD
  Assets:US:BofA:Checking                         -608.17 USD

2023-02-13 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -26.74 USD
  Expenses:Food:Restaurant                          26.74 USD

2023-02-14 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.13 USD
  Expenses:Food:Restaurant                          41.13 USD

2023-02-16 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -12.37 USD
  Expenses:Food:Restaurant                          12.37 USD

2023-02-20 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -44.74 USD
  Expenses:Food:Restaurant                          44.74 USD

2023-02-21 balance Liabilities:US:Chase:Slate     -124.98 USD

2023-02-22 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -46.18 USD
  Expenses:Food:Restaurant                          46.18 USD

2023-02-25 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.66 USD
  Expenses:Food:Restaurant                          23.66 USD

2023-02-28 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -57.48 USD
  Expenses:Food:Restaurant                          57.48 USD

2023-03-01 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.17 USD
  Expenses:Food:Groceries                           62.17 USD

2023-03-03 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.52 USD
  Expenses:Food:Restaurant                          20.52 USD

2023-03-04 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.47 USD
  Expenses:Food:Restaurant                          14.47 USD

2023-03-05 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -32.76 USD
  Expenses:Food:Restaurant                          32.76 USD

2023-03-05 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-03-08 * "Jewel of Morroco" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.25 USD
  Expenses:Food:Restaurant                          17.25 USD

2023-03-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       557.97 USD
  Assets:US:BofA:Checking                         -557.97 USD

2023-03-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -38.50 USD
  Expenses:Food:Groceries                           38.50 USD

2023-03-13 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -19.91 USD
  Expenses:Food:Restaurant                          19.91 USD

2023-03-16 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -75.44 USD
  Expenses:Food:Restaurant                          75.44 USD

2023-03-17 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.48 USD
  Expenses:Food:Restaurant                          35.48 USD

2023-03-21 balance Liabilities:US:Chase:Slate     -130.83 USD

2023-03-22 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.92 USD
  Expenses:Food:Restaurant                          17.92 USD

2023-03-25 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -37.95 USD
  Expenses:Food:Restaurant                          37.95 USD

2023-03-25 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.59 USD
  Expenses:Food:Groceries                           82.59 USD

2023-03-30 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -39.52 USD
  Expenses:Food:Restaurant                          39.52 USD

2023-04-01 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -17.70 USD
  Expenses:Food:Restaurant                          17.70 USD

2023-04-02 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-04-04 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -45.86 USD
  Expenses:Food:Restaurant                          45.86 USD

2023-04-07 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -31.40 USD
  Expenses:Food:Restaurant                          31.40 USD

2023-04-11 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.41 USD
  Expenses:Food:Restaurant                          30.41 USD

2023-04-11 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -110.42 USD
  Expenses:Food:Groceries                          110.42 USD

2023-04-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       554.18 USD
  Assets:US:BofA:Checking                         -554.18 USD

2023-04-16 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.29 USD
  Expenses:Food:Restaurant                          21.29 USD

2023-04-18 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -25.39 USD
  Expenses:Food:Restaurant                          25.39 USD

2023-04-19 balance Liabilities:US:Chase:Slate     -157.10 USD

2023-04-21 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -35.52 USD
  Expenses:Food:Restaurant                          35.52 USD

2023-04-22 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.36 USD
  Expenses:Food:Restaurant                          23.36 USD

2023-04-24 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -23.68 USD
  Expenses:Food:Restaurant                          23.68 USD

2023-04-27 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -17.08 USD
  Expenses:Food:Restaurant                          17.08 USD

2023-04-27 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -80.91 USD
  Expenses:Food:Groceries                           80.91 USD

2023-05-02 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -18.52 USD
  Expenses:Food:Restaurant                          18.52 USD

2023-05-05 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-05-06 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -24.51 USD
  Expenses:Food:Restaurant                          24.51 USD

2023-05-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       566.22 USD
  Assets:US:BofA:Checking                         -566.22 USD

2023-05-10 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -65.54 USD
  Expenses:Food:Restaurant                          65.54 USD

2023-05-11 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -10.36 USD
  Expenses:Food:Restaurant                          10.36 USD

2023-05-12 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.25 USD
  Expenses:Food:Restaurant                          35.25 USD

2023-05-12 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -124.00 USD
  Expenses:Food:Groceries                          124.00 USD

2023-05-14 balance Liabilities:US:Chase:Slate     -169.61 USD

2023-05-15 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.66 USD
  Expenses:Food:Restaurant                          21.66 USD

2023-05-18 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -30.17 USD
  Expenses:Food:Restaurant                          30.17 USD

2023-05-21 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.87 USD
  Expenses:Food:Restaurant                          21.87 USD

2023-05-24 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -19.26 USD
  Expenses:Food:Restaurant                          19.26 USD

2023-05-25 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -46.42 USD
  Expenses:Food:Restaurant                          46.42 USD

2023-05-29 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -22.36 USD
  Expenses:Food:Restaurant                          22.36 USD

2023-05-30 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -61.47 USD
  Expenses:Food:Groceries                           61.47 USD

2023-05-31 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.13 USD
  Expenses:Food:Restaurant                          30.13 USD

2023-06-01 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.83 USD
  Expenses:Food:Restaurant                          31.83 USD

2023-06-03 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.19 USD
  Expenses:Food:Restaurant                          35.19 USD

2023-06-03 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-06-07 balance Liabilities:US:Chase:Slate     -609.97 USD

2023-06-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       641.44 USD
  Assets:US:BofA:Checking                         -641.44 USD

2023-06-08 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -31.47 USD
  Expenses:Food:Restaurant                          31.47 USD

2023-06-12 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -24.74 USD
  Expenses:Food:Restaurant                          24.74 USD

2023-06-14 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -27.54 USD
  Expenses:Food:Restaurant                          27.54 USD

2023-06-18 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -48.66 USD
  Expenses:Food:Groceries                           48.66 USD

2023-06-19 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -37.09 USD
  Expenses:Food:Restaurant                          37.09 USD

2023-06-20 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.10 USD
  Expenses:Food:Restaurant                          30.10 USD

2023-06-21 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -51.19 USD
  Expenses:Food:Restaurant                          51.19 USD

2023-06-23 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -29.01 USD
  Expenses:Food:Restaurant                          29.01 USD

2023-06-27 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -37.96 USD
  Expenses:Food:Restaurant                          37.96 USD

2023-06-30 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -42.30 USD
  Expenses:Food:Restaurant                          42.30 USD

2023-07-01 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-07-03 balance Liabilities:US:Chase:Slate     -448.59 USD

2023-07-03 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2023-07-06 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -83.99 USD
  Expenses:Food:Groceries                           83.99 USD

2023-07-07 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.73 USD
  Expenses:Food:Restaurant                          30.73 USD

2023-07-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       631.58 USD
  Assets:US:BofA:Checking                         -631.58 USD

2023-07-11 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -35.52 USD
  Expenses:Food:Restaurant                          35.52 USD

2023-07-14 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.23 USD
  Expenses:Food:Restaurant                          26.23 USD

2023-07-19 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -16.98 USD
  Expenses:Food:Restaurant                          16.98 USD

2023-07-23 balance Liabilities:US:Chase:Slate      -43.21 USD

2023-07-24 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.55 USD
  Expenses:Food:Restaurant                          41.55 USD

2023-07-26 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -75.30 USD
  Expenses:Food:Groceries                           75.30 USD

2023-07-29 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -23.56 USD
  Expenses:Food:Restaurant                          23.56 USD

2023-07-31 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-08-01 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -35.00 USD
  Expenses:Food:Restaurant                          35.00 USD

2023-08-03 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -34.02 USD
  Expenses:Food:Restaurant                          34.02 USD

2023-08-08 * "Uncle Boons" "Eating out with Julie"
  Liabilities:US:Chase:Slate                      -108.99 USD
  Expenses:Food:Restaurant                         108.99 USD

2023-08-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       481.63 USD
  Assets:US:BofA:Checking                         -481.63 USD

2023-08-10 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -26.35 USD
  Expenses:Food:Restaurant                          26.35 USD

2023-08-10 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -73.08 USD
  Expenses:Food:Groceries                           73.08 USD

2023-08-11 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -33.51 USD
  Expenses:Food:Restaurant                          33.51 USD

2023-08-14 balance Liabilities:US:Chase:Slate     -132.94 USD

2023-08-14 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -39.60 USD
  Expenses:Food:Restaurant                          39.60 USD

2023-08-17 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -33.20 USD
  Expenses:Food:Restaurant                          33.20 USD

2023-08-19 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -40.64 USD
  Expenses:Food:Restaurant                          40.64 USD

2023-08-22 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -56.30 USD
  Expenses:Food:Restaurant                          56.30 USD

2023-08-24 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.27 USD
  Expenses:Food:Restaurant                          14.27 USD

2023-08-26 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.47 USD
  Expenses:Food:Restaurant                          41.47 USD

2023-08-29 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -68.69 USD
  Expenses:Food:Groceries                           68.69 USD

2023-08-29 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-08-31 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -59.52 USD
  Expenses:Food:Restaurant                          59.52 USD

2023-09-02 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -35.23 USD
  Expenses:Food:Restaurant                          35.23 USD

2023-09-06 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -39.44 USD
  Expenses:Food:Restaurant                          39.44 USD

2023-09-09 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -35.02 USD
  Expenses:Food:Restaurant                          35.02 USD

2023-09-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       757.96 USD
  Assets:US:BofA:Checking                         -757.96 USD

2023-09-12 balance Liabilities:US:Chase:Slate       41.64 USD

2023-09-14 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -41.64 USD
  Expenses:Food:Restaurant                          41.64 USD

2023-09-17 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -31.89 USD
  Expenses:Food:Restaurant                          31.89 USD

2023-09-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -90.53 USD
  Expenses:Food:Groceries                           90.53 USD

2023-09-20 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -92.75 USD
  Expenses:Food:Restaurant                          92.75 USD

2023-09-25 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.95 USD
  Expenses:Food:Restaurant                          20.95 USD

2023-09-26 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -52.07 USD
  Expenses:Food:Groceries                           52.07 USD

2023-09-29 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.55 USD
  Expenses:Food:Restaurant                          30.55 USD

2023-09-29 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-10-01 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -16.17 USD
  Expenses:Food:Restaurant                          16.17 USD

2023-10-03 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -40.04 USD
  Expenses:Food:Restaurant                          40.04 USD

2023-10-04 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -64.82 USD
  Expenses:Food:Restaurant                          64.82 USD

2023-10-05 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -19.24 USD
  Expenses:Food:Restaurant                          19.24 USD

2023-10-07 balance Liabilities:US:Chase:Slate     -579.01 USD

2023-10-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       614.33 USD
  Assets:US:BofA:Checking                         -614.33 USD

2023-10-10 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -35.32 USD
  Expenses:Food:Restaurant                          35.32 USD

2023-10-10 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.81 USD
  Expenses:Food:Groceries                           99.81 USD

2023-10-13 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -19.06 USD
  Expenses:Food:Restaurant                          19.06 USD

2023-10-17 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -28.28 USD
  Expenses:Food:Restaurant                          28.28 USD

2023-10-18 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -65.31 USD
  Expenses:Food:Groceries                           65.31 USD

2023-10-19 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -51.60 USD
  Expenses:Food:Restaurant                          51.60 USD

2023-10-20 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.83 USD
  Expenses:Food:Restaurant                          23.83 USD

2023-10-23 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.79 USD
  Expenses:Food:Restaurant                          23.79 USD

2023-10-24 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -51.24 USD
  Expenses:Food:Restaurant                          51.24 USD

2023-10-27 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -16.37 USD
  Expenses:Food:Restaurant                          16.37 USD

2023-10-27 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-10-29 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -35.76 USD
  Expenses:Food:Restaurant                          35.76 USD

2023-10-30 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -122.87 USD
  Expenses:Food:Groceries                          122.87 USD

2023-11-03 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -58.59 USD
  Expenses:Food:Restaurant                          58.59 USD

2023-11-04 * "Chichipotle" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -25.84 USD
  Expenses:Food:Restaurant                          25.84 USD

2023-11-05 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -37.72 USD
  Expenses:Food:Restaurant                          37.72 USD

2023-11-06 balance Liabilities:US:Chase:Slate     -780.07 USD

2023-11-07 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -59.56 USD
  Expenses:Food:Groceries                           59.56 USD

2023-11-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       873.25 USD
  Assets:US:BofA:Checking                         -873.25 USD

2023-11-10 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -33.62 USD
  Expenses:Food:Restaurant                          33.62 USD

2023-11-11 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.26 USD
  Expenses:Food:Restaurant                          23.26 USD

2023-11-12 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -23.73 USD
  Expenses:Food:Restaurant                          23.73 USD

2023-11-16 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -31.06 USD
  Expenses:Food:Restaurant                          31.06 USD

2023-11-17 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -51.76 USD
  Expenses:Food:Restaurant                          51.76 USD

2023-11-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.52 USD
  Expenses:Food:Groceries                           78.52 USD

2023-11-21 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -46.27 USD
  Expenses:Food:Restaurant                          46.27 USD

2023-11-23 * "China Garden" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.95 USD
  Expenses:Food:Restaurant                          29.95 USD

2023-11-27 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-11-28 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.12 USD
  Expenses:Food:Restaurant                          30.12 USD

2023-11-30 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.61 USD
  Expenses:Food:Restaurant                          32.61 USD

2023-12-01 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -19.50 USD
  Expenses:Food:Restaurant                          19.50 USD

2023-12-02 balance Liabilities:US:Chase:Slate     -486.78 USD

2023-12-03 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -37.47 USD
  Expenses:Food:Restaurant                          37.47 USD

2023-12-04 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -131.78 USD
  Expenses:Food:Groceries                          131.78 USD

2023-12-07 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.72 USD
  Expenses:Food:Restaurant                          15.72 USD

2023-12-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       671.75 USD
  Assets:US:BofA:Checking                         -671.75 USD

2023-12-12 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -55.31 USD
  Expenses:Food:Restaurant                          55.31 USD

2023-12-14 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -41.38 USD
  Expenses:Food:Restaurant                          41.38 USD

2023-12-15 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -132.93 USD
  Expenses:Food:Groceries                          132.93 USD

2023-12-17 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -41.74 USD
  Expenses:Food:Restaurant                          41.74 USD

2023-12-19 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -32.46 USD
  Expenses:Food:Restaurant                          32.46 USD

2023-12-24 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -29.17 USD
  Expenses:Food:Restaurant                          29.17 USD

2023-12-25 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2023-12-26 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -97.38 USD
  Expenses:Food:Groceries                           97.38 USD

2023-12-27 balance Liabilities:US:Chase:Slate     -550.37 USD

2023-12-27 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -26.26 USD
  Expenses:Food:Restaurant                          26.26 USD

2023-12-29 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.53 USD
  Expenses:Food:Restaurant                          21.53 USD

2023-12-30 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -36.60 USD
  Expenses:Food:Restaurant                          36.60 USD

2023-12-31 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -83.58 USD
  Expenses:Food:Groceries                           83.58 USD

2024-01-01 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -24.47 USD
  Expenses:Food:Restaurant                          24.47 USD

2024-01-02 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -27.09 USD
  Expenses:Food:Restaurant                          27.09 USD

2024-01-05 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -28.20 USD
  Expenses:Food:Restaurant                          28.20 USD

2024-01-05 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -105.68 USD
  Expenses:Food:Groceries                          105.68 USD

2024-01-10 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -25.36 USD
  Expenses:Food:Restaurant                          25.36 USD

2024-01-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       958.61 USD
  Assets:US:BofA:Checking                         -958.61 USD

2024-01-14 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -29.47 USD
  Expenses:Food:Restaurant                          29.47 USD

2024-01-15 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -88.58 USD
  Expenses:Food:Groceries                           88.58 USD

2024-01-17 balance Liabilities:US:Chase:Slate      -88.58 USD

2024-01-19 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.50 USD
  Expenses:Food:Restaurant                          27.50 USD

2024-01-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -67.38 USD
  Expenses:Food:Groceries                           67.38 USD

2024-01-21 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.01 USD
  Expenses:Food:Restaurant                          31.01 USD

2024-01-24 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -35.34 USD
  Expenses:Food:Restaurant                          35.34 USD

2024-01-26 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-01-28 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -38.53 USD
  Expenses:Food:Restaurant                          38.53 USD

2024-01-28 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -60.72 USD
  Expenses:Food:Groceries                           60.72 USD

2024-02-01 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.65 USD
  Expenses:Food:Restaurant                          22.65 USD

2024-02-04 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.48 USD
  Expenses:Food:Restaurant                          33.48 USD

2024-02-07 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -40.75 USD
  Expenses:Food:Restaurant                          40.75 USD

2024-02-10 balance Liabilities:US:Chase:Slate     -565.94 USD

2024-02-10 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -24.57 USD
  Expenses:Food:Restaurant                          24.57 USD

2024-02-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       590.51 USD
  Assets:US:BofA:Checking                         -590.51 USD

2024-02-12 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.58 USD
  Expenses:Food:Restaurant                          27.58 USD

2024-02-15 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -69.44 USD
  Expenses:Food:Groceries                           69.44 USD

2024-02-16 event "location" "Boston"

2024-02-18 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -26.07 USD
  Expenses:Food:Restaurant                          26.07 USD

2024-02-20 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.53 USD
  Expenses:Food:Restaurant                          40.53 USD

2024-02-20 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2024-02-22 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -44.34 USD
  Expenses:Food:Restaurant                          44.34 USD

2024-02-22 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -35.07 USD
  Expenses:Food:Restaurant                          35.07 USD

2024-02-22 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.49 USD
  Expenses:Food:Restaurant                          32.49 USD

2024-02-23 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -38.56 USD
  Expenses:Food:Restaurant                          38.56 USD

2024-02-23 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -29.38 USD
  Expenses:Food:Restaurant                          29.38 USD

2024-02-23 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.02 USD
  Expenses:Food:Restaurant                          32.02 USD

2024-02-23 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.27 USD
  Expenses:Food:Coffee                               6.27 USD

2024-02-24 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -32.98 USD
  Expenses:Food:Restaurant                          32.98 USD

2024-02-24 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.48 USD
  Expenses:Food:Coffee                               6.48 USD

2024-02-25 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.44 USD
  Expenses:Food:Restaurant                          42.44 USD

2024-02-25 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2024-02-26 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.70 USD
  Expenses:Food:Coffee                               5.70 USD

2024-02-27 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -34.06 USD
  Expenses:Food:Restaurant                          34.06 USD

2024-02-28 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.47 USD
  Expenses:Food:Restaurant                          40.47 USD

2024-02-28 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.93 USD
  Expenses:Food:Restaurant                          37.93 USD

2024-02-29 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.97 USD
  Expenses:Food:Restaurant                          40.97 USD

2024-02-29 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -36.30 USD
  Expenses:Food:Restaurant                          36.30 USD

2024-03-02 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.23 USD
  Expenses:Food:Coffee                               5.23 USD

2024-03-03 * "Legal Seafood" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -40.75 USD
  Expenses:Food:Restaurant                          40.75 USD

2024-03-04 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -6.66 USD
  Expenses:Food:Coffee                               6.66 USD

2024-03-05 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.35 USD
  Expenses:Food:Restaurant                          42.35 USD

2024-03-05 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -33.02 USD
  Expenses:Food:Restaurant                          33.02 USD

2024-03-06 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.35 USD
  Expenses:Food:Restaurant                          37.35 USD

2024-03-07 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -37.09 USD
  Expenses:Food:Restaurant                          37.09 USD

2024-03-07 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -20.65 USD
  Expenses:Food:Restaurant                          20.65 USD

2024-03-08 * "Giacomo's Restaurant" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -42.39 USD
  Expenses:Food:Restaurant                          42.39 USD

2024-03-08 * "Franklin Cafe" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                       -28.99 USD
  Expenses:Food:Restaurant                          28.99 USD

2024-03-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       133.56 USD
  Assets:US:BofA:Checking                         -133.56 USD

2024-03-09 * "Starbucks" "" #trip-boston-2024
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2024-03-09 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -176 VACHR
  Expenses:Vacation                                   176 VACHR

2024-03-09 event "location" "New Metropolis"

2024-03-10 balance Liabilities:US:Chase:Slate     -863.81 USD

2024-03-10 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -36.54 USD
  Expenses:Food:Restaurant                          36.54 USD

2024-03-12 * "Chichipotle" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -19.01 USD
  Expenses:Food:Restaurant                          19.01 USD

2024-03-16 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -45.32 USD
  Expenses:Food:Restaurant                          45.32 USD

2024-03-16 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.45 USD
  Expenses:Food:Groceries                           78.45 USD

2024-03-21 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -37.95 USD
  Expenses:Food:Restaurant                          37.95 USD

2024-03-22 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -22.83 USD
  Expenses:Food:Restaurant                          22.83 USD

2024-03-25 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-03-26 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -27.42 USD
  Expenses:Food:Restaurant                          27.42 USD

2024-03-27 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.49 USD
  Expenses:Food:Restaurant                          33.49 USD

2024-03-30 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -112.48 USD
  Expenses:Food:Groceries                          112.48 USD

2024-04-01 balance Liabilities:US:Chase:Slate    -1397.30 USD

2024-04-01 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.89 USD
  Expenses:Food:Restaurant                          23.89 USD

2024-04-04 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -48.83 USD
  Expenses:Food:Restaurant                          48.83 USD

2024-04-06 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -34.53 USD
  Expenses:Food:Restaurant                          34.53 USD

2024-04-07 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -20.07 USD
  Expenses:Food:Restaurant                          20.07 USD

2024-04-08 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.71 USD
  Expenses:Food:Groceries                           82.71 USD

2024-04-09 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -25.21 USD
  Expenses:Food:Restaurant                          25.21 USD

2024-04-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       855.80 USD
  Assets:US:BofA:Checking                         -855.80 USD

2024-04-13 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                      -123.61 USD
  Expenses:Food:Groceries                          123.61 USD

2024-04-14 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -58.33 USD
  Expenses:Food:Restaurant                          58.33 USD

2024-04-15 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -15.58 USD
  Expenses:Food:Restaurant                          15.58 USD

2024-04-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -48.12 USD
  Expenses:Food:Groceries                           48.12 USD

2024-04-19 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.74 USD
  Expenses:Food:Restaurant                          27.74 USD

2024-04-20 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -22.70 USD
  Expenses:Food:Restaurant                          22.70 USD

2024-04-22 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -42.39 USD
  Expenses:Food:Restaurant                          42.39 USD

2024-04-22 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-04-26 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -23.91 USD
  Expenses:Food:Restaurant                          23.91 USD

2024-04-27 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.75 USD
  Expenses:Food:Restaurant                          17.75 USD

2024-04-29 balance Liabilities:US:Chase:Slate    -1276.87 USD

2024-04-29 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.06 USD
  Expenses:Food:Restaurant                          20.06 USD

2024-05-01 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -52.38 USD
  Expenses:Food:Restaurant                          52.38 USD

2024-05-05 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -19.03 USD
  Expenses:Food:Restaurant                          19.03 USD

2024-05-06 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -82.15 USD
  Expenses:Food:Groceries                           82.15 USD

2024-05-10 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.53 USD
  Expenses:Food:Restaurant                          23.53 USD

2024-05-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       573.67 USD
  Assets:US:BofA:Checking                         -573.67 USD

2024-05-12 * "Uncle Boons" "Eating out after work"
  Liabilities:US:Chase:Slate                       -22.26 USD
  Expenses:Food:Restaurant                          22.26 USD

2024-05-12 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -84.08 USD
  Expenses:Food:Groceries                           84.08 USD

2024-05-16 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.11 USD
  Expenses:Food:Restaurant                          30.11 USD

2024-05-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.00 USD
  Expenses:Food:Groceries                           96.00 USD

2024-05-20 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -26.50 USD
  Expenses:Food:Restaurant                          26.50 USD

2024-05-21 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-05-25 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -13.95 USD
  Expenses:Food:Restaurant                          13.95 USD

2024-05-27 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -61.85 USD
  Expenses:Food:Restaurant                          61.85 USD

2024-05-28 balance Liabilities:US:Chase:Slate    -1355.10 USD

2024-05-28 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -45.75 USD
  Expenses:Food:Groceries                           45.75 USD

2024-05-29 * "Kin Soy" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -55.96 USD
  Expenses:Food:Restaurant                          55.96 USD

2024-06-02 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.39 USD
  Expenses:Food:Restaurant                          30.39 USD

2024-06-03 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.10 USD
  Expenses:Food:Restaurant                          30.10 USD

2024-06-03 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -55.86 USD
  Expenses:Food:Groceries                           55.86 USD

2024-06-05 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -45.07 USD
  Expenses:Food:Restaurant                          45.07 USD

2024-06-06 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -22.64 USD
  Expenses:Food:Restaurant                          22.64 USD

2024-06-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       777.16 USD
  Assets:US:BofA:Checking                         -777.16 USD

2024-06-10 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -36.64 USD
  Expenses:Food:Restaurant                          36.64 USD

2024-06-15 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.21 USD
  Expenses:Food:Restaurant                          26.21 USD

2024-06-19 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -36.10 USD
  Expenses:Food:Restaurant                          36.10 USD

2024-06-21 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-06-22 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.82 USD
  Expenses:Food:Groceries                           62.82 USD

2024-06-23 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.03 USD
  Expenses:Food:Restaurant                          20.03 USD

2024-06-25 balance Liabilities:US:Chase:Slate    -1165.51 USD

2024-06-27 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -32.58 USD
  Expenses:Food:Restaurant                          32.58 USD

2024-06-30 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -74.53 USD
  Expenses:Food:Restaurant                          74.53 USD

2024-07-02 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.42 USD
  Expenses:Food:Restaurant                          33.42 USD

2024-07-05 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -71.08 USD
  Expenses:Food:Groceries                           71.08 USD

2024-07-07 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -33.86 USD
  Expenses:Food:Restaurant                          33.86 USD

2024-07-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       552.15 USD
  Assets:US:BofA:Checking                         -552.15 USD

2024-07-09 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -41.52 USD
  Expenses:Food:Restaurant                          41.52 USD

2024-07-14 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -25.02 USD
  Expenses:Food:Restaurant                          25.02 USD

2024-07-18 * "Jewel of Morroco" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.37 USD
  Expenses:Food:Restaurant                          26.37 USD

2024-07-18 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -68.03 USD
  Expenses:Food:Groceries                           68.03 USD

2024-07-19 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-07-21 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -52.50 USD
  Expenses:Food:Restaurant                          52.50 USD

2024-07-22 balance Liabilities:US:Chase:Slate    -1192.27 USD

2024-07-25 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -15.71 USD
  Expenses:Food:Restaurant                          15.71 USD

2024-07-27 * "Chichipotle" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -26.48 USD
  Expenses:Food:Restaurant                          26.48 USD

2024-07-28 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.90 USD
  Expenses:Food:Restaurant                          23.90 USD

2024-08-02 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -24.84 USD
  Expenses:Food:Restaurant                          24.84 USD

2024-08-03 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -20.02 USD
  Expenses:Food:Restaurant                          20.02 USD

2024-08-04 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -65.17 USD
  Expenses:Food:Groceries                           65.17 USD

2024-08-07 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -26.07 USD
  Expenses:Food:Restaurant                          26.07 USD

2024-08-10 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -41.45 USD
  Expenses:Food:Restaurant                          41.45 USD

2024-08-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       550.53 USD
  Assets:US:BofA:Checking                         -550.53 USD

2024-08-12 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -14.97 USD
  Expenses:Food:Restaurant                          14.97 USD

2024-08-13 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -30.21 USD
  Expenses:Food:Restaurant                          30.21 USD

2024-08-15 balance Liabilities:US:Chase:Slate     -930.56 USD

2024-08-15 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -29.37 USD
  Expenses:Food:Restaurant                          29.37 USD

2024-08-19 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.52 USD
  Expenses:Food:Restaurant                          27.52 USD

2024-08-20 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -24.54 USD
  Expenses:Food:Restaurant                          24.54 USD

2024-08-20 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-08-21 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.49 USD
  Expenses:Food:Groceries                           79.49 USD

2024-08-24 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -41.64 USD
  Expenses:Food:Restaurant                          41.64 USD

2024-08-27 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -54.24 USD
  Expenses:Food:Restaurant                          54.24 USD

2024-08-29 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -93.44 USD
  Expenses:Food:Groceries                           93.44 USD

2024-08-31 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -66.04 USD
  Expenses:Food:Restaurant                          66.04 USD

2024-09-04 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -29.79 USD
  Expenses:Food:Restaurant                          29.79 USD

2024-09-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       620.91 USD
  Assets:US:BofA:Checking                         -620.91 USD

2024-09-08 balance Liabilities:US:Chase:Slate     -875.72 USD

2024-09-09 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -24.63 USD
  Expenses:Food:Restaurant                          24.63 USD

2024-09-11 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.39 USD
  Expenses:Food:Restaurant                          22.39 USD

2024-09-12 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -80.41 USD
  Expenses:Food:Groceries                           80.41 USD

2024-09-13 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -20.60 USD
  Expenses:Food:Restaurant                          20.60 USD

2024-09-14 * "Cafe Modagor" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -17.37 USD
  Expenses:Food:Restaurant                          17.37 USD

2024-09-19 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -21.23 USD
  Expenses:Food:Restaurant                          21.23 USD

2024-09-20 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -75.39 USD
  Expenses:Food:Restaurant                          75.39 USD

2024-09-20 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-09-23 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -15.89 USD
  Expenses:Food:Restaurant                          15.89 USD

2024-09-26 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -16.35 USD
  Expenses:Food:Restaurant                          16.35 USD

2024-09-27 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -98.49 USD
  Expenses:Food:Groceries                           98.49 USD

2024-09-28 * "Jewel of Morroco" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.17 USD
  Expenses:Food:Restaurant                          21.17 USD

2024-09-30 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -34.48 USD
  Expenses:Food:Restaurant                          34.48 USD

2024-10-02 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.19 USD
  Expenses:Food:Restaurant                          23.19 USD

2024-10-07 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.71 USD
  Expenses:Food:Restaurant                          17.71 USD

2024-10-08 balance Liabilities:US:Chase:Slate    -1485.02 USD

2024-10-09 * "Cafe Modagor" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -11.01 USD
  Expenses:Food:Restaurant                          11.01 USD

2024-10-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       595.68 USD
  Assets:US:BofA:Checking                         -595.68 USD

2024-10-10 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -89.51 USD
  Expenses:Food:Groceries                           89.51 USD

2024-10-13 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -21.91 USD
  Expenses:Food:Restaurant                          21.91 USD

2024-10-14 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -44.94 USD
  Expenses:Food:Restaurant                          44.94 USD

2024-10-15 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -16.95 USD
  Expenses:Food:Restaurant                          16.95 USD

2024-10-17 * "Rose Flower" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -18.02 USD
  Expenses:Food:Restaurant                          18.02 USD

2024-10-20 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.78 USD
  Expenses:Food:Restaurant                          15.78 USD

2024-10-22 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-10-23 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -66.73 USD
  Expenses:Food:Groceries                           66.73 USD

2024-10-25 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.29 USD
  Expenses:Food:Restaurant                          21.29 USD

2024-10-28 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -25.92 USD
  Expenses:Food:Restaurant                          25.92 USD

2024-10-30 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -23.52 USD
  Expenses:Food:Restaurant                          23.52 USD

2024-10-31 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -56.17 USD
  Expenses:Food:Restaurant                          56.17 USD

2024-11-01 balance Liabilities:US:Chase:Slate    -1421.09 USD

2024-11-01 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -30.60 USD
  Expenses:Food:Restaurant                          30.60 USD

2024-11-05 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -14.05 USD
  Expenses:Food:Restaurant                          14.05 USD

2024-11-08 * "China Garden" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -28.17 USD
  Expenses:Food:Restaurant                          28.17 USD

2024-11-09 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -131.52 USD
  Expenses:Food:Groceries                          131.52 USD

2024-11-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       725.08 USD
  Assets:US:BofA:Checking                         -725.08 USD

2024-11-11 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -28.52 USD
  Expenses:Food:Restaurant                          28.52 USD

2024-11-14 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -54.60 USD
  Expenses:Food:Restaurant                          54.60 USD

2024-11-16 * "Uncle Boons" "Eating out "
  Liabilities:US:Chase:Slate                       -19.39 USD
  Expenses:Food:Restaurant                          19.39 USD

2024-11-18 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-11-20 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -90.51 USD
  Expenses:Food:Restaurant                          90.51 USD

2024-11-25 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -23.86 USD
  Expenses:Food:Restaurant                          23.86 USD

2024-11-25 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -63.39 USD
  Expenses:Food:Groceries                           63.39 USD

2024-11-27 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -41.20 USD
  Expenses:Food:Restaurant                          41.20 USD

2024-11-28 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.88 USD
  Expenses:Food:Restaurant                          33.88 USD

2024-11-29 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.64 USD
  Expenses:Food:Restaurant                          25.64 USD

2024-12-01 balance Liabilities:US:Chase:Slate    -1401.34 USD

2024-12-02 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -34.49 USD
  Expenses:Food:Restaurant                          34.49 USD

2024-12-03 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -86.60 USD
  Expenses:Food:Groceries                           86.60 USD

2024-12-04 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -16.15 USD
  Expenses:Food:Restaurant                          16.15 USD

2024-12-05 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -27.83 USD
  Expenses:Food:Restaurant                          27.83 USD

2024-12-10 * "Kin Soy" "Eating out "
  Liabilities:US:Chase:Slate                       -30.15 USD
  Expenses:Food:Restaurant                          30.15 USD

2024-12-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       696.21 USD
  Assets:US:BofA:Checking                         -696.21 USD

2024-12-11 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -32.50 USD
  Expenses:Food:Restaurant                          32.50 USD

2024-12-12 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -76.36 USD
  Expenses:Food:Groceries                           76.36 USD

2024-12-15 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -42.82 USD
  Expenses:Food:Restaurant                          42.82 USD

2024-12-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2024-12-17 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -16.64 USD
  Expenses:Food:Restaurant                          16.64 USD

2024-12-17 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -64.87 USD
  Expenses:Food:Groceries                           64.87 USD

2024-12-21 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -17.68 USD
  Expenses:Food:Restaurant                          17.68 USD

2024-12-23 balance Liabilities:US:Chase:Slate    -1271.22 USD

2024-12-23 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -112.67 USD
  Expenses:Food:Groceries                          112.67 USD

2024-12-25 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -15.99 USD
  Expenses:Food:Restaurant                          15.99 USD

2024-12-26 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.04 USD
  Expenses:Food:Restaurant                          31.04 USD

2024-12-27 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -44.09 USD
  Expenses:Food:Restaurant                          44.09 USD

2024-12-28 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -21.87 USD
  Expenses:Food:Restaurant                          21.87 USD

2024-12-29 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.30 USD
  Expenses:Food:Restaurant                          32.30 USD

2024-12-30 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -33.47 USD
  Expenses:Food:Restaurant                          33.47 USD

2024-12-30 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -78.36 USD
  Expenses:Food:Groceries                           78.36 USD

2025-01-02 * "Goba Goba" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -70.64 USD
  Expenses:Food:Restaurant                          70.64 USD

2025-01-07 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -37.56 USD
  Expenses:Food:Restaurant                          37.56 USD

2025-01-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       848.86 USD
  Assets:US:BofA:Checking                         -848.86 USD

2025-01-12 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -23.65 USD
  Expenses:Food:Restaurant                          23.65 USD

2025-01-13 balance Liabilities:US:Chase:Slate     -924.00 USD

2025-01-14 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-01-16 * "Jewel of Morroco" "Eating out "
  Liabilities:US:Chase:Slate                       -18.20 USD
  Expenses:Food:Restaurant                          18.20 USD

2025-01-16 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -111.57 USD
  Expenses:Food:Groceries                          111.57 USD

2025-01-19 * "Uncle Boons" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -30.98 USD
  Expenses:Food:Restaurant                          30.98 USD

2025-01-21 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -53.08 USD
  Expenses:Food:Restaurant                          53.08 USD

2025-01-23 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -13.71 USD
  Expenses:Food:Restaurant                          13.71 USD

2025-01-25 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.82 USD
  Expenses:Food:Restaurant                          20.82 USD

2025-01-30 * "Goba Goba" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -13.57 USD
  Expenses:Food:Restaurant                          13.57 USD

2025-02-03 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -44.36 USD
  Expenses:Food:Restaurant                          44.36 USD

2025-02-04 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -104.49 USD
  Expenses:Food:Groceries                          104.49 USD

2025-02-07 * "Rose Flower" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -32.09 USD
  Expenses:Food:Restaurant                          32.09 USD

2025-02-08 event "location" "Boston"

2025-02-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       598.93 USD
  Assets:US:BofA:Checking                         -598.93 USD

2025-02-09 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -27.39 USD
  Expenses:Food:Restaurant                          27.39 USD

2025-02-11 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -37.25 USD
  Expenses:Food:Restaurant                          37.25 USD

2025-02-12 balance Liabilities:US:Chase:Slate     -952.58 USD

2025-02-12 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -44.33 USD
  Expenses:Food:Restaurant                          44.33 USD

2025-02-12 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.71 USD
  Expenses:Food:Coffee                               6.71 USD

2025-02-13 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -36.45 USD
  Expenses:Food:Restaurant                          36.45 USD

2025-02-13 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.65 USD
  Expenses:Food:Restaurant                          32.65 USD

2025-02-15 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.58 USD
  Expenses:Food:Coffee                               5.58 USD

2025-02-16 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -38.39 USD
  Expenses:Food:Restaurant                          38.39 USD

2025-02-16 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -41.00 USD
  Expenses:Food:Restaurant                          41.00 USD

2025-02-16 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -7.35 USD
  Expenses:Food:Coffee                               7.35 USD

2025-02-17 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -42.94 USD
  Expenses:Food:Restaurant                          42.94 USD

2025-02-17 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.58 USD
  Expenses:Food:Coffee                               5.58 USD

2025-02-18 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -37.25 USD
  Expenses:Food:Restaurant                          37.25 USD

2025-02-18 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -23.80 USD
  Expenses:Food:Restaurant                          23.80 USD

2025-02-18 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.66 USD
  Expenses:Food:Coffee                               6.66 USD

2025-02-19 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.75 USD
  Expenses:Food:Restaurant                          32.75 USD

2025-02-19 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.26 USD
  Expenses:Food:Coffee                               5.26 USD

2025-02-22 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -31.02 USD
  Expenses:Food:Restaurant                          31.02 USD

2025-02-22 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.98 USD
  Expenses:Food:Coffee                               5.98 USD

2025-02-24 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -41.50 USD
  Expenses:Food:Restaurant                          41.50 USD

2025-02-24 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -27.53 USD
  Expenses:Food:Restaurant                          27.53 USD

2025-02-25 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -5.53 USD
  Expenses:Food:Coffee                               5.53 USD

2025-02-26 * "Giacomo's Restaurant" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.63 USD
  Expenses:Food:Restaurant                          32.63 USD

2025-02-27 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -29.89 USD
  Expenses:Food:Restaurant                          29.89 USD

2025-02-27 * "Starbucks" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                        -6.63 USD
  Expenses:Food:Coffee                               6.63 USD

2025-02-28 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -31.93 USD
  Expenses:Food:Restaurant                          31.93 USD

2025-03-01 * "Legal Seafood" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -32.69 USD
  Expenses:Food:Restaurant                          32.69 USD

2025-03-01 * "Franklin Cafe" "" #trip-boston-2025
  Liabilities:US:Chase:Slate                       -30.59 USD
  Expenses:Food:Restaurant                          30.59 USD

2025-03-01 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -168 VACHR
  Expenses:Vacation                                   168 VACHR

2025-03-01 event "location" "New Metropolis"

2025-03-05 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -12.41 USD
  Expenses:Food:Restaurant                          12.41 USD

2025-03-06 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.94 USD
  Expenses:Food:Restaurant                          21.94 USD

2025-03-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                        98.67 USD
  Assets:US:BofA:Checking                          -98.67 USD

2025-03-10 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -76.73 USD
  Expenses:Food:Groceries                           76.73 USD

2025-03-11 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -64.87 USD
  Expenses:Food:Restaurant                          64.87 USD

2025-03-13 balance Liabilities:US:Chase:Slate    -1672.48 USD

2025-03-14 * "Kin Soy" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -34.68 USD
  Expenses:Food:Restaurant                          34.68 USD

2025-03-17 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-03-18 * "Rose Flower" "Eating out alone"
  Liabilities:US:Chase:Slate                       -69.64 USD
  Expenses:Food:Restaurant                          69.64 USD

2025-03-19 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.96 USD
  Expenses:Food:Restaurant                          30.96 USD

2025-03-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -93.95 USD
  Expenses:Food:Groceries                           93.95 USD

2025-03-22 * "Goba Goba" "Eating out "
  Liabilities:US:Chase:Slate                       -31.51 USD
  Expenses:Food:Restaurant                          31.51 USD

2025-03-23 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -28.39 USD
  Expenses:Food:Restaurant                          28.39 USD

2025-03-26 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -25.56 USD
  Expenses:Food:Restaurant                          25.56 USD

2025-03-27 * "Cafe Modagor" "Eating out alone"
  Liabilities:US:Chase:Slate                       -52.28 USD
  Expenses:Food:Restaurant                          52.28 USD

2025-03-30 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -77.44 USD
  Expenses:Food:Groceries                           77.44 USD

2025-03-31 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -27.37 USD
  Expenses:Food:Restaurant                          27.37 USD

2025-04-04 balance Liabilities:US:Chase:Slate    -2264.26 USD

2025-04-04 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -12.78 USD
  Expenses:Food:Restaurant                          12.78 USD

2025-04-07 * "China Garden" "Eating out after work"
  Liabilities:US:Chase:Slate                       -63.49 USD
  Expenses:Food:Restaurant                          63.49 USD

2025-04-09 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -40.91 USD
  Expenses:Food:Restaurant                          40.91 USD

2025-04-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       773.83 USD
  Assets:US:BofA:Checking                         -773.83 USD

2025-04-10 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -44.86 USD
  Expenses:Food:Groceries                           44.86 USD

2025-04-11 * "Kin Soy" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -22.51 USD
  Expenses:Food:Restaurant                          22.51 USD

2025-04-15 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -21.12 USD
  Expenses:Food:Restaurant                          21.12 USD

2025-04-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-04-17 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -64.45 USD
  Expenses:Food:Restaurant                          64.45 USD

2025-04-18 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -23.83 USD
  Expenses:Food:Restaurant                          23.83 USD

2025-04-19 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -12.50 USD
  Expenses:Food:Restaurant                          12.50 USD

2025-04-21 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.14 USD
  Expenses:Food:Groceries                           99.14 USD

2025-04-24 * "Kin Soy" "Eating out after work"
  Liabilities:US:Chase:Slate                       -18.16 USD
  Expenses:Food:Restaurant                          18.16 USD

2025-04-25 balance Liabilities:US:Chase:Slate    -2034.18 USD

2025-04-29 * "Jewel of Morroco" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -28.86 USD
  Expenses:Food:Restaurant                          28.86 USD

2025-05-01 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -98.56 USD
  Expenses:Food:Groceries                           98.56 USD

2025-05-02 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -18.81 USD
  Expenses:Food:Restaurant                          18.81 USD

2025-05-04 * "China Garden" "Eating out alone"
  Liabilities:US:Chase:Slate                       -49.42 USD
  Expenses:Food:Restaurant                          49.42 USD

2025-05-05 * "China Garden" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -23.04 USD
  Expenses:Food:Restaurant                          23.04 USD

2025-05-07 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -39.73 USD
  Expenses:Food:Restaurant                          39.73 USD

2025-05-07 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       684.99 USD
  Assets:US:BofA:Checking                         -684.99 USD

2025-05-10 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -45.33 USD
  Expenses:Food:Restaurant                          45.33 USD

2025-05-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.59 USD
  Expenses:Food:Groceries                           79.59 USD

2025-05-15 * "Goba Goba" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -21.78 USD
  Expenses:Food:Restaurant                          21.78 USD

2025-05-18 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-05-19 * "Goba Goba" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.09 USD
  Expenses:Food:Restaurant                          35.09 USD

2025-05-20 * "Good Moods Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -60.97 USD
  Expenses:Food:Groceries                           60.97 USD

2025-05-22 * "Chichipotle" "Eating out alone"
  Liabilities:US:Chase:Slate                       -70.66 USD
  Expenses:Food:Restaurant                          70.66 USD

2025-05-23 balance Liabilities:US:Chase:Slate    -2041.03 USD

2025-05-24 * "Cafe Modagor" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.99 USD
  Expenses:Food:Restaurant                          25.99 USD

2025-05-27 * "Cafe Modagor" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -39.99 USD
  Expenses:Food:Restaurant                          39.99 USD

2025-05-28 * "China Garden" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -28.50 USD
  Expenses:Food:Restaurant                          28.50 USD

2025-05-28 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                       -96.42 USD
  Expenses:Food:Groceries                           96.42 USD

2025-06-01 * "Chichipotle" "Eating out after work"
  Liabilities:US:Chase:Slate                       -47.94 USD
  Expenses:Food:Restaurant                          47.94 USD

2025-06-02 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.18 USD
  Expenses:Food:Restaurant                          20.18 USD

2025-06-05 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -20.73 USD
  Expenses:Food:Restaurant                          20.73 USD

2025-06-08 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       745.01 USD
  Assets:US:BofA:Checking                         -745.01 USD

2025-06-09 * "Goba Goba" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -31.84 USD
  Expenses:Food:Restaurant                          31.84 USD

2025-06-11 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -10.82 USD
  Expenses:Food:Restaurant                          10.82 USD

2025-06-15 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -22.35 USD
  Expenses:Food:Restaurant                          22.35 USD

2025-06-15 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -91.27 USD
  Expenses:Food:Groceries                           91.27 USD

2025-06-16 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -29.56 USD
  Expenses:Food:Restaurant                          29.56 USD

2025-06-16 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-06-17 balance Liabilities:US:Chase:Slate    -1881.61 USD

2025-06-19 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -21.35 USD
  Expenses:Food:Restaurant                          21.35 USD

2025-06-21 * "Uncle Boons" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -41.80 USD
  Expenses:Food:Restaurant                          41.80 USD

2025-06-22 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -27.57 USD
  Expenses:Food:Restaurant                          27.57 USD

2025-06-26 * "Rose Flower" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -18.36 USD
  Expenses:Food:Restaurant                          18.36 USD

2025-06-26 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -61.05 USD
  Expenses:Food:Groceries                           61.05 USD

2025-06-29 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -35.93 USD
  Expenses:Food:Restaurant                          35.93 USD

2025-07-04 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -28.58 USD
  Expenses:Food:Restaurant                          28.58 USD

2025-07-06 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -79.83 USD
  Expenses:Food:Groceries                           79.83 USD

2025-07-07 * "Kin Soy" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -30.40 USD
  Expenses:Food:Restaurant                          30.40 USD

2025-07-08 * "Jewel of Morroco" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -34.23 USD
  Expenses:Food:Restaurant                          34.23 USD

2025-07-09 balance Liabilities:US:Chase:Slate    -2260.71 USD

2025-07-09 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       677.90 USD
  Assets:US:BofA:Checking                         -677.90 USD

2025-07-11 * "Uncle Boons" "Eating out alone"
  Liabilities:US:Chase:Slate                       -24.80 USD
  Expenses:Food:Restaurant                          24.80 USD

2025-07-12 * "Chichipotle" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -52.97 USD
  Expenses:Food:Restaurant                          52.97 USD

2025-07-15 * "Uncle Boons" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -34.43 USD
  Expenses:Food:Restaurant                          34.43 USD

2025-07-15 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-07-17 * "Rose Flower" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -55.58 USD
  Expenses:Food:Restaurant                          55.58 USD

2025-07-21 * "Jewel of Morroco" "Eating out after work"
  Liabilities:US:Chase:Slate                       -33.85 USD
  Expenses:Food:Restaurant                          33.85 USD

2025-07-22 * "Chichipotle" "Eating out with Natasha"
  Liabilities:US:Chase:Slate                       -22.69 USD
  Expenses:Food:Restaurant                          22.69 USD

2025-07-23 * "Kin Soy" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -22.54 USD
  Expenses:Food:Restaurant                          22.54 USD

2025-07-23 * "Corner Deli" "Buying groceries"
  Liabilities:US:Chase:Slate                       -72.93 USD
  Expenses:Food:Groceries                           72.93 USD

2025-07-27 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -20.59 USD
  Expenses:Food:Restaurant                          20.59 USD

2025-07-29 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -21.83 USD
  Expenses:Food:Restaurant                          21.83 USD

2025-07-30 balance Liabilities:US:Chase:Slate    -2065.02 USD

2025-07-31 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -37.59 USD
  Expenses:Food:Restaurant                          37.59 USD

2025-07-31 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -99.03 USD
  Expenses:Food:Groceries                           99.03 USD

2025-08-05 * "Goba Goba" "Eating out after work"
  Liabilities:US:Chase:Slate                       -24.44 USD
  Expenses:Food:Restaurant                          24.44 USD

2025-08-10 * "Goba Goba" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -25.93 USD
  Expenses:Food:Restaurant                          25.93 USD

2025-08-11 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       745.75 USD
  Assets:US:BofA:Checking                         -745.75 USD

2025-08-12 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -101.35 USD
  Expenses:Food:Groceries                          101.35 USD

2025-08-15 event "location" "New York"

2025-08-16 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.16 USD
  Expenses:Food:Coffee                               6.16 USD

2025-08-17 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -38.61 USD
  Expenses:Food:Restaurant                          38.61 USD

2025-08-17 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -29.83 USD
  Expenses:Food:Restaurant                          29.83 USD

2025-08-19 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -42.14 USD
  Expenses:Food:Restaurant                          42.14 USD

2025-08-19 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -32.18 USD
  Expenses:Food:Restaurant                          32.18 USD

2025-08-19 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -9.61 USD
  Expenses:Food:Coffee                               9.61 USD

2025-08-20 balance Liabilities:US:Chase:Slate    -1766.14 USD

2025-08-21 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -27.32 USD
  Expenses:Food:Restaurant                          27.32 USD

2025-08-21 * "Laut" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.70 USD
  Expenses:Food:Restaurant                          36.70 USD

2025-08-21 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.95 USD
  Expenses:Food:Coffee                               5.95 USD

2025-08-22 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -44.65 USD
  Expenses:Food:Restaurant                          44.65 USD

2025-08-22 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -45.20 USD
  Expenses:Food:Restaurant                          45.20 USD

2025-08-23 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.91 USD
  Expenses:Food:Restaurant                          36.91 USD

2025-08-23 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.27 USD
  Expenses:Food:Coffee                               5.27 USD

2025-08-24 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -48.45 USD
  Expenses:Food:Restaurant                          48.45 USD

2025-08-24 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.20 USD
  Expenses:Food:Coffee                               6.20 USD

2025-08-25 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -40.21 USD
  Expenses:Food:Restaurant                          40.21 USD

2025-08-25 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -34.44 USD
  Expenses:Food:Restaurant                          34.44 USD

2025-08-25 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -56.03 USD
  Expenses:Food:Restaurant                          56.03 USD

2025-08-25 * "Gimme! Coffee" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.90 USD
  Expenses:Food:Coffee                               6.90 USD

2025-08-27 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -44.41 USD
  Expenses:Food:Restaurant                          44.41 USD

2025-08-27 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -6.23 USD
  Expenses:Food:Coffee                               6.23 USD

2025-08-28 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -25.86 USD
  Expenses:Food:Restaurant                          25.86 USD

2025-08-28 * "La Colombe" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                        -5.60 USD
  Expenses:Food:Coffee                               5.60 USD

2025-08-29 * "Cafe Select" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.53 USD
  Expenses:Food:Restaurant                          36.53 USD

2025-08-30 * "Uncle Boons" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -42.11 USD
  Expenses:Food:Restaurant                          42.11 USD

2025-08-30 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -56.12 USD
  Expenses:Food:Restaurant                          56.12 USD

2025-08-31 * "Takahachi" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -51.26 USD
  Expenses:Food:Restaurant                          51.26 USD

2025-08-31 * "Laut" "" #trip-new-york-2025
  Liabilities:US:Chase:Slate                       -36.97 USD
  Expenses:Food:Restaurant                          36.97 USD

2025-09-01 * "Consume vacation days"
  Assets:US:Hooli:Vacation                           -136 VACHR
  Expenses:Vacation                                   136 VACHR

2025-09-01 event "location" "New Metropolis"

2025-09-02 * "China Garden" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -30.95 USD
  Expenses:Food:Restaurant                          30.95 USD

2025-09-05 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -35.62 USD
  Expenses:Food:Restaurant                          35.62 USD

2025-09-05 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                      -151.18 USD
  Expenses:Food:Groceries                          151.18 USD

2025-09-06 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -20.42 USD
  Expenses:Food:Restaurant                          20.42 USD

2025-09-07 * "Rose Flower" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -21.19 USD
  Expenses:Food:Restaurant                          21.19 USD

2025-09-10 * "Chase:Slate" "Paying off credit card"
  Liabilities:US:Chase:Slate                       321.58 USD
  Assets:US:BofA:Checking                         -321.58 USD

2025-09-11 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -62.22 USD
  Expenses:Food:Groceries                           62.22 USD

2025-09-12 * "Jewel of Morroco" "Eating out alone"
  Liabilities:US:Chase:Slate                       -33.68 USD
  Expenses:Food:Restaurant                          33.68 USD

2025-09-13 * "Metro Transport Authority" "Tram tickets"
  Liabilities:US:Chase:Slate                      -120.00 USD
  Expenses:Transport:Tram                          120.00 USD

2025-09-15 * "Cafe Modagor" "Eating out with Julie"
  Liabilities:US:Chase:Slate                       -26.23 USD
  Expenses:Food:Restaurant                          26.23 USD

2025-09-17 balance Liabilities:US:Chase:Slate    -2645.37 USD

2025-09-17 * "Jewel of Morroco" "Eating out with Bill"
  Liabilities:US:Chase:Slate                       -43.08 USD
  Expenses:Food:Restaurant                          43.08 USD

2025-09-21 * "China Garden" "Eating out "
  Liabilities:US:Chase:Slate                       -27.95 USD
  Expenses:Food:Restaurant                          27.95 USD

2025-09-25 * "Rose Flower" "Eating out after work"
  Liabilities:US:Chase:Slate                       -32.34 USD
  Expenses:Food:Restaurant                          32.34 USD

2025-09-26 * "Farmer Fresh" "Buying groceries"
  Liabilities:US:Chase:Slate                       -58.58 USD
  Expenses:Food:Groceries                           58.58 USD

2025-09-27 * "Chichipotle" "Eating out "
  Liabilities:US:Chase:Slate                       -53.62 USD
  Expenses:Food:Restaurant                          53.62 USD

2025-09-30 * "Rose Flower" "Eating out "
  Liabilities:US:Chase:Slate                       -24.86 USD
  Expenses:Food:Restaurant                          24.86 USD

2025-10-02 * "China Garden" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -30.49 USD
  Expenses:Food:Restaurant                          30.49 USD

2025-10-06 * "Uncle Boons" "Eating out with Joe"
  Liabilities:US:Chase:Slate                       -46.38 USD
  Expenses:Food:Restaurant                          46.38 USD

2025-10-07 balance Liabilities:US:Chase:Slate    -2962.67 USD

2025-10-07 * "Cafe Modagor" "Eating out after work"
  Liabilities:US:Chase:Slate                       -30.48 USD
  Expenses:Food:Restaurant                          30.48 USD

2025-10-09 * "Kin Soy" "Eating out alone"
  Liabilities:US:Chase:Slate                       -41.89 USD
  Expenses:Food:Restaurant                          41.89 USD

2025-10-10 * "Onion Market" "Buying groceries"
  Liabilities:US:Chase:Slate                      -119.10 USD
  Expenses:Food:Groceries                          119.10 USD

2025-10-11 * "Uncle Boons" "Eating out with work buddies"
  Liabilities:US:Chase:Slate                       -45.19 USD
  Expenses:Food:Restaurant                          45.19 USD



* Taxable Investments

2023-01-01 open Assets:US:ETrade:Cash                       USD
2023-01-01 open Assets:US:ETrade:ITOT                       ITOT
2023-01-01 open Assets:US:ETrade:VEA                       VEA
2023-01-01 open Assets:US:ETrade:VHT                       VHT
2023-01-01 open Assets:US:ETrade:GLD                       GLD
2023-01-01 open Income:US:ETrade:PnL                        USD
2023-01-01 open Income:US:ETrade:ITOT:Dividend              USD
2023-01-01 open Income:US:ETrade:VEA:Dividend              USD
2023-01-01 open Income:US:ETrade:VHT:Dividend              USD
2023-01-01 open Income:US:ETrade:GLD:Dividend              USD

2023-09-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                              0.00 USD
  Income:US:ETrade:VEA:Dividend                      0.00 USD

2023-10-22 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1274.85 USD
  Assets:US:ETrade:ITOT                                10 ITOT {126.59 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-10-22 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1298.81 USD
  Assets:US:ETrade:VEA                                 22 VEA {58.63 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-10-22 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1308.95 USD
  Assets:US:ETrade:VHT                                 26 VHT {50.00 USD, 2023-10-22}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                           -635.50 USD
  Assets:US:ETrade:ITOT                                 5 ITOT {125.31 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                           -705.91 USD
  Assets:US:ETrade:VEA                                 11 VEA {63.36 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                           -659.65 USD
  Assets:US:ETrade:GLD                                  6 GLD {108.45 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-16 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                           -669.55 USD
  Assets:US:ETrade:VHT                                 15 VHT {44.04 USD, 2023-12-16}
  Expenses:Financial:Commissions                     8.95 USD

2023-12-17 * "Sell shares of VEA"
  Assets:US:ETrade:VEA                                -22 VEA {58.63 USD, 2023-10-22} @ 63.36 USD
  Assets:US:ETrade:Cash                           1384.97 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                            -104.06 USD

2023-12-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             25.96 USD
  Income:US:ETrade:GLD:Dividend                    -25.96 USD

2023-12-22 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -26 VHT {50.00 USD, 2023-10-22} @ 43.48 USD
  Assets:US:ETrade:Cash                           1121.53 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             169.52 USD

2023-12-26 * "Sell shares of VEA"
  Assets:US:ETrade:VEA                                -11 VEA {63.36 USD, 2023-12-16} @ 66.57 USD
  Assets:US:ETrade:Cash                            723.32 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             -35.31 USD

2024-01-01 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -3578.95 USD
  Assets:US:ETrade:VHT                                 85 VHT {42.00 USD, 2024-01-01}
  Expenses:Financial:Commissions                     8.95 USD

2024-03-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             40.24 USD
  Income:US:ETrade:VEA:Dividend                    -40.24 USD

2024-06-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             40.24 USD
  Income:US:ETrade:GLD:Dividend                    -40.24 USD

2024-07-05 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -85 VHT {42.00 USD, 2024-01-01} @ 41.09 USD
  Assets:US:ETrade:Cash                           3483.70 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              77.35 USD

2024-07-06 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1706.70 USD
  Assets:US:ETrade:VEA                                 25 VEA {67.91 USD, 2024-07-06}
  Expenses:Financial:Commissions                     8.95 USD

2024-07-06 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1697.49 USD
  Assets:US:ETrade:GLD                                 14 GLD {120.61 USD, 2024-07-06}
  Expenses:Financial:Commissions                     8.95 USD

2024-08-07 * "Sell shares of VHT"
  Assets:US:ETrade:VHT                                -15 VHT {44.04 USD, 2023-12-16} @ 39.15 USD
  Assets:US:ETrade:Cash                            578.30 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              73.35 USD

2024-09-04 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -2276.05 USD
  Assets:US:ETrade:VEA                                 33 VEA {68.70 USD, 2024-09-04}
  Expenses:Financial:Commissions                     8.95 USD

2024-09-04 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -2191.45 USD
  Assets:US:ETrade:GLD                                 18 GLD {121.25 USD, 2024-09-04}
  Expenses:Financial:Commissions                     8.95 USD

2024-09-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             71.59 USD
  Income:US:ETrade:VEA:Dividend                    -71.59 USD

2024-10-30 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -4139.27 USD
  Assets:US:ETrade:GLD                                 34 GLD {121.48 USD, 2024-10-30}
  Expenses:Financial:Commissions                     8.95 USD

2024-12-03 * "Sell shares of ITOT"
  Assets:US:ETrade:ITOT                               -10 ITOT {126.59 USD, 2023-10-22} @ 115.63 USD
  Assets:US:ETrade:Cash                           1147.35 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                             109.60 USD

2024-12-08 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1188.79 USD
  Assets:US:ETrade:VHT                                 24 VHT {49.16 USD, 2024-12-08}
  Expenses:Financial:Commissions                     8.95 USD

2024-12-17 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             92.83 USD
  Income:US:ETrade:VHT:Dividend                    -92.83 USD

2025-01-06 * "Sell shares of ITOT"
  Assets:US:ETrade:ITOT                                -5 ITOT {125.31 USD, 2023-12-16} @ 112.46 USD
  Assets:US:ETrade:Cash                            553.35 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                              64.25 USD

2025-03-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                             92.83 USD
  Income:US:ETrade:VHT:Dividend                    -92.83 USD

2025-04-11 * "Sell shares of GLD"
  Assets:US:ETrade:GLD                                -34 GLD {121.48 USD, 2024-10-30} @ 131.74 USD
  Assets:US:ETrade:Cash                           4470.21 USD
  Expenses:Financial:Commissions                     8.95 USD
  Income:US:ETrade:PnL                            -348.84 USD

2025-04-28 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1672.00 USD
  Assets:US:ETrade:ITOT                                15 ITOT {110.87 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-04-28 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1708.63 USD
  Assets:US:ETrade:VEA                                 24 VEA {70.82 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-04-28 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1674.23 USD
  Assets:US:ETrade:VHT                                 32 VHT {52.04 USD, 2025-04-28}
  Expenses:Financial:Commissions                     8.95 USD

2025-06-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                            112.94 USD
  Income:US:ETrade:VEA:Dividend                   -112.94 USD

2025-08-18 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1076.18 USD
  Assets:US:ETrade:VHT                                 19 VHT {56.17 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1001.65 USD
  Assets:US:ETrade:ITOT                                 9 ITOT {110.30 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of VEA"
  Assets:US:ETrade:Cash                          -1058.35 USD
  Assets:US:ETrade:VEA                                 15 VEA {69.96 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-08-18 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1055.75 USD
  Assets:US:ETrade:GLD                                  8 GLD {130.85 USD, 2025-08-18}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-18 * "Dividends on portfolio"
  Assets:US:ETrade:Cash                            129.56 USD
  Income:US:ETrade:ITOT:Dividend                  -129.56 USD

2025-09-27 * "Buy shares of GLD"
  Assets:US:ETrade:Cash                          -1696.35 USD
  Assets:US:ETrade:GLD                                 13 GLD {129.80 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-27 * "Buy shares of ITOT"
  Assets:US:ETrade:Cash                          -1704.55 USD
  Assets:US:ETrade:ITOT                                15 ITOT {113.04 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD

2025-09-27 * "Buy shares of VHT"
  Assets:US:ETrade:Cash                          -1665.43 USD
  Assets:US:ETrade:VHT                                 29 VHT {57.12 USD, 2025-09-27}
  Expenses:Financial:Commissions                     8.95 USD



* Vanguard Investments

2023-01-01 open Assets:US:Vanguard:VBMPX                     VBMPX
  number: "882882"
2023-01-01 open Assets:US:Vanguard:RGAGX                     RGAGX
  number: "882882"
2023-01-01 open Assets:US:Vanguard                            USD
  institution: "Vanguard Group"
  address: "P.O. Box 1110, Valley Forge, PA 19482-1110"
  phone: "+1.800.523.1188"
2023-01-01 open Income:US:Hooli:Match401k                   USD
2023-01-01 open Assets:US:Vanguard:Cash                       USD
  number: "882882"

2023-01-06 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-01-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.122 VBMPX {47.42 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-01-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.614 RGAGX {156.05 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -720.01 USD

2023-01-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.061 VBMPX {47.42 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -239.99 USD

2023-01-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.307 RGAGX {156.05 USD, 2023-01-09}
  Assets:US:Vanguard:Cash                         -360.01 USD

2023-01-20 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-01-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.988 VBMPX {48.06 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -480.02 USD

2023-01-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.593 RGAGX {156.75 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -719.95 USD

2023-01-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.994 VBMPX {48.06 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -240.01 USD

2023-01-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.297 RGAGX {156.75 USD, 2023-01-23}
  Assets:US:Vanguard:Cash                         -360.05 USD

2023-02-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-02-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.998 VBMPX {48.01 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-02-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.576 RGAGX {157.34 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -719.99 USD

2023-02-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.999 VBMPX {48.01 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-02-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.288 RGAGX {157.34 USD, 2023-02-06}
  Assets:US:Vanguard:Cash                         -359.99 USD

2023-02-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-02-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.069 VBMPX {47.67 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-02-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.680 RGAGX {153.85 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -720.02 USD

2023-02-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.034 VBMPX {47.67 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -239.97 USD

2023-02-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.340 RGAGX {153.85 USD, 2023-02-20}
  Assets:US:Vanguard:Cash                         -360.01 USD

2023-03-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-03-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.082 VBMPX {47.61 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-03-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.589 RGAGX {156.90 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -720.01 USD

2023-03-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.041 VBMPX {47.61 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-03-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.294 RGAGX {156.90 USD, 2023-03-06}
  Assets:US:Vanguard:Cash                         -359.93 USD

2023-03-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-03-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.001 VBMPX {48.00 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -480.05 USD

2023-03-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.500 RGAGX {160.01 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-03-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.000 VBMPX {48.00 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-03-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.250 RGAGX {160.01 USD, 2023-03-20}
  Assets:US:Vanguard:Cash                         -360.02 USD

2023-03-31 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-04-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                         10.044 VBMPX {47.79 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-04-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.509 RGAGX {159.69 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-04-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          5.021 VBMPX {47.79 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -239.95 USD

2023-04-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.254 RGAGX {159.69 USD, 2023-04-03}
  Assets:US:Vanguard:Cash                         -359.94 USD

2023-04-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-04-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.984 VBMPX {48.08 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -480.03 USD

2023-04-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.409 RGAGX {163.31 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -720.03 USD

2023-04-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.991 VBMPX {48.08 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -239.97 USD

2023-04-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.204 RGAGX {163.31 USD, 2023-04-17}
  Assets:US:Vanguard:Cash                         -359.94 USD

2023-04-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.885 VBMPX {48.56 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -480.02 USD

2023-05-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.381 RGAGX {164.37 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -720.10 USD

2023-05-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.942 VBMPX {48.56 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -239.98 USD

2023-05-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.190 RGAGX {164.37 USD, 2023-05-01}
  Assets:US:Vanguard:Cash                         -359.97 USD

2023-05-12 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.913 VBMPX {48.42 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -479.99 USD

2023-05-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.317 RGAGX {166.77 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -719.95 USD

2023-05-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.957 VBMPX {48.42 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -240.02 USD

2023-05-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.159 RGAGX {166.77 USD, 2023-05-15}
  Assets:US:Vanguard:Cash                         -360.06 USD

2023-05-26 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-05-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.808 VBMPX {48.94 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-05-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.222 RGAGX {170.53 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -719.98 USD

2023-05-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.904 VBMPX {48.94 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-05-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.111 RGAGX {170.53 USD, 2023-05-29}
  Assets:US:Vanguard:Cash                         -359.99 USD

2023-06-09 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-06-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.810 VBMPX {48.93 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-06-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.227 RGAGX {170.33 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -719.98 USD

2023-06-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.905 VBMPX {48.93 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-06-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.114 RGAGX {170.33 USD, 2023-06-12}
  Assets:US:Vanguard:Cash                         -360.08 USD

2023-06-23 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-06-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.811 VBMPX {48.92 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -479.95 USD

2023-06-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.089 RGAGX {176.06 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -719.91 USD

2023-06-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.907 VBMPX {48.92 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -240.05 USD

2023-06-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.045 RGAGX {176.06 USD, 2023-06-26}
  Assets:US:Vanguard:Cash                         -360.04 USD

2023-07-07 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-07-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.714 VBMPX {49.41 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -479.97 USD

2023-07-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.972 RGAGX {181.27 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -720.00 USD

2023-07-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.857 VBMPX {49.41 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -239.98 USD

2023-07-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.986 RGAGX {181.27 USD, 2023-07-10}
  Assets:US:Vanguard:Cash                         -360.00 USD

2023-07-21 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2023-07-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.788 VBMPX {49.04 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -480.00 USD

2023-07-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          4.052 RGAGX {177.70 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -720.04 USD

2023-07-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.894 VBMPX {49.04 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -240.00 USD

2023-07-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          2.026 RGAGX {177.70 USD, 2023-07-24}
  Assets:US:Vanguard:Cash                         -360.02 USD

2023-08-04 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2023-08-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.062 VBMPX {49.23 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -199.97 USD

2023-08-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.689 RGAGX {177.64 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -300.03 USD

2023-08-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          2.031 VBMPX {49.23 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                          -99.99 USD

2023-08-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.844 RGAGX {177.64 USD, 2023-08-07}
  Assets:US:Vanguard:Cash                         -149.93 USD

2024-01-05 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-01-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.105 VBMPX {52.72 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -480.02 USD

2024-01-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.778 RGAGX {190.59 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -720.05 USD

2024-01-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.552 VBMPX {52.72 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -239.98 USD

2024-01-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.889 RGAGX {190.59 USD, 2024-01-08}
  Assets:US:Vanguard:Cash                         -360.02 USD

2024-01-19 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-01-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.141 VBMPX {52.51 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -479.99 USD

2024-01-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.763 RGAGX {191.31 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -719.90 USD

2024-01-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.571 VBMPX {52.51 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -240.02 USD

2024-01-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.882 RGAGX {191.31 USD, 2024-01-22}
  Assets:US:Vanguard:Cash                         -360.05 USD

2024-02-02 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-02-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.041 VBMPX {53.09 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -479.99 USD

2024-02-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.901 RGAGX {184.58 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -720.05 USD

2024-02-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.520 VBMPX {53.09 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-02-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.950 RGAGX {184.58 USD, 2024-02-05}
  Assets:US:Vanguard:Cash                         -359.93 USD

2024-02-16 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-02-19 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.035 VBMPX {53.13 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -480.03 USD

2024-02-19 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.856 RGAGX {186.75 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -720.11 USD

2024-02-19 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.517 VBMPX {53.13 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -239.99 USD

2024-02-19 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.928 RGAGX {186.75 USD, 2024-02-19}
  Assets:US:Vanguard:Cash                         -360.05 USD

2024-03-01 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-03-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.203 VBMPX {52.15 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -479.94 USD

2024-03-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.982 RGAGX {180.78 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -719.87 USD

2024-03-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.603 VBMPX {52.15 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -240.05 USD

2024-03-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.992 RGAGX {180.78 USD, 2024-03-04}
  Assets:US:Vanguard:Cash                         -360.11 USD

2024-03-15 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-03-18 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.160 VBMPX {52.40 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -479.98 USD

2024-03-18 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.919 RGAGX {183.69 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -719.88 USD

2024-03-18 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.581 VBMPX {52.40 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -240.04 USD

2024-03-18 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.960 RGAGX {183.69 USD, 2024-03-18}
  Assets:US:Vanguard:Cash                         -360.03 USD

2024-03-29 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.138 VBMPX {52.53 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -480.02 USD

2024-04-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.800 RGAGX {189.45 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -719.91 USD

2024-04-01 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.569 VBMPX {52.53 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -240.01 USD

2024-04-01 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.900 RGAGX {189.45 USD, 2024-04-01}
  Assets:US:Vanguard:Cash                         -359.96 USD

2024-04-12 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.118 VBMPX {52.65 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -480.06 USD

2024-04-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.743 RGAGX {192.39 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -720.12 USD

2024-04-15 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.558 VBMPX {52.65 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -239.98 USD

2024-04-15 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.871 RGAGX {192.39 USD, 2024-04-15}
  Assets:US:Vanguard:Cash                         -359.96 USD

2024-04-26 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-04-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.118 VBMPX {52.64 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -479.97 USD

2024-04-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.618 RGAGX {199.01 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -720.02 USD

2024-04-29 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.559 VBMPX {52.64 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -239.99 USD

2024-04-29 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.809 RGAGX {199.01 USD, 2024-04-29}
  Assets:US:Vanguard:Cash                         -360.01 USD

2024-05-10 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-05-13 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.129 VBMPX {52.58 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -480.00 USD

2024-05-13 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.530 RGAGX {203.94 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -719.91 USD

2024-05-13 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.565 VBMPX {52.58 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -240.03 USD

2024-05-13 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.765 RGAGX {203.94 USD, 2024-05-13}
  Assets:US:Vanguard:Cash                         -359.95 USD

2024-05-24 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-05-27 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.179 VBMPX {52.30 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -480.06 USD

2024-05-27 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.498 RGAGX {205.85 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -720.06 USD

2024-05-27 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.589 VBMPX {52.30 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -240.00 USD

2024-05-27 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.749 RGAGX {205.85 USD, 2024-05-27}
  Assets:US:Vanguard:Cash                         -360.03 USD

2024-06-07 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-06-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.146 VBMPX {52.48 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -479.98 USD

2024-06-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.489 RGAGX {206.38 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -720.06 USD

2024-06-10 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.572 VBMPX {52.48 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -239.94 USD

2024-06-10 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.744 RGAGX {206.38 USD, 2024-06-10}
  Assets:US:Vanguard:Cash                         -359.93 USD

2024-06-21 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-06-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.154 VBMPX {52.44 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -480.04 USD

2024-06-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.564 RGAGX {202.04 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -720.07 USD

2024-06-24 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.576 VBMPX {52.44 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-06-24 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.782 RGAGX {202.04 USD, 2024-06-24}
  Assets:US:Vanguard:Cash                         -360.04 USD

2024-07-05 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-07-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.182 VBMPX {52.27 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -479.94 USD

2024-07-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.552 RGAGX {202.70 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -719.99 USD

2024-07-08 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.591 VBMPX {52.27 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -239.97 USD

2024-07-08 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.776 RGAGX {202.70 USD, 2024-07-08}
  Assets:US:Vanguard:Cash                         -360.00 USD

2024-07-19 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2024-07-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          9.126 VBMPX {52.60 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -480.03 USD

2024-07-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.511 RGAGX {205.07 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -720.00 USD

2024-07-22 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.563 VBMPX {52.60 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -240.01 USD

2024-07-22 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.755 RGAGX {205.07 USD, 2024-07-22}
  Assets:US:Vanguard:Cash                         -359.90 USD

2024-08-02 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2024-08-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.791 VBMPX {52.77 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -200.05 USD

2024-08-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.414 RGAGX {212.16 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -299.99 USD

2024-08-05 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          1.895 VBMPX {52.77 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -100.00 USD

2024-08-05 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.707 RGAGX {212.16 USD, 2024-08-05}
  Assets:US:Vanguard:Cash                         -150.00 USD

2025-01-03 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-01-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.379 VBMPX {57.29 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -480.03 USD

2025-01-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.328 RGAGX {216.33 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -719.95 USD

2025-01-06 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.190 VBMPX {57.29 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -240.05 USD

2025-01-06 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.664 RGAGX {216.33 USD, 2025-01-06}
  Assets:US:Vanguard:Cash                         -359.97 USD

2025-01-17 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-01-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.259 VBMPX {58.12 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -480.01 USD

2025-01-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.273 RGAGX {219.98 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -719.99 USD

2025-01-20 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.130 VBMPX {58.12 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -240.04 USD

2025-01-20 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.637 RGAGX {219.98 USD, 2025-01-20}
  Assets:US:Vanguard:Cash                         -360.11 USD

2025-01-31 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-02-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.245 VBMPX {58.21 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -479.94 USD

2025-02-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.229 RGAGX {222.97 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-02-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.123 VBMPX {58.21 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -240.00 USD

2025-02-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.615 RGAGX {222.97 USD, 2025-02-03}
  Assets:US:Vanguard:Cash                         -360.10 USD

2025-02-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-02-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.156 VBMPX {58.85 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-02-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.115 RGAGX {231.12 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -719.94 USD

2025-02-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.078 VBMPX {58.85 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -239.99 USD

2025-02-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.558 RGAGX {231.12 USD, 2025-02-17}
  Assets:US:Vanguard:Cash                         -360.08 USD

2025-02-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.009 VBMPX {59.93 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-03-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.136 RGAGX {229.60 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -720.03 USD

2025-03-03 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.004 VBMPX {59.93 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-03-03 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.568 RGAGX {229.60 USD, 2025-03-03}
  Assets:US:Vanguard:Cash                         -360.01 USD

2025-03-14 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          8.001 VBMPX {59.99 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -479.98 USD

2025-03-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.224 RGAGX {223.34 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -720.05 USD

2025-03-17 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          4.000 VBMPX {59.99 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-03-17 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.612 RGAGX {223.34 USD, 2025-03-17}
  Assets:US:Vanguard:Cash                         -360.02 USD

2025-03-28 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-03-31 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.902 VBMPX {60.74 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-03-31 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.212 RGAGX {224.16 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -720.00 USD

2025-03-31 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.951 VBMPX {60.74 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -239.98 USD

2025-03-31 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.606 RGAGX {224.16 USD, 2025-03-31}
  Assets:US:Vanguard:Cash                         -360.00 USD

2025-04-11 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-04-14 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.871 VBMPX {60.98 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-04-14 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.232 RGAGX {222.76 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -719.96 USD

2025-04-14 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.936 VBMPX {60.98 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -240.02 USD

2025-04-14 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.616 RGAGX {222.76 USD, 2025-04-14}
  Assets:US:Vanguard:Cash                         -359.98 USD

2025-04-25 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-04-28 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.765 VBMPX {61.82 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -480.03 USD

2025-04-28 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.201 RGAGX {224.92 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-04-28 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.882 VBMPX {61.82 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -239.99 USD

2025-04-28 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.601 RGAGX {224.92 USD, 2025-04-28}
  Assets:US:Vanguard:Cash                         -360.10 USD

2025-05-09 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-05-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.688 VBMPX {62.43 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -479.96 USD

2025-05-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.260 RGAGX {220.85 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -719.97 USD

2025-05-12 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.844 VBMPX {62.43 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -239.98 USD

2025-05-12 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.630 RGAGX {220.85 USD, 2025-05-12}
  Assets:US:Vanguard:Cash                         -359.99 USD

2025-05-23 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-05-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.711 VBMPX {62.25 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -480.01 USD

2025-05-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.321 RGAGX {216.78 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -719.93 USD

2025-05-26 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.856 VBMPX {62.25 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -240.04 USD

2025-05-26 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.661 RGAGX {216.78 USD, 2025-05-26}
  Assets:US:Vanguard:Cash                         -360.07 USD

2025-06-06 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-06-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.698 VBMPX {62.35 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -479.97 USD

2025-06-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.299 RGAGX {218.23 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -719.94 USD

2025-06-09 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.850 VBMPX {62.35 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -240.05 USD

2025-06-09 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.650 RGAGX {218.23 USD, 2025-06-09}
  Assets:US:Vanguard:Cash                         -360.08 USD

2025-06-20 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-06-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.683 VBMPX {62.47 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -479.96 USD

2025-06-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.339 RGAGX {215.60 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -719.89 USD

2025-06-23 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.842 VBMPX {62.47 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -240.01 USD

2025-06-23 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.670 RGAGX {215.60 USD, 2025-06-23}
  Assets:US:Vanguard:Cash                         -360.05 USD

2025-07-04 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-07-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.616 VBMPX {63.03 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -480.04 USD

2025-07-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.318 RGAGX {217.02 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -720.07 USD

2025-07-07 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.807 VBMPX {63.03 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -239.96 USD

2025-07-07 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.659 RGAGX {217.02 USD, 2025-07-07}
  Assets:US:Vanguard:Cash                         -360.04 USD

2025-07-18 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          600.00 USD
  Income:US:Hooli:Match401k                       -600.00 USD

2025-07-21 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          7.673 VBMPX {62.55 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -479.95 USD

2025-07-21 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          3.252 RGAGX {221.38 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -719.93 USD

2025-07-21 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.837 VBMPX {62.55 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -240.00 USD

2025-07-21 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.626 RGAGX {221.38 USD, 2025-07-21}
  Assets:US:Vanguard:Cash                         -359.96 USD

2025-08-01 * "Employer match for contribution"
  Assets:US:Vanguard:Cash                          250.00 USD
  Income:US:Hooli:Match401k                       -250.00 USD

2025-08-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          3.205 VBMPX {62.41 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -200.02 USD

2025-08-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          1.321 RGAGX {227.19 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -300.12 USD

2025-08-04 * "Investing 40% of cash in VBMPX"
  Assets:US:Vanguard:VBMPX                          1.602 VBMPX {62.41 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                          -99.98 USD

2025-08-04 * "Investing 60% of cash in RGAGX"
  Assets:US:Vanguard:RGAGX                          0.660 RGAGX {227.19 USD, 2025-08-04}
  Assets:US:Vanguard:Cash                         -149.95 USD



* Sources of Income

2023-01-01 open Income:US:Hooli:Salary                      USD
2023-01-01 open Income:US:Hooli:GroupTermLife               USD
2023-01-01 open Income:US:Hooli:Vacation                    VACHR
2023-01-01 open Assets:US:Hooli:Vacation                    VACHR
2023-01-01 open Expenses:Vacation                               VACHR
2023-01-01 open Expenses:Health:Life:GroupTermLife
2023-01-01 open Expenses:Health:Medical:Insurance
2023-01-01 open Expenses:Health:Dental:Insurance
2023-01-01 open Expenses:Health:Vision:Insurance

2023-01-01 event "employer" "Hooli, 1 Carloston Rd, Mountain Beer, CA"

2023-01-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-01-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-02-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-02-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-03-30 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-04-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-04-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-05-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-05-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-06-08 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-06-22 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-07-06 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-07-20 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-03 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2023:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-17 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-08-31 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-09-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-09-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-10-12 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-10-26 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-11-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-11-23 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-12-07 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2589.06 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                   243.08 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2023-12-21 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2832.14 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2023:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2023:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2023:US:State                    365.08 USD
  Expenses:Taxes:Y2023:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2023:US:SDI                        1.12 USD
  Expenses:Taxes:Y2023:US:SocSec                     0.00 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-01-04 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-01-18 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-01 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-15 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-02-29 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-03-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-03-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-04-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-04-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-05-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-05-23 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-06-06 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-06-20 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-07-04 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-07-18 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-01 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2024:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-15 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-08-29 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-09-12 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-09-26 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-10-10 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-10-24 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-11-07 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-11-21 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-12-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2589.06 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                   243.08 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2024-12-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2832.14 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2024:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2024:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2024:US:State                    365.08 USD
  Expenses:Taxes:Y2024:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2024:US:SDI                        1.12 USD
  Expenses:Taxes:Y2024:US:SocSec                     0.00 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-02 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-16 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-01-30 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-02-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-02-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-03-13 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-03-27 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-04-10 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-04-24 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-05-08 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-05-22 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-06-05 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-06-19 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-03 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-17 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         1350.60 USD
  Assets:US:Vanguard:Cash                         1200.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                   -1200.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k      1200.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-07-31 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2050.60 USD
  Assets:US:Vanguard:Cash                          500.00 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Federal:PreTax401k                    -500.00 IRAUSD
  Expenses:Taxes:Y2025:US:Federal:PreTax401k       500.00 IRAUSD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-08-14 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-08-28 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-09-11 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-09-25 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR

2025-10-09 * "Hooli" "Payroll"
  Assets:US:BofA:Checking                         2550.60 USD
  Income:US:Hooli:Salary                         -4615.38 USD
  Income:US:Hooli:GroupTermLife                    -24.32 USD
  Expenses:Health:Life:GroupTermLife                24.32 USD
  Expenses:Health:Dental:Insurance                   2.90 USD
  Expenses:Health:Medical:Insurance                 27.38 USD
  Expenses:Health:Vision:Insurance                  42.30 USD
  Expenses:Taxes:Y2025:US:Medicare                 106.62 USD
  Expenses:Taxes:Y2025:US:Federal                 1062.92 USD
  Expenses:Taxes:Y2025:US:State                    365.08 USD
  Expenses:Taxes:Y2025:US:CityNYC                  174.92 USD
  Expenses:Taxes:Y2025:US:SDI                        1.12 USD
  Expenses:Taxes:Y2025:US:SocSec                   281.54 USD
  Assets:US:Hooli:Vacation                              5 VACHR
  Income:US:Hooli:Vacation                             -5 VACHR



* Taxes

1980-05-12 open Income:US:Federal:PreTax401k                    IRAUSD
1980-05-12 open Assets:US:Federal:PreTax401k                    IRAUSD



** Tax Year 2023

2023-01-01 open Expenses:Taxes:Y2023:US:Federal:PreTax401k      IRAUSD
2023-01-01 open Expenses:Taxes:Y2023:US:Medicare                USD
2023-01-01 open Expenses:Taxes:Y2023:US:Federal                 USD
2023-01-01 open Expenses:Taxes:Y2023:US:CityNYC                 USD
2023-01-01 open Expenses:Taxes:Y2023:US:SDI                     USD
2023-01-01 open Expenses:Taxes:Y2023:US:State                   USD
2023-01-01 open Expenses:Taxes:Y2023:US:SocSec                  USD

2023-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2023-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD

2024-03-21 * "Filing taxes for 2023"
  Expenses:Taxes:Y2023:US:Federal                  439.85 USD
  Expenses:Taxes:Y2023:US:State                    167.16 USD
  Liabilities:AccountsPayable                     -607.01 USD

2024-03-21 * "STATE TAX & FINANC PYMT"
  Assets:US:BofA:Checking                         -167.16 USD
  Liabilities:AccountsPayable                      167.16 USD

2024-03-24 * "FEDERAL TAXPYMT"
  Assets:US:BofA:Checking                         -439.85 USD
  Liabilities:AccountsPayable                      439.85 USD



** Tax Year 2024

2024-01-01 open Expenses:Taxes:Y2024:US:Federal:PreTax401k      IRAUSD
2024-01-01 open Expenses:Taxes:Y2024:US:Medicare                USD
2024-01-01 open Expenses:Taxes:Y2024:US:Federal                 USD
2024-01-01 open Expenses:Taxes:Y2024:US:CityNYC                 USD
2024-01-01 open Expenses:Taxes:Y2024:US:SDI                     USD
2024-01-01 open Expenses:Taxes:Y2024:US:State                   USD
2024-01-01 open Expenses:Taxes:Y2024:US:SocSec                  USD

2024-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2024-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD

2025-03-25 * "Filing taxes for 2024"
  Expenses:Taxes:Y2024:US:Federal                  467.37 USD
  Expenses:Taxes:Y2024:US:State                    376.14 USD
  Liabilities:AccountsPayable                     -843.51 USD

2025-03-25 * "STATE TAX & FINANC PYMT"
  Assets:US:BofA:Checking                         -376.14 USD
  Liabilities:AccountsPayable                      376.14 USD

2025-03-27 * "FEDERAL TAXPYMT"
  Assets:US:BofA:Checking                         -467.37 USD
  Liabilities:AccountsPayable                      467.37 USD



** Tax Year 2025

2025-01-01 open Expenses:Taxes:Y2025:US:Federal:PreTax401k      IRAUSD
2025-01-01 open Expenses:Taxes:Y2025:US:Medicare                USD
2025-01-01 open Expenses:Taxes:Y2025:US:Federal                 USD
2025-01-01 open Expenses:Taxes:Y2025:US:CityNYC                 USD
2025-01-01 open Expenses:Taxes:Y2025:US:SDI                     USD
2025-01-01 open Expenses:Taxes:Y2025:US:State                   USD
2025-01-01 open Expenses:Taxes:Y2025:US:SocSec                  USD

2025-01-01 balance Assets:US:Federal:PreTax401k         0 IRAUSD

2025-01-01 * "Allowed contributions for one year"
  Income:US:Federal:PreTax401k                     -18500 IRAUSD
  Assets:US:Federal:PreTax401k                      18500 IRAUSD



* Expenses

1980-05-12 open Expenses:Food:Groceries
1980-05-12 open Expenses:Food:Restaurant
1980-05-12 open Expenses:Food:Coffee
1980-05-12 open Expenses:Food:Alcohol
1980-05-12 open Expenses:Transport:Tram
1980-05-12 open Expenses:Home:Rent
1980-05-12 open Expenses:Home:Electricity
1980-05-12 open Expenses:Home:Internet
1980-05-12 open Expenses:Home:Phone
1980-05-12 open Expenses:Financial:Fees
1980-05-12 open Expenses:Financial:Commissions



* Prices

2023-01-06 price VBMPX                              47.42 USD
2023-01-06 price RGAGX                             156.05 USD
2023-01-06 price ITOT                              123.64 USD
2023-01-06 price VEA                                55.80 USD
2023-01-06 price VHT                                45.24 USD
2023-01-06 price GLD                                96.26 USD
2023-01-13 price VBMPX                              47.64 USD
2023-01-13 price RGAGX                             157.74 USD
2023-01-13 price ITOT                              125.51 USD
2023-01-13 price VEA                                56.58 USD
2023-01-13 price VHT                                43.68 USD
2023-01-13 price GLD                                97.17 USD
2023-01-20 price VBMPX                              48.06 USD
2023-01-20 price RGAGX                             156.75 USD
2023-01-20 price ITOT                              123.87 USD
2023-01-20 price VEA                                57.76 USD
2023-01-20 price VHT                                41.73 USD
2023-01-20 price GLD                                97.53 USD
2023-01-27 price VBMPX                              47.99 USD
2023-01-27 price RGAGX                             156.58 USD
2023-01-27 price ITOT                              125.43 USD
2023-01-27 price VEA                                55.34 USD
2023-01-27 price VHT                                41.78 USD
2023-01-27 price GLD                                98.64 USD
2023-02-03 price VBMPX                              48.01 USD
2023-02-03 price RGAGX                             157.34 USD
2023-02-03 price ITOT                              125.38 USD
2023-02-03 price VEA                                55.13 USD
2023-02-03 price VHT                                41.07 USD
2023-02-03 price GLD                                99.21 USD
2023-02-10 price VBMPX                              47.74 USD
2023-02-10 price RGAGX                             154.62 USD
2023-02-10 price ITOT                              122.46 USD
2023-02-10 price VEA                                54.65 USD
2023-02-10 price VHT                                40.41 USD
2023-02-10 price GLD                                99.87 USD
2023-02-17 price VBMPX                              47.67 USD
2023-02-17 price RGAGX                             153.85 USD
2023-02-17 price ITOT                              123.81 USD
2023-02-17 price VEA                                55.78 USD
2023-02-17 price VHT                                40.94 USD
2023-02-17 price GLD                               100.96 USD
2023-02-24 price VBMPX                              47.61 USD
2023-02-24 price RGAGX                             153.68 USD
2023-02-24 price ITOT                              123.11 USD
2023-02-24 price VEA                                58.06 USD
2023-02-24 price VHT                                41.11 USD
2023-02-24 price GLD                               100.37 USD
2023-03-03 price VBMPX                              47.61 USD
2023-03-03 price RGAGX                             156.90 USD
2023-03-03 price ITOT                              121.47 USD
2023-03-03 price VEA                                60.07 USD
2023-03-03 price VHT                                42.25 USD
2023-03-03 price GLD                                99.56 USD
2023-03-10 price VBMPX                              47.94 USD
2023-03-10 price RGAGX                             160.27 USD
2023-03-10 price ITOT                              124.97 USD
2023-03-10 price VEA                                60.46 USD
2023-03-10 price VHT                                41.86 USD
2023-03-10 price GLD                                99.14 USD
2023-03-17 price VBMPX                              48.00 USD
2023-03-17 price RGAGX                             160.01 USD
2023-03-17 price ITOT                              123.76 USD
2023-03-17 price VEA                                60.43 USD
2023-03-17 price VHT                                41.86 USD
2023-03-17 price GLD                                99.60 USD
2023-03-24 price VBMPX                              48.07 USD
2023-03-24 price RGAGX                             159.58 USD
2023-03-24 price ITOT                              126.05 USD
2023-03-24 price VEA                                59.21 USD
2023-03-24 price VHT                                42.80 USD
2023-03-24 price GLD                               100.78 USD
2023-03-31 price VBMPX                              47.79 USD
2023-03-31 price RGAGX                             159.69 USD
2023-03-31 price ITOT                              126.66 USD
2023-03-31 price VEA                                58.81 USD
2023-03-31 price VHT                                42.85 USD
2023-03-31 price GLD                               101.58 USD
2023-04-07 price VBMPX                              48.30 USD
2023-04-07 price RGAGX                             162.28 USD
2023-04-07 price ITOT                              127.72 USD
2023-04-07 price VEA                                59.61 USD
2023-04-07 price VHT                                43.49 USD
2023-04-07 price GLD                               101.93 USD
2023-04-14 price VBMPX                              48.08 USD
2023-04-14 price RGAGX                             163.31 USD
2023-04-14 price ITOT                              128.12 USD
2023-04-14 price VEA                                61.04 USD
2023-04-14 price VHT                                43.32 USD
2023-04-14 price GLD                               102.48 USD
2023-04-21 price VBMPX                              48.28 USD
2023-04-21 price RGAGX                             164.28 USD
2023-04-21 price ITOT                              126.94 USD
2023-04-21 price VEA                                60.93 USD
2023-04-21 price VHT                                43.71 USD
2023-04-21 price GLD                               102.03 USD
2023-04-28 price VBMPX                              48.56 USD
2023-04-28 price RGAGX                             164.37 USD
2023-04-28 price ITOT                              125.10 USD
2023-04-28 price VEA                                60.93 USD
2023-04-28 price VHT                                42.51 USD
2023-04-28 price GLD                               103.35 USD
2023-05-05 price VBMPX                              48.73 USD
2023-05-05 price RGAGX                             163.17 USD
2023-05-05 price ITOT                              125.93 USD
2023-05-05 price VEA                                60.15 USD
2023-05-05 price VHT                                43.67 USD
2023-05-05 price GLD                               102.77 USD
2023-05-12 price VBMPX                              48.42 USD
2023-05-12 price RGAGX                             166.77 USD
2023-05-12 price ITOT                              123.15 USD
2023-05-12 price VEA                                60.52 USD
2023-05-12 price VHT                                43.67 USD
2023-05-12 price GLD                               103.90 USD
2023-05-19 price VBMPX                              48.25 USD
2023-05-19 price RGAGX                             171.12 USD
2023-05-19 price ITOT                              121.64 USD
2023-05-19 price VEA                                60.74 USD
2023-05-19 price VHT                                44.19 USD
2023-05-19 price GLD                               104.13 USD
2023-05-26 price VBMPX                              48.94 USD
2023-05-26 price RGAGX                             170.53 USD
2023-05-26 price ITOT                              122.42 USD
2023-05-26 price VEA                                60.18 USD
2023-05-26 price VHT                                44.54 USD
2023-05-26 price GLD                               104.06 USD
2023-06-02 price VBMPX                              48.73 USD
2023-06-02 price RGAGX                             173.13 USD
2023-06-02 price ITOT                              122.31 USD
2023-06-02 price VEA                                60.76 USD
2023-06-02 price VHT                                45.90 USD
2023-06-02 price GLD                               103.93 USD
2023-06-09 price VBMPX                              48.93 USD
2023-06-09 price RGAGX                             170.33 USD
2023-06-09 price ITOT                              124.05 USD
2023-06-09 price VEA                                60.24 USD
2023-06-09 price VHT                                46.19 USD
2023-06-09 price GLD                               103.87 USD
2023-06-16 price VBMPX                              48.72 USD
2023-06-16 price RGAGX                             172.16 USD
2023-06-16 price ITOT                              125.18 USD
2023-06-16 price VEA                                59.51 USD
2023-06-16 price VHT                                48.21 USD
2023-06-16 price GLD                               105.13 USD
2023-06-23 price VBMPX                              48.92 USD
2023-06-23 price RGAGX                             176.06 USD
2023-06-23 price ITOT                              127.18 USD
2023-06-23 price VEA                                58.55 USD
2023-06-23 price VHT                                48.29 USD
2023-06-23 price GLD                               106.45 USD
2023-06-30 price VBMPX                              49.39 USD
2023-06-30 price RGAGX                             176.46 USD
2023-06-30 price ITOT                              126.20 USD
2023-06-30 price VEA                                60.10 USD
2023-06-30 price VHT                                48.79 USD
2023-06-30 price GLD                               106.04 USD
2023-07-07 price VBMPX                              49.41 USD
2023-07-07 price RGAGX                             181.27 USD
2023-07-07 price ITOT                              129.12 USD
2023-07-07 price VEA                                60.93 USD
2023-07-07 price VHT                                48.18 USD
2023-07-07 price GLD                               106.16 USD
2023-07-14 price VBMPX                              49.16 USD
2023-07-14 price RGAGX                             179.91 USD
2023-07-14 price ITOT                              128.53 USD
2023-07-14 price VEA                                60.64 USD
2023-07-14 price VHT                                46.44 USD
2023-07-14 price GLD                               106.59 USD
2023-07-21 price VBMPX                              49.04 USD
2023-07-21 price RGAGX                             177.70 USD
2023-07-21 price ITOT                              127.01 USD
2023-07-21 price VEA                                58.96 USD
2023-07-21 price VHT                                45.39 USD
2023-07-21 price GLD                               106.18 USD
2023-07-28 price VBMPX                              49.31 USD
2023-07-28 price RGAGX                             177.37 USD
2023-07-28 price ITOT                              126.18 USD
2023-07-28 price VEA                                57.90 USD
2023-07-28 price VHT                                44.20 USD
2023-07-28 price GLD                               105.84 USD
2023-08-04 price VBMPX                              49.23 USD
2023-08-04 price RGAGX                             177.64 USD
2023-08-04 price ITOT                              127.20 USD
2023-08-04 price VEA                                59.05 USD
2023-08-04 price VHT                                46.04 USD
2023-08-04 price GLD                               107.31 USD
2023-08-11 price VBMPX                              49.91 USD
2023-08-11 price RGAGX                             176.65 USD
2023-08-11 price ITOT                              125.56 USD
2023-08-11 price VEA                                59.76 USD
2023-08-11 price VHT                                45.97 USD
2023-08-11 price GLD                               107.58 USD
2023-08-18 price VBMPX                              50.19 USD
2023-08-18 price RGAGX                             176.39 USD
2023-08-18 price ITOT                              121.73 USD
2023-08-18 price VEA                                59.27 USD
2023-08-18 price VHT                                46.80 USD
2023-08-18 price GLD                               106.29 USD
2023-08-25 price VBMPX                              50.93 USD
2023-08-25 price RGAGX                             177.36 USD
2023-08-25 price ITOT                              121.13 USD
2023-08-25 price VEA                                60.04 USD
2023-08-25 price VHT                                47.91 USD
2023-08-25 price GLD                               107.17 USD
2023-09-01 price VBMPX                              51.04 USD
2023-09-01 price RGAGX                             176.04 USD
2023-09-01 price ITOT                              122.96 USD
2023-09-01 price VEA                                58.66 USD
2023-09-01 price VHT                                48.30 USD
2023-09-01 price GLD                               106.59 USD
2023-09-08 price VBMPX                              51.08 USD
2023-09-08 price RGAGX                             173.90 USD
2023-09-08 price ITOT                              124.54 USD
2023-09-08 price VEA                                59.71 USD
2023-09-08 price VHT                                48.10 USD
2023-09-08 price GLD                               108.42 USD
2023-09-15 price VBMPX                              51.71 USD
2023-09-15 price RGAGX                             173.03 USD
2023-09-15 price ITOT                              123.96 USD
2023-09-15 price VEA                                61.26 USD
2023-09-15 price VHT                                48.65 USD
2023-09-15 price GLD                               108.91 USD
2023-09-22 price VBMPX                              51.91 USD
2023-09-22 price RGAGX                             174.64 USD
2023-09-22 price ITOT                              125.70 USD
2023-09-22 price VEA                                62.04 USD
2023-09-22 price VHT                                49.33 USD
2023-09-22 price GLD                               110.03 USD
2023-09-29 price VBMPX                              52.08 USD
2023-09-29 price RGAGX                             178.57 USD
2023-09-29 price ITOT                              128.09 USD
2023-09-29 price VEA                                61.41 USD
2023-09-29 price VHT                                50.14 USD
2023-09-29 price GLD                               109.93 USD
2023-10-06 price VBMPX                              51.76 USD
2023-10-06 price RGAGX                             176.15 USD
2023-10-06 price ITOT                              126.90 USD
2023-10-06 price VEA                                59.23 USD
2023-10-06 price VHT                                50.69 USD
2023-10-06 price GLD                               108.76 USD
2023-10-13 price VBMPX                              52.04 USD
2023-10-13 price RGAGX                             181.95 USD
2023-10-13 price ITOT                              127.83 USD
2023-10-13 price VEA                                58.29 USD
2023-10-13 price VHT                                49.78 USD
2023-10-13 price GLD                               107.56 USD
2023-10-20 price VBMPX                              51.76 USD
2023-10-20 price RGAGX                             185.56 USD
2023-10-20 price ITOT                              126.59 USD
2023-10-20 price VEA                                58.63 USD
2023-10-20 price VHT                                50.00 USD
2023-10-20 price GLD                               108.77 USD
2023-10-27 price VBMPX                              51.98 USD
2023-10-27 price RGAGX                             187.85 USD
2023-10-27 price ITOT                              127.87 USD
2023-10-27 price VEA                                59.08 USD
2023-10-27 price VHT                                47.92 USD
2023-10-27 price GLD                               108.91 USD
2023-11-03 price VBMPX                              52.07 USD
2023-11-03 price RGAGX                             189.69 USD
2023-11-03 price ITOT                              130.56 USD
2023-11-03 price VEA                                59.83 USD
2023-11-03 price VHT                                49.12 USD
2023-11-03 price GLD                               107.44 USD
2023-11-10 price VBMPX                              52.38 USD
2023-11-10 price RGAGX                             190.86 USD
2023-11-10 price ITOT                              131.93 USD
2023-11-10 price VEA                                61.01 USD
2023-11-10 price VHT                                48.27 USD
2023-11-10 price GLD                               107.36 USD
2023-11-17 price VBMPX                              52.24 USD
2023-11-17 price RGAGX                             191.09 USD
2023-11-17 price ITOT                              129.48 USD
2023-11-17 price VEA                                60.53 USD
2023-11-17 price VHT                                47.71 USD
2023-11-17 price GLD                               106.79 USD
2023-11-24 price VBMPX                              52.53 USD
2023-11-24 price RGAGX                             188.43 USD
2023-11-24 price ITOT                              130.13 USD
2023-11-24 price VEA                                61.27 USD
2023-11-24 price VHT                                46.48 USD
2023-11-24 price GLD                               106.29 USD
2023-12-01 price VBMPX                              52.43 USD
2023-12-01 price RGAGX                             190.57 USD
2023-12-01 price ITOT                              132.11 USD
2023-12-01 price VEA                                61.13 USD
2023-12-01 price VHT                                46.80 USD
2023-12-01 price GLD                               107.21 USD
2023-12-08 price VBMPX                              52.58 USD
2023-12-08 price RGAGX                             186.97 USD
2023-12-08 price ITOT                              129.55 USD
2023-12-08 price VEA                                61.95 USD
2023-12-08 price VHT                                45.54 USD
2023-12-08 price GLD                               107.78 USD
2023-12-15 price VBMPX                              52.81 USD
2023-12-15 price RGAGX                             188.71 USD
2023-12-15 price ITOT                              125.31 USD
2023-12-15 price VEA                                63.36 USD
2023-12-15 price VHT                                44.04 USD
2023-12-15 price GLD                               108.45 USD
2023-12-22 price VBMPX                              52.75 USD
2023-12-22 price RGAGX                             191.03 USD
2023-12-22 price ITOT                              126.65 USD
2023-12-22 price VEA                                66.57 USD
2023-12-22 price VHT                                43.48 USD
2023-12-22 price GLD                               109.10 USD
2023-12-29 price VBMPX                              52.89 USD
2023-12-29 price RGAGX                             194.06 USD
2023-12-29 price ITOT                              129.32 USD
2023-12-29 price VEA                                66.23 USD
2023-12-29 price VHT                                42.00 USD
2023-12-29 price GLD                               109.88 USD
2024-01-05 price VBMPX                              52.72 USD
2024-01-05 price RGAGX                             190.59 USD
2024-01-05 price ITOT                              129.20 USD
2024-01-05 price VEA                                65.93 USD
2024-01-05 price VHT                                41.49 USD
2024-01-05 price GLD                               109.97 USD
2024-01-12 price VBMPX                              52.25 USD
2024-01-12 price RGAGX                             189.41 USD
2024-01-12 price ITOT                              129.34 USD
2024-01-12 price VEA                                67.97 USD
2024-01-12 price VHT                                42.55 USD
2024-01-12 price GLD                               109.75 USD
2024-01-19 price VBMPX                              52.51 USD
2024-01-19 price RGAGX                             191.31 USD
2024-01-19 price ITOT                              126.55 USD
2024-01-19 price VEA                                68.55 USD
2024-01-19 price VHT                                41.99 USD
2024-01-19 price GLD                               109.73 USD
2024-01-26 price VBMPX                              53.01 USD
2024-01-26 price RGAGX                             184.67 USD
2024-01-26 price ITOT                              124.70 USD
2024-01-26 price VEA                                68.82 USD
2024-01-26 price VHT                                41.03 USD
2024-01-26 price GLD                               109.10 USD
2024-02-02 price VBMPX                              53.09 USD
2024-02-02 price RGAGX                             184.58 USD
2024-02-02 price ITOT                              124.24 USD
2024-02-02 price VEA                                68.65 USD
2024-02-02 price VHT                                42.10 USD
2024-02-02 price GLD                               109.33 USD
2024-02-09 price VBMPX                              53.05 USD
2024-02-09 price RGAGX                             185.91 USD
2024-02-09 price ITOT                              121.27 USD
2024-02-09 price VEA                                69.94 USD
2024-02-09 price VHT                                41.26 USD
2024-02-09 price GLD                               111.21 USD
2024-02-16 price VBMPX                              53.13 USD
2024-02-16 price RGAGX                             186.75 USD
2024-02-16 price ITOT                              122.22 USD
2024-02-16 price VEA                                69.04 USD
2024-02-16 price VHT                                41.48 USD
2024-02-16 price GLD                               111.80 USD
2024-02-23 price VBMPX                              52.37 USD
2024-02-23 price RGAGX                             185.92 USD
2024-02-23 price ITOT                              121.14 USD
2024-02-23 price VEA                                69.51 USD
2024-02-23 price VHT                                41.74 USD
2024-02-23 price GLD                               112.77 USD
2024-03-01 price VBMPX                              52.15 USD
2024-03-01 price RGAGX                             180.78 USD
2024-03-01 price ITOT                              118.84 USD
2024-03-01 price VEA                                68.35 USD
2024-03-01 price VHT                                42.22 USD
2024-03-01 price GLD                               111.07 USD
2024-03-08 price VBMPX                              52.38 USD
2024-03-08 price RGAGX                             181.83 USD
2024-03-08 price ITOT                              122.47 USD
2024-03-08 price VEA                                68.22 USD
2024-03-08 price VHT                                42.75 USD
2024-03-08 price GLD                               111.47 USD
2024-03-15 price VBMPX                              52.40 USD
2024-03-15 price RGAGX                             183.69 USD
2024-03-15 price ITOT                              120.56 USD
2024-03-15 price VEA                                66.21 USD
2024-03-15 price VHT                                41.50 USD
2024-03-15 price GLD                               112.20 USD
2024-03-22 price VBMPX                              52.49 USD
2024-03-22 price RGAGX                             185.58 USD
2024-03-22 price ITOT                              123.73 USD
2024-03-22 price VEA                                68.05 USD
2024-03-22 price VHT                                40.84 USD
2024-03-22 price GLD                               112.79 USD
2024-03-29 price VBMPX                              52.53 USD
2024-03-29 price RGAGX                             189.45 USD
2024-03-29 price ITOT                              124.37 USD
2024-03-29 price VEA                                66.77 USD
2024-03-29 price VHT                                39.97 USD
2024-03-29 price GLD                               113.53 USD
2024-04-05 price VBMPX                              52.18 USD
2024-04-05 price RGAGX                             188.85 USD
2024-04-05 price ITOT                              127.06 USD
2024-04-05 price VEA                                65.32 USD
2024-04-05 price VHT                                39.13 USD
2024-04-05 price GLD                               115.54 USD
2024-04-12 price VBMPX                              52.65 USD
2024-04-12 price RGAGX                             192.39 USD
2024-04-12 price ITOT                              126.61 USD
2024-04-12 price VEA                                66.21 USD
2024-04-12 price VHT                                38.76 USD
2024-04-12 price GLD                               115.55 USD
2024-04-19 price VBMPX                              52.41 USD
2024-04-19 price RGAGX                             195.10 USD
2024-04-19 price ITOT                              125.01 USD
2024-04-19 price VEA                                66.14 USD
2024-04-19 price VHT                                38.61 USD
2024-04-19 price GLD                               115.06 USD
2024-04-26 price VBMPX                              52.64 USD
2024-04-26 price RGAGX                             199.01 USD
2024-04-26 price ITOT                              126.35 USD
2024-04-26 price VEA                                65.22 USD
2024-04-26 price VHT                                38.75 USD
2024-04-26 price GLD                               116.79 USD
2024-05-03 price VBMPX                              52.41 USD
2024-05-03 price RGAGX                             199.93 USD
2024-05-03 price ITOT                              129.05 USD
2024-05-03 price VEA                                67.01 USD
2024-05-03 price VHT                                38.80 USD
2024-05-03 price GLD                               116.31 USD
2024-05-10 price VBMPX                              52.58 USD
2024-05-10 price RGAGX                             203.94 USD
2024-05-10 price ITOT                              131.22 USD
2024-05-10 price VEA                                67.18 USD
2024-05-10 price VHT                                39.07 USD
2024-05-10 price GLD                               115.89 USD
2024-05-17 price VBMPX                              52.36 USD
2024-05-17 price RGAGX                             205.45 USD
2024-05-17 price ITOT                              131.41 USD
2024-05-17 price VEA                                68.97 USD
2024-05-17 price VHT                                38.53 USD
2024-05-17 price GLD                               117.44 USD
2024-05-24 price VBMPX                              52.30 USD
2024-05-24 price RGAGX                             205.85 USD
2024-05-24 price ITOT                              131.92 USD
2024-05-24 price VEA                                68.96 USD
2024-05-24 price VHT                                38.46 USD
2024-05-24 price GLD                               117.47 USD
2024-05-31 price VBMPX                              52.75 USD
2024-05-31 price RGAGX                             208.51 USD
2024-05-31 price ITOT                              131.51 USD
2024-05-31 price VEA                                70.42 USD
2024-05-31 price VHT                                38.81 USD
2024-05-31 price GLD                               117.45 USD
2024-06-07 price VBMPX                              52.48 USD
2024-06-07 price RGAGX                             206.38 USD
2024-06-07 price ITOT                              128.71 USD
2024-06-07 price VEA                                69.10 USD
2024-06-07 price VHT                                39.69 USD
2024-06-07 price GLD                               118.90 USD
2024-06-14 price VBMPX                              52.55 USD
2024-06-14 price RGAGX                             203.95 USD
2024-06-14 price ITOT                              126.33 USD
2024-06-14 price VEA                                67.39 USD
2024-06-14 price VHT                                38.86 USD
2024-06-14 price GLD                               120.86 USD
2024-06-21 price VBMPX                              52.44 USD
2024-06-21 price RGAGX                             202.04 USD
2024-06-21 price ITOT                              126.11 USD
2024-06-21 price VEA                                67.95 USD
2024-06-21 price VHT                                39.40 USD
2024-06-21 price GLD                               120.11 USD
2024-06-28 price VBMPX                              52.36 USD
2024-06-28 price RGAGX                             203.11 USD
2024-06-28 price ITOT                              127.70 USD
2024-06-28 price VEA                                68.64 USD
2024-06-28 price VHT                                40.75 USD
2024-06-28 price GLD                               120.17 USD
2024-07-05 price VBMPX                              52.27 USD
2024-07-05 price RGAGX                             202.70 USD
2024-07-05 price ITOT                              127.85 USD
2024-07-05 price VEA                                67.91 USD
2024-07-05 price VHT                                41.09 USD
2024-07-05 price GLD                               120.61 USD
2024-07-12 price VBMPX                              52.89 USD
2024-07-12 price RGAGX                             203.56 USD
2024-07-12 price ITOT                              129.70 USD
2024-07-12 price VEA                                67.60 USD
2024-07-12 price VHT                                41.49 USD
2024-07-12 price GLD                               120.54 USD
2024-07-19 price VBMPX                              52.60 USD
2024-07-19 price RGAGX                             205.07 USD
2024-07-19 price ITOT                              125.48 USD
2024-07-19 price VEA                                66.45 USD
2024-07-19 price VHT                                41.07 USD
2024-07-19 price GLD                               121.43 USD
2024-07-26 price VBMPX                              52.81 USD
2024-07-26 price RGAGX                             207.66 USD
2024-07-26 price ITOT                              124.50 USD
2024-07-26 price VEA                                66.33 USD
2024-07-26 price VHT                                40.78 USD
2024-07-26 price GLD                               120.12 USD
2024-08-02 price VBMPX                              52.77 USD
2024-08-02 price RGAGX                             212.16 USD
2024-08-02 price ITOT                              122.67 USD
2024-08-02 price VEA                                65.73 USD
2024-08-02 price VHT                                39.15 USD
2024-08-02 price GLD                               121.16 USD
2024-08-09 price VBMPX                              53.14 USD
2024-08-09 price RGAGX                             215.54 USD
2024-08-09 price ITOT                              121.42 USD
2024-08-09 price VEA                                67.05 USD
2024-08-09 price VHT                                39.94 USD
2024-08-09 price GLD                               121.30 USD
2024-08-16 price VBMPX                              53.42 USD
2024-08-16 price RGAGX                             212.19 USD
2024-08-16 price ITOT                              120.77 USD
2024-08-16 price VEA                                67.25 USD
2024-08-16 price VHT                                39.84 USD
2024-08-16 price GLD                               121.21 USD
2024-08-23 price VBMPX                              53.67 USD
2024-08-23 price RGAGX                             208.40 USD
2024-08-23 price ITOT                              124.59 USD
2024-08-23 price VEA                                68.96 USD
2024-08-23 price VHT                                40.20 USD
2024-08-23 price GLD                               121.55 USD
2024-08-30 price VBMPX                              53.97 USD
2024-08-30 price RGAGX                             209.33 USD
2024-08-30 price ITOT                              123.20 USD
2024-08-30 price VEA                                68.70 USD
2024-08-30 price VHT                                39.91 USD
2024-08-30 price GLD                               121.25 USD
2024-09-06 price VBMPX                              54.77 USD
2024-09-06 price RGAGX                             211.12 USD
2024-09-06 price ITOT                              123.19 USD
2024-09-06 price VEA                                68.65 USD
2024-09-06 price VHT                                41.78 USD
2024-09-06 price GLD                               121.00 USD
2024-09-13 price VBMPX                              55.39 USD
2024-09-13 price RGAGX                             212.50 USD
2024-09-13 price ITOT                              124.68 USD
2024-09-13 price VEA                                68.78 USD
2024-09-13 price VHT                                43.23 USD
2024-09-13 price GLD                               121.33 USD
2024-09-20 price VBMPX                              55.56 USD
2024-09-20 price RGAGX                             208.41 USD
2024-09-20 price ITOT                              122.31 USD
2024-09-20 price VEA                                69.20 USD
2024-09-20 price VHT                                44.93 USD
2024-09-20 price GLD                               121.13 USD
2024-09-27 price VBMPX                              55.92 USD
2024-09-27 price RGAGX                             212.94 USD
2024-09-27 price ITOT                              125.02 USD
2024-09-27 price VEA                                69.34 USD
2024-09-27 price VHT                                45.33 USD
2024-09-27 price GLD                               121.37 USD
2024-10-04 price VBMPX                              55.76 USD
2024-10-04 price RGAGX                             212.29 USD
2024-10-04 price ITOT                              124.47 USD
2024-10-04 price VEA                                68.02 USD
2024-10-04 price VHT                                46.68 USD
2024-10-04 price GLD                               121.05 USD
2024-10-11 price VBMPX                              55.62 USD
2024-10-11 price RGAGX                             215.94 USD
2024-10-11 price ITOT                              119.91 USD
2024-10-11 price VEA                                69.19 USD
2024-10-11 price VHT                                46.06 USD
2024-10-11 price GLD                               120.72 USD
2024-10-18 price VBMPX                              55.68 USD
2024-10-18 price RGAGX                             217.85 USD
2024-10-18 price ITOT                              119.47 USD
2024-10-18 price VEA                                66.99 USD
2024-10-18 price VHT                                45.50 USD
2024-10-18 price GLD                               120.36 USD
2024-10-25 price VBMPX                              56.26 USD
2024-10-25 price RGAGX                             216.01 USD
2024-10-25 price ITOT                              116.15 USD
2024-10-25 price VEA                                66.48 USD
2024-10-25 price VHT                                47.45 USD
2024-10-25 price GLD                               121.48 USD
2024-11-01 price VBMPX                              56.89 USD
2024-11-01 price RGAGX                             215.53 USD
2024-11-01 price ITOT                              116.87 USD
2024-11-01 price VEA                                65.29 USD
2024-11-01 price VHT                                47.43 USD
2024-11-01 price GLD                               123.64 USD
2024-11-08 price VBMPX                              57.85 USD
2024-11-08 price RGAGX                             219.52 USD
2024-11-08 price ITOT                              114.91 USD
2024-11-08 price VEA                                65.30 USD
2024-11-08 price VHT                                48.12 USD
2024-11-08 price GLD                               122.99 USD
2024-11-15 price VBMPX                              58.14 USD
2024-11-15 price RGAGX                             218.13 USD
2024-11-15 price ITOT                              117.24 USD
2024-11-15 price VEA                                66.02 USD
2024-11-15 price VHT                                47.60 USD
2024-11-15 price GLD                               123.59 USD
2024-11-22 price VBMPX                              57.87 USD
2024-11-22 price RGAGX                             218.17 USD
2024-11-22 price ITOT                              117.12 USD
2024-11-22 price VEA                                66.34 USD
2024-11-22 price VHT                                47.22 USD
2024-11-22 price GLD                               123.50 USD
2024-11-29 price VBMPX                              57.95 USD
2024-11-29 price RGAGX                             216.22 USD
2024-11-29 price ITOT                              115.63 USD
2024-11-29 price VEA                                66.71 USD
2024-11-29 price VHT                                48.31 USD
2024-11-29 price GLD                               124.95 USD
2024-12-06 price VBMPX                              58.01 USD
2024-12-06 price RGAGX                             216.50 USD
2024-12-06 price ITOT                              115.00 USD
2024-12-06 price VEA                                67.77 USD
2024-12-06 price VHT                                49.16 USD
2024-12-06 price GLD                               124.99 USD
2024-12-13 price VBMPX                              57.79 USD
2024-12-13 price RGAGX                             215.68 USD
2024-12-13 price ITOT                              114.04 USD
2024-12-13 price VEA                                68.12 USD
2024-12-13 price VHT                                48.70 USD
2024-12-13 price GLD                               124.01 USD
2024-12-20 price VBMPX                              57.53 USD
2024-12-20 price RGAGX                             216.30 USD
2024-12-20 price ITOT                              113.71 USD
2024-12-20 price VEA                                68.44 USD
2024-12-20 price VHT                                49.41 USD
2024-12-20 price GLD                               124.43 USD
2024-12-27 price VBMPX                              57.40 USD
2024-12-27 price RGAGX                             214.87 USD
2024-12-27 price ITOT                              113.88 USD
2024-12-27 price VEA                                67.83 USD
2024-12-27 price VHT                                48.27 USD
2024-12-27 price GLD                               124.93 USD
2025-01-03 price VBMPX                              57.29 USD
2025-01-03 price RGAGX                             216.33 USD
2025-01-03 price ITOT                              112.46 USD
2025-01-03 price VEA                                68.66 USD
2025-01-03 price VHT                                48.43 USD
2025-01-03 price GLD                               125.47 USD
2025-01-10 price VBMPX                              57.82 USD
2025-01-10 price RGAGX                             221.41 USD
2025-01-10 price ITOT                              112.45 USD
2025-01-10 price VEA                                71.61 USD
2025-01-10 price VHT                                47.08 USD
2025-01-10 price GLD                               127.07 USD
2025-01-17 price VBMPX                              58.12 USD
2025-01-17 price RGAGX                             219.98 USD
2025-01-17 price ITOT                              110.23 USD
2025-01-17 price VEA                                72.21 USD
2025-01-17 price VHT                                46.11 USD
2025-01-17 price GLD                               125.07 USD
2025-01-24 price VBMPX                              57.87 USD
2025-01-24 price RGAGX                             221.50 USD
2025-01-24 price ITOT                              109.26 USD
2025-01-24 price VEA                                71.97 USD
2025-01-24 price VHT                                46.18 USD
2025-01-24 price GLD                               126.80 USD
2025-01-31 price VBMPX                              58.21 USD
2025-01-31 price RGAGX                             222.97 USD
2025-01-31 price ITOT                              106.75 USD
2025-01-31 price VEA                                71.50 USD
2025-01-31 price VHT                                46.22 USD
2025-01-31 price GLD                               128.63 USD
2025-02-07 price VBMPX                              58.35 USD
2025-02-07 price RGAGX                             228.22 USD
2025-02-07 price ITOT                              108.43 USD
2025-02-07 price VEA                                73.76 USD
2025-02-07 price VHT                                46.61 USD
2025-02-07 price GLD                               129.64 USD
2025-02-14 price VBMPX                              58.85 USD
2025-02-14 price RGAGX                             231.12 USD
2025-02-14 price ITOT                              108.67 USD
2025-02-14 price VEA                                73.25 USD
2025-02-14 price VHT                                46.93 USD
2025-02-14 price GLD                               128.27 USD
2025-02-21 price VBMPX                              59.18 USD
2025-02-21 price RGAGX                             231.80 USD
2025-02-21 price ITOT                              106.02 USD
2025-02-21 price VEA                                73.11 USD
2025-02-21 price VHT                                47.48 USD
2025-02-21 price GLD                               129.00 USD
2025-02-28 price VBMPX                              59.93 USD
2025-02-28 price RGAGX                             229.60 USD
2025-02-28 price ITOT                              108.37 USD
2025-02-28 price VEA                                73.03 USD
2025-02-28 price VHT                                48.70 USD
2025-02-28 price GLD                               128.83 USD
2025-03-07 price VBMPX                              60.10 USD
2025-03-07 price RGAGX                             223.09 USD
2025-03-07 price ITOT                              108.06 USD
2025-03-07 price VEA                                75.21 USD
2025-03-07 price VHT                                48.46 USD
2025-03-07 price GLD                               129.70 USD
2025-03-14 price VBMPX                              59.99 USD
2025-03-14 price RGAGX                             223.34 USD
2025-03-14 price ITOT                              107.07 USD
2025-03-14 price VEA                                74.03 USD
2025-03-14 price VHT                                49.23 USD
2025-03-14 price GLD                               130.08 USD
2025-03-21 price VBMPX                              60.61 USD
2025-03-21 price RGAGX                             223.27 USD
2025-03-21 price ITOT                              109.41 USD
2025-03-21 price VEA                                73.00 USD
2025-03-21 price VHT                                49.46 USD
2025-03-21 price GLD                               131.58 USD
2025-03-28 price VBMPX                              60.74 USD
2025-03-28 price RGAGX                             224.16 USD
2025-03-28 price ITOT                              108.67 USD
2025-03-28 price VEA                                73.13 USD
2025-03-28 price VHT                                50.97 USD
2025-03-28 price GLD                               131.11 USD
2025-04-04 price VBMPX                              61.09 USD
2025-04-04 price RGAGX                             223.61 USD
2025-04-04 price ITOT                              108.70 USD
2025-04-04 price VEA                                73.19 USD
2025-04-04 price VHT                                50.44 USD
2025-04-04 price GLD                               132.24 USD
2025-04-11 price VBMPX                              60.98 USD
2025-04-11 price RGAGX                             222.76 USD
2025-04-11 price ITOT                              109.92 USD
2025-04-11 price VEA                                72.00 USD
2025-04-11 price VHT                                50.64 USD
2025-04-11 price GLD                               131.74 USD
2025-04-18 price VBMPX                              61.34 USD
2025-04-18 price RGAGX                             220.66 USD
2025-04-18 price ITOT                              108.71 USD
2025-04-18 price VEA                                71.57 USD
2025-04-18 price VHT                                51.63 USD
2025-04-18 price GLD                               131.66 USD
2025-04-25 price VBMPX                              61.82 USD
2025-04-25 price RGAGX                             224.92 USD
2025-04-25 price ITOT                              110.87 USD
2025-04-25 price VEA                                70.82 USD
2025-04-25 price VHT                                52.04 USD
2025-04-25 price GLD                               131.94 USD
2025-05-02 price VBMPX                              61.90 USD
2025-05-02 price RGAGX                             222.13 USD
2025-05-02 price ITOT                              111.22 USD
2025-05-02 price VEA                                69.91 USD
2025-05-02 price VHT                                51.97 USD
2025-05-02 price GLD                               134.18 USD
2025-05-09 price VBMPX                              62.43 USD
2025-05-09 price RGAGX                             220.85 USD
2025-05-09 price ITOT                              107.67 USD
2025-05-09 price VEA                                69.81 USD
2025-05-09 price VHT                                52.89 USD
2025-05-09 price GLD                               134.95 USD
2025-05-16 price VBMPX                              62.52 USD
2025-05-16 price RGAGX                             218.03 USD
2025-05-16 price ITOT                              107.42 USD
2025-05-16 price VEA                                70.31 USD
2025-05-16 price VHT                                53.04 USD
2025-05-16 price GLD                               135.94 USD
2025-05-23 price VBMPX                              62.25 USD
2025-05-23 price RGAGX                             216.78 USD
2025-05-23 price ITOT                              107.18 USD
2025-05-23 price VEA                                66.13 USD
2025-05-23 price VHT                                53.35 USD
2025-05-23 price GLD                               138.52 USD
2025-05-30 price VBMPX                              62.15 USD
2025-05-30 price RGAGX                             216.76 USD
2025-05-30 price ITOT                              108.34 USD
2025-05-30 price VEA                                65.53 USD
2025-05-30 price VHT                                55.53 USD
2025-05-30 price GLD                               136.91 USD
2025-06-06 price VBMPX                              62.35 USD
2025-06-06 price RGAGX                             218.23 USD
2025-06-06 price ITOT                              106.76 USD
2025-06-06 price VEA                                67.50 USD
2025-06-06 price VHT                                56.81 USD
2025-06-06 price GLD                               136.23 USD
2025-06-13 price VBMPX                              62.75 USD
2025-06-13 price RGAGX                             220.18 USD
2025-06-13 price ITOT                              106.49 USD
2025-06-13 price VEA                                68.26 USD
2025-06-13 price VHT                                57.10 USD
2025-06-13 price GLD                               135.62 USD
2025-06-20 price VBMPX                              62.47 USD
2025-06-20 price RGAGX                             215.60 USD
2025-06-20 price ITOT                              108.57 USD
2025-06-20 price VEA                                68.93 USD
2025-06-20 price VHT                                56.51 USD
2025-06-20 price GLD                               134.69 USD
2025-06-27 price VBMPX                              62.65 USD
2025-06-27 price RGAGX                             217.76 USD
2025-06-27 price ITOT                              110.15 USD
2025-06-27 price VEA                                69.35 USD
2025-06-27 price VHT                                56.41 USD
2025-06-27 price GLD                               133.97 USD
2025-07-04 price VBMPX                              63.03 USD
2025-07-04 price RGAGX                             217.02 USD
2025-07-04 price ITOT                              109.89 USD
2025-07-04 price VEA                                70.98 USD
2025-07-04 price VHT                                56.23 USD
2025-07-04 price GLD                               134.09 USD
2025-07-11 price VBMPX                              63.11 USD
2025-07-11 price RGAGX                             221.12 USD
2025-07-11 price ITOT                              112.19 USD
2025-07-11 price VEA                                70.73 USD
2025-07-11 price VHT                                55.63 USD
2025-07-11 price GLD                               133.87 USD
2025-07-18 price VBMPX                              62.55 USD
2025-07-18 price RGAGX                             221.38 USD
2025-07-18 price ITOT                              111.26 USD
2025-07-18 price VEA                                70.05 USD
2025-07-18 price VHT                                56.22 USD
2025-07-18 price GLD                               133.92 USD
2025-07-25 price VBMPX                              62.18 USD
2025-07-25 price RGAGX                             219.31 USD
2025-07-25 price ITOT                              112.40 USD
2025-07-25 price VEA                                69.48 USD
2025-07-25 price VHT                                54.31 USD
2025-07-25 price GLD                               134.81 USD
2025-08-01 price VBMPX                              62.41 USD
2025-08-01 price RGAGX                             227.19 USD
2025-08-01 price ITOT                              112.30 USD
2025-08-01 price VEA                                71.07 USD
2025-08-01 price VHT                                54.89 USD
2025-08-01 price GLD                               134.21 USD
2025-08-08 price VBMPX                              62.32 USD
2025-08-08 price RGAGX                             228.98 USD
2025-08-08 price ITOT                              110.17 USD
2025-08-08 price VEA                                70.30 USD
2025-08-08 price VHT                                55.02 USD
2025-08-08 price GLD                               132.47 USD
2025-08-15 price VBMPX                              62.46 USD
2025-08-15 price RGAGX                             230.09 USD
2025-08-15 price ITOT                              110.30 USD
2025-08-15 price VEA                                69.96 USD
2025-08-15 price VHT                                56.17 USD
2025-08-15 price GLD                               130.85 USD
2025-08-22 price VBMPX                              62.17 USD
2025-08-22 price RGAGX                             230.29 USD
2025-08-22 price ITOT                              109.85 USD
2025-08-22 price VEA                                69.26 USD
2025-08-22 price VHT                                56.60 USD
2025-08-22 price GLD                               130.40 USD
2025-08-29 price VBMPX                              62.90 USD
2025-08-29 price RGAGX                             227.20 USD
2025-08-29 price ITOT                              110.33 USD
2025-08-29 price VEA                                69.17 USD
2025-08-29 price VHT                                55.67 USD
2025-08-29 price GLD                               131.79 USD
2025-09-05 price VBMPX                              63.73 USD
2025-09-05 price RGAGX                             232.98 USD
2025-09-05 price ITOT                              110.26 USD
2025-09-05 price VEA                                70.80 USD
2025-09-05 price VHT                                56.96 USD
2025-09-05 price GLD                               131.32 USD
2025-09-12 price VBMPX                              64.25 USD
2025-09-12 price RGAGX                             230.78 USD
2025-09-12 price ITOT                              110.87 USD
2025-09-12 price VEA                                72.12 USD
2025-09-12 price VHT                                56.92 USD
2025-09-12 price GLD                               130.54 USD
2025-09-19 price VBMPX                              64.61 USD
2025-09-19 price RGAGX                             231.77 USD
2025-09-19 price ITOT                              111.92 USD
2025-09-19 price VEA                                70.90 USD
2025-09-19 price VHT                                55.68 USD
2025-09-19 price GLD                               129.93 USD
2025-09-26 price VBMPX                              65.03 USD
2025-09-26 price RGAGX                             238.96 USD
2025-09-26 price ITOT                              113.04 USD
2025-09-26 price VEA                                71.92 USD
2025-09-26 price VHT                                57.12 USD
2025-09-26 price GLD                               129.80 USD
2025-10-03 price VBMPX                              64.71 USD
2025-10-03 price RGAGX                             237.42 USD
2025-10-03 price ITOT                              112.19 USD
2025-10-03 price VEA                                71.35 USD
2025-10-03 price VHT                                57.51 USD
2025-10-03 price GLD                               129.32 USD
2025-10-10 price VBMPX                              65.12 USD
2025-10-10 price RGAGX                             241.06 USD
2025-10-10 price ITOT                              112.46 USD
2025-10-10 price VEA                                71.55 USD
2025-10-10 price VHT                                56.97 USD
2025-10-10 price GLD                               132.14 USD



* Cash


  `,
  };

export const defaultLedgerTemplate: Record<string, string> =
  simpleLedgerTemplate;
