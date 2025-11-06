# DataGovIN Sentinel - Usage Examples

This document provides practical, real-world examples of using the DataGovIN Sentinel actor for various use cases.

---

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Research & Academic Use](#research--academic-use)
3. [Policy Analysis](#policy-analysis)
4. [Data Journalism](#data-journalism)
5. [Application Development](#application-development)
6. [Compliance & Governance](#compliance--governance)
7. [Advanced Analytics](#advanced-analytics)

---

## Basic Examples

### Example 1: Simple Search

Find datasets about COVID-19 vaccination:

```json
{
  "mode": "search",
  "query": "COVID-19 vaccination statistics",
  "maxResults": 20
}
```

**Expected Output:**
- List of 20 datasets related to COVID-19 vaccination
- Metadata including titles, organizations, resource formats
- Quality scores for each dataset

---

### Example 2: Filtered Search

Search for datasets from Ministry of Health in CSV format:

```json
{
  "mode": "search",
  "query": "health statistics",
  "filters": {
    "organization": "Ministry of Health and Family Welfare",
    "format": ["CSV", "JSON"],
    "dateFrom": "2024-01-01"
  },
  "maxResults": 50
}
```

---

### Example 3: Download Specific Dataset

Retrieve a specific dataset with actual data:

```json
{
  "mode": "retrieve",
  "datasetIds": ["58c94f85-0ed1-4e66-9787-03d7afddc2c0"],
  "includeResources": true,
  "resourceLimit": 5,
  "maxFileSize": 100
}
```

---

## Research & Academic Use

### Example 4: Education Research

Analyze literacy rates across Indian states:

```json
{
  "mode": "analyze",
  "query": "state wise literacy rate education statistics",
  "filters": {
    "organization": "Ministry of Education",
    "sector": "Education",
    "format": ["CSV", "XLSX"]
  },
  "includeResources": true,
  "maxResults": 30,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true,
    "dataQualityScore": true
  }
}
```

**Use Case:** PhD research on educational attainment trends

---

### Example 5: Agricultural Production Analysis

Study crop production patterns:

```json
{
  "mode": "retrieve",
  "query": "crop production yield agriculture state wise",
  "filters": {
    "organization": "Ministry of Agriculture and Farmers Welfare",
    "tags": ["agriculture", "crops", "production"],
    "dateFrom": "2020-01-01",
    "dateTo": "2024-12-31"
  },
  "includeResources": true,
  "maxResults": 50,
  "resourceLimit": 3,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true
  },
  "governance": {
    "enableAuditLog": true
  }
}
```

**Output Includes:**
- Time-series data for crop yields
- Trend analysis (increasing/decreasing/stable)
- Statistical summaries (mean, median, std dev)
- Data quality scores

---

## Policy Analysis

### Example 6: Budget Allocation Study

Analyze government budget allocations over time:

```json
{
  "mode": "analyze",
  "query": "union budget allocation ministry wise",
  "filters": {
    "organization": "Ministry of Finance",
    "sector": "Finance",
    "dateFrom": "2015-01-01"
  },
  "includeResources": true,
  "maxResults": 100,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true,
    "dataQualityScore": true
  }
}
```

**Use Case:** Policy think tank analyzing fiscal priorities

---

### Example 7: Healthcare Expenditure Comparison

Compare healthcare spending across states:

```json
{
  "mode": "retrieve",
  "query": "state wise healthcare expenditure per capita",
  "filters": {
    "sector": "Health",
    "format": ["CSV", "JSON"],
    "dateFrom": "2020-01-01"
  },
  "includeResources": true,
  "maxResults": 40,
  "resourceLimit": 5,
  "analytics": {
    "enableStatistics": true,
    "dataQualityScore": true
  },
  "output": {
    "format": "json",
    "includeMetadata": true,
    "includePreview": true
  }
}
```

---

## Data Journalism

### Example 8: Investigative Journalism

Find datasets on government contracts and tenders:

```json
{
  "mode": "search",
  "query": "government contracts tenders public procurement",
  "filters": {
    "tags": ["procurement", "tenders", "contracts"],
    "dateFrom": "2024-01-01"
  },
  "maxResults": 100,
  "governance": {
    "respectLicenses": true,
    "blockRestrictedData": true,
    "enableAuditLog": true,
    "piiDetection": true
  }
}
```

**Use Case:** Investigative reporter tracking government spending

---

### Example 9: Environmental Reporting

Track air quality data for investigative story:

```json
{
  "mode": "retrieve",
  "query": "air quality index AQI pollution monitoring stations",
  "filters": {
    "organization": "Central Pollution Control Board",
    "sector": "Environment",
    "format": ["CSV", "JSON", "API"]
  },
  "includeResources": true,
  "maxResults": 50,
  "resourceLimit": 3,
  "maxFileSize": 200,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true
  }
}
```

---

## Application Development

### Example 10: Build a Weather App

Access weather and climate data:

```json
{
  "mode": "retrieve",
  "query": "weather data meteorological rainfall temperature",
  "filters": {
    "organization": "India Meteorological Department",
    "format": ["API", "JSON"],
    "dateFrom": "2024-01-01"
  },
  "includeResources": false,
  "maxResults": 20,
  "output": {
    "format": "json",
    "includeMetadata": true
  }
}
```

**Use Case:** Mobile app developer building weather forecast app

---

### Example 11: Transport Data API

Build a public transport information app:

```json
{
  "mode": "retrieve",
  "datasetIds": [
    "railway-station-data",
    "bus-route-information",
    "metro-network-data"
  ],
  "includeResources": true,
  "resourceLimit": 10,
  "maxFileSize": 50,
  "output": {
    "format": "json"
  }
}
```

---

## Compliance & Governance

### Example 12: Audit Trail Enabled

Run search with full governance logging:

```json
{
  "mode": "search",
  "query": "sensitive data health records",
  "filters": {
    "sector": "Health"
  },
  "maxResults": 50,
  "governance": {
    "respectLicenses": true,
    "blockRestrictedData": true,
    "enableAuditLog": true,
    "piiDetection": true
  },
  "debugMode": true
}
```

**Output Includes:**
- Compliance report with blocked datasets
- PII detection warnings
- License validation results
- Complete audit log

---

### Example 13: License Compliance Check

Check licensing for datasets before use:

```json
{
  "mode": "retrieve",
  "query": "demographic census data population",
  "maxResults": 30,
  "includeResources": false,
  "governance": {
    "respectLicenses": true,
    "blockRestrictedData": true,
    "enableAuditLog": true
  }
}
```

**Use Case:** Legal team verifying data usage rights

---

## Advanced Analytics

### Example 14: Multi-Dataset Trend Analysis

Analyze trends across multiple economic indicators:

```json
{
  "mode": "analyze",
  "query": "GDP growth rate inflation unemployment quarterly data",
  "filters": {
    "organization": "Ministry of Statistics and Programme Implementation",
    "sector": "Finance",
    "format": ["CSV", "XLSX"],
    "dateFrom": "2015-01-01"
  },
  "includeResources": true,
  "maxResults": 50,
  "resourceLimit": 5,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true,
    "dataQualityScore": true,
    "generateVisualizations": false
  }
}
```

**Expected Analytics:**
- Trend direction (increasing/decreasing/stable)
- Correlation analysis between indicators
- Data quality assessment
- Recommendations for data usage

---

### Example 15: Comprehensive Platform Monitoring

Monitor the entire data.gov.in platform:

```json
{
  "mode": "monitor",
  "maxResults": 100
}
```

**Output:**
- 100 most recently updated datasets
- 100 trending datasets (by views)
- List of all active organizations
- Top 30 popular tags
- Platform statistics

---

## Rate Limiting Examples

### Example 16: High-Volume Data Collection

Configure for intensive data collection:

```json
{
  "mode": "retrieve",
  "query": "district wise population census data",
  "maxResults": 500,
  "includeResources": true,
  "resourceLimit": 2,
  "maxFileSize": 50,
  "rateLimit": {
    "requestsPerHour": 1500,
    "concurrentRequests": 3,
    "retryAttempts": 5
  },
  "authentication": {
    "apiKey": "your-api-key-here"
  }
}
```

**Note:** Adjust rate limits based on your API quota

---

### Example 17: Conservative Rate Limiting

Minimal resource usage for testing:

```json
{
  "mode": "search",
  "query": "test query",
  "maxResults": 10,
  "rateLimit": {
    "requestsPerHour": 100,
    "concurrentRequests": 1,
    "retryAttempts": 3
  }
}
```

---

## Authentication Examples

### Example 18: Using API Key

Access with authenticated requests:

```json
{
  "mode": "retrieve",
  "query": "premium government data",
  "maxResults": 100,
  "includeResources": true,
  "authentication": {
    "apiKey": "your-data-gov-in-api-key",
    "enableOAuth": false
  },
  "rateLimit": {
    "requestsPerHour": 2000
  }
}
```

---

### Example 19: OAuth 2.0 Authentication

Use OAuth for premium features:

```json
{
  "mode": "retrieve",
  "query": "premium datasets",
  "maxResults": 200,
  "authentication": {
    "enableOAuth": true,
    "oauthToken": "your-oauth-access-token"
  },
  "rateLimit": {
    "requestsPerHour": 2000,
    "concurrentRequests": 10
  }
}
```

---

## Output Configuration

### Example 20: CSV Export

Export results in CSV format:

```json
{
  "mode": "search",
  "query": "export ready data",
  "maxResults": 100,
  "output": {
    "format": "csv",
    "includeMetadata": true,
    "includePreview": false,
    "compressionFormat": "zip"
  }
}
```

---

### Example 21: Full Data Download with Compression

Download large datasets with compression:

```json
{
  "mode": "retrieve",
  "query": "large dataset census data",
  "maxResults": 200,
  "includeResources": true,
  "resourceLimit": 10,
  "maxFileSize": 500,
  "output": {
    "format": "json",
    "includeMetadata": true,
    "includePreview": true,
    "compressionFormat": "gzip"
  }
}
```

---

## Debugging Examples

### Example 22: Debug Mode Enabled

Run with verbose logging for troubleshooting:

```json
{
  "mode": "search",
  "query": "debug test query",
  "maxResults": 10,
  "debugMode": true,
  "governance": {
    "enableAuditLog": true
  }
}
```

**Debug Output Includes:**
- Detailed API request logs
- Rate limiter status
- Governance check details
- Error stack traces

---

## Common Workflows

### Workflow 1: Research Paper Data Collection

1. **Discovery Phase:**
```json
{
  "mode": "search",
  "query": "renewable energy solar wind capacity state wise",
  "maxResults": 100
}
```

2. **Quality Assessment:**
```json
{
  "mode": "analyze",
  "datasetIds": ["id-from-step-1", "id-from-step-1-b"],
  "analytics": {
    "dataQualityScore": true
  }
}
```

3. **Data Retrieval:**
```json
{
  "mode": "retrieve",
  "datasetIds": ["high-quality-ids-from-step-2"],
  "includeResources": true,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true
  }
}
```

---

### Workflow 2: News Article Fact-Checking

1. **Find Official Data:**
```json
{
  "mode": "search",
  "query": "unemployment rate quarterly 2024",
  "filters": {
    "organization": "Ministry of Labour and Employment"
  }
}
```

2. **Verify and Download:**
```json
{
  "mode": "retrieve",
  "datasetIds": ["official-dataset-id"],
  "includeResources": true,
  "governance": {
    "enableAuditLog": true,
    "respectLicenses": true
  }
}
```

---

## Tips & Best Practices

1. **Start with Search Mode** to explore available datasets before downloading
2. **Use Filters** to narrow down results and reduce API calls
3. **Check Quality Scores** before investing time in data analysis
4. **Enable Governance** features to ensure compliance
5. **Adjust Rate Limits** based on your use case urgency
6. **Use Debug Mode** when troubleshooting issues
7. **Monitor Audit Logs** for compliance reporting
8. **Respect Licenses** by enabling license enforcement
9. **Test with Small Queries** before scaling up
10. **Cache Results** to avoid redundant API calls

---

## Error Handling Examples

### Example 23: Handling Failed Downloads

```json
{
  "mode": "retrieve",
  "datasetIds": ["potentially-unavailable-id"],
  "includeResources": true,
  "resourceLimit": 5,
  "maxFileSize": 100,
  "rateLimit": {
    "retryAttempts": 5
  }
}
```

The actor will:
- Retry failed downloads up to 5 times
- Log errors for each resource
- Continue processing other resources
- Return partial results with error details

---

## Need Help?

For more examples or assistance:
- Check the main README.md
- Review API documentation
- Enable debug mode for detailed logs
- Contact support with your use case

---

**Last Updated:** 2025-11-06
**Actor Version:** 1.0.0
