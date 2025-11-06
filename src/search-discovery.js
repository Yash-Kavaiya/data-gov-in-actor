/**
 * Search and Discovery Module
 * Handles intelligent dataset discovery with semantic search and filtering
 */

const { sanitizeQuery, buildSolrQuery, formatDatasetMetadata } = require('./utils');

class SearchDiscovery {
    constructor(apiClient, config = {}) {
        this.client = apiClient;
        this.debugMode = config.debugMode || false;
        this.relevanceThreshold = config.relevanceThreshold || 0.5;
    }

    /**
     * Perform comprehensive dataset search
     * @param {string} query - Search query (natural language or keywords)
     * @param {object} filters - Advanced filters
     * @param {number} maxResults - Maximum number of results
     * @returns {Promise<object>} Search results with metadata
     */
    async search(query, filters = {}, maxResults = 50) {
        try {
            const sanitizedQuery = query ? sanitizeQuery(query) : '';
            const solrQuery = filters && Object.keys(filters).length > 0
                ? buildSolrQuery(filters)
                : '*:*';

            // Combine query and filters
            const finalQuery = sanitizedQuery && sanitizedQuery !== ''
                ? `${sanitizedQuery}`
                : solrQuery;

            const filterQuery = solrQuery !== '*:*' ? solrQuery : undefined;

            if (this.debugMode) {
                console.log('Search Query:', finalQuery);
                console.log('Filter Query:', filterQuery);
            }

            // Fetch results in batches if needed
            const batchSize = 100; // Max rows per request
            const results = [];
            let start = 0;
            let totalFound = 0;

            while (results.length < maxResults) {
                const rows = Math.min(batchSize, maxResults - results.length);

                const searchResult = await this.client.packageSearch(finalQuery, {
                    rows,
                    start,
                    fq: filterQuery,
                    sort: 'score desc, metadata_modified desc',
                    facet: true,
                    facetFields: ['organization', 'groups', 'tags', 'res_format']
                });

                totalFound = searchResult.count || 0;

                if (!searchResult.results || searchResult.results.length === 0) {
                    break;
                }

                // Filter by relevance score if available
                const relevantResults = searchResult.results.filter(dataset => {
                    const score = dataset.score || 1.0;
                    return score >= this.relevanceThreshold;
                });

                results.push(...relevantResults);

                if (searchResult.results.length < rows || results.length >= totalFound) {
                    break;
                }

                start += rows;
            }

            // Format and enrich results
            const formattedResults = results.slice(0, maxResults).map(dataset => {
                return {
                    ...formatDatasetMetadata(dataset),
                    relevanceScore: dataset.score || 1.0,
                    resources: this.formatResources(dataset.resources || [])
                };
            });

            return {
                success: true,
                query: {
                    original: query,
                    processed: finalQuery,
                    filters: filters
                },
                results: formattedResults,
                count: formattedResults.length,
                totalAvailable: totalFound,
                facets: this.processFacets(searchResult.facets || {}),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Search error:', error.message);
            return {
                success: false,
                error: error.message || 'Search failed',
                query: { original: query, filters },
                results: [],
                count: 0
            };
        }
    }

    /**
     * Search by specific dataset IDs
     * @param {array} datasetIds - Array of dataset IDs
     * @returns {Promise<array>} Dataset details
     */
    async searchByIds(datasetIds) {
        if (!Array.isArray(datasetIds) || datasetIds.length === 0) {
            return [];
        }

        const results = [];

        for (const datasetId of datasetIds) {
            try {
                const dataset = await this.client.packageShow(datasetId);
                results.push({
                    ...formatDatasetMetadata(dataset),
                    resources: this.formatResources(dataset.resources || [])
                });
            } catch (error) {
                console.error(`Failed to fetch dataset ${datasetId}:`, error.message);
                results.push({
                    id: datasetId,
                    error: error.message || 'Failed to fetch dataset',
                    success: false
                });
            }
        }

        return results;
    }

    /**
     * Discover trending/popular datasets
     * @param {number} limit - Number of datasets to return
     * @returns {Promise<array>} Trending datasets
     */
    async discoverTrending(limit = 20) {
        try {
            const result = await this.client.packageSearch('*:*', {
                rows: limit,
                sort: 'views_recent desc, metadata_modified desc'
            });

            return (result.results || []).map(dataset => formatDatasetMetadata(dataset));

        } catch (error) {
            console.error('Discover trending error:', error.message);
            return [];
        }
    }

    /**
     * Discover recently updated datasets
     * @param {number} limit - Number of datasets to return
     * @returns {Promise<array>} Recently updated datasets
     */
    async discoverRecent(limit = 20) {
        try {
            const result = await this.client.packageSearch('*:*', {
                rows: limit,
                sort: 'metadata_modified desc'
            });

            return (result.results || []).map(dataset => formatDatasetMetadata(dataset));

        } catch (error) {
            console.error('Discover recent error:', error.message);
            return [];
        }
    }

    /**
     * Discover datasets by organization
     * @param {string} organizationName - Organization name
     * @param {number} limit - Number of datasets to return
     * @returns {Promise<array>} Organization datasets
     */
    async discoverByOrganization(organizationName, limit = 50) {
        try {
            const result = await this.client.packageSearch('*:*', {
                rows: limit,
                fq: `organization:"${organizationName}"`,
                sort: 'metadata_modified desc'
            });

            return (result.results || []).map(dataset => formatDatasetMetadata(dataset));

        } catch (error) {
            console.error('Discover by organization error:', error.message);
            return [];
        }
    }

    /**
     * Discover datasets by sector/group
     * @param {string} sector - Sector/group name
     * @param {number} limit - Number of datasets to return
     * @returns {Promise<array>} Sector datasets
     */
    async discoverBySector(sector, limit = 50) {
        try {
            const result = await this.client.packageSearch('*:*', {
                rows: limit,
                fq: `groups:"${sector}"`,
                sort: 'metadata_modified desc'
            });

            return (result.results || []).map(dataset => formatDatasetMetadata(dataset));

        } catch (error) {
            console.error('Discover by sector error:', error.message);
            return [];
        }
    }

    /**
     * Get available organizations
     * @returns {Promise<array>} List of organizations
     */
    async getOrganizations() {
        try {
            const organizations = await this.client.organizationList({ allFields: true });
            return organizations.map(org => ({
                name: org.name,
                title: org.title,
                description: org.description,
                datasetCount: org.package_count || 0
            }));
        } catch (error) {
            console.error('Get organizations error:', error.message);
            return [];
        }
    }

    /**
     * Get available sectors/groups
     * @returns {Promise<array>} List of sectors
     */
    async getSectors() {
        try {
            const groups = await this.client.groupList({ allFields: true });
            return groups.map(group => ({
                name: group.name,
                title: group.title,
                description: group.description,
                datasetCount: group.package_count || 0
            }));
        } catch (error) {
            console.error('Get sectors error:', error.message);
            return [];
        }
    }

    /**
     * Get popular tags
     * @param {number} limit - Number of tags to return
     * @returns {Promise<array>} List of popular tags
     */
    async getPopularTags(limit = 50) {
        try {
            const tags = await this.client.tagList({ allFields: true });

            // Sort by vocabulary count if available
            const sortedTags = tags
                .filter(tag => tag.name)
                .sort((a, b) => (b.package_count || 0) - (a.package_count || 0))
                .slice(0, limit);

            return sortedTags.map(tag => ({
                name: tag.name,
                datasetCount: tag.package_count || 0
            }));
        } catch (error) {
            console.error('Get popular tags error:', error.message);
            return [];
        }
    }

    /**
     * Format resources for output
     * @param {array} resources - Raw resources array
     * @returns {array} Formatted resources
     */
    formatResources(resources) {
        return resources.map(resource => ({
            id: resource.id,
            name: resource.name,
            description: resource.description,
            format: resource.format,
            url: resource.url,
            size: resource.size,
            created: resource.created,
            modified: resource.last_modified,
            mimetype: resource.mimetype
        }));
    }

    /**
     * Process and format facets from search results
     * @param {object} facets - Raw facets object
     * @returns {object} Processed facets
     */
    processFacets(facets) {
        const processed = {};

        if (facets.organization) {
            processed.organizations = this.formatFacetItems(facets.organization);
        }

        if (facets.groups) {
            processed.sectors = this.formatFacetItems(facets.groups);
        }

        if (facets.tags) {
            processed.tags = this.formatFacetItems(facets.tags);
        }

        if (facets.res_format) {
            processed.formats = this.formatFacetItems(facets.res_format);
        }

        return processed;
    }

    /**
     * Format individual facet items
     * @param {object} facetData - Facet data object
     * @returns {array} Formatted facet items
     */
    formatFacetItems(facetData) {
        if (!facetData || !facetData.items) return [];

        return facetData.items
            .sort((a, b) => b.count - a.count)
            .slice(0, 20) // Limit to top 20
            .map(item => ({
                name: item.name,
                count: item.count
            }));
    }
}

module.exports = SearchDiscovery;
