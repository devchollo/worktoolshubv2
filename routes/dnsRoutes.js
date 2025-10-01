const express = require('express');
const router = express.Router();
const dns = require('dns').promises;
const { Validator } = require('../utils/validation');

// List of DNS servers from different locations worldwide
const DNS_SERVERS = [
  // Google Public DNS
  { name: 'Google (Primary)', ip: '8.8.8.8', location: 'Global' },
  { name: 'Google (Secondary)', ip: '8.8.4.4', location: 'Global' },
  
  // Cloudflare DNS
  { name: 'Cloudflare (Primary)', ip: '1.1.1.1', location: 'Global' },
  { name: 'Cloudflare (Secondary)', ip: '1.0.0.1', location: 'Global' },
  
  // OpenDNS
  { name: 'OpenDNS (Primary)', ip: '208.67.222.222', location: 'Global' },
  { name: 'OpenDNS (Secondary)', ip: '208.67.220.220', location: 'Global' },
  
  // Quad9
  { name: 'Quad9', ip: '9.9.9.9', location: 'Global' },
  
  // Level3
  { name: 'Level3', ip: '209.244.0.3', location: 'US' },
  
  // Verisign
  { name: 'Verisign', ip: '64.6.64.6', location: 'US' },
  
  // DNS.WATCH
  { name: 'DNS.WATCH', ip: '84.200.69.80', location: 'Germany' },
  
  // Comodo Secure DNS
  { name: 'Comodo', ip: '8.26.56.26', location: 'US' },
  
  // AdGuard DNS
  { name: 'AdGuard', ip: '94.140.14.14', location: 'Global' },
];

// Record types supported
const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'];

// Helper function to query specific DNS server
async function queryDNSServer(domain, recordType, dnsServer) {
  const resolver = new dns.Resolver();
  resolver.setServers([dnsServer]);

  try {
    let records;
    const lowerType = recordType.toLowerCase();

    switch (recordType) {
      case 'A':
        records = await resolver.resolve4(domain);
        break;
      case 'AAAA':
        records = await resolver.resolve6(domain);
        break;
      case 'CNAME':
        records = await resolver.resolveCname(domain);
        break;
      case 'MX':
        records = await resolver.resolveMx(domain);
        break;
      case 'TXT':
        records = await resolver.resolveTxt(domain);
        // Flatten TXT records
        records = records.map(r => Array.isArray(r) ? r.join('') : r);
        break;
      case 'NS':
        records = await resolver.resolveNs(domain);
        break;
      case 'SOA':
        records = await resolver.resolveSoa(domain);
        break;
      default:
        throw new Error(`Unsupported record type: ${recordType}`);
    }

    return {
      success: true,
      records: records,
      recordType: recordType
    };
  } catch (error) {
    return {
      success: false,
      error: error.code || error.message,
      recordType: recordType
    };
  }
}

// POST /api/dns/check - Check DNS propagation
router.post('/check', async (req, res) => {
  try {
    const { domain, recordType = 'A' } = req.body;

    // Validate inputs
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Sanitize domain
    const sanitizedDomain = Validator.sanitizeInput(domain).toLowerCase();
    
    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(sanitizedDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Validate record type
    if (!RECORD_TYPES.includes(recordType.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid record type',
        supportedTypes: RECORD_TYPES 
      });
    }

    // Query all DNS servers
    const results = await Promise.all(
      DNS_SERVERS.map(async (server) => {
        const startTime = Date.now();
        const result = await queryDNSServer(sanitizedDomain, recordType.toUpperCase(), server.ip);
        const responseTime = Date.now() - startTime;

        return {
          server: server.name,
          location: server.location,
          ip: server.ip,
          ...result,
          responseTime: responseTime
        };
      })
    );

    // Calculate propagation status
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Check if records are consistent
    let isFullyPropagated = false;
    let isPropagating = false;
    let recordValues = new Set();

    if (successful.length > 0) {
      successful.forEach(result => {
        const recordString = JSON.stringify(result.records);
        recordValues.add(recordString);
      });

      if (recordValues.size === 1 && failed.length === 0) {
        isFullyPropagated = true;
      } else if (recordValues.size > 0) {
        isPropagating = true;
      }
    }

    res.json({
      domain: sanitizedDomain,
      recordType: recordType.toUpperCase(),
      timestamp: new Date().toISOString(),
      status: {
        fullyPropagated: isFullyPropagated,
        propagating: isPropagating,
        notPropagated: !isFullyPropagated && !isPropagating
      },
      summary: {
        total: DNS_SERVERS.length,
        successful: successful.length,
        failed: failed.length,
        uniqueRecords: recordValues.size
      },
      results: results
    });

  } catch (error) {
    console.error('DNS check error:', error);
    res.status(500).json({ error: 'Failed to check DNS propagation' });
  }
});

// GET /api/dns/servers - Get list of DNS servers
router.get('/servers', (req, res) => {
  res.json({
    servers: DNS_SERVERS,
    count: DNS_SERVERS.length
  });
});

// GET /api/dns/record-types - Get supported record types
router.get('/record-types', (req, res) => {
  res.json({
    recordTypes: RECORD_TYPES
  });
});

module.exports = router;