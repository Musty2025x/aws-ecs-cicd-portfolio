# AWS ECS Fargate CI/CD Portfolio Project

GitHub → AWS CodePipeline → CodeBuild → Amazon ECR → ECS Fargate → CloudWatch

Region: `us-east-1`. Terraform provisions the AWS infrastructure. The sample app is a small Node.js HTTP server with `/`, `/health`, and `/version` endpoints.

## Cost warning

This is a learning environment, not a free-tier guarantee. An Application Load Balancer, Fargate tasks, public IPv4 addresses, CloudWatch logs, ECR storage, CodePipeline, and build minutes may incur charges. There is no NAT Gateway in this design. Keep the project up only while testing, and run `terraform destroy` when finished. Check current prices in AWS Pricing Calculator first.

## Prerequisites

- Git and Docker Desktop
- Terraform 1.6+
- AWS CLI v2
- An AWS account with permissions to create IAM, VPC, ECS, ECR, CodeBuild, CodePipeline, CloudWatch and related resources
- GitHub account

## 1. Run the app locally first

From the repository root:

```bash
docker build -t aws-cicd-sample:local .
docker run --rm -p 3000:3000 aws-cicd-sample:local
```

In another terminal:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/version
```

Expected health response: `{"status":"ok"}`. Stop the container with Ctrl+C.

Optional Docker Compose:

```bash
docker compose up --build
```

Then open `http://localhost:3000`. Stop with `Ctrl+C`, then `docker compose down`.

## 2. Create a GitHub repository

Create an empty GitHub repository named `aws-ecs-cicd-portfolio` (without a README if you want to avoid merge conflicts). From this project directory:

```bash
git init
git add .
git commit -m "Build sample app and AWS ECS CI/CD infrastructure"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/aws-ecs-cicd-portfolio.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username. Do not commit AWS keys or `.tfvars` containing secrets.

## 3. Configure AWS credentials

Configure the AWS CLI using your preferred secure method (for example, `aws configure` for a local learning account, or an AWS IAM Identity Center profile).

```bash
aws sts get-caller-identity
aws configure get region
```

The first command should return your AWS account and caller identity. Do not proceed if it shows the wrong account. Use a dedicated learning account if possible.

## 4. Create a GitHub connection

CodePipeline needs a GitHub App connection. Create it once in the AWS Console:
1. Switch the console to **US East (N. Virginia), `us-east-1`**.
2. Open Developer Tools → Settings → Connections (or search for **CodeConnections**).
3. Choose **Create connection**, provider **GitHub**, and connect/install the AWS Connector for GitHub.
4. Give the connection access to your repository.
5. Finish creating it, then copy its connection ARN. If its status is `PENDING`, choose **Update pending connection** and complete the GitHub authorization until it shows `AVAILABLE`.

The ARN is an identifier, not a password. Use the exact ARN in `terraform.tfvars`.

## 5. Configure Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `project_name` to a short unique name (letters, numbers, hyphens; max 20 chars is a good target)
- `github_owner` to your GitHub username or organization
- `github_repo` to `aws-ecs-cicd-portfolio`
- `github_branch` to `main`
- `github_connection_arn` to the connection ARN created above

Then:

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

Read the plan carefully. It creates billable resources. **The first deployment needs a bootstrap image in ECR before ECS can start its service.** Create the ECR repository first:

```bash
terraform apply -target=aws_ecr_repository.app
```

The targeted apply is used only for this bootstrap step. Next, authenticate Docker to ECR and push a starter image:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1
REPOSITORY=aws-cicd-portfolio
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"
docker build --build-arg APP_VERSION=bootstrap -t "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY:bootstrap" .
docker push "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY:bootstrap"
```

If you changed `project_name` in `terraform.tfvars`, replace `REPOSITORY` with that value. Then create the rest of the infrastructure:

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

Terraform creates the VPC and two public subnets, ALB, ECS cluster/service/task definition, IAM roles, CloudWatch log group, CodeBuild project, artifact bucket and CodePipeline. The bootstrap image allows ECS to start before the first pipeline run; the pipeline subsequently deploys a commit-tagged image.

## 6. Trigger the first build

After `terraform apply` completes, the pipeline should start automatically. If not, open AWS Console → CodePipeline → `aws-cicd-portfolio-pipeline` → **Release change**.

The first run may fail if the GitHub connection has not reached `AVAILABLE`, the GitHub repository/branch is wrong, or account permissions are insufficient. Inspect the failed action details.

## 7. Verify the deployment

Get the URL:

```bash
terraform output app_url
```

From the Terraform directory, test it (replace `<URL>` with the output):

```bash
curl http://<URL>/health
curl http://<URL>/version
```

The `/version` endpoint reports the `APP_VERSION` environment variable, which is set to the Git commit hash during the build.

Check ECS:
- AWS Console → ECS → Clusters → `aws-cicd-portfolio-cluster`
- Confirm the service has one running task.
- Check the target group in EC2 → Target Groups and confirm the target is healthy.
- Check CodePipeline and CodeBuild logs if deployment is not healthy.

## 8. Test continuous deployment

Change the response text in `app.js`, then:

```bash
git add app.js
git commit -m "Test automatic deployment"
git push
```

Watch CodePipeline run Source → Build → Deploy. After it succeeds, refresh `/version` and the root URL.

## 9. Troubleshooting

- **GitHub source action fails:** ensure the connection is `AVAILABLE`, has access to this repo, and branch names match.
- **CodeBuild cannot push to ECR:** review the CodeBuild role policy and build logs.
- **ECS task stops:** open ECS → service → Tasks → stopped task → stopped reason; check CloudWatch log group `/ecs/aws-cicd-portfolio`.
- **ALB target unhealthy:** confirm app listens on `0.0.0.0:3000`, container port is 3000, health path is `/health`, and ECS security group allows port 3000 from ALB security group.
- **Docker build fails locally:** ensure Docker Desktop is running.

## 10. Clean up everything

From `terraform/`:

```bash
terraform destroy
```

Review the destroy plan and confirm. This removes resources managed by this Terraform configuration, including the ALB, ECS service, pipeline and artifact bucket. The S3 artifact bucket is configured to be destroyed with its objects. ECR images are also configured to be force-deleted.

Then check the AWS Console in `us-east-1` for any manually-created CodeConnections connection and delete it if no longer needed. Also check Cost Explorer/Billing for remaining resources. Never assume cleanup succeeded until you verify.

## Architecture notes

- The task runs in public subnets with a public IP to avoid NAT Gateway charges. Its security group only permits inbound application traffic from the ALB security group.
- This is an HTTP-only demo. Do not use it for sensitive data or production workloads. For production, use HTTPS, private subnets with a suitable egress design, tighter IAM, secrets management, and stronger deployment controls.
- The ALB is a major ongoing cost. Destroy resources when you are not actively using the project.
