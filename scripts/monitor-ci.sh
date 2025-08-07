#!/bin/bash

echo "📊 CI/CD Pipeline Monitor"
echo "========================="

# Check latest workflow run
if command -v gh &> /dev/null; then
    echo ""
    echo "📈 Latest Workflow Runs:"
    gh run list --workflow=production-ci-cd.yml --limit=5
    
    echo ""
    echo "🔍 Latest Run Details:"
    gh run view --log-failed
else
    echo "⚠️ GitHub CLI not installed. Install with: brew install gh"
fi

# Check Docker resource usage
echo ""
echo "🐳 Docker Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Check service health
echo ""
echo "❤️ Service Health:"
curl -s http://localhost:3001/health | jq '.' 2>/dev/null || echo "Backend not running"
curl -s http://localhost:5173/ > /dev/null && echo "Frontend: ✅ Running" || echo "Frontend: ❌ Not running" 