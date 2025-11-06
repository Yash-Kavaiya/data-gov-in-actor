/**
 * Data Acquisition Module
 * Handles secure retrieval, processing, and parsing of dataset resources
 */

const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const { formatBytes, getFileExtension, isDownloadableFormat, safeJsonParse } = require('./utils');

class DataAcquisition {
    constructor(apiClient, config = {}) {
        this.client = apiClient;
        this.maxFileSize = (config.maxFileSize || 50) * 1024 * 1024; // Convert MB to bytes
        this.resourceLimit = config.resourceLimit || 3;
        this.debugMode = config.debugMode || false;
        this.supportedFormats = ['csv', 'json', 'xml', 'xls', 'xlsx', 'txt', 'tsv'];
    }

    /**
     * Acquire dataset with all resources
     * @param {string} datasetId - Dataset ID
     * @param {object} options - Acquisition options
     * @returns {Promise<object>} Dataset with resource data
     */
    async acquireDataset(datasetId, options = {}) {
        try {
            // Fetch dataset details
            const dataset = await this.client.packageShow(datasetId);

            if (!dataset) {
                throw new Error(`Dataset ${datasetId} not found`);
            }

            // Process resources
            const resources = dataset.resources || [];
            const processedResources = [];

            const limit = Math.min(
                options.resourceLimit || this.resourceLimit,
                resources.length
            );

            for (let i = 0; i < limit; i++) {
                const resource = resources[i];

                if (this.debugMode) {
                    console.log(`Processing resource ${i + 1}/${limit}: ${resource.name}`);
                }

                try {
                    const resourceData = await this.acquireResource(resource, {
                        includeData: options.includeData !== false,
                        maxFileSize: options.maxFileSize || this.maxFileSize
                    });

                    processedResources.push(resourceData);

                } catch (error) {
                    console.error(`Failed to acquire resource ${resource.id}:`, error.message);
                    processedResources.push({
                        ...this.formatResourceMetadata(resource),
                        error: error.message,
                        acquired: false
                    });
                }
            }

            return {
                success: true,
                dataset: {
                    id: dataset.id || dataset.name,
                    title: dataset.title,
                    description: dataset.notes,
                    organization: dataset.organization?.title || 'Unknown',
                    license: dataset.license_title || 'Not specified',
                    tags: dataset.tags?.map(t => t.name) || [],
                    metadata_created: dataset.metadata_created,
                    metadata_modified: dataset.metadata_modified,
                    url: `https://data.gov.in/resource/${dataset.name}`
                },
                resources: processedResources,
                resourceCount: processedResources.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`Failed to acquire dataset ${datasetId}:`, error.message);
            return {
                success: false,
                datasetId,
                error: error.message,
                resources: []
            };
        }
    }

    /**
     * Acquire single resource with data
     * @param {object} resource - Resource object
     * @param {object} options - Acquisition options
     * @returns {Promise<object>} Resource with data
     */
    async acquireResource(resource, options = {}) {
        const metadata = this.formatResourceMetadata(resource);

        // Check if format is supported
        const format = (resource.format || '').toLowerCase();
        if (!this.supportedFormats.includes(format)) {
            return {
                ...metadata,
                acquired: false,
                reason: `Format '${format}' not supported for download`
            };
        }

        // Check file size
        if (resource.size && parseInt(resource.size) > this.maxFileSize) {
            return {
                ...metadata,
                acquired: false,
                reason: `File size (${formatBytes(resource.size)}) exceeds limit (${formatBytes(this.maxFileSize)})`
            };
        }

        // Download resource if requested
        if (options.includeData && resource.url) {
            try {
                const data = await this.client.downloadResource(
                    resource.url,
                    options.maxFileSize || this.maxFileSize
                );

                const parsedData = await this.parseResourceData(data, format);

                return {
                    ...metadata,
                    acquired: true,
                    dataSize: formatBytes(data.length),
                    data: parsedData
                };

            } catch (error) {
                return {
                    ...metadata,
                    acquired: false,
                    error: error.message
                };
            }
        }

        return {
            ...metadata,
            acquired: false,
            reason: 'Data download not requested'
        };
    }

    /**
     * Parse resource data based on format
     * @param {Buffer} data - Raw data buffer
     * @param {string} format - File format
     * @returns {Promise<object>} Parsed data with preview
     */
    async parseResourceData(data, format) {
        try {
            switch (format.toLowerCase()) {
                case 'csv':
                case 'tsv':
                    return this.parseCSV(data, format === 'tsv' ? '\t' : ',');

                case 'json':
                    return this.parseJSON(data);

                case 'xls':
                case 'xlsx':
                    return this.parseExcel(data);

                case 'xml':
                    return this.parseXML(data);

                case 'txt':
                    return this.parseText(data);

                default:
                    return {
                        format,
                        raw: data.toString('utf-8').substring(0, 1000),
                        parsed: false,
                        reason: 'Format parser not implemented'
                    };
            }
        } catch (error) {
            console.error(`Parse error for format ${format}:`, error.message);
            return {
                format,
                parsed: false,
                error: error.message
            };
        }
    }

    /**
     * Parse CSV/TSV data
     * @param {Buffer} data - CSV data
     * @param {string} delimiter - Field delimiter
     * @returns {object} Parsed CSV data
     */
    parseCSV(data, delimiter = ',') {
        const text = data.toString('utf-8');

        const records = parse(text, {
            delimiter,
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
            bom: true
        });

        return {
            format: 'csv',
            parsed: true,
            rowCount: records.length,
            columns: records.length > 0 ? Object.keys(records[0]) : [],
            preview: records.slice(0, 100), // First 100 rows
            hasMore: records.length > 100,
            statistics: this.calculateBasicStats(records)
        };
    }

    /**
     * Parse JSON data
     * @param {Buffer} data - JSON data
     * @returns {object} Parsed JSON data
     */
    parseJSON(data) {
        const text = data.toString('utf-8');
        const json = safeJsonParse(text);

        if (!json) {
            throw new Error('Invalid JSON format');
        }

        const isArray = Array.isArray(json);

        return {
            format: 'json',
            parsed: true,
            type: isArray ? 'array' : 'object',
            itemCount: isArray ? json.length : 1,
            preview: isArray ? json.slice(0, 100) : json,
            hasMore: isArray && json.length > 100,
            structure: this.analyzeJSONStructure(json)
        };
    }

    /**
     * Parse Excel data
     * @param {Buffer} data - Excel data
     * @returns {object} Parsed Excel data
     */
    parseExcel(data) {
        const workbook = XLSX.read(data, { type: 'buffer' });
        const sheets = {};

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });

            sheets[sheetName] = {
                rowCount: jsonData.length,
                columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
                preview: jsonData.slice(0, 100),
                hasMore: jsonData.length > 100
            };
        });

        return {
            format: 'excel',
            parsed: true,
            sheetCount: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames,
            sheets
        };
    }

    /**
     * Parse XML data
     * @param {Buffer} data - XML data
     * @returns {object} Parsed XML data
     */
    parseXML(data) {
        const text = data.toString('utf-8');

        // Basic XML structure detection
        const tagMatches = text.match(/<(\w+)[^>]*>/g) || [];
        const uniqueTags = [...new Set(tagMatches.map(tag => tag.match(/<(\w+)/)[1]))];

        return {
            format: 'xml',
            parsed: true,
            elementCount: tagMatches.length,
            uniqueTags: uniqueTags.slice(0, 50),
            preview: text.substring(0, 2000),
            hasMore: text.length > 2000,
            note: 'XML parsing is basic. Consider using specialized XML parser for full analysis.'
        };
    }

    /**
     * Parse text data
     * @param {Buffer} data - Text data
     * @returns {object} Parsed text data
     */
    parseText(data) {
        const text = data.toString('utf-8');
        const lines = text.split('\n');

        return {
            format: 'text',
            parsed: true,
            lineCount: lines.length,
            characterCount: text.length,
            preview: lines.slice(0, 100).join('\n'),
            hasMore: lines.length > 100
        };
    }

    /**
     * Calculate basic statistics for tabular data
     * @param {array} records - Array of records
     * @returns {object} Basic statistics
     */
    calculateBasicStats(records) {
        if (!records || records.length === 0) return null;

        const stats = {
            recordCount: records.length,
            fields: {}
        };

        // Analyze first 1000 records for performance
        const sample = records.slice(0, 1000);
        const columns = Object.keys(sample[0] || {});

        columns.forEach(column => {
            const values = sample.map(r => r[column]).filter(v => v !== null && v !== undefined && v !== '');
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));

            stats.fields[column] = {
                nonNullCount: values.length,
                nullCount: sample.length - values.length,
                completeness: ((values.length / sample.length) * 100).toFixed(2) + '%',
                isNumeric: numericValues.length > values.length * 0.8,
                uniqueValues: [...new Set(values)].length
            };
        });

        return stats;
    }

    /**
     * Analyze JSON structure
     * @param {*} json - JSON data
     * @returns {object} Structure analysis
     */
    analyzeJSONStructure(json) {
        if (Array.isArray(json)) {
            if (json.length === 0) return { type: 'emptyArray' };

            const firstItem = json[0];
            return {
                type: 'array',
                itemType: typeof firstItem,
                keys: typeof firstItem === 'object' ? Object.keys(firstItem) : []
            };
        } else if (typeof json === 'object') {
            return {
                type: 'object',
                keys: Object.keys(json),
                depth: this.getObjectDepth(json)
            };
        }

        return { type: typeof json };
    }

    /**
     * Get object nesting depth
     * @param {object} obj - Object to analyze
     * @returns {number} Maximum depth
     */
    getObjectDepth(obj) {
        if (typeof obj !== 'object' || obj === null) return 0;

        let maxDepth = 0;
        for (const key in obj) {
            maxDepth = Math.max(maxDepth, this.getObjectDepth(obj[key]));
        }

        return maxDepth + 1;
    }

    /**
     * Format resource metadata
     * @param {object} resource - Raw resource object
     * @returns {object} Formatted metadata
     */
    formatResourceMetadata(resource) {
        return {
            id: resource.id,
            name: resource.name,
            description: resource.description,
            format: resource.format,
            url: resource.url,
            size: resource.size ? formatBytes(resource.size) : 'Unknown',
            created: resource.created,
            modified: resource.last_modified,
            mimetype: resource.mimetype
        };
    }

    /**
     * Batch acquire multiple datasets
     * @param {array} datasetIds - Array of dataset IDs
     * @param {object} options - Acquisition options
     * @returns {Promise<array>} Array of acquired datasets
     */
    async batchAcquire(datasetIds, options = {}) {
        const results = [];

        for (const datasetId of datasetIds) {
            try {
                const result = await this.acquireDataset(datasetId, options);
                results.push(result);
            } catch (error) {
                console.error(`Batch acquire failed for ${datasetId}:`, error.message);
                results.push({
                    success: false,
                    datasetId,
                    error: error.message
                });
            }
        }

        return results;
    }
}

module.exports = DataAcquisition;
