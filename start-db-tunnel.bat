@echo off
echo Starting AWS SSM Secure Tunnel to RDS...
echo Please wait... (Do not close this window)
echo.
aws ssm start-session --target "i-0623e612b644a544b" --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters host="mooncliq-crm.cvykoi060my8.ap-south-1.rds.amazonaws.com",portNumber="5432",localPortNumber="5432"
