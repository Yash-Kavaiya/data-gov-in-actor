/**
 * DataGovIN Sentinel - Main Actor
 * Production-ready actor for advanced interaction with data.gov.in
 * Complies with OGD Policy 2025, DPDP Act 2023, and CC-BY 4.0 licensing
 */

const Apify = require('apify');
const DataGovINClient = require('./api-client');
const SearchDiscovery = require('./search-discovery');
const DataAcquisition = require('./data-acquisition');
const AnalyticsEngine = require('./analytics');
const GovernanceLayer = require('./governance');
const { formatDatasetMetadata, createError } = require('./utils');

// Main actor function
Apify.main(async () => {
    console.log('🚀 DataGovIN Sentinel Actor Starting...');

    // Get input configuration
    const input = await Apify.getInput();

    // Validate input
    if (!input) {
        throw new Error('No input provided. Please configure actor input.');
    }

    // Extract configuration
    const {
        mode = 'search',
        query,
        filters = {},
        datasetIds = [],
        maxResults = 50,
        includeResources = false,
        resourceLimit = 3,
        maxFileSize = 50,
        analytics = {},
        output = {},
        authentication = {},
        rateLimit = {},
        governance = {},
        language = 'en',
        debugMode = false
    } = input;

    console.log(`📋 Mode: ${mode}`);
    console.log(`🔍 Query: ${query || 'None'}`);
    console.log(`🎯 Max Results: ${maxResults}`);

    try {
        // Initialize API client with rate limiting
        const apiClient = new DataGovINClient({
            apiKey: authentication.apiKey,
            oauthToken: authentication.oauthToken,
            requestsPerHour: rateLimit.requestsPerHour || 1800,
            concurrentRequests: rateLimit.concurrentRequests || 5,
            retryAttempts: rateLimit.retryAttempts || 5,
            debugMode
        });

        // Test API connection
        console.log('🔌 Testing API connection...');
        const connectionOk = await apiClient.testConnection();
        if (!connectionOk) {
            throw new Error('Failed to connect to data.gov.in API. Please check network and credentials.');
        }
        console.log('✅ API connection successful');

        // Initialize modules
        const searchDiscovery = new SearchDiscovery(apiClient, { debugMode });
        const dataAcquisition = new DataAcquisition(apiClient, {
            maxFileSize,
            resourceLimit,
            debugMode
        });
        const analyticsEngine = new AnalyticsEngine({ debugMode });
        const governanceLayer = new GovernanceLayer({
            respectLicenses: governance.respectLicenses !== false,
            blockRestrictedData: governance.blockRestrictedData !== false,
            enableAuditLog: governance.enableAuditLog !== false,
            piiDetection: governance.piiDetection !== false,
            debugMode
        });

        console.log('✅ All modules initialized');

        // Execute based on mode
        let results = [];

        switch (mode) {
            case 'search':
                results = await executeSearchMode(
                    searchDiscovery,
                    governanceLayer,
                    query,
                    filters,
                    maxResults,
                    debugMode
                );
                break;

            case 'retrieve':
                results = await executeRetrieveMode(
                    searchDiscovery,
                    dataAcquisition,
                    governanceLayer,
                    analyticsEngine,
                    query,
                    filters,
                    datasetIds,
                    maxResults,
                    includeResources,
                    analytics,
                    debugMode
                );
                break;

            case 'analyze':
                results = await executeAnalyzeMode(
                    searchDiscovery,
                    dataAcquisition,
                    analyticsEngine,
                    governanceLayer,
                    query,
                    filters,
                    datasetIds,
                    maxResults,
                    debugMode
                );
                break;

            case 'monitor':
                results = await executeMonitorMode(
                    searchDiscovery,
                    filters,
                    maxResults,
                    debugMode
                );
                break;

            default:
                throw new Error(`Unknown mode: ${mode}`);
        }

        // Generate compliance report
        const complianceReport = governanceLayer.generateComplianceReport();

        // Get API statistics
        const apiStats = apiClient.getStats();

        // Prepare final output
        const finalOutput = {
            success: true,
            mode,
            metadata: {
                actor: 'DataGovIN Sentinel',
                version: '1.0.0',
                executionTime: new Date().toISOString(),
                dataSource: 'Open Government Data Platform India (data.gov.in)',
                compliance: {
                    ogdPolicy: 'OGD Policy India 2025',
                    dataProtection: 'DPDP Act 2023',
                    license: 'CC-BY 4.0'
                }
            },
            query: {
                mode,
                searchQuery: query,
                filters,
                datasetIds
            },
            results,
            statistics: {
                resultsCount: results.length,
                apiRequests: apiStats.totalRequests,
                successRate: apiStats.successRate
            },
            compliance: complianceReport,
            attribution: results.length > 0 && results[0].dataset
                ? governanceLayer.generateAttribution(results[0].dataset)
                : 'Data sourced from Open Government Data Platform India (data.gov.in)'
        };

        // Save to dataset
        await Apify.pushData(finalOutput);

        // Also save individual results for easier processing
        if (results.length > 0) {
            for (const result of results) {
                await Apify.pushData(result);
            }
        }

        console.log(`✅ Actor completed successfully`);
        console.log(`📊 Results: ${results.length} items`);
        console.log(`📈 API Requests: ${apiStats.totalRequests} (${apiStats.successRate} success rate)`);
        console.log(`🔒 Blocked Datasets: ${complianceReport.summary.blockedDatasets}`);
        console.log(`⚠️  License Warnings: ${complianceReport.summary.licenseWarnings}`);

    } catch (error) {
        console.error('❌ Actor execution failed:', error.message);

        // Save error to dataset
        await Apify.pushData({
            success: false,
            error: {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            },
            mode,
            query,
            filters
        });

        throw error;
    }
});

/**
 * Execute search mode
 */
async function executeSearchMode(searchDiscovery, governanceLayer, query, filters, maxResults, debugMode) {
    console.log('🔍 Executing SEARCH mode...');

    const searchResults = await searchDiscovery.search(query, filters, maxResults);

    if (!searchResults.success) {
        throw new Error(`Search failed: ${searchResults.error}`);
    }

    console.log(`📊 Found ${searchResults.count} datasets`);

    // Apply governance checks
    const validatedResults = [];
    for (const dataset of searchResults.results) {
        const validation = governanceLayer.validateDatasetAccess(dataset);

        if (validation.allowed) {
            validatedResults.push({
                ...dataset,
                governance: {
                    allowed: true,
                    warnings: validation.warnings
                }
            });
        } else if (debugMode) {
            console.log(`⚠️  Dataset blocked: ${dataset.title} - ${validation.errors.join(', ')}`);
        }
    }

    console.log(`✅ ${validatedResults.length} datasets passed governance checks`);

    return validatedResults;
}

/**
 * Execute retrieve mode
 */
async function executeRetrieveMode(
    searchDiscovery,
    dataAcquisition,
    governanceLayer,
    analyticsEngine,
    query,
    filters,
    datasetIds,
    maxResults,
    includeResources,
    analyticsConfig,
    debugMode
) {
    console.log('📥 Executing RETRIEVE mode...');

    let datasets = [];

    // Get datasets by ID or search
    if (datasetIds && datasetIds.length > 0) {
        console.log(`📋 Retrieving ${datasetIds.length} specific datasets...`);
        datasets = await searchDiscovery.searchByIds(datasetIds);
    } else {
        console.log(`🔍 Searching for datasets...`);
        const searchResults = await searchDiscovery.search(query, filters, maxResults);

        if (!searchResults.success) {
            throw new Error(`Search failed: ${searchResults.error}`);
        }

        datasets = searchResults.results;
    }

    console.log(`📊 Processing ${datasets.length} datasets...`);

    const results = [];

    for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i];

        console.log(`[${i + 1}/${datasets.length}] Processing: ${dataset.title}`);

        // Governance check
        const validation = governanceLayer.validateDatasetAccess(dataset);

        if (!validation.allowed) {
            console.log(`⚠️  Skipped (blocked): ${validation.errors.join(', ')}`);
            continue;
        }

        // Acquire dataset with resources
        const acquiredDataset = includeResources
            ? await dataAcquisition.acquireDataset(dataset.id, {
                includeData: true,
                resourceLimit: 3
            })
            : { dataset, resources: [] };

        // Run analytics if requested
        let analysis = null;
        if (analyticsConfig.enableStatistics || analyticsConfig.dataQualityScore) {
            analysis = analyticsEngine.analyzeDataset(acquiredDataset);
        }

        results.push({
            ...acquiredDataset,
            analysis,
            governance: {
                allowed: true,
                warnings: validation.warnings,
                attribution: governanceLayer.generateAttribution(dataset)
            }
        });

        console.log(`✅ Completed: ${dataset.title}`);
    }

    return results;
}

/**
 * Execute analyze mode
 */
async function executeAnalyzeMode(
    searchDiscovery,
    dataAcquisition,
    analyticsEngine,
    governanceLayer,
    query,
    filters,
    datasetIds,
    maxResults,
    debugMode
) {
    console.log('📊 Executing ANALYZE mode...');

    // First retrieve datasets
    const retrieveResults = await executeRetrieveMode(
        searchDiscovery,
        dataAcquisition,
        governanceLayer,
        analyticsEngine,
        query,
        filters,
        datasetIds,
        maxResults,
        true, // Include resources
        { enableStatistics: true, dataQualityScore: true },
        debugMode
    );

    // Add comprehensive analytics
    const analyzedResults = retrieveResults.map(result => {
        const analysis = analyticsEngine.analyzeDataset(result);
        const piiScan = governanceLayer.scanForPII(result.dataset || result);

        return {
            ...result,
            comprehensiveAnalysis: analysis,
            piiScan,
            insights: generateInsights(analysis)
        };
    });

    return analyzedResults;
}

/**
 * Execute monitor mode
 */
async function executeMonitorMode(searchDiscovery, filters, maxResults, debugMode) {
    console.log('👁️  Executing MONITOR mode...');

    // Get recent datasets
    const recentDatasets = await searchDiscovery.discoverRecent(maxResults);

    // Get trending datasets
    const trendingDatasets = await searchDiscovery.discoverTrending(maxResults);

    // Get organizations
    const organizations = await searchDiscovery.getOrganizations();

    // Get popular tags
    const popularTags = await searchDiscovery.getPopularTags(30);

    return [
        {
            type: 'recent_datasets',
            count: recentDatasets.length,
            datasets: recentDatasets.slice(0, 20)
        },
        {
            type: 'trending_datasets',
            count: trendingDatasets.length,
            datasets: trendingDatasets.slice(0, 20)
        },
        {
            type: 'organizations',
            count: organizations.length,
            organizations: organizations.slice(0, 50)
        },
        {
            type: 'popular_tags',
            count: popularTags.length,
            tags: popularTags
        }
    ];
}

/**
 * Generate insights from analysis
 */
function generateInsights(analysis) {
    if (!analysis || analysis.error) {
        return [];
    }

    const insights = [];

    // Quality insights
    if (analysis.qualityScore) {
        insights.push({
            category: 'quality',
            message: `Dataset quality is ${analysis.qualityScore.rating} (score: ${analysis.qualityScore.overallScore}/100)`,
            score: analysis.qualityScore.overallScore
        });
    }

    // Resource insights
    if (analysis.resourceAnalysis) {
        const { count, formats, parseRate } = analysis.resourceAnalysis;
        insights.push({
            category: 'resources',
            message: `Contains ${count} resource(s) in ${formats.length} format(s) with ${parseRate} parse success rate`,
            count
        });
    }

    // Freshness insights
    if (analysis.metadata && analysis.metadata.daysLastUpdated !== null) {
        const days = analysis.metadata.daysLastUpdated;
        insights.push({
            category: 'freshness',
            message: days <= 30
                ? `Recently updated (${days} days ago)`
                : days <= 365
                    ? `Updated ${days} days ago`
                    : `Not updated in over a year (${days} days)`,
            daysOld: days
        });
    }

    return insights;
}

// Export for testing
module.exports = {
    executeSearchMode,
    executeRetrieveMode,
    executeAnalyzeMode,
    executeMonitorMode,
    generateInsights
};
