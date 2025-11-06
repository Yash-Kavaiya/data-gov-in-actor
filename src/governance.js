/**
 * Governance and Compliance Layer
 * Ensures ethical data handling, license compliance, and DPDP Act 2023 adherence
 */

const { detectPII, redactPII, createError } = require('./utils');

class GovernanceLayer {
    constructor(config = {}) {
        this.respectLicenses = config.respectLicenses !== false;
        this.blockRestrictedData = config.blockRestrictedData !== false;
        this.enableAuditLog = config.enableAuditLog !== false;
        this.piiDetection = config.piiDetection !== false;
        this.debugMode = config.debugMode || false;

        this.auditLog = [];
        this.blockedDatasets = new Set();
        this.licenseWarnings = new Set();
    }

    /**
     * Validate dataset access compliance
     * @param {object} dataset - Dataset to validate
     * @returns {object} Validation result
     */
    validateDatasetAccess(dataset) {
        const validationResult = {
            allowed: true,
            warnings: [],
            errors: [],
            compliance: {
                licenseCheck: true,
                restrictionCheck: true,
                piiCheck: true
            }
        };

        // Check for restricted data
        if (this.blockRestrictedData) {
            const restrictionCheck = this.checkRestrictions(dataset);
            if (!restrictionCheck.allowed) {
                validationResult.allowed = false;
                validationResult.errors.push(restrictionCheck.reason);
                validationResult.compliance.restrictionCheck = false;
            }
        }

        // Check license compliance
        if (this.respectLicenses) {
            const licenseCheck = this.checkLicense(dataset);
            if (licenseCheck.restrictive) {
                validationResult.warnings.push(licenseCheck.warning);
                validationResult.compliance.licenseCheck = false;
            }
        }

        // Log access attempt
        if (this.enableAuditLog) {
            this.logAccess(dataset, validationResult);
        }

        return validationResult;
    }

    /**
     * Check for restricted or internal-use datasets
     * @param {object} dataset - Dataset to check
     * @returns {object} Restriction check result
     */
    checkRestrictions(dataset) {
        const restrictedKeywords = [
            'internal-use',
            'restricted',
            'confidential',
            'classified',
            'private',
            'sensitive',
            'secret'
        ];

        const datasetText = [
            dataset.title || '',
            dataset.description || dataset.notes || '',
            dataset.tags?.map(t => t.name || t).join(' ') || ''
        ].join(' ').toLowerCase();

        const foundRestriction = restrictedKeywords.find(keyword =>
            datasetText.includes(keyword)
        );

        if (foundRestriction) {
            this.blockedDatasets.add(dataset.id || dataset.name);

            return {
                allowed: false,
                reason: `Dataset contains restricted content (keyword: '${foundRestriction}'). Access blocked per governance policy.`,
                keyword: foundRestriction
            };
        }

        return {
            allowed: true,
            reason: 'No restrictions found'
        };
    }

    /**
     * Check license compliance
     * @param {object} dataset - Dataset to check
     * @returns {object} License check result
     */
    checkLicense(dataset) {
        const license = dataset.license_title || dataset.license_id || '';

        // Open licenses (CC-BY 4.0, etc.)
        const openLicenses = [
            'cc-by',
            'cc-by-4.0',
            'creative commons attribution',
            'cc0',
            'public domain',
            'odc-by',
            'odbl',
            'open government license'
        ];

        const isOpenLicense = openLicenses.some(ol =>
            license.toLowerCase().includes(ol)
        );

        if (!license || license.toLowerCase() === 'not specified') {
            this.licenseWarnings.add(dataset.id || dataset.name);

            return {
                restrictive: true,
                warning: 'No license specified. Use with caution. Attribution recommended.',
                license: 'Not specified',
                requiresAttribution: true
            };
        }

        if (!isOpenLicense) {
            this.licenseWarnings.add(dataset.id || dataset.name);

            return {
                restrictive: true,
                warning: `License '${license}' may have restrictions. Review terms before use.`,
                license,
                requiresAttribution: true
            };
        }

        return {
            restrictive: false,
            license,
            requiresAttribution: license.toLowerCase().includes('cc-by'),
            compliant: true
        };
    }

    /**
     * Scan for PII in dataset (DPDP Act 2023 compliance)
     * @param {object} dataset - Dataset to scan
     * @returns {object} PII detection result
     */
    scanForPII(dataset) {
        if (!this.piiDetection) {
            return {
                scanned: false,
                reason: 'PII detection disabled'
            };
        }

        const textToScan = [
            dataset.title || '',
            dataset.description || dataset.notes || '',
            JSON.stringify(dataset.resources || [])
        ].join(' ');

        const hasPII = detectPII(textToScan);

        return {
            scanned: true,
            piiDetected: hasPII,
            warning: hasPII
                ? 'Potential PII detected. Review data carefully before processing per DPDP Act 2023.'
                : 'No obvious PII patterns detected',
            recommendation: hasPII
                ? 'Consider redacting or anonymizing personal data before analysis.'
                : 'Dataset appears safe for processing.'
        };
    }

    /**
     * Redact PII from text content
     * @param {string} text - Text to redact
     * @returns {string} Redacted text
     */
    redactPIIContent(text) {
        if (!this.piiDetection || !text) {
            return text;
        }

        return redactPII(text);
    }

    /**
     * Validate resource download compliance
     * @param {object} resource - Resource to validate
     * @returns {object} Validation result
     */
    validateResourceDownload(resource) {
        const validation = {
            allowed: true,
            warnings: [],
            errors: []
        };

        // Check file size (prevent abuse)
        const maxSizeMB = 500;
        if (resource.size && parseInt(resource.size) > maxSizeMB * 1024 * 1024) {
            validation.warnings.push(`Large file size (${resource.size}). Consider streaming or chunked download.`);
        }

        // Check URL safety
        if (resource.url) {
            const urlValidation = this.validateURL(resource.url);
            if (!urlValidation.safe) {
                validation.allowed = false;
                validation.errors.push(urlValidation.reason);
            }
        }

        return validation;
    }

    /**
     * Validate URL safety
     * @param {string} url - URL to validate
     * @returns {object} Validation result
     */
    validateURL(url) {
        try {
            const parsedURL = new URL(url);

            // Check for suspicious protocols
            const allowedProtocols = ['http:', 'https:'];
            if (!allowedProtocols.includes(parsedURL.protocol)) {
                return {
                    safe: false,
                    reason: `Unsafe protocol: ${parsedURL.protocol}. Only HTTP/HTTPS allowed.`
                };
            }

            // Check for localhost/internal IPs (prevent SSRF)
            const suspiciousHosts = [
                'localhost',
                '127.0.0.1',
                '0.0.0.0',
                '169.254.169.254' // AWS metadata endpoint
            ];

            if (suspiciousHosts.some(host => parsedURL.hostname.includes(host))) {
                return {
                    safe: false,
                    reason: 'Cannot access internal/localhost URLs for security reasons.'
                };
            }

            return {
                safe: true,
                url: parsedURL.href
            };

        } catch (error) {
            return {
                safe: false,
                reason: `Invalid URL: ${error.message}`
            };
        }
    }

    /**
     * Generate attribution text for dataset
     * @param {object} dataset - Dataset to attribute
     * @returns {string} Attribution text
     */
    generateAttribution(dataset) {
        const title = dataset.title || 'Untitled Dataset';
        const organization = dataset.organization?.title || dataset.organization || 'Unknown Organization';
        const license = dataset.license_title || 'License not specified';
        const url = dataset.url || `https://data.gov.in/resource/${dataset.name || dataset.id}`;
        const accessDate = new Date().toISOString().split('T')[0];

        return `Data Source: "${title}" by ${organization}. ` +
               `Retrieved from Open Government Data Platform India (${url}) ` +
               `on ${accessDate}. ` +
               `License: ${license}. ` +
               `Attribution required under CC-BY 4.0 and OGD Policy India 2025.`;
    }

    /**
     * Log access for audit trail
     * @param {object} dataset - Dataset being accessed
     * @param {object} validationResult - Validation result
     */
    logAccess(dataset, validationResult) {
        if (!this.enableAuditLog) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            datasetId: dataset.id || dataset.name,
            datasetTitle: dataset.title,
            action: 'ACCESS_ATTEMPT',
            allowed: validationResult.allowed,
            warnings: validationResult.warnings,
            errors: validationResult.errors,
            compliance: validationResult.compliance
        };

        this.auditLog.push(logEntry);

        // Keep only last 1000 entries to prevent memory issues
        if (this.auditLog.length > 1000) {
            this.auditLog.shift();
        }

        if (this.debugMode) {
            console.log('Audit Log Entry:', logEntry);
        }
    }

    /**
     * Log data processing activity
     * @param {string} activity - Activity description
     * @param {object} details - Additional details
     */
    logActivity(activity, details = {}) {
        if (!this.enableAuditLog) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            activity,
            details
        };

        this.auditLog.push(logEntry);

        if (this.auditLog.length > 1000) {
            this.auditLog.shift();
        }
    }

    /**
     * Get audit log
     * @param {number} limit - Number of entries to return
     * @returns {array} Audit log entries
     */
    getAuditLog(limit = 100) {
        return this.auditLog.slice(-limit);
    }

    /**
     * Get compliance summary
     * @returns {object} Compliance summary
     */
    getComplianceSummary() {
        return {
            totalAccessAttempts: this.auditLog.filter(e => e.action === 'ACCESS_ATTEMPT').length,
            blockedDatasets: this.blockedDatasets.size,
            licenseWarnings: this.licenseWarnings.size,
            piiDetectionEnabled: this.piiDetection,
            auditLogEnabled: this.enableAuditLog,
            policies: {
                respectLicenses: this.respectLicenses,
                blockRestrictedData: this.blockRestrictedData,
                enableAuditLog: this.enableAuditLog,
                piiDetection: this.piiDetection
            }
        };
    }

    /**
     * Generate compliance report
     * @returns {object} Detailed compliance report
     */
    generateComplianceReport() {
        const summary = this.getComplianceSummary();
        const recentLogs = this.getAuditLog(50);

        const blockedAttempts = recentLogs.filter(log =>
            log.action === 'ACCESS_ATTEMPT' && !log.allowed
        ).length;

        return {
            summary,
            statistics: {
                totalLogs: this.auditLog.length,
                recentAccessAttempts: recentLogs.filter(log => log.action === 'ACCESS_ATTEMPT').length,
                recentBlockedAttempts: blockedAttempts,
                blockRate: recentLogs.length > 0
                    ? ((blockedAttempts / recentLogs.length) * 100).toFixed(2) + '%'
                    : '0%'
            },
            recentActivity: recentLogs.slice(-10),
            compliance: {
                ogdPolicy2025: this.respectLicenses && this.enableAuditLog,
                dpdpAct2023: this.piiDetection,
                ccBy40: this.respectLicenses
            },
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Reset governance state
     */
    reset() {
        this.auditLog = [];
        this.blockedDatasets.clear();
        this.licenseWarnings.clear();
    }
}

module.exports = GovernanceLayer;
