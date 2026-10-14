# AWS Bedrock & Marketplace IAM Configuration

## Overview
EKARA uses Amazon Bedrock Converse API with Anthropic Claude Haiku (`us.anthropic.claude-haiku-4-5-20251001-v1:0`).

## IAM Permissions Required

The IAM user (`arn:aws:iam::702501893963:user/alexa-ai-tools`) requires two sets of permissions:

1. **Amazon Bedrock Model Invocation**:
   - `bedrock:InvokeModel`
   - `bedrock:InvokeModelWithResponseStream`
   - `bedrock:GetInferenceProfile`

2. **AWS Marketplace Subscription Lifecycle**:
   - `aws-marketplace:ViewSubscriptions`
   - `aws-marketplace:Subscribe`
   - `aws-marketplace:Unsubscribe`

Anthropic models are distributed through AWS Marketplace. Amazon Bedrock automatically checks and initiates the AWS Marketplace subscription for the model upon first invocation. If the IAM user lacks `aws-marketplace:Subscribe` or `aws-marketplace:ViewSubscriptions`, Bedrock denies model access with:
```
Model access is denied due to IAM user or service role is not authorized to perform the required AWS Marketplace actions (aws-marketplace:ViewSubscriptions, aws-marketplace:Subscribe) to enable access to this model.
```

## IAM Policy JSON (`server/iam-bedrock-policy.json`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeModelAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:GetInferenceProfile"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:702501893963:inference-profile/*",
        "arn:aws:bedrock:*:702501893963:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
      ]
    },
    {
      "Sid": "BedrockMarketplaceSubscriptionAccess",
      "Effect": "Allow",
      "Action": [
        "aws-marketplace:ViewSubscriptions",
        "aws-marketplace:Subscribe",
        "aws-marketplace:Unsubscribe"
      ],
      "Resource": "*"
    }
  ]
}
```

## AWS Account Prerequisite: Valid Payment Instrument

Even with full IAM Marketplace permissions, AWS Marketplace requires that AWS Account `702501893963` has a **valid payment instrument** (credit card/debit card) registered in the **AWS Billing Console** (`Payment preferences`).

If the account has no valid payment instrument or it has expired, AWS Marketplace subscription fails with:
```
Model access is denied due to INVALID_PAYMENT_INSTRUMENT: A valid payment instrument must be provided. Your AWS Marketplace subscription for this model cannot be completed at this time.
```
This is an AWS account billing prerequisite that cannot be resolved by application code or IAM permissions. It requires adding/updating a valid payment method in the AWS Console under Billing & Cost Management > Payment preferences.
