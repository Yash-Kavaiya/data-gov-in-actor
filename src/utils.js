/**
 * Utility Functions for DataGovIN Sentinel
 * Provides helper functions for data processing, validation, and formatting
 */

const moment = require('moment');

/**
 * Format bytes to human readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000) {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(exponentialDelay + jitter);
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDate(dateString) {
    if (!dateString) return false;
    return moment(dateString, 'YYYY-MM-DD', true).isValid();
}

/**
 * Parse and format date for API queries
 * @param {string} dateString - Date string
 * @returns {string} Formatted date or null
 */
function formatDateForAPI(dateString) {
    if (!dateString) return null;
    const date = moment(dateString, 'YYYY-MM-DD');
    return date.isValid() ? date.format('YYYY-MM-DD') : null;
}

/**
 * Sanitize and normalize search query
 * @param {string} query - Raw search query
 * @returns {string} Sanitized query
 */
function sanitizeQuery(query) {
    if (!query) return '';
    return query
        .trim()
        .replace(/[^\w\s\-\.]/gi, ' ') // Remove special chars except - and .
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 500); // Limit length
}

/**
 * Build SOLR query string from filters
 * @param {object} filters - Filter object
 * @returns {string} SOLR query string
 */
function buildSolrQuery(filters = {}) {
    const conditions = [];

    if (filters.organization) {
        conditions.push(`organization:"${filters.organization}"`);
    }

    if (filters.sector) {
        conditions.push(`sector:"${filters.sector}"`);
    }

    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const tagQuery = filters.tags.map(tag => `tags:"${tag}"`).join(' OR ');
        conditions.push(`(${tagQuery})`);
    }

    if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? formatDateForAPI(filters.dateFrom) : '*';
        const to = filters.dateTo ? formatDateForAPI(filters.dateTo) : '*';
        conditions.push(`metadata_modified:[${from} TO ${to}]`);
    }

    return conditions.length > 0 ? conditions.join(' AND ') : '*:*';
}

/**
 * Extract file extension from URL or filename
 * @param {string} url - URL or filename
 * @returns {string} File extension (lowercase)
 */
function getFileExtension(url) {
    if (!url) return '';
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : '';
}

/**
 * Check if file format is downloadable
 * @param {string} format - File format
 * @returns {boolean} True if downloadable
 */
function isDownloadableFormat(format) {
    const downloadable = ['csv', 'json', 'xml', 'xls', 'xlsx', 'txt', 'tsv'];
    return downloadable.includes(format.toLowerCase());
}

/**
 * Generate unique ID for datasets
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
function generateId(prefix = 'item') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 200) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Calculate data quality score based on completeness
 * @param {object} dataset - Dataset object
 * @returns {number} Quality score (0-100)
 */
function calculateQualityScore(dataset) {
    let score = 0;
    const weights = {
        title: 10,
        description: 15,
        resources: 25,
        organization: 10,
        tags: 10,
        metadata_created: 5,
        metadata_modified: 5,
        license: 10,
        maintainer: 5,
        author: 5
    };

    for (const [field, weight] of Object.entries(weights)) {
        if (field === 'resources') {
            if (dataset[field] && Array.isArray(dataset[field]) && dataset[field].length > 0) {
                score += weight;
            }
        } else if (dataset[field] && dataset[field].toString().trim().length > 0) {
            score += weight;
        }
    }

    return score;
}

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeJsonParse(jsonString, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return fallback;
    }
}

/**
 * Detect if content might contain PII (simple pattern matching)
 * @param {string} text - Text to check
 * @returns {boolean} True if PII patterns detected
 */
function detectPII(text) {
    if (!text) return false;

    const patterns = [
        /\b\d{12}\b/, // Aadhaar-like 12-digit numbers
        /\b[A-Z]{5}\d{4}[A-Z]\b/, // PAN card pattern
        /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // Email
        /\b\d{10}\b/, // Phone number
        /\b\d{3}-\d{2}-\d{4}\b/ // SSN-like pattern
    ];

    return patterns.some(pattern => pattern.test(text));
}

/**
 * Redact PII from text
 * @param {string} text - Text to redact
 * @returns {string} Redacted text
 */
function redactPII(text) {
    if (!text) return text;

    let redacted = text;

    // Redact Aadhaar-like numbers
    redacted = redacted.replace(/\b\d{12}\b/g, 'XXXXXXXXXXXX');

    // Redact email
    redacted = redacted.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, 'email@redacted.com');

    // Redact phone numbers
    redacted = redacted.replace(/\b\d{10}\b/g, 'XXXXXXXXXX');

    return redacted;
}

/**
 * Format dataset metadata for output
 * @param {object} dataset - Raw dataset object
 * @returns {object} Formatted metadata
 */
function formatDatasetMetadata(dataset) {
    return {
        id: dataset.id || dataset.name,
        title: dataset.title,
        description: truncateText(dataset.notes || dataset.description, 500),
        organization: dataset.organization?.title || dataset.organization?.name || 'Unknown',
        sector: dataset.sector || dataset.groups?.[0]?.title || 'General',
        tags: dataset.tags?.map(t => typeof t === 'string' ? t : t.name) || [],
        license: dataset.license_title || dataset.license_id || 'Not specified',
        createdDate: dataset.metadata_created,
        modifiedDate: dataset.metadata_modified,
        resourceCount: dataset.num_resources || dataset.resources?.length || 0,
        url: dataset.url || `https://data.gov.in/resource/${dataset.name}`,
        qualityScore: calculateQualityScore(dataset)
    };
}

/**
 * Create standardized error object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {object} details - Additional details
 * @returns {object} Error object
 */
function createError(message, code = 'UNKNOWN_ERROR', details = {}) {
    return {
        error: true,
        code,
        message,
        details,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    formatBytes,
    sleep,
    calculateBackoff,
    isValidDate,
    formatDateForAPI,
    sanitizeQuery,
    buildSolrQuery,
    getFileExtension,
    isDownloadableFormat,
    generateId,
    truncateText,
    calculateQualityScore,
    safeJsonParse,
    detectPII,
    redactPII,
    formatDatasetMetadata,
    createError
};
