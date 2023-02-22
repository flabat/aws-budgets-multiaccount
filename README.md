# AWS Budgets Multiaccount

This sample application allows customers using AWS Organizations with multiple linked accounts, to easily create per account AWS Budgets. All Budgets will be created in the Organizations Payer account. The sample alerts are published to a SNS topic created by the application.

## Getting started

Clone the repo locally and install dependencies:

```bash
git clone REPO_URL
cd aws-budgets-multiaccount
npm install
```

## Helper script

The project includes a bash helper script that creates a ```budgets.json``` with all accounts under the AWS Organization, the average monthly spend for the selected period, and a budget based on a defined increase factor.

Sample ```budgets.json```

```json
[
{"Account": "195725555393","Budget": "1"},
{"Account": "606333333326","Budget": "5.5"},
{"Account": "780500353454","Budget": "113.5"},
{"Account": "983475879345","Budget": "857.5"},
{"Account": "132454546232","Budget": "19078.0"}
]
```

Edit the ```create-budget-json.sh``` and configure your desired start/end date for the average calculation (period must be in the last 12 months) and the budget increase multiplier:

```bash
# Set the start and end date for the calculation of the average spend
STARTDATE='2022-03-01'

# Set the end date to the last day of the current month
ENDDATE='2022-12-31'

# Set the budget increase factor (1.5 = 50% increase)
BUDGETINCREASE=1.5
```

Execute the ```create-budget-json.sh```

```bash
./create-budget-json.sh
```

Check the contents of ```budgets.json``` for accuracy.

## Deploy the CDK app

```bash
cdk deploy
```

## Customization

You can modify ```lib\aws-budgets-multiaccount-stack.ts``` to your needs, without changes the application will create two Budgets per linked account:

- An **auto-adjusting** budget dynamically setting your budget amount based on your spending over the last six months range. The historical six months is the auto-adjustment baseline for your budget. The auto-adjusting budgets will have send an alert to the SNS topic when your forecasted cost is greater than 90% your budgeted amount.
- A **fixed budget** to monitor the same amount every budget period, based on the ```budgets.json``` file provided. The fixed budgets will send an alert to the SNS topic when your actual cost is greater than 80% of your budgeted amount.

Optionally, you can uncomment the SNS Subscription section and add your email in the ```endpoint``` property to receive the published alerts:

```javascript
// SNS sample subscription

    new sns.Subscription(this, 'BudgetsTopicSubscription', {
       topic: topic,
       endpoint: 'YOUR_EMAIL_ADDRESS',
       protocol: sns.SubscriptionProtocol.EMAIL
     });
```

