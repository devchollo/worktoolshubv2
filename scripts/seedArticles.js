// scripts/seedArticles.js
const mongoose = require('mongoose');
require('dotenv').config();

// Import your models
const Article = require('../models/Articles');

const sampleArticles = [
  {
    title: "Advanced React Performance Optimization Techniques",
    excerpt: "Learn how to optimize React applications for better performance using React.memo, useMemo, useCallback, and advanced patterns.",
    content: `# Advanced React Performance Optimization Techniques

React applications can become slow as they grow in complexity. This comprehensive guide covers the most effective techniques for optimizing React performance.

## Understanding React Performance

React's virtual DOM is efficient, but it's not magic. Understanding when and why React re-renders components is crucial for optimization.

### Key Concepts:
- **Reconciliation**: React's process of updating the DOM
- **Re-rendering**: When React calls your component function again
- **Memoization**: Caching expensive calculations

## React.memo for Component Memoization

React.memo prevents unnecessary re-renders by memoizing the component result.

\`\`\`jsx
const MyComponent = React.memo(({ name, age }) => {
  return <div>{name} is {age} years old</div>;
});
\`\`\`

## useMemo for Expensive Calculations

Use useMemo to memoize expensive calculations:

\`\`\`jsx
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
\`\`\`

## useCallback for Function Memoization

useCallback prevents function recreation on every render:

\`\`\`jsx
const handleClick = useCallback(() => {
  setCount(count + 1);
}, [count]);
\`\`\`

## Advanced Patterns

### Code Splitting with React.lazy

\`\`\`jsx
const LazyComponent = React.lazy(() => import('./LazyComponent'));
\`\`\`

### Virtualization for Large Lists

Use libraries like react-window for rendering large datasets efficiently.

## Conclusion

Performance optimization is about finding the right balance. Don't optimize prematurely, but understand these techniques for when you need them.`,
    category: "technical",
    difficulty: "advanced",
    tags: ["React", "Performance", "JavaScript", "Optimization"],
    author: "John Doe",
    readTime: "8 min read",
    upvotes: 47,
    helpfulCount: 89,
    views: 1250,
    slug: "advanced-react-performance-optimization"
  },
  {
    title: "Getting Started with MongoDB Atlas",
    excerpt: "A comprehensive tutorial on setting up and using MongoDB Atlas for your next project.",
    content: `# Getting Started with MongoDB Atlas

MongoDB Atlas is the cloud-hosted version of MongoDB. This guide will walk you through setting up your first cluster and connecting your application.

## What is MongoDB Atlas?

MongoDB Atlas is a fully managed cloud database service that handles all the complexity of deploying, managing, and healing your deployments on the cloud service provider of your choice.

## Setting Up Your First Cluster

1. **Create an Account**: Go to mongodb.com/cloud/atlas
2. **Choose a Plan**: Start with the free tier
3. **Select a Cloud Provider**: AWS, Google Cloud, or Azure
4. **Configure Your Cluster**: Choose region and cluster tier

## Connecting to Your Database

### Connection String Format:
\`\`\`
mongodb+srv://username:password@cluster.mongodb.net/database
\`\`\`

### Using Node.js:
\`\`\`javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient(uri);
\`\`\`

## Security Best Practices

- Use strong passwords
- Whitelist IP addresses
- Enable authentication
- Use SSL connections

## Common Operations

### Insert Document:
\`\`\`javascript
await collection.insertOne({ name: "John", age: 30 });
\`\`\`

### Find Documents:
\`\`\`javascript
const docs = await collection.find({ age: { $gte: 18 } }).toArray();
\`\`\`

## Monitoring and Optimization

Atlas provides built-in monitoring tools to track performance metrics and optimize your queries.

## Conclusion

MongoDB Atlas simplifies database management, letting you focus on building your application rather than managing infrastructure.`,
    category: "tutorials",
    difficulty: "beginner",
    tags: ["MongoDB", "Database", "Atlas", "NoSQL"],
    author: "Jane Smith",
    readTime: "12 min read",
    upvotes: 32,
    helpfulCount: 67,
    views: 890,
    slug: "getting-started-mongodb-atlas"
  },
  {
    title: "Troubleshooting Common Docker Issues",
    excerpt: "Solutions to the most common Docker problems developers encounter in production environments.",
    content: `# Troubleshooting Common Docker Issues

Docker is powerful but can be frustrating when things go wrong. Here are solutions to the most common problems.

## Container Won't Start

### Check the logs:
\`\`\`bash
docker logs container-name
\`\`\`

### Common causes:
- Port conflicts
- Missing environment variables
- Incorrect file permissions
- Resource constraints

## Image Build Failures

### Clear build cache:
\`\`\`bash
docker builder prune
\`\`\`

### Check Dockerfile syntax:
- Use proper base images
- Install dependencies before copying code
- Use .dockerignore to exclude unnecessary files

## Network Issues

### Container can't reach other containers:
1. Check if containers are on the same network
2. Use container names instead of localhost
3. Verify port configurations

### Example network creation:
\`\`\`bash
docker network create mynetwork
docker run --network mynetwork mycontainer
\`\`\`

## Volume and Permission Problems

### File permission errors:
\`\`\`dockerfile
RUN chown -R user:user /app
USER user
\`\`\`

### Volume mounting issues:
- Use absolute paths
- Check file/directory existence
- Verify permissions on host

## Performance Issues

### Resource constraints:
\`\`\`bash
docker stats
\`\`\`

### Optimization tips:
- Use multi-stage builds
- Minimize layer count
- Use specific base image tags
- Clean up after installations

## Security Concerns

### Run as non-root user:
\`\`\`dockerfile
RUN adduser --disabled-password --gecos '' appuser
USER appuser
\`\`\`

### Scan images for vulnerabilities:
\`\`\`bash
docker scan myimage:tag
\`\`\`

## Debugging Techniques

### Interactive debugging:
\`\`\`bash
docker exec -it container-name /bin/bash
\`\`\`

### Check container configuration:
\`\`\`bash
docker inspect container-name
\`\`\`

## Conclusion

Most Docker issues stem from configuration problems. Systematic debugging and understanding Docker's architecture will help you resolve issues quickly.`,
    category: "troubleshooting",
    difficulty: "intermediate",
    tags: ["Docker", "DevOps", "Containers", "Deployment"],
    author: "Mike Johnson",
    readTime: "15 min read",
    upvotes: 78,
    helpfulCount: 134,
    views: 2100,
    slug: "troubleshooting-docker-issues"
  },
  {
    title: "API Design Best Practices for 2024",
    excerpt: "Modern approaches to designing scalable, maintainable APIs with proper versioning and documentation.",
    content: `# API Design Best Practices for 2024

Building great APIs requires careful planning and adherence to established patterns. This guide covers modern best practices for API design.

## RESTful Design Principles

### Use HTTP Methods Correctly
- GET: Retrieve data
- POST: Create new resources
- PUT: Update entire resources
- PATCH: Partial updates
- DELETE: Remove resources

### Resource-Based URLs
\`\`\`
Good: /api/v1/users/123
Bad:  /api/v1/getUser?id=123
\`\`\`

## HTTP Status Codes

### Success Codes:
- 200 OK: Standard success
- 201 Created: Resource created
- 204 No Content: Success with no body

### Client Error Codes:
- 400 Bad Request: Invalid syntax
- 401 Unauthorized: Authentication required
- 403 Forbidden: Access denied
- 404 Not Found: Resource doesn't exist

### Server Error Codes:
- 500 Internal Server Error: Generic server error
- 502 Bad Gateway: Invalid response from upstream
- 503 Service Unavailable: Server overloaded

## API Versioning

### URL Versioning (Recommended):
\`\`\`
/api/v1/users
/api/v2/users
\`\`\`

### Header Versioning:
\`\`\`
Accept: application/vnd.api+json;version=1
\`\`\`

## Error Handling

### Consistent Error Format:
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
\`\`\`

## Pagination

### Cursor-Based Pagination (Recommended):
\`\`\`json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIz",
    "prev_cursor": "eyJpZCI6OTg3",
    "has_more": true
  }
}
\`\`\`

## Security Best Practices

### Authentication & Authorization
- Use JWT tokens or OAuth 2.0
- Implement rate limiting
- Validate all inputs
- Use HTTPS everywhere

### Example Rate Limiting:
\`\`\`javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
\`\`\`

## Documentation

### Use OpenAPI/Swagger
- Auto-generate documentation
- Provide interactive testing
- Keep docs up-to-date with code

### Example OpenAPI spec:
\`\`\`yaml
paths:
  /users:
    get:
      summary: Get all users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        200:
          description: Users retrieved successfully
\`\`\`

## Testing

### Test Pyramid for APIs:
1. Unit tests for business logic
2. Integration tests for endpoints
3. Contract tests for API compatibility

## Monitoring & Observability

### Essential Metrics:
- Response times
- Error rates
- Request volumes
- Endpoint usage

### Logging Best Practices:
- Use structured logging (JSON)
- Include correlation IDs
- Log at appropriate levels
- Don't log sensitive data

## Conclusion

Great APIs are designed with the consumer in mind. Follow these practices to build APIs that are intuitive, reliable, and maintainable.`,
    category: "best-practices",
    difficulty: "intermediate",
    tags: ["API", "REST", "Design", "Backend"],
    author: "Sarah Wilson",
    readTime: "10 min read",
    upvotes: 56,
    helpfulCount: 98,
    views: 1750,
    slug: "api-design-best-practices-2024"
  },
  {
    title: "Essential VS Code Extensions for Developers",
    excerpt: "Boost your productivity with these carefully curated VS Code extensions for modern development.",
    content: `# Essential VS Code Extensions for Developers

VS Code's extensibility is one of its greatest strengths. This curated list covers the most valuable extensions for different types of development.

## General Productivity

### 1. GitLens
**Purpose**: Supercharge Git capabilities
- Inline blame annotations
- Rich commit search
- Repository insights
- Line and file history

### 2. Auto Rename Tag
**Purpose**: Automatically rename paired HTML/XML tags
- Saves time on tag editing
- Prevents mismatched tags
- Works with JSX and Vue templates

### 3. Bracket Pair Colorizer
**Purpose**: Color-code matching brackets
- Visual bracket matching
- Customizable colors
- Supports multiple bracket types

## Language-Specific Extensions

### JavaScript/TypeScript

#### ES7+ React/Redux/React-Native snippets
- Extensive snippet collection
- Modern JavaScript patterns
- React hooks support

#### TypeScript Importer
- Auto-imports for TypeScript
- Intelligent suggestions
- Workspace indexing

### Python

#### Python (Microsoft)
- IntelliSense and debugging
- Linting with pylint/flake8
- Jupyter notebook support

#### Python Docstring Generator
- Auto-generate docstrings
- Multiple formats (Google, NumPy, Sphinx)
- Custom templates

### Web Development

#### Live Server
- Local development server
- Hot reload functionality
- Multi-root workspace support

#### CSS Peek
- Navigate to CSS definitions
- Inline CSS viewing
- Symbol search

## Code Quality & Formatting

### 1. Prettier - Code formatter
**Configuration**:
\`\`\`json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
\`\`\`

### 2. ESLint
**Purpose**: JavaScript/TypeScript linting
- Real-time error detection
- Auto-fix capabilities
- Configurable rules

### 3. SonarLint
**Purpose**: Code quality and security
- Detects bugs and vulnerabilities
- Code smells identification
- Multi-language support

## Theme and UI

### Material Theme
- Popular color schemes
- File icon themes
- Consistent syntax highlighting

### Indent Rainbow
- Colorizes indentation
- Improves code readability
- Customizable colors

## Debugging and Testing

### REST Client
**Purpose**: Test APIs directly in VS Code
\`\`\`http
GET https://api.example.com/users
Authorization: Bearer {{token}}
\`\`\`

### Thunder Client
**Purpose**: Lightweight API testing
- Postman-like interface
- Collection management
- Environment variables

## Docker and DevOps

### Docker
- Dockerfile syntax highlighting
- Container management
- Image building and running

### Kubernetes
- YAML validation
- Cluster management
- Pod logs and debugging

## Database Tools

### SQLTools
- Database connections
- Query execution
- Schema exploration

### MongoDB for VS Code
- Database browsing
- Query execution
- Document editing

## Custom Configuration

### Recommended Settings
\`\`\`json
{
  "workbench.colorTheme": "Material Theme",
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.wordWrap": "on",
  "files.autoSave": "afterDelay",
  "terminal.integrated.fontSize": 13,
  "git.enableSmartCommit": true
}
\`\`\`

### Useful Keybindings
\`\`\`json
[
  {
    "key": "ctrl+shift+r",
    "command": "workbench.action.reloadWindow"
  },
  {
    "key": "ctrl+k ctrl+f",
    "command": "editor.action.formatDocument"
  }
]
\`\`\`

## Extension Management Tips

### Performance Optimization
1. Disable unused extensions
2. Use workspace-specific extensions
3. Monitor extension impact

### Backup and Sync
- Use Settings Sync feature
- Export extension lists
- Version control your settings

## Creating Custom Snippets

\`\`\`json
{
  "React Functional Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "const $1 = () => {",
      "  return (",
      "    <div>$2</div>",
      "  );",
      "};",
      "",
      "export default $1;"
    ]
  }
}
\`\`\`

## Conclusion

The right extensions can dramatically improve your development workflow. Start with the essentials and gradually add more specialized tools as needed. Remember to periodically review and clean up your extension list to maintain optimal performance.`,
    category: "tools",
    difficulty: "beginner",
    tags: ["VS Code", "Extensions", "Productivity", "Tools"],
    author: "Alex Chen",
    readTime: "6 min read",
    upvotes: 91,
    helpfulCount: 156,
    views: 3200,
    slug: "essential-vscode-extensions"
  }
];

async function seedDatabase() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing articles
    console.log('🗑️  Clearing existing articles...');
    await Article.deleteMany({});

    // Insert sample articles
    console.log('📚 Inserting sample articles...');
    const insertedArticles = await Article.insertMany(sampleArticles);
    
    console.log(`✅ Successfully inserted ${insertedArticles.length} articles`);
    
    // Display inserted articles
    insertedArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (ID: ${article._id})`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('📴 Database connection closed');
  }
}

// Run the seed function
seedDatabase();