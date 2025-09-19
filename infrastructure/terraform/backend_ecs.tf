variable "backend_image" { type = string description = "Container image for backend" }
variable "backend_cpu" { type = number default = 256 }
variable "backend_memory" { type = number default = 512 }
variable "backend_desired_count" { type = number default = 1 }

# ECS Cluster
resource "aws_ecs_cluster" "backend" {
	name = "${local.name_prefix}-ecs"
}

# ALB
resource "aws_lb" "app" {
	name               = "${local.name_prefix}-alb"
	load_balancer_type = "application"
	subnets            = var.private_subnet_ids
	internal           = false
	security_groups    = [aws_security_group.alb.id]
}

resource "aws_security_group" "alb" {
	name   = "${local.name_prefix}-alb-sg"
	vpc_id = var.vpc_id
	ingress { from_port = 80 to_port = 80 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
	ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
	egress  { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_lb_target_group" "app" {
	name        = "${local.name_prefix}-tg"
	port        = 4000
	protocol    = "HTTP"
	vpc_id      = var.vpc_id
	target_type = "ip"
	health_check { path = "/health" interval = 30 timeout = 5 healthy_threshold = 2 unhealthy_threshold = 3 }
}

resource "aws_lb_listener" "http" {
	load_balancer_arn = aws_lb.app.arn
	port              = 80
	protocol          = "HTTP"
	default_action { type = "forward" target_group_arn = aws_lb_target_group.app.arn }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "backend" {
	family                   = "${local.name_prefix}-task"
	requires_compatibilities = ["FARGATE"]
	network_mode             = "awsvpc"
	cpu                      = var.backend_cpu
	memory                   = var.backend_memory
	execution_role_arn       = aws_iam_role.ecs_exec.arn
	task_role_arn            = aws_iam_role.ecs_task.arn
	container_definitions    = jsonencode([
		{
			name: "backend",
			image: var.backend_image,
			portMappings: [{ containerPort: 4000, hostPort: 4000 }],
			environment: [
				{ name: "PORT", value: "4000" },
			],
			logConfiguration: { logDriver: "awslogs", options: { "awslogs-group": "/ecs/${local.name_prefix}", "awslogs-region": var.region, "awslogs-stream-prefix": "ecs" } }
		}
	])
}

resource "aws_cloudwatch_log_group" "ecs" { name = "/ecs/${local.name_prefix}" retention_in_days = 14 }

# ECS Service
resource "aws_ecs_service" "backend" {
	name            = "${local.name_prefix}-svc"
	cluster         = aws_ecs_cluster.backend.id
	desired_count   = var.backend_desired_count
	task_definition = aws_ecs_task_definition.backend.arn
	launch_type     = "FARGATE"
	network_configuration { subnets = var.private_subnet_ids security_groups = [aws_security_group.svc.id] assign_public_ip = false }
	load_balancer { target_group_arn = aws_lb_target_group.app.arn container_name = "backend" container_port = 4000 }
	depends_on = [aws_lb_listener.http]
}

resource "aws_security_group" "svc" {
	name   = "${local.name_prefix}-svc-sg"
	vpc_id = var.vpc_id
	ingress { from_port = 4000 to_port = 4000 protocol = "tcp" security_groups = [aws_security_group.alb.id] }
	egress  { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

# Minimal WAF association placeholder
resource "aws_wafv2_web_acl" "web" {
	name        = "${local.name_prefix}-waf"
	scope       = "REGIONAL"
	default_action { allow {} }
	rule {
		name     = "AWS-AWSManagedRulesCommonRuleSet"
		priority = 1
		statement { managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet" vendor_name = "AWS" } }
		action { allow {} }
	}
	visibility_config { cloudwatch_metrics_enabled = true metric_name = "${local.name_prefix}-waf" sampled_requests_enabled = true }
}

resource "aws_wafv2_web_acl_association" "alb" {
	resource_arn = aws_lb.app.arn
	web_acl_arn  = aws_wafv2_web_acl.web.arn
}

output "alb_dns" { value = aws_lb.app.dns_name }