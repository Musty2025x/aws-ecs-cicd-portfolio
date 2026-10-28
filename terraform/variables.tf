variable "aws_region" {
  description = "AWS region for all project resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short, unique project prefix. Use lowercase letters, numbers, and hyphens."
  type        = string
  default     = "aws-cicd-portfolio"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project_name))
    error_message = "project_name must be 3-24 characters and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "github_owner" {
  description = "GitHub username or organization that owns the source repository."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name, without owner."
  type        = string
}

variable "github_branch" {
  description = "Branch that triggers the pipeline."
  type        = string
  default     = "main"
}

variable "github_connection_arn" {
  description = "ARN of an AVAILABLE AWS CodeConnections GitHub connection created in us-east-1."
  type        = string
}

variable "app_port" {
  description = "Port exposed by the Node.js app."
  type        = number
  default     = 3000
}
