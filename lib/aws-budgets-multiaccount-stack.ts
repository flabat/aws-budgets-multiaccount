import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as sns from 'aws-cdk-lib/aws-sns';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

// Budgets JSON file
var budgetFile = require('../budgets.json');

// Convert JSON to JS object
var budgetJson = JSON.parse(JSON.stringify(budgetFile));

export class AwsBudgetsMultiaccountStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Create SNS topic for notifications
    const topic = new sns.Topic(this, 'BudgetsTopic', {
      displayName: 'Budgets Notifications'
    });

    // Add budget service as an allowed publisher to the SNS topic
    topic.addToResourcePolicy(new PolicyStatement({
      actions: ['SNS:Publish'],
      resources: [topic.topicArn],
      principals: [new ServicePrincipal('budgets.amazonaws.com')]
    }));

    // Loop over the accounts in budgets.json and create the budgets for each account
    for(let i = 0; i < budgetJson.length; i++) {
      let account = budgetJson[i];
      
      // Create auto-adjusting budget
      new budgets.CfnBudget(this, `BudgetAutoAdj-${account.Account}`, {
        budget: {
          budgetType: 'COST',
          costFilters: {
            LinkedAccount: [`${account.Account}`]
          },
          timeUnit: 'MONTHLY',
          autoAdjustData: {
            autoAdjustType: 'HISTORICAL',
            historicalOptions: {
              budgetAdjustmentPeriod: 6
              }
          },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              comparisonOperator: 'GREATER_THAN',
              notificationType: 'FORECASTED',
              threshold: 90,
              thresholdType: 'PERCENTAGE'
            },
            subscribers: [
              {
                address: topic.topicArn,
                subscriptionType: 'SNS'
              }
            ]}]
      });

      // Create fixed budget
      new budgets.CfnBudget(this, `BudgetFixed-${account.Account}`, {
        budget: {
          
          budgetType: 'COST',
          costFilters: {
            LinkedAccount: [`${account.Account}`]
          },
          timeUnit: 'MONTHLY',
          budgetLimit: {
            amount: Number(`${account.Budget}`),
            unit: 'USD'
          }
          },
          notificationsWithSubscribers: [
            {
              notification: {
                comparisonOperator: 'GREATER_THAN',
                notificationType: 'ACTUAL',
                threshold: 80,
                thresholdType: 'PERCENTAGE'
              },
              subscribers: [
                {
                  address: topic.topicArn,
                  subscriptionType: 'SNS'
                }
              ]}]
        }); 
    }

    // SNS sample subscription

    // new sns.Subscription(this, 'BudgetsTopicSubscription', {
    //   topic: topic,
    //   endpoint: 'YOUR_EMAIL_ADDRESS',
    //   protocol: sns.SubscriptionProtocol.EMAIL
    // });

    //Cloudformation output for the SNS topic
    new cdk.CfnOutput(this, 'BudgetsTopicArn', {
      value: topic.topicArn
    });

  }
}
