# DataGovIN Sentinel 🇮🇳

<p align="center">
  <strong>Production-Ready AI Actor for India's Open Government Data Platform</strong>
</p>

<p align="center">
  <em>Advanced Discovery • Secure Retrieval • Ethical Analysis • Compliance-First</em>
</p>

---

## 🎯 Overview

**DataGovIN Sentinel** is a sophisticated Apify actor designed exclusively for interacting with [data.gov.in](https://data.gov.in/), India's Open Government Data (OGD) Platform. This actor empowers citizens, researchers, policymakers, and developers to seamlessly discover, retrieve, analyze, and visualize datasets while maintaining full compliance with:

- ✅ **Open Government Data (OGD) Policy India 2025**
- ✅ **Digital Personal Data Protection Act (DPDP) 2023**
- ✅ **Creative Commons CC-BY 4.0 Licensing**
- ✅ **API v3 Rate Limits** (2000 requests/hour with OAuth 2.0)

---

## 🌟 Key Features

### 🔍 Intelligent Discovery
- **Semantic Search**: Natural language queries with SOLR-powered search
- **Advanced Filtering**: Filter by organization, sector, format, tags, date ranges
- **Relevance Scoring**: Automatic filtering of results by relevance threshold
- **Faceted Navigation**: Browse by organizations, sectors, tags, and formats

### 📥 Secure Data Acquisition
- **Multi-Format Support**: CSV, JSON, XML, XLS, XLSX, TXT, TSV
- **Smart Parsing**: Automatic data parsing with preview generation
- **Size Management**: Configurable file size limits and streaming
- **Rate-Limited Downloads**: Respects API quotas with exponential backoff

### 📊 Analytics Engine
- **Data Quality Assessment**: Comprehensive quality scoring (0-100)
- **Statistical Analysis**: Descriptive statistics using simple-statistics
- **Trend Detection**: Linear regression for time-series analysis
- **Resource Analysis**: Format distribution, completeness metrics

### 🔒 Governance & Compliance
- **License Enforcement**: Automatic CC-BY 4.0 attribution generation
- **Access Control**: Blocks restricted/confidential datasets
- **PII Detection**: DPDP Act 2023 compliance with pattern matching
- **Audit Logging**: Complete activity trail for transparency

### ⚡ Performance & Resilience
- **Rate Limiting**: Bottleneck-based throttling (configurable 100-2000 req/hour)
- **Retry Logic**: Exponential backoff with jitter (up to 5 attempts)
- **Concurrent Processing**: Parallel requests (1-10 concurrent)
- **Fault Tolerance**: Graceful error handling and fallback mechanisms

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Apify account (for deployment)
- Optional: data.gov.in API key (for enhanced access)

### Installation

#### Local Development
```bash
# Clone repository
git clone <repository-url>
cd data-gov-in-actor

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env with your API credentials

# Run locally
npm start
```

#### Deploy to Apify
```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Deploy actor
apify push
```

---

## 📖 Usage Guide

### Operation Modes

The actor supports **4 operation modes**:

#### 1. 🔍 **Search Mode** (Discovery)
Find datasets matching your query without downloading data.

**Input Example:**
```json
{
  "mode": "search",
  "query": "agriculture production statistics 2024",
  "filters": {
    "organization": "Ministry of Agriculture",
    "sector": "Agriculture",
    "format": ["CSV", "JSON"],
    "dateFrom": "2024-01-01"
  },
  "maxResults": 50
}
```

**Output:**
- Dataset metadata (title, description, organization, tags)
- Resource information (formats, sizes, URLs)
- Quality scores and relevance rankings
- Governance validation results

---

#### 2. 📥 **Retrieve Mode** (Data Acquisition)
Download and parse actual dataset files.

**Input Example:**
```json
{
  "mode": "retrieve",
  "query": "GDP quarterly data",
  "includeResources": true,
  "resourceLimit": 3,
  "maxFileSize": 50,
  "analytics": {
    "dataQualityScore": true,
    "enableStatistics": true
  }
}
```

**Output:**
- Full dataset metadata
- Parsed resource data with previews (first 100 rows)
- Data quality assessment
- Basic statistics (mean, median, std dev)
- Attribution text for proper citation

---

#### 3. 📊 **Analyze Mode** (Deep Analytics)
Comprehensive analysis with statistical insights.

**Input Example:**
```json
{
  "mode": "analyze",
  "datasetIds": ["dataset-id-1", "dataset-id-2"],
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true,
    "dataQualityScore": true
  }
}
```

**Output:**
- Quality assessment with recommendations
- Resource completeness analysis
- Trend detection for time-series data
- PII scan results (DPDP compliance)
- Actionable insights and warnings

---

#### 4. 👁️ **Monitor Mode** (Platform Insights)
Track platform activity and discover trending datasets.

**Input Example:**
```json
{
  "mode": "monitor",
  "maxResults": 50
}
```

**Output:**
- Recently updated datasets (last 30 days)
- Trending datasets (by views)
- Active organizations and their dataset counts
- Popular tags and categories

---

## 🔧 Configuration

### Authentication (Optional)

For enhanced access and higher rate limits:

```json
{
  "authentication": {
    "apiKey": "your-api-key-here",
    "enableOAuth": false,
    "oauthToken": "your-oauth-token"
  }
}
```

**Note:** Most public data is accessible without authentication.

---

### Rate Limiting

Stay compliant with OGD Policy 2025:

```json
{
  "rateLimit": {
    "requestsPerHour": 1800,
    "concurrentRequests": 5,
    "retryAttempts": 5
  }
}
```

**Default:** 1800 requests/hour (buffer under 2000 limit)

---

### Governance & Compliance

Configure ethical data handling:

```json
{
  "governance": {
    "respectLicenses": true,
    "blockRestrictedData": true,
    "enableAuditLog": true,
    "piiDetection": true
  }
}
```

---

## 📊 Output Format

### Standard Output Structure

```json
{
  "success": true,
  "mode": "retrieve",
  "metadata": {
    "actor": "DataGovIN Sentinel",
    "version": "1.0.0",
    "executionTime": "2025-11-06T12:00:00.000Z",
    "dataSource": "Open Government Data Platform India",
    "compliance": {
      "ogdPolicy": "OGD Policy India 2025",
      "dataProtection": "DPDP Act 2023",
      "license": "CC-BY 4.0"
    }
  },
  "results": [ /* Array of datasets */ ],
  "statistics": {
    "resultsCount": 10,
    "apiRequests": 45,
    "successRate": "97.78%"
  },
  "compliance": {
    "summary": {
      "totalAccessAttempts": 10,
      "blockedDatasets": 2,
      "licenseWarnings": 1
    }
  },
  "attribution": "Data Source: ... Retrieved from ... License: CC-BY 4.0 ..."
}
```

---

## 🏗️ Architecture

### Module Overview

```
src/
├── main.js              # Main actor entry point
├── api-client.js        # API client with rate limiting
├── search-discovery.js  # Search and discovery module
├── data-acquisition.js  # Data retrieval and parsing
├── analytics.js         # Statistical analysis engine
├── governance.js        # Compliance and ethics layer
└── utils.js            # Utility functions
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Apify SDK 3.x
- **HTTP Client**: Axios with axios-retry
- **Rate Limiting**: Bottleneck
- **Statistics**: simple-statistics
- **Data Parsing**: csv-parse, xlsx
- **Queue Management**: p-queue

---

## 🔐 Security & Compliance

### Data Protection (DPDP Act 2023)

The actor includes PII detection using pattern matching for:
- Aadhaar numbers (12-digit patterns)
- PAN card numbers
- Email addresses
- Phone numbers

**Automatic Actions:**
- Detection warnings in output
- Optional redaction (if enabled)
- Audit log entries

### License Compliance (CC-BY 4.0)

**Automatic Attribution Generation:**
```
Data Source: "Dataset Title" by Organization Name.
Retrieved from Open Government Data Platform India (https://data.gov.in/...)
on 2025-11-06. License: CC-BY 4.0.
Attribution required under CC-BY 4.0 and OGD Policy India 2025.
```

### API Rate Limits

**OGD Policy 2025 Limits:**
- **Public Access**: 2000 requests/hour
- **Default Setting**: 1800 requests/hour (10% buffer)
- **Implementation**: Bottleneck with reservoir refresh

---

## 🎓 Use Cases

### 1. Research & Academia
```json
{
  "mode": "retrieve",
  "query": "education statistics literacy rates",
  "filters": {
    "organization": "Ministry of Education",
    "format": ["CSV"]
  },
  "includeResources": true,
  "analytics": {
    "enableStatistics": true,
    "enableTrends": true
  }
}
```

### 2. Policy Analysis
```json
{
  "mode": "analyze",
  "query": "healthcare expenditure states",
  "filters": {
    "sector": "Health",
    "dateFrom": "2020-01-01"
  },
  "maxResults": 100
}
```

### 3. Journalism & Transparency
```json
{
  "mode": "search",
  "query": "budget allocation 2024",
  "filters": {
    "organization": "Ministry of Finance"
  },
  "governance": {
    "enableAuditLog": true
  }
}
```

### 4. App Development
```json
{
  "mode": "retrieve",
  "datasetIds": ["weather-api-dataset"],
  "includeResources": true,
  "output": {
    "format": "json"
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### API Connection Failed
**Problem:** `Failed to connect to data.gov.in API`

**Solutions:**
- Check internet connectivity
- Verify data.gov.in is accessible (not blocked)
- Try with API key if available
- Check rate limit status

#### Rate Limit Exceeded
**Problem:** `Rate limit exceeded. Implement backoff.`

**Solutions:**
- Reduce `requestsPerHour` in configuration
- Decrease `concurrentRequests`
- Wait for reservoir to refresh (1 hour)

#### Dataset Blocked
**Problem:** `Dataset contains restricted content`

**Solutions:**
- Review dataset tags and description
- Disable `blockRestrictedData` if false positive
- Check governance audit log for details

#### Resource Download Failed
**Problem:** `Failed to acquire resource`

**Solutions:**
- Increase `maxFileSize` limit
- Check resource URL availability
- Verify format is supported
- Review network logs

---

## 📚 API Reference

### CKAN API v3 Endpoints

The actor uses data.gov.in's CKAN API:

- **Base URL**: `https://data.gov.in/api/3/action`
- **Endpoints Used**:
  - `package_search` - Search datasets
  - `package_show` - Get dataset details
  - `resource_show` - Get resource details
  - `organization_list` - List organizations
  - `group_list` - List sectors/groups
  - `tag_list` - List tags

**Official Documentation**: [data.gov.in/apis](https://data.gov.in/apis)

---

## 🤝 Contributing

We welcome contributions! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add JSDoc comments for new functions
- Test with real data.gov.in data
- Update documentation
- Maintain compliance checks

---

## 📄 License

This project is licensed under the **Apache License 2.0**.

### Data License

Data retrieved from data.gov.in is subject to:
- **Creative Commons CC-BY 4.0** (most datasets)
- **Open Government Data Policy India 2025**
- Individual dataset licenses (always check)

**Attribution Required:** Yes, for all CC-BY licensed datasets.

---

## 🙏 Acknowledgments

- **Open Government Data Platform India** - For providing open data infrastructure
- **CKAN Project** - For the open-source data portal software
- **Apify** - For the actor platform and SDK
- **Indian Government** - For commitment to open data transparency

---

## 📞 Support

### Issues & Questions
- **GitHub Issues**: [Report bugs or request features]
- **Email**: support@example.com
- **Documentation**: [Full API docs]

### Resources
- [data.gov.in](https://data.gov.in/) - Official platform
- [OGD Policy India](https://data.gov.in/ogpl) - Policy details
- [DPDP Act 2023](https://www.meity.gov.in/dpdpa-2023) - Data protection law
- [Apify Docs](https://docs.apify.com/) - Actor development

---

## 🗓️ Changelog

### Version 1.0.0 (2025-11-06)
- ✨ Initial release
- 🔍 Search, Retrieve, Analyze, Monitor modes
- 📊 Analytics engine with statistical analysis
- 🔒 Governance layer with DPDP Act 2023 compliance
- ⚡ Rate limiting and fault tolerance
- 📝 Comprehensive documentation
- ✅ Full OGD Policy 2025 compliance

---

## 🔮 Roadmap

### Upcoming Features
- [ ] Visualization generation (charts, maps)
- [ ] Multi-language support (Hindi, regional languages)
- [ ] Real-time monitoring with webhooks
- [ ] Advanced ML-based data quality scoring
- [ ] Integration with Google Earth Engine for geospatial data
- [ ] Export to multiple formats (Excel, PDF reports)
- [ ] Collaborative features (sharing, annotations)

---

<p align="center">
  <strong>Built with ❤️ for India's Open Data Community</strong>
</p>

<p align="center">
  <em>Empowering citizens through transparent access to government data</em>
</p>

---

## 📊 Stats

![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Compliance](https://img.shields.io/badge/compliance-OGD%202025-success)
![Security](https://img.shields.io/badge/security-DPDP%202023-important)
