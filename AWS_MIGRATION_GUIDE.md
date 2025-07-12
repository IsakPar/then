# 🚀 **AWS Migration Guide: Railway → AWS**

## 📋 **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Phase 1: AWS Foundation Setup](#phase-1-aws-foundation-setup)
3. [Phase 2: Database Migration](#phase-2-database-migration)
4. [Phase 3: Backend Deployment](#phase-3-backend-deployment)
5. [Phase 4: File Storage & CDN](#phase-4-file-storage--cdn)
6. [Phase 5: Go-Live & Monitoring](#phase-5-go-live--monitoring)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Migration Optimization](#post-migration-optimization)

---

## 📋 **Prerequisites**

### **Required Tools:**
```bash
# AWS CLI
brew install awscli

# Terraform (optional but recommended)
brew install terraform

# PostgreSQL tools
brew install postgresql

# Node.js & pnpm (already installed)
```

### **Required Information:**
- [ ] AWS Account with billing alerts enabled
- [ ] Domain name (if using custom domain)
- [ ] Current Railway database credentials
- [ ] Stripe API keys
- [ ] Mailjet API keys
- [ ] Google OAuth credentials

---

## 🔧 **Phase 1: AWS Foundation Setup**

### **Step 1.1: AWS Account Setup**

#### **Create AWS Account:**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create new account or sign in
3. Enable free tier tracking

#### **Set up Billing Alerts:**
```bash
# Create billing alert for $50
aws cloudwatch put-metric-alarm \
  --alarm-name "BillingAlert50" \
  --alarm-description "Alert when AWS bill exceeds $50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:billing-alerts
```

### **Step 1.2: IAM User Setup**

#### **Create IAM User:**
1. Go to IAM console
2. Create user: `lastminutelive-deploy`
3. Attach policies:
   - `AmazonRDSFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `IAMFullAccess`

#### **Configure AWS CLI:**
```bash
aws configure
# Enter your access key ID
# Enter your secret access key
# Default region: us-east-1 (or your preferred region)
# Default output format: json
```

### **Step 1.3: VPC and Security Setup**

#### **Create VPC Configuration:**
```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lastminutelive-vpc}]'

# Create public subnet
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxxx \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=lastminutelive-public}]'

# Create private subnet
aws ec2 create-subnet \
  --vpc-id vpc-xxxxxxxxx \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=lastminutelive-private}]'
```

#### **Security Groups:**
```bash
# Web server security group
aws ec2 create-security-group \
  --group-name lastminutelive-web \
  --description "Web server security group" \
  --vpc-id vpc-xxxxxxxxx

# Database security group
aws ec2 create-security-group \
  --group-name lastminutelive-db \
  --description "Database security group" \
  --vpc-id vpc-xxxxxxxxx
```

---

## 🗄️ **Phase 2: Database Migration**

### **Step 2.1: Create RDS Instance**

#### **RDS Configuration:**
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name lastminutelive-subnet-group \
  --db-subnet-group-description "Subnet group for LastMinuteLive" \
  --subnet-ids subnet-xxxxxxxxx subnet-yyyyyyyyy

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier lastminutelive-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --db-subnet-group-name lastminutelive-subnet-group \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible \
  --storage-encrypted \
  --db-name lastminutelive
```

### **Step 2.2: Export Railway Database**

#### **Export Current Data:**
```bash
# Get Railway database URL (from your Railway dashboard)
export RAILWAY_DATABASE_URL="postgresql://postgres:password@host:port/database"

# Export schema and data
pg_dump "$RAILWAY_DATABASE_URL" > railway_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
wc -l railway_backup_*.sql
```

### **Step 2.3: Import to AWS RDS**

#### **Import Database:**
```bash
# Wait for RDS instance to be available
aws rds wait db-instance-available --db-instance-identifier lastminutelive-prod

# Get RDS endpoint
export RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier lastminutelive-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Import data to RDS
psql -h "$RDS_ENDPOINT" -U postgres -d lastminutelive < railway_backup_*.sql
```

### **Step 2.4: Update Environment Variables**

#### **Create new .env for AWS:**
```bash
# Create .env.aws
cp .env.local .env.aws

# Update database URL
echo "DATABASE_URL=postgresql://postgres:YourSecurePassword123!@$RDS_ENDPOINT:5432/lastminutelive" >> .env.aws
```

---

## 🖥️ **Phase 3: Backend Deployment**

### **Step 3.1: Create EC2 Instance**

#### **Launch EC2 Instance:**
```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name lastminutelive-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/lastminutelive-key.pem

chmod 400 ~/.ssh/lastminutelive-key.pem

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.micro \
  --key-name lastminutelive-key \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --user-data file://user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=lastminutelive-web}]'
```

#### **User Data Script (user-data.sh):**
```bash
#!/bin/bash
yum update -y
yum install -y docker git

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Create application directory
mkdir -p /opt/lastminutelive
chown ec2-user:ec2-user /opt/lastminutelive
```

### **Step 3.2: Deploy Application**

#### **Deploy Script (deploy.sh):**
```bash
#!/bin/bash
# Create deploy.sh

SERVER_IP="YOUR_EC2_IP"
SSH_KEY="~/.ssh/lastminutelive-key.pem"

# Copy files to server
rsync -avz --exclude node_modules --exclude .git \
  -e "ssh -i $SSH_KEY" \
  ./ ec2-user@$SERVER_IP:/opt/lastminutelive/

# SSH into server and setup
ssh -i $SSH_KEY ec2-user@$SERVER_IP << 'EOF'
cd /opt/lastminutelive

# Install dependencies
pnpm install

# Copy environment variables
cp .env.aws .env.local

# Build application
pnpm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
EOF
```

#### **PM2 Configuration (ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'lastminutelive',
    script: 'node_modules/.bin/next',
    args: 'start -p 3001',
    cwd: '/opt/lastminutelive',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### **Step 3.3: Load Balancer Setup**

#### **Application Load Balancer:**
```bash
# Create target group
aws elbv2 create-target-group \
  --name lastminutelive-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxxxxxxxx \
  --health-check-path /api/health

# Create load balancer
aws elbv2 create-load-balancer \
  --name lastminutelive-alb \
  --subnets subnet-xxxxxxxxx subnet-yyyyyyyyy \
  --security-groups sg-xxxxxxxxx

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/lastminutelive-targets/xxx \
  --targets Id=i-xxxxxxxxx
```

---

## 📁 **Phase 4: File Storage & CDN**

### **Step 4.1: S3 Bucket Setup**

#### **Create S3 Buckets:**
```bash
# Main uploads bucket
aws s3 mb s3://lastminutelive-uploads-prod

# Backup bucket
aws s3 mb s3://lastminutelive-backups-prod

# Configure bucket policies
aws s3api put-bucket-policy \
  --bucket lastminutelive-uploads-prod \
  --policy file://bucket-policy.json
```

#### **Bucket Policy (bucket-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::lastminutelive-uploads-prod/*"
    }
  ]
}
```

### **Step 4.2: CloudFront Distribution**

#### **Create CloudFront Distribution:**
```bash
# Create distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

#### **CloudFront Configuration (cloudfront-config.json):**
```json
{
  "CallerReference": "lastminutelive-cdn-$(date +%s)",
  "Comment": "LastMinuteLive CDN",
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-lastminutelive-uploads-prod",
    "ViewerProtocolPolicy": "redirect-to-https",
    "MinTTL": 0,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    },
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    }
  },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-lastminutelive-uploads-prod",
        "DomainName": "lastminutelive-uploads-prod.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

### **Step 4.3: Update Application for S3**

#### **S3 Upload Configuration:**
```typescript
// src/lib/s3-upload.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${fileName}`,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);
  
  // Return CloudFront URL
  return `https://${process.env.CLOUDFRONT_DOMAIN}/uploads/${fileName}`;
}
```

---

## 🎯 **Phase 5: Go-Live & Monitoring**

### **Step 5.1: Health Checks**

#### **Health Check Endpoint:**
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    
    // Check S3 connection
    // Add S3 health check here
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      storage: 'connected'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 });
  }
}
```

### **Step 5.2: Monitoring Setup**

#### **CloudWatch Alarms:**
```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HighCPUUtilization" \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-xxxxxxxxx

# Database connections alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HighDatabaseConnections" \
  --alarm-description "Alert when DB connections exceed 15" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 15 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=lastminutelive-prod
```

### **Step 5.3: DNS Cutover**

#### **Update DNS Records:**
```bash
# Get ALB DNS name
export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names lastminutelive-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Update your DNS provider to point to ALB
# A record: @ -> $ALB_DNS
# CNAME record: www -> $ALB_DNS
```

### **Step 5.4: Mobile App Updates**

#### **Update Mobile App Configuration:**
```typescript
// mobile-app/src/config/index.ts
export const config = {
  // Change from Railway URL to AWS ALB URL
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com',
  
  // Update image URLs to use CloudFront
  imageBaseUrl: 'https://your-cloudfront-domain.cloudfront.net',
  
  // Rest of your config...
};
```

---

## 🔄 **Rollback Procedures**

### **Emergency Rollback Plan**

#### **1. DNS Rollback:**
```bash
# Immediately point DNS back to Railway
# Update A record: @ -> railway-production-url.railway.app
```

#### **2. Database Rollback:**
```bash
# If database migration fails, restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier lastminutelive-rollback \
  --db-snapshot-identifier railway-backup-snapshot
```

#### **3. Application Rollback:**
```bash
# Keep Railway deployment active during migration
# Can switch traffic back via DNS
```

---

## 📊 **Cost Monitoring**

### **Daily Cost Tracking:**
```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### **Set up Cost Alerts:**
```bash
# Create SNS topic for cost alerts
aws sns create-topic --name cost-alerts

# Subscribe to notifications
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:account:cost-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## 🔧 **Backup Strategy**

### **Database Backups:**
```bash
# Automated daily backups (already configured in RDS)
# Manual snapshot before major changes
aws rds create-db-snapshot \
  --db-instance-identifier lastminutelive-prod \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d)
```

### **S3 Lifecycle Policies:**
```json
{
  "Rules": [
    {
      "Id": "BackupLifecycle",
      "Status": "Enabled",
      "Filter": {"Prefix": "backups/"},
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

---

## 📈 **Performance Optimization**

### **After Migration:**
1. **Enable RDS Performance Insights**
2. **Set up CloudWatch custom metrics**
3. **Configure Auto Scaling for EC2**
4. **Implement CDN caching strategies**
5. **Database query optimization**

### **Auto Scaling Configuration:**
```bash
# Create Auto Scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name lastminutelive-asg \
  --launch-configuration-name lastminutelive-lc \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 1 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account:targetgroup/lastminutelive-targets/xxx
```

---

## ✅ **Migration Checklist**

### **Phase 1: Foundation**
- [ ] AWS account created and configured
- [ ] IAM user with proper permissions
- [ ] VPC and security groups configured
- [ ] Billing alerts set up

### **Phase 2: Database**
- [ ] RDS instance created
- [ ] Railway data exported
- [ ] Data imported to RDS
- [ ] Connection tested

### **Phase 3: Backend**
- [ ] EC2 instance launched
- [ ] Application deployed
- [ ] Load balancer configured
- [ ] Health checks working

### **Phase 4: Storage**
- [ ] S3 buckets created
- [ ] CloudFront distribution created
- [ ] File upload functionality updated
- [ ] Mobile app updated

### **Phase 5: Go-Live**
- [ ] DNS updated
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Performance tested

---

## 🚨 **Emergency Contacts**

### **AWS Support:**
- Basic Support: Included
- Developer Support: $29/month
- Business Support: $100/month

### **Monitoring:**
- Set up PagerDuty or similar for alerts
- Configure Slack notifications
- Create runbook for common issues

---

## 📞 **Next Steps**

1. **Review this guide thoroughly**
2. **Set up AWS account and billing alerts**
3. **Start with Phase 1 (Foundation)**
4. **Test each phase in staging environment**
5. **Schedule migration during low-traffic period**

**Estimated Timeline: 2-3 weeks**
**Estimated Cost: $25-35/month after free tier**

---

*This guide provides a comprehensive roadmap for migrating from Railway to AWS. Each phase should be tested thoroughly before proceeding to the next.* 