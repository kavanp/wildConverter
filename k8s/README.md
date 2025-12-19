# WildConverter Kubernetes Deployment

This directory contains all Kubernetes manifests for deploying WildConverter to AWS EKS.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **kubectl** installed and configured for your EKS cluster
3. **AWS Load Balancer Controller** installed in your cluster
4. **Docker** for building and pushing images

## Files

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates the `wildconverter` namespace |
| `configmap.yaml` | Application configuration |
| `deployment.yaml` | Application deployment with 2 replicas |
| `service.yaml` | ClusterIP service exposing port 80 |
| `ingress.yaml` | AWS ALB ingress for external access |
| `hpa.yaml` | Horizontal Pod Autoscaler (2-10 pods) |

## Deployment Instructions

### Step 1: Configure AWS CLI and kubectl

```bash
# Configure AWS CLI (if not already done)
aws configure

# Update kubeconfig for your EKS cluster
aws eks update-kubeconfig --region us-east-1 --name YOUR_CLUSTER_NAME
```

### Step 2: Build and Push Docker Image

```bash
# Navigate to project root
cd ..

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762313885910.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t wildconverter .

# Tag the image
docker tag wildconverter:latest 762313885910.dkr.ecr.us-east-1.amazonaws.com/wildconverter:latest

# Push to ECR
docker push 762313885910.dkr.ecr.us-east-1.amazonaws.com/wildconverter:latest
```

### Step 3: Deploy to Kubernetes

```bash
# Navigate to k8s directory
cd k8s

# Apply all manifests in order
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Or apply everything at once
kubectl apply -f .
```

### Step 4: Verify Deployment

```bash
# Check namespace
kubectl get ns wildconverter

# Check all resources in namespace
kubectl get all -n wildconverter

# Check pods are running
kubectl get pods -n wildconverter

# Check pod logs
kubectl logs -n wildconverter -l app=wildconverter --tail=100

# Check ingress status (get ALB DNS)
kubectl get ingress -n wildconverter

# Describe ingress for details
kubectl describe ingress wildconverter-ingress -n wildconverter
```

### Step 5: Access the Application

After the ALB is provisioned (2-5 minutes), get the DNS name:

```bash
kubectl get ingress -n wildconverter -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}'
```

Open the DNS name in your browser to access WildConverter.

## Useful Commands

### Scaling

```bash
# Manual scale
kubectl scale deployment wildconverter -n wildconverter --replicas=5

# Check HPA status
kubectl get hpa -n wildconverter
```

### Updates

```bash
# Update to new image version
kubectl set image deployment/wildconverter wildconverter=762313885910.dkr.ecr.us-east-1.amazonaws.com/wildconverter:v2 -n wildconverter

# Rollout status
kubectl rollout status deployment/wildconverter -n wildconverter

# Rollback if needed
kubectl rollout undo deployment/wildconverter -n wildconverter
```

### Debugging

```bash
# Get pod details
kubectl describe pod -n wildconverter -l app=wildconverter

# Execute into pod
kubectl exec -it -n wildconverter $(kubectl get pod -n wildconverter -l app=wildconverter -o jsonpath='{.items[0].metadata.name}') -- /bin/bash

# Check events
kubectl get events -n wildconverter --sort-by='.lastTimestamp'
```

### Cleanup

```bash
# Delete all resources
kubectl delete -f .

# Or delete namespace (removes everything)
kubectl delete namespace wildconverter
```

## HTTPS Configuration

To enable HTTPS with AWS Certificate Manager:

1. Request/import a certificate in ACM (us-east-1 region)
2. Update `ingress.yaml` - uncomment the SSL lines and add your certificate ARN:

```yaml
alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
alb.ingress.kubernetes.io/ssl-redirect: "443"
alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:762313885910:certificate/YOUR-CERT-ID
```

3. Apply the updated ingress:
```bash
kubectl apply -f ingress.yaml
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod -n wildconverter -l app=wildconverter
kubectl logs -n wildconverter -l app=wildconverter --previous
```

### ALB not provisioning
- Ensure AWS Load Balancer Controller is installed
- Check controller logs: `kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller`
- Verify IAM permissions for the controller

### Image pull errors
```bash
# Verify ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762313885910.dkr.ecr.us-east-1.amazonaws.com

# Check if image exists
aws ecr describe-images --repository-name wildconverter --region us-east-1
```
