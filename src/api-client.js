/**
 * API Client for data.gov.in
 * Handles authentication, rate limiting, retry logic, and fault tolerance
 */

const axios = require('axios');
const axiosRetry = require('axios-retry');
const Bottleneck = require('bottleneck');
const { sleep, calculateBackoff, createError } = require('./utils');

class DataGovINClient {
    constructor(config = {}) {
        this.baseURL = 'https://data.gov.in/api/3/action';
        this.apiKey = config.apiKey || null;
        this.oauthToken = config.oauthToken || null;
        this.debugMode = config.debugMode || false;

        // Rate limiting configuration
        const requestsPerHour = config.requestsPerHour || 1800; // Default: 1800 to stay under 2000 limit
        const concurrentRequests = config.concurrentRequests || 5;
        const retryAttempts = config.retryAttempts || 5;

        // Initialize rate limiter using Bottleneck
        this.limiter = new Bottleneck({
            maxConcurrent: concurrentRequests,
            minTime: Math.floor(3600000 / requestsPerHour), // Distribute requests evenly across the hour
            reservoir: requestsPerHour, // Initial number of requests allowed
            reservoirRefreshAmount: requestsPerHour, // Refresh amount
            reservoirRefreshInterval: 60 * 60 * 1000 // Refresh every hour
        });

        // Initialize axios client
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DataGovIN-Sentinel-Actor/1.0'
            }
        });

        // Configure retry logic with exponential backoff
        axiosRetry(this.client, {
            retries: retryAttempts,
            retryDelay: (retryCount, error) => {
                const delay = calculateBackoff(retryCount - 1);
                if (this.debugMode) {
                    console.log(`Retry attempt ${retryCount} after ${delay}ms delay. Error: ${error.message}`);
                }
                return delay;
            },
            retryCondition: (error) => {
                // Retry on network errors or 5xx server errors
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    (error.response && error.response.status >= 500) ||
                    (error.response && error.response.status === 429); // Rate limit
            },
            shouldResetTimeout: true
        });

        // Request interceptor for authentication
        this.client.interceptors.request.use(
            (config) => {
                if (this.oauthToken) {
                    config.headers.Authorization = `Bearer ${this.oauthToken}`;
                } else if (this.apiKey) {
                    config.headers['X-API-Key'] = this.apiKey;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    const status = error.response.status;
                    const message = error.response.data?.error?.message || error.message;

                    if (status === 403) {
                        throw createError('Access forbidden. Check API credentials.', 'API_FORBIDDEN', { status });
                    } else if (status === 404) {
                        throw createError('Resource not found.', 'API_NOT_FOUND', { status });
                    } else if (status === 429) {
                        throw createError('Rate limit exceeded. Implement backoff.', 'API_RATE_LIMIT', { status });
                    } else if (status >= 500) {
                        throw createError('Server error. Retrying...', 'API_SERVER_ERROR', { status, message });
                    }
                }
                return Promise.reject(error);
            }
        );

        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retries: 0
        };
    }

    /**
     * Make a rate-limited API request
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @returns {Promise<object>} API response data
     */
    async request(endpoint, params = {}) {
        return this.limiter.schedule(async () => {
            try {
                this.stats.totalRequests++;

                if (this.debugMode) {
                    console.log(`API Request: ${endpoint}`, params);
                }

                const response = await this.client.get(endpoint, { params });

                this.stats.successfulRequests++;

                if (response.data.success === false) {
                    throw createError(
                        response.data.error?.message || 'API returned unsuccessful response',
                        'API_ERROR',
                        response.data.error
                    );
                }

                return response.data.result;

            } catch (error) {
                this.stats.failedRequests++;

                if (this.debugMode) {
                    console.error(`API Error: ${endpoint}`, error.message);
                }

                throw error;
            }
        });
    }

    /**
     * Search for datasets using package_search endpoint
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Promise<object>} Search results
     */
    async packageSearch(query = '*:*', options = {}) {
        const params = {
            q: query,
            rows: options.rows || 10,
            start: options.start || 0,
            sort: options.sort || 'metadata_modified desc'
        };

        if (options.fq) {
            params.fq = options.fq; // Filter query
        }

        if (options.facet) {
            params.facet = options.facet;
            params['facet.field'] = options.facetFields || ['organization', 'tags', 'groups'];
        }

        return this.request('package_search', params);
    }

    /**
     * Get details of a specific dataset
     * @param {string} datasetId - Dataset ID or name
     * @returns {Promise<object>} Dataset details
     */
    async packageShow(datasetId) {
        return this.request('package_show', { id: datasetId });
    }

    /**
     * Get details of a specific resource
     * @param {string} resourceId - Resource ID
     * @returns {Promise<object>} Resource details
     */
    async resourceShow(resourceId) {
        return this.request('resource_show', { id: resourceId });
    }

    /**
     * Get list of organizations
     * @param {object} options - List options
     * @returns {Promise<array>} List of organizations
     */
    async organizationList(options = {}) {
        const params = {
            all_fields: options.allFields !== false,
            limit: options.limit || 100,
            offset: options.offset || 0
        };
        return this.request('organization_list', params);
    }

    /**
     * Get list of groups/sectors
     * @param {object} options - List options
     * @returns {Promise<array>} List of groups
     */
    async groupList(options = {}) {
        const params = {
            all_fields: options.allFields !== false,
            limit: options.limit || 100,
            offset: options.offset || 0
        };
        return this.request('group_list', params);
    }

    /**
     * Get list of tags
     * @param {object} options - List options
     * @returns {Promise<array>} List of tags
     */
    async tagList(options = {}) {
        const params = {
            all_fields: options.allFields !== false
        };
        return this.request('tag_list', params);
    }

    /**
     * Download resource file
     * @param {string} url - Resource URL
     * @param {number} maxSize - Maximum file size in bytes
     * @returns {Promise<Buffer>} File data
     */
    async downloadResource(url, maxSize = 50 * 1024 * 1024) {
        return this.limiter.schedule(async () => {
            try {
                this.stats.totalRequests++;

                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    maxContentLength: maxSize,
                    timeout: 60000, // 60 second timeout for downloads
                    headers: {
                        'User-Agent': 'DataGovIN-Sentinel-Actor/1.0'
                    }
                });

                this.stats.successfulRequests++;
                return response.data;

            } catch (error) {
                this.stats.failedRequests++;

                if (error.code === 'ECONNABORTED') {
                    throw createError('Download timeout exceeded', 'DOWNLOAD_TIMEOUT');
                } else if (error.response?.status === 404) {
                    throw createError('Resource file not found', 'DOWNLOAD_NOT_FOUND');
                }

                throw error;
            }
        });
    }

    /**
     * Get API statistics
     * @returns {object} Request statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalRequests > 0
                ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retries: 0
        };
    }

    /**
     * Test API connectivity
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testConnection() {
        try {
            await this.packageSearch('test', { rows: 1 });
            return true;
        } catch (error) {
            console.error('API connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get current rate limiter status
     * @returns {object} Rate limiter status
     */
    async getRateLimitStatus() {
        const counts = await this.limiter.counts();
        return {
            running: counts.RUNNING,
            queued: counts.QUEUED,
            executing: counts.EXECUTING
        };
    }
}

module.exports = DataGovINClient;
