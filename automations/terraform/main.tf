terraform {
  required_providers {
    cursor = {
      source  = "cursor/cursor"
      version = "~> 0.1"
    }
  }
}

provider "cursor" {}

resource "cursor_platform_workflow" "gram_hourly" {
  name        = "Crypto Chart · GRAM hourly"
  description = "Hourly GRAM (OKX) chart read via crypto-chart-analysis skill"
  scope       = "user"
  enabled     = true

  git_repo   = "github.com/DALee66/crypto-chart-agent"
  git_branch = "main"

  disabled_default_tools = ["open_git_pr"]

  model_selection = {
    model_id = "auto-smart"
    parameters = [
      { id = "optimize_for", value = "balanced" }
    ]
  }

  prompt = file("${path.module}/../INSTRUCTIONS.paste.txt")

  trigger = [
    {
      cron = {
        # Every hour at minute 0, UTC
        schedule = "0 * * * *"
      }
    }
  ]
}

output "automation_id" {
  value = cursor_platform_workflow.gram_hourly.id
}
