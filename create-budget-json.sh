#!/bin/bash

# create-budget-json.sh

# Helper bash script to create a JSON file with the budgets for all accounts in the organization
# The script will calculate the average spend for the last X months based on the STARTDATA and ENDDATE and multiply it by the BUDGETINCREASE variable
# The script adds USD 1.00 to each budget to account to prevent the budget from being set to USD 0
# The script output is a JSON file called budgets.json required by the CDK app 

# Get all accounts in the organization
ACCOUNTS=$(aws organizations list-accounts --query 'Accounts[*].Id' --output text)

# Set the start and end date for the calculation of the average spend
STARTDATE='2022-03-01'

# Set the end date to the last day of the current month
ENDDATE='2022-12-31'

# Set the budget increase factor (1.5 = 50% increase)
BUDGETINCREASE=1.5

# Create the JSON file
echo "[" > budgets.json

# Loop through all accounts and calculate the average spend for the last X months
for ACCOUNT in $ACCOUNTS
    do
        TSPEND=0
        MONTHS=0

        # Get the spend for the last X months
        MSPEND=$(
            aws ce get-cost-and-usage \
            --time-period Start=$STARTDATE,End=$ENDDATE \
            --granularity MONTHLY \
            --metrics UnblendedCost \
            --group-by Type=DIMENSION,Key=LINKED_ACCOUNT \
            --filter "{\"Dimensions\":{\"Key\":\"LINKED_ACCOUNT\",\"Values\":[\"${ACCOUNT}\"]}}" \
            --query "ResultsByTime[*].Groups[*].Metrics.UnblendedCost.Amount" \
            --output text)
        
        # Calculate the average spend
        for SPEND in $MSPEND
            do
                TSPEND=$(echo "$TSPEND + $SPEND" | bc)
                MONTHS=$((MONTHS+1))  
            done
        TSPEND=${TSPEND%.*}
        AVGSPEND=$(echo "$TSPEND / $MONTHS" | bc)

        # Calculate the budget
        BUDGET=$(echo "$AVGSPEND * $BUDGETINCREASE + 1" | bc)
        
        # Add the budget to the JSON file
        echo "{\"Account\": \"$ACCOUNT\",\"Budget\": \"$BUDGET\"}," >> budgets.json
    done
    
    # Remove the last comma and add the closing bracket
    truncate -s -2 budgets.json 
    echo "]" >> budgets.json

