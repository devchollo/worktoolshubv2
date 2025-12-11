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

// Cipher suite categories
const CIPHER_STRENGTH = {
  'AES_256': 'Strong',
  'AES_128': 'Good',
  'CHACHA20': 'Strong',
  '3DES': 'Weak',
  'RC4': 'Insecure',
  'DES': 'Insecure',
  'NULL': 'Insecure'
};

// Browser compatibility data (updated with more details)
const BROWSER_COMPATIBILITY = {
  'TLSv1': {
    Chrome: { min: '1', max: '96', status: 'removed', note: 'Removed in Chrome 97+' },
    Firefox: { min: '1', max: '96', status: 'removed', note: 'Removed in Firefox 97+' },
    Safari: { min: '1', max: '14', status: 'removed', note: 'Removed in Safari 15+' },
    Edge: { min: '12', max: '96', status: 'removed', note: 'Removed in Edge 97+' },
    IE: { min: '7', max: '11', status: 'deprecated', note: 'Only IE 11' }
  },
  'TLSv1.1': {
    Chrome: { min: '22', max: '96', status: 'removed', note: 'Removed in Chrome 97+' },
    Firefox: { min: '24', max: '96', status: 'removed', note: 'Removed in Firefox 97+' },
    Safari: { min: '7', max: '14', status: 'removed', note: 'Removed in Safari 15+' },
    Edge: { min: '12', max: '96', status: 'removed', note: 'Removed in Edge 97+' },
    IE: { min: '11', max: '11', status: 'deprecated', note: 'Only IE 11' }
  },
  'TLSv1.2': {
    Chrome: { min: '30', current: true, status: 'supported', note: 'Full support' },
    Firefox: { min: '27', current: true, status: 'supported', note: 'Full support' },
    Safari: { min: '7', current: true, status: 'supported', note: 'Full support' },
    Edge: { min: '12', current: true, status: 'supported', note: 'Full support' },
    IE: { min: '11', current: true, status: 'supported', note: 'IE 11 only' }
  },
  'TLSv1.3': {
    Chrome: { min: '70', current: true, status: 'recommended', note: 'Best performance' },
    Firefox: { min: '63', current: true, status: 'recommended', note: 'Best performance' },
    Safari: { min: '12.1', current: true, status: 'recommended', note: 'iOS 12.2+' },
    Edge: { min: '79', current: true, status: 'recommended', note: 'Chromium-based' },
    IE: { min: null, current: false, status: 'unsupported', note: 'Never supported' }
  }
};

// Device/OS compatibility (more detailed)
const DEVICE_COMPATIBILITY = {
  'TLSv1': {
    'Android': { min: '1.0', max: '9', status: 'removed', note: 'Removed in Android 10+' },
    'iOS': { min: '1.0', max: '12', status: 'removed', note: 'Removed in iOS 13+' },
    'Windows': { min: 'Vista', current: true, status: 'deprecated', note: 'Not recommended' },
    'macOS': { min: '10.6', current: false, status: 'removed', note: 'Removed in Big Sur+' },
    'Linux': { min: 'All', current: true, status: 'deprecated', note: 'Depends on distro' }
  },
  'TLSv1.1': {
    'Android': { min: '4.1', max: '9', status: 'removed', note: 'Removed in Android 10+' },
    'iOS': { min: '5.0', max: '12', status: 'removed', note: 'Removed in iOS 13+' },
    'Windows': { min: '7', current: true, status: 'deprecated', note: 'Not recommended' },
    'macOS': { min: '10.9', current: false, status: 'removed', note: 'Removed in Big Sur+' },
    'Linux': { min: 'All', current: true, status: 'deprecated', note: 'Depends on distro' }
  },
  'TLSv1.2': {
    'Android': { min: '4.1', current: true, status: 'supported', note: 'Full support' },
    'iOS': { min: '5.0', current: true, status: 'supported', note: 'Full support' },
    'Windows': { min: '7', current: true, status: 'supported', note: 'Windows 7+' },
    'macOS': { min: '10.9', current: true, status: 'supported', note: 'Mavericks+' },
    'Linux': { min: 'All', current: true, status: 'supported', note: 'All modern distros' }
  },
  'TLSv1.3': {
    'Android': { min: '10', current: true, status: 'recommended', note: 'Android 10+' },
    'iOS': { min: '12.2', current: true, status: 'recommended', note: 'iOS 12.2+' },
    'Windows': { min: '10 (1903)', current: true, status: 'recommended', note: 'May 2019 Update+' },
    'macOS': { min: '10.15', current: true, status: 'recommended', note: 'Catalina+' },
    'Linux': { min: 'Modern', current: true, status: 'recommended', note: 'Kernel 4.13+' }
  }
};

// Parse domain from various input formats
function parseDomain(input) {
  // Remove whitespace
  input = input.trim();
  
  // If it starts with http:// or https://, parse as URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const url = new URL(input);
      return url.hostname;
    } catch (e) {
      throw new Error('Invalid URL format');
    }
  }
  
  // If it contains :// but not http/https, it's invalid
  if (input.includes('://')) {
    throw new Error('Invalid protocol. Use https:// or just the domain name');
  }
  
  // Remove any path, query strings, or fragments
  input = input.split('/')[0].split('?')[0].split('#')[0];
  
  // Remove port if present
  input = input.split(':')[0];
  
  // Basic domain validation
  if (!input || input.includes(' ') || input.length < 3) {
    throw new Error('Invalid domain name');
  }
  
  return input;
}

// Test TLS version support with timeout
async function testTLSVersion(hostname, port, version) {
  return new Promise((resolve) => {
    const startTime = Date.now();
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
      const responseTime = Date.now() - startTime;
      const protocol = res.socket.getProtocol();
      const cipher = res.socket.getCipher();
      
      resolve({
        version,
        supported: true,
        protocol,
        cipher,
        responseTime
      });
      res.socket.end();
    });

    req.on('error', (error) => {
      resolve({
        version,
        supported: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        version,
        supported: false,
        error: 'Connection timeout',
        responseTime: 10000
      });
    });

    req.end();
  });
}

// Get comprehensive certificate details
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

      // Calculate days remaining
      const validTo = new Date(cert.valid_to);
      const now = new Date();
      const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

      // Parse subject alt names
      const altNames = cert.subjectaltname 
        ? cert.subjectaltname.split(', ').map(n => n.replace('DNS:', ''))
        : [];

      resolve({
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        serialNumber: cert.serialNumber,
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        subjectAltNames: altNames,
        protocol,
        cipher,
        daysRemaining,
        keySize: cert.bits || 'Unknown',
        signatureAlgorithm: cert.asn1Curve || 'RSA',
        version: cert.version || 3
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

// Comprehensive cipher suite analysis
function analyzeCipherSuite(cipher) {
  if (!cipher) return { 
    rating: 'F', 
    issues: ['No cipher information available'],
    details: {}
  };

  const issues = [];
  const warnings = [];
  let rating = 'A';
  let score = 100;

  const cipherName = cipher.name || '';

  // Check for insecure ciphers
  const insecureCiphers = ['RC4', 'DES', 'MD5', 'NULL', 'EXPORT', 'anon'];
  for (const weak of insecureCiphers) {
    if (cipherName.includes(weak)) {
      issues.push(`Insecure cipher component: ${weak}`);
      rating = 'F';
      score = 0;
      break;
    }
  }

  // Check for weak ciphers
  if (cipherName.includes('3DES')) {
    issues.push('3DES cipher is deprecated and weak');
    rating = rating === 'A' ? 'C' : rating;
    score -= 40;
  }

  // Check cipher strength
  if (cipher.bits < 112) {
    issues.push(`Very weak key strength: ${cipher.bits} bits`);
    rating = 'F';
    score = 0;
  } else if (cipher.bits < 128) {
    issues.push(`Weak key strength: ${cipher.bits} bits (minimum 128-bit recommended)`);
    rating = rating === 'A' ? 'D' : rating;
    score -= 30;
  } else if (cipher.bits < 256) {
    warnings.push('Uses 128-bit encryption (256-bit recommended for best security)');
    if (rating === 'A') rating = 'B';
    score -= 10;
  }

  // Check for forward secrecy
  const hasForwardSecrecy = cipherName.includes('ECDHE') || cipherName.includes('DHE');
  if (!hasForwardSecrecy) {
    issues.push('No forward secrecy - vulnerable to future key compromise');
    if (rating === 'A') rating = 'C';
    score -= 30;
  }

  // Check for AEAD ciphers (GCM, CCM, POLY1305)
  const hasAEAD = cipherName.includes('GCM') || 
                  cipherName.includes('CCM') || 
                  cipherName.includes('POLY1305');
  if (!hasAEAD) {
    warnings.push('Not using AEAD cipher mode (GCM/POLY1305 recommended)');
    score -= 5;
  }

  // Recalculate grade based on score
  if (score >= 90) rating = 'A+';
  else if (score >= 80) rating = 'A';
  else if (score >= 70) rating = 'B';
  else if (score >= 60) rating = 'C';
  else if (score >= 50) rating = 'D';
  else rating = 'F';

  return { 
    rating, 
    score: Math.max(0, score),
    issues,
    warnings,
    details: {
      forwardSecrecy: hasForwardSecrecy,
      aeadMode: hasAEAD,
      keySize: cipher.bits
    }
  };
}

// Analyze protocol support and vulnerabilities
function analyzeProtocolSecurity(tlsVersions) {
  const vulnerabilities = [];
  const warnings = [];
  let score = 100;

  // Check for dangerous protocols
  if (tlsVersions['TLSv1'] && tlsVersions['TLSv1'].supported) {
    vulnerabilities.push({
      name: 'TLS 1.0 Enabled',
      severity: 'HIGH',
      description: 'TLS 1.0 has known vulnerabilities including BEAST and POODLE attacks',
      cve: ['CVE-2011-3389', 'CVE-2014-3566'],
      recommendation: 'Disable TLS 1.0 immediately'
    });
    score -= 40;
  }

  if (tlsVersions['TLSv1.1'] && tlsVersions['TLSv1.1'].supported) {
    vulnerabilities.push({
      name: 'TLS 1.1 Enabled',
      severity: 'HIGH',
      description: 'TLS 1.1 is deprecated by major browsers and has security weaknesses',
      recommendation: 'Disable TLS 1.1 immediately'
    });
    score -= 30;
  }

  // Check for missing modern protocols
  if (!tlsVersions['TLSv1.2'] || !tlsVersions['TLSv1.2'].supported) {
    vulnerabilities.push({
      name: 'TLS 1.2 Not Supported',
      severity: 'CRITICAL',
      description: 'TLS 1.2 is the minimum recommended version',
      recommendation: 'Enable TLS 1.2 support immediately'
    });
    score -= 50;
  }

  if (!tlsVersions['TLSv1.3'] || !tlsVersions['TLSv1.3'].supported) {
    warnings.push({
      name: 'TLS 1.3 Not Supported',
      severity: 'MEDIUM',
      description: 'TLS 1.3 provides improved security and performance',
      recommendation: 'Consider upgrading to support TLS 1.3'
    });
    score -= 10;
  }

  return {
    vulnerabilities,
    warnings,
    score: Math.max(0, score)
  };
}

// Calculate overall grade (SSL Labs style)
function calculateOverallGrade(results, protocolAnalysis) {
  let score = 100;
  const issues = [];

  // Certificate validity (30% weight)
  if (results.certificate.daysRemaining < 0) {
    score = 0;
    issues.push('CRITICAL: Certificate has expired');
  } else if (results.certificate.daysRemaining < 7) {
    score -= 30;
    issues.push('Certificate expires in less than 7 days');
  } else if (results.certificate.daysRemaining < 30) {
    score -= 15;
    issues.push('Certificate expires in less than 30 days');
  }

  // Protocol security (40% weight)
  score -= (100 - protocolAnalysis.score) * 0.4;
  issues.push(...protocolAnalysis.vulnerabilities.map(v => v.name));

  // Cipher suite security (30% weight)
  const cipherScore = results.cipherAnalysis.score || 0;
  score -= (100 - cipherScore) * 0.3;
  if (results.cipherAnalysis.issues.length > 0) {
    issues.push(...results.cipherAnalysis.issues);
  }

  // Calculate letter grade
  score = Math.max(0, score);
  let grade;
  if (score >= 95) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 65) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else if (score >= 20) grade = 'E';
  else grade = 'F';

  return { 
    grade, 
    score: Math.round(score), 
    issues,
    securityLevel: grade === 'A+' || grade === 'A' ? 'Excellent' :
                   grade === 'B' ? 'Good' :
                   grade === 'C' ? 'Fair' :
                   grade === 'D' ? 'Poor' :
                   'Critical'
  };
}

// Main SSL check endpoint
router.post('/check', async (req, res) => {
  try {
    let { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Parse and validate domain
    const hostname = parseDomain(domain);
    const port = 443;

    console.log(`🔍 Checking SSL for: ${hostname}:${port}`);

    // Get certificate details
    let certificate;
    try {
      certificate = await getCertificateDetails(hostname, port);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Failed to connect to server',
        message: `Could not establish connection to ${hostname}. Please verify the domain is correct and accessible.`,
        details: error.message
      });
    }

    // Test all TLS versions
    const tlsVersions = {};
    const tlsTests = Object.entries(TLS_VERSIONS).map(async ([version, name]) => {
      const result = await testTLSVersion(hostname, port, version);
      tlsVersions[version] = {
        ...result,
        name,
        browserCompat: BROWSER_COMPATIBILITY[version],
        deviceCompat: DEVICE_COMPATIBILITY[version]
      };
    });

    await Promise.all(tlsTests);

    // Analyze cipher suite
    const cipherAnalysis = analyzeCipherSuite(certificate.cipher);

    // Analyze protocol security
    const protocolAnalysis = analyzeProtocolSecurity(tlsVersions);

    // Compile results
    const results = {
      domain: hostname,
      certificate,
      tlsVersions,
      cipherAnalysis,
      protocolAnalysis,
      timestamp: new Date().toISOString()
    };

    // Calculate overall grade
    const grading = calculateOverallGrade(results, protocolAnalysis);

    // Generate recommendations
    const recommendations = generateRecommendations(results, grading, protocolAnalysis);

    res.json({
      ...results,
      grading,
      recommendations
    });

  } catch (error) {
    console.error('SSL check error:', error);
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to check SSL certificate',
      message: 'An unexpected error occurred while checking the SSL certificate',
      details: error.message 
    });
  }
});

// Generate comprehensive recommendations
function generateRecommendations(results, grading, protocolAnalysis) {
  const recommendations = [];

  // Certificate recommendations
  if (results.certificate.daysRemaining < 30) {
    recommendations.push({
      severity: results.certificate.daysRemaining < 7 ? 'critical' : 'high',
      category: 'Certificate',
      issue: 'Certificate Expiring Soon',
      description: `Certificate expires in ${results.certificate.daysRemaining} days. Renew before expiration to avoid service interruption.`,
      action: 'Renew SSL certificate immediately'
    });
  }

  // Protocol vulnerabilities
  protocolAnalysis.vulnerabilities.forEach(vuln => {
    recommendations.push({
      severity: vuln.severity.toLowerCase(),
      category: 'Protocol',
      issue: vuln.name,
      description: vuln.description,
      action: vuln.recommendation
    });
  });

  // Protocol warnings
  protocolAnalysis.warnings.forEach(warn => {
    recommendations.push({
      severity: 'medium',
      category: 'Protocol',
      issue: warn.name,
      description: warn.description,
      action: warn.recommendation
    });
  });

  // Cipher suite recommendations
  if (results.cipherAnalysis.issues.length > 0) {
    recommendations.push({
      severity: 'high',
      category: 'Cipher Suite',
      issue: 'Cipher Suite Issues Detected',
      description: results.cipherAnalysis.issues.join('. '),
      action: 'Update server configuration to use strong, modern cipher suites'
    });
  }

  if (results.cipherAnalysis.warnings && results.cipherAnalysis.warnings.length > 0) {
    recommendations.push({
      severity: 'low',
      category: 'Cipher Suite',
      issue: 'Cipher Suite Improvements Available',
      description: results.cipherAnalysis.warnings.join('. '),
      action: 'Consider upgrading cipher configuration'
    });
  }

  // Key size recommendations
  if (results.certificate.keySize && results.certificate.keySize < 2048) {
    recommendations.push({
      severity: 'high',
      category: 'Certificate',
      issue: 'Weak Key Size',
      description: `Certificate uses ${results.certificate.keySize}-bit key. Minimum 2048-bit required.`,
      action: 'Generate new certificate with at least 2048-bit key'
    });
  }

  return recommendations;
}

module.exports = router;