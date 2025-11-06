/**
 * Analytics Engine
 * Provides statistical analysis, trend detection, and data quality assessment
 */

const stats = require('simple-statistics');
const { calculateQualityScore } = require('./utils');

class AnalyticsEngine {
    constructor(config = {}) {
        this.debugMode = config.debugMode || false;
    }

    /**
     * Analyze dataset with comprehensive metrics
     * @param {object} dataset - Dataset object with resources
     * @returns {object} Analysis results
     */
    analyzeDataset(dataset) {
        try {
            const analysis = {
                datasetId: dataset.id || dataset.dataset?.id,
                title: dataset.title || dataset.dataset?.title,
                qualityScore: this.assessDataQuality(dataset),
                resourceAnalysis: this.analyzeResources(dataset.resources || []),
                metadata: this.analyzeMetadata(dataset.dataset || dataset),
                recommendations: []
            };

            // Generate recommendations
            analysis.recommendations = this.generateRecommendations(analysis);

            return analysis;

        } catch (error) {
            console.error('Dataset analysis error:', error.message);
            return {
                error: error.message,
                success: false
            };
        }
    }

    /**
     * Assess overall data quality
     * @param {object} dataset - Dataset object
     * @returns {object} Quality assessment
     */
    assessDataQuality(dataset) {
        const metadata = dataset.dataset || dataset;
        const resources = dataset.resources || [];

        // Calculate base quality score
        const baseScore = calculateQualityScore(metadata);

        // Additional quality factors
        const factors = {
            hasDescription: (metadata.description || metadata.notes) ? 10 : 0,
            hasLicense: metadata.license_title ? 10 : 0,
            hasResources: resources.length > 0 ? 15 : 0,
            recentUpdate: this.isRecentlyUpdated(metadata.metadata_modified) ? 10 : 0,
            hasDownloadableFormats: this.hasDownloadableFormats(resources) ? 10 : 0,
            resourceCompleteness: this.assessResourceCompleteness(resources)
        };

        const totalScore = Math.min(100, baseScore + Object.values(factors).reduce((a, b) => a + b, 0));

        return {
            overallScore: totalScore,
            rating: this.getQualityRating(totalScore),
            factors,
            issues: this.identifyQualityIssues(metadata, resources)
        };
    }

    /**
     * Analyze resources in dataset
     * @param {array} resources - Array of resources
     * @returns {object} Resource analysis
     */
    analyzeResources(resources) {
        if (!resources || resources.length === 0) {
            return {
                count: 0,
                formats: [],
                totalSize: 0,
                status: 'No resources available'
            };
        }

        const formats = {};
        let totalSize = 0;
        let parsedCount = 0;
        let failedCount = 0;

        resources.forEach(resource => {
            // Count formats
            const format = (resource.format || 'unknown').toLowerCase();
            formats[format] = (formats[format] || 0) + 1;

            // Sum sizes
            if (resource.dataSize) {
                // Parse size from formatted string
                const sizeMatch = resource.dataSize.match(/[\d.]+/);
                if (sizeMatch) {
                    totalSize += parseFloat(sizeMatch[0]);
                }
            }

            // Track parsing status
            if (resource.acquired) parsedCount++;
            if (resource.error) failedCount++;
        });

        return {
            count: resources.length,
            formats: Object.entries(formats).map(([format, count]) => ({ format, count })),
            totalSize: `~${totalSize.toFixed(2)} MB`,
            parsedCount,
            failedCount,
            parseRate: resources.length > 0 ? ((parsedCount / resources.length) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Analyze dataset metadata
     * @param {object} metadata - Dataset metadata
     * @returns {object} Metadata analysis
     */
    analyzeMetadata(metadata) {
        return {
            organization: metadata.organization?.title || metadata.organization || 'Unknown',
            sector: metadata.sector || metadata.groups?.[0]?.title || 'General',
            tagCount: metadata.tags?.length || 0,
            createdDate: metadata.metadata_created,
            lastModified: metadata.metadata_modified,
            daysLastUpdated: this.getDaysSinceUpdate(metadata.metadata_modified),
            license: metadata.license_title || metadata.license_id || 'Not specified',
            isOpenLicense: this.isOpenLicense(metadata.license_title || metadata.license_id)
        };
    }

    /**
     * Perform statistical analysis on numerical data
     * @param {array} data - Array of numerical values
     * @returns {object} Statistical summary
     */
    analyzeNumericalData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }

        // Filter numerical values
        const numbers = data
            .map(v => parseFloat(v))
            .filter(v => !isNaN(v) && isFinite(v));

        if (numbers.length === 0) {
            return null;
        }

        try {
            return {
                count: numbers.length,
                mean: stats.mean(numbers),
                median: stats.median(numbers),
                mode: stats.mode(numbers),
                min: stats.min(numbers),
                max: stats.max(numbers),
                range: stats.max(numbers) - stats.min(numbers),
                variance: stats.variance(numbers),
                standardDeviation: stats.standardDeviation(numbers),
                quartiles: {
                    q1: stats.quantile(numbers, 0.25),
                    q2: stats.quantile(numbers, 0.5),
                    q3: stats.quantile(numbers, 0.75)
                }
            };
        } catch (error) {
            console.error('Statistical analysis error:', error.message);
            return null;
        }
    }

    /**
     * Detect trends in time-series data
     * @param {array} timeSeries - Array of {date, value} objects
     * @returns {object} Trend analysis
     */
    detectTrends(timeSeries) {
        if (!Array.isArray(timeSeries) || timeSeries.length < 2) {
            return null;
        }

        try {
            // Prepare data for linear regression
            const dataPoints = timeSeries
                .filter(point => point.value != null && !isNaN(point.value))
                .map((point, index) => [index, parseFloat(point.value)]);

            if (dataPoints.length < 2) {
                return null;
            }

            // Calculate linear regression
            const regression = stats.linearRegression(dataPoints);
            const rSquared = stats.rSquared(dataPoints, stats.linearRegressionLine(regression));

            // Determine trend direction
            let direction = 'stable';
            if (regression.m > 0.01) direction = 'increasing';
            else if (regression.m < -0.01) direction = 'decreasing';

            return {
                direction,
                slope: regression.m,
                intercept: regression.b,
                strength: rSquared > 0.7 ? 'strong' : rSquared > 0.4 ? 'moderate' : 'weak',
                rSquared,
                dataPoints: dataPoints.length
            };

        } catch (error) {
            console.error('Trend detection error:', error.message);
            return null;
        }
    }

    /**
     * Calculate correlation between two datasets
     * @param {array} dataX - First dataset
     * @param {array} dataY - Second dataset
     * @returns {number} Correlation coefficient (-1 to 1)
     */
    calculateCorrelation(dataX, dataY) {
        if (!Array.isArray(dataX) || !Array.isArray(dataY) || dataX.length !== dataY.length) {
            return null;
        }

        try {
            const numbersX = dataX.map(v => parseFloat(v)).filter(v => !isNaN(v));
            const numbersY = dataY.map(v => parseFloat(v)).filter(v => !isNaN(v));

            if (numbersX.length !== numbersY.length || numbersX.length < 2) {
                return null;
            }

            return stats.sampleCorrelation(numbersX, numbersY);

        } catch (error) {
            console.error('Correlation calculation error:', error.message);
            return null;
        }
    }

    /**
     * Generate recommendations based on analysis
     * @param {object} analysis - Analysis results
     * @returns {array} Recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        // Quality-based recommendations
        if (analysis.qualityScore.overallScore < 50) {
            recommendations.push({
                type: 'quality',
                priority: 'high',
                message: 'Dataset quality is below acceptable standards. Review metadata completeness and resource availability.'
            });
        }

        // Resource-based recommendations
        if (analysis.resourceAnalysis.count === 0) {
            recommendations.push({
                type: 'resources',
                priority: 'high',
                message: 'No resources available in this dataset. Data cannot be accessed.'
            });
        } else if (analysis.resourceAnalysis.failedCount > 0) {
            recommendations.push({
                type: 'resources',
                priority: 'medium',
                message: `${analysis.resourceAnalysis.failedCount} resource(s) failed to download. Check resource URLs and formats.`
            });
        }

        // Update frequency recommendations
        if (analysis.metadata.daysLastUpdated > 365) {
            recommendations.push({
                type: 'freshness',
                priority: 'medium',
                message: 'Dataset has not been updated in over a year. Verify if data is still relevant.'
            });
        }

        // License recommendations
        if (!analysis.metadata.isOpenLicense) {
            recommendations.push({
                type: 'license',
                priority: 'low',
                message: 'Dataset license may have restrictions. Review license terms before use.'
            });
        }

        return recommendations;
    }

    /**
     * Check if dataset was recently updated
     * @param {string} dateString - Last modified date
     * @returns {boolean} True if updated within 90 days
     */
    isRecentlyUpdated(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const now = new Date();
        const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
        return daysDiff <= 90;
    }

    /**
     * Get days since last update
     * @param {string} dateString - Last modified date
     * @returns {number} Days since update
     */
    getDaysSinceUpdate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        const now = new Date();
        return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if resources have downloadable formats
     * @param {array} resources - Resources array
     * @returns {boolean} True if at least one downloadable format
     */
    hasDownloadableFormats(resources) {
        if (!resources || resources.length === 0) return false;
        const downloadable = ['csv', 'json', 'xml', 'xls', 'xlsx'];
        return resources.some(r => downloadable.includes((r.format || '').toLowerCase()));
    }

    /**
     * Assess resource completeness
     * @param {array} resources - Resources array
     * @returns {number} Completeness score (0-25)
     */
    assessResourceCompleteness(resources) {
        if (!resources || resources.length === 0) return 0;

        let score = 0;
        resources.forEach(resource => {
            if (resource.name) score += 1;
            if (resource.description) score += 1;
            if (resource.format) score += 1;
            if (resource.url) score += 2;
        });

        return Math.min(25, (score / (resources.length * 5)) * 25);
    }

    /**
     * Identify quality issues
     * @param {object} metadata - Dataset metadata
     * @param {array} resources - Resources array
     * @returns {array} List of issues
     */
    identifyQualityIssues(metadata, resources) {
        const issues = [];

        if (!metadata.description && !metadata.notes) {
            issues.push('Missing description');
        }

        if (!metadata.license_title && !metadata.license_id) {
            issues.push('No license specified');
        }

        if (!resources || resources.length === 0) {
            issues.push('No resources available');
        }

        if (!metadata.organization && !metadata.organization?.title) {
            issues.push('No organization information');
        }

        if (!metadata.tags || metadata.tags.length === 0) {
            issues.push('No tags for discoverability');
        }

        return issues;
    }

    /**
     * Get quality rating from score
     * @param {number} score - Quality score (0-100)
     * @returns {string} Rating label
     */
    getQualityRating(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Fair';
        if (score >= 40) return 'Poor';
        return 'Very Poor';
    }

    /**
     * Check if license is open
     * @param {string} license - License string
     * @returns {boolean} True if open license
     */
    isOpenLicense(license) {
        if (!license) return false;
        const openLicenses = ['cc-by', 'cc0', 'odc-by', 'odbl', 'public domain', 'open'];
        return openLicenses.some(ol => license.toLowerCase().includes(ol));
    }
}

module.exports = AnalyticsEngine;
