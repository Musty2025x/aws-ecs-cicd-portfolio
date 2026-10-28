output "app_url" {
  description = "Public HTTP URL for the sample application."
  value       = "http://${aws_lb.app.dns_name}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "pipeline_name" {
  value = aws_codepipeline.app.name
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.app.name
}
