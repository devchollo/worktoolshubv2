// routes/sslRoutes.js
const express = require('express');
const router = express.Router();
const https = require('https');
const tls = require('tls');
const { URL } = require('url');

// SSL/TLS Protocol versions
const TLS_VERSIONS = {
  'TLSv1': 'TLS 1.0',
  'TLSv1.1': 'TLS 1.1',
  'TLSv1.2': 'TLS 1.2',
  'TLSv1.3': 'TLS 1.3'
};

// Browser compatibility data
const BROWSER_COMPATIBILITY = {
  'TLSv1': {
    Chrome: { min: '1', max: '96', status: 'deprecated' },
    Firefox: { min: '1', max: '96', status: 'deprecated' },
    Safari: { min: '1', max: '14', status: 'deprecated' },
    Edge: { min: '12', max: '96', status: 'deprecated' },
    IE: { min: '7', max: '11', status: 'deprecated' }
  },
  'TLSv1.1': {
    Chrome: { min: '22', max: '96', status: 'deprecated' },
    Firefox: { min: '24', max: '96', status: 'deprecated' },
    Safari: { min: '7', max: '14', status: 'deprecated' },
    Edge: { min: '12', max: '96', status: 'deprecated' },
    IE: { min: '11', max: '11', status: 'deprecated' }
  },
  'TLSv1.2': {
    Chrome: { min: '30', current: true, status: 'supported' },
    Firefox: { min: '27', current: true, status: 'supported' },
    Safari: { min: '7', current: true, status: 'supported' },
    Edge: { min: '12', current: true, status: 'supported' },
    IE: { min: '11', current: true, status: 'supported' }
  },
  'TLSv1.3': {
    Chrome: { min: '70', current: true, status: 'recommended' },
    Firefox: { min: '63', current: true, status: 'recommended' },
    Safari: { min: '12.1', current: true, status: 'recommended' },
    Edge: { min: '79', current: true, status: 'recommended' },
    IE: { min: null, current: false, status: 'unsupported' }
  }
};

// Device/OS compatibility
const DEVICE_COMPATIBILITY = {
  'TLSv1': {
    'Android': { min: '1.0', max: '9', status: 'deprecated' },
    'iOS': { min: '1.0', max: '12', status: 'deprecated' },
    'Windows': { min: 'Vista', current: true, status: 'deprecated' },
    'macOS': { min: '10.6', current: true, status: 'deprecated' },
    'Linux': { min: 'All', current: true, status: 'deprecated' }
  },
  'TLSv1.1': {
    'Android': { min: '4.1', max: '9', status: 'deprecated' },
    'iOS': { min: '5.0', max: '12', status: 'deprecated' },
    'Windows': { min: '7', current: true, status: 'deprecated' },
    'macOS': { min: '10.9', current: true, status: 'deprecated' },
    'Linux': { min: 'All', current: true, status: 'deprecated' }
  },
  'TLSv1.2': {
    'Android': { min: '4.1', current: true, status: 'supported' },
    'iOS': { min: '5.0', current: true, status: 'supported' },
    'Windows': { min: '7', current: true, status: 'supported' },
    'macOS': { min: '10.9', current: true, status: 'supported' },
    'Linux': { min: 'All', current: true, status: 'supported' }
  },
  'TLSv1.3': {
    'Android': { min: '10', current: true, status: 'recommended' },
    'iOS': { min: '12.2', current: true, status: 'recommended' },
    'Windows': { min: '11', current: true, status: 'recommended' },
    'macOS': { min: '10.15', current: true, status: 'recommended' },
    'Linux': { min: 'Modern', current: true, status: 'recommended' }
  }
};

// Test TLS version support
async function testTLSVersion(hostname, port, version) {
  return new Promise((resolve) => {
    const options = {
      host: hostname,
      port: port,
      method: 'GET',
      minVersion: version,
      maxVersion: version,
      rejectUnauthorized: false,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      resolve({
        version,
        supported: true,
        protocol: res.socket.getProtocol(),
        cipher: res.socket.getCipher()
      });
      res.socket.end();
    });

    req.on('error', (error) => {
      resolve({
        version,
        supported: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        version,
        supported: false,
        error: 'Connection timeout'
      });
    });

    req.end();
  });
}

// Get certificate details
async function getCertificateDetails(hostname, port) {
  return new Promise((resolve, reject) => {
    const options = {
      host: hostname,
      port: port,
      method: 'GET',
      rejectUnauthorized: false,
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate(true);
      const protocol = res.socket.getProtocol();
      const cipher = res.socket.getCipher();

      if (!cert || Object.keys(cert).length === 0) {
        reject(new Error('No certificate found'));
        return;
      }

      resolve({
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        subjectAltNames: cert.subjectaltname,
        protocol,
        cipher,
        daysRemaining: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
      });

      res.socket.end();
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

// Analyze cipher suite security
function analyzeCipherSuite(cipher) {
  if (!cipher) return { rating: 'F', issues: ['No cipher information'] };

  const issues = [];
  let rating = 'A';

  // Check for weak ciphers
  const weakCiphers = ['RC4', 'DES', '3DES', 'MD5', 'NULL', 'EXPORT', 'anon'];
  for (const weak of weakCiphers) {
    if (cipher.name && cipher.name.includes(weak)) {
      issues.push(`Weak cipher detected: ${weak}`);
      rating = 'F';
    }
  }

  // Check cipher strength
  if (cipher.bits < 128) {
    issues.push(`Low key strength: ${cipher.bits} bits`);
    rating = 'F';
  } else if (cipher.bits < 256) {
    issues.push('Cipher uses 128-bit encryption (256-bit recommended)');
    if (rating === 'A') rating = 'B';
  }

  // Check for forward secrecy
  if (cipher.name && !cipher.name.includes('ECDHE') && !cipher.name.includes('DHE')) {
    issues.push('No forward secrecy');
    if (rating === 'A') rating = 'B';
  }

  return { rating, issues };
}

// Calculate overall grade
function calculateOverallGrade(results) {
  let score = 100;
  const issues = [];

  // Check TLS version support
  if (results.tlsVersions['TLSv1'] && results.tlsVersions['TLSv1'].supported) {
    score -= 40;
    issues.push('TLS 1.0 is deprecated and insecure');
  }
  if (results.tlsVersions['TLSv1.1'] && results.tlsVersions['TLSv1.1'].supported) {
    score -= 30;
    issues.push('TLS 1.1 is deprecated and insecure');
  }
  if (!results.tlsVersions['TLSv1.2'] || !results.tlsVersions['TLSv1.2'].supported) {
    score -= 50;
    issues.push('TLS 1.2 not supported - critical security issue');
  }
  if (!results.tlsVersions['TLSv1.3'] || !results.tlsVersions['TLSv1.3'].supported) {
    score -= 10;
    issues.push('TLS 1.3 not supported - consider upgrading');
  }

  // Check certificate validity
  if (results.certificate.daysRemaining < 0) {
    score -= 100;
    issues.push('Certificate expired');
  } else if (results.certificate.daysRemaining < 30) {
    score -= 20;
    issues.push('Certificate expiring soon');
  }

  // Cipher suite analysis
  if (results.cipherAnalysis.rating === 'F') {
    score -= 50;
    issues.push(...results.cipherAnalysis.issues);
  } else if (results.cipherAnalysis.rating === 'B') {
    score -= 10;
  }

  // Calculate letter grade
  let grade;
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';
  else grade = 'F';

  return { grade, score: Math.max(0, score), issues };
}

// Main SSL check endpoint
router.post('/check', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Parse domain
    let hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const port = 443;

    console.log(`Checking SSL for: ${hostname}:${port}`);

    // Get certificate details
    const certificate = await getCertificateDetails(hostname, port);

    // Test all TLS versions
    const tlsVersions = {};
    for (const [version, name] of Object.entries(TLS_VERSIONS)) {
      const result = await testTLSVersion(hostname, port, version);
      tlsVersions[version] = {
        ...result,
        name,
        browserCompat: BROWSER_COMPATIBILITY[version],
        deviceCompat: DEVICE_COMPATIBILITY[version]
      };
    }

    // Analyze cipher suite
    const cipherAnalysis = analyzeCipherSuite(certificate.cipher);

    // Compile results
    const results = {
      domain: hostname,
      certificate,
      tlsVersions,
      cipherAnalysis,
      timestamp: new Date().toISOString()
    };

    // Calculate overall grade
    const grading = calculateOverallGrade(results);

    res.json({
      ...results,
      grading,
      recommendations: generateRecommendations(results, grading)
    });

  } catch (error) {
    console.error('SSL check error:', error);
    res.status(500).json({ 
      error: 'Failed to check SSL certificate',
      message: error.message 
    });
  }
});

// Generate recommendations
function generateRecommendations(results, grading) {
  const recommendations = [];

  if (results.tlsVersions['TLSv1']?.supported) {
    recommendations.push({
      severity: 'high',
      issue: 'Disable TLS 1.0',
      description: 'TLS 1.0 is deprecated and has known security vulnerabilities'
    });
  }

  if (results.tlsVersions['TLSv1.1']?.supported) {
    recommendations.push({
      severity: 'high',
      issue: 'Disable TLS 1.1',
      description: 'TLS 1.1 is deprecated and should not be used'
    });
  }

  if (!results.tlsVersions['TLSv1.3']?.supported) {
    recommendations.push({
      severity: 'medium',
      issue: 'Enable TLS 1.3',
      description: 'TLS 1.3 provides better security and performance'
    });
  }

  if (results.certificate.daysRemaining < 30) {
    recommendations.push({
      severity: 'high',
      issue: 'Renew certificate soon',
      description: `Certificate expires in ${results.certificate.daysRemaining} days`
    });
  }

  if (results.cipherAnalysis.issues.length > 0) {
    recommendations.push({
      severity: 'high',
      issue: 'Cipher suite issues',
      description: results.cipherAnalysis.issues.join(', ')
    });
  }

  return recommendations;
}

module.exports = router;