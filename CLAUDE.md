# Claude Code Web UI - Multi-User Management System

A comprehensive web-based interface for managing Claude Code CLI across multiple system users with API-first architecture and ultra-modern design.

## 📋 **CLAUDE.md Maintenance Protocol**

> **CRITICAL REQUIREMENT**: After completing each development task, Claude Code must:
> 1. **READ** this CLAUDE.md file completely
> 2. **UPDATE** relevant sections with new functionality 
> 3. **OPTIMIZE** documentation structure and clarity
> 4. **TEST** that all documented features work as described
> 5. **COMMIT** changes with clear documentation updates
>
> This ensures CLAUDE.md remains the authoritative source of truth for the project.

## 🏗️ **API-First Architecture**

This project follows **API-First Design** principles:

### Core Principles
- **API Design Before Implementation**: All features start with API specification
- **Frontend as API Consumer**: UI layer consumes well-defined backend APIs
- **Versioned APIs**: Clear API versioning strategy for backward compatibility
- **OpenAPI Documentation**: Comprehensive API documentation with examples
- **Contract Testing**: API contracts validated through automated testing
- **Separation of Concerns**: Business logic in backend, presentation in frontend

### API Design Flow
1. **Specification**: Define API endpoints, request/response schemas
2. **Documentation**: Create OpenAPI/Swagger specs
3. **Mock Implementation**: Create API mocks for frontend development
4. **Backend Implementation**: Implement actual API endpoints
5. **Integration Testing**: Validate API contracts
6. **Frontend Integration**: Connect UI to production APIs

## 🔐 **Multi-User Claude Code Management System**

### Overview
Advanced system for managing Claude Code CLI across multiple system users with proper isolation, security, and permission management.

### Core Features
- **User Isolation**: Each system user runs Claude with their own permissions
- **Sudo Integration**: Secure `sudo -u` command execution
- **Environment Preservation**: Maintains user-specific environments and configurations
- **Project Management**: Per-user project directories and Claude CLI configurations
- **Security Boundaries**: Proper user access controls and validation

### Architecture Components

#### 1. User Management API
```typescript
// API Endpoints
GET /api/users                    // List available system users
GET /api/users/:username/status   // Check user Claude CLI status
POST /api/users/:username/validate // Validate user access and Claude setup
```

#### 2. Multi-User Execution Engine
```typescript
// Core functionality
- sudo -u <user> claude --working-directory <path>
- User environment validation
- Claude CLI path detection per user
- Process isolation and security
```

#### 3. User Context Management
- **Per-User Authentication**: Each user has their own Claude API credentials
- **Project Isolation**: User-specific project directories
- **Configuration Management**: Individual Claude CLI configurations
- **History Segregation**: Separate conversation histories per user

### Implementation Strategy

#### Phase 1: User Discovery & Validation
- System user enumeration
- Claude CLI installation detection per user
- Permission validation
- Environment setup verification

#### Phase 2: Execution Engine
- `sudo -u` command wrapper implementation
- User context switching
- Process management and monitoring
- Security validation layer

#### Phase 3: Frontend Integration
- User selection interface
- Project management per user
- Status monitoring and feedback
- Error handling and user guidance

## 🎨 **Ultra Modern Design System**

### Technology Stack
- **Styling**: Tailwind CSS CDN + DaisyUI CDN
- **Custom CSS**: `design.css` for Ultra theme overrides
- **CDN Integration**: No build-time CSS compilation required
- **Theme System**: Light/Dark mode with smooth transitions

### Ultra Design Components
- **Glass Effects**: Backdrop blur and transparency
- **Gradient Animations**: Smooth color transitions
- **Micro-interactions**: Hover states and loading animations
- **Responsive Design**: Mobile-first responsive layout
- **Custom Scrollbars**: Styled scrollbar components
- **Typography**: Inter font with gradient text effects

## 🏛️ **System Architecture**

### Backend (Node.js/Deno)
- **Runtime Abstraction**: Universal Deno/Node.js compatibility
- **Hono Framework**: Lightweight web framework
- **Multi-User Execution**: `sudo -u` command integration
- **Security Layer**: User validation and permission checks
- **API-First Design**: RESTful endpoints with OpenAPI specs

### Frontend (React + Vite)
- **Modern React**: React 19 with concurrent features
- **Vite Build System**: Fast development and optimized builds
- **TypeScript**: Full type safety across the stack
- **Component Architecture**: Reusable UI components
- **State Management**: Custom hooks and context patterns
- **Real-time Updates**: WebSocket integration for live status

### Shared Types
- **Contract Definition**: Shared TypeScript interfaces
- **API Schemas**: Request/response type definitions
- **Multi-User Types**: User management type system
- **Validation Schemas**: Runtime type validation

## 🔧 **Development Environment**

### Prerequisites
- **System Access**: sudo permissions required
- **Multiple Users**: System users with home directories
- **Claude CLI**: Installed per user requiring Claude access
- **Node.js**: 20.0.0+ for development
- **Development Tools**: TypeScript, Vite, testing frameworks

### Environment Setup
```bash
# 1. Clone and setup
git clone <repository>
cd claude-code-webui
npm install

# 2. Configure environment
echo "PORT=8081" > .env
echo "MULTI_USER_MODE=true" >> .env

# 3. Start development servers
npm run dev:backend
npm run dev:frontend

# 4. Access application
# Frontend: https://coding.dannyac.com/
# Backend: http://localhost:8081/
```

### Multi-User Testing Environment
```bash
# Create test users (requires sudo)
sudo useradd -m testuser1
sudo useradd -m testuser2

# Install Claude CLI for test users
sudo -u testuser1 npm install -g @anthropic-ai/claude-code
sudo -u testuser2 npm install -g @anthropic-ai/claude-code

# Configure Claude credentials per user
sudo -u testuser1 claude auth
sudo -u testuser2 claude auth
```

## 📡 **API Specification**

### Multi-User Management APIs

#### User Management
```typescript
// GET /api/users
Response: {
  users: Array<{
    username: string
    uid: number
    homeDirectory: string
    claudeInstalled: boolean
    claudeVersion?: string
    lastAccess?: string
    projectCount: number
  }>
}

// GET /api/users/:username/status
Response: {
  username: string
  available: boolean
  claudeInstalled: boolean
  claudeVersion?: string
  claudeAuthenticated: boolean
  permissions: {
    homeDirectoryAccess: boolean
    sudoAccess: boolean
  }
  projects: string[]
}

// POST /api/users/:username/validate
Request: { /* validation parameters */ }
Response: {
  valid: boolean
  issues?: string[]
  recommendations?: string[]
}
```

#### Multi-User Chat API
```typescript
// POST /api/chat
Request: {
  message: string
  username: string           // Target user to execute as
  workingDirectory?: string  // User's project directory
  sessionId?: string
  requestId: string
  allowedTools?: string[]
  permissionMode?: 'normal' | 'plan'
}

Response: StreamResponse // Standard streaming response
```

#### Project Management per User
```typescript
// GET /api/users/:username/projects
Response: {
  projects: Array<{
    name: string
    path: string
    lastModified: string
    claudeHistory: boolean
    gitRepository: boolean
  }>
}
```

### Security & Validation
- **Input Sanitization**: All user inputs validated and sanitized
- **Command Injection Prevention**: Secure command construction
- **User Authorization**: Validate sudo access before execution
- **Path Traversal Protection**: Restrict access to user directories only
- **Rate Limiting**: Per-user and per-endpoint rate limits

## 🧪 **Testing Strategy**

### Unit Testing
- **Backend Logic**: API handlers and business logic
- **Frontend Components**: React component testing
- **Utility Functions**: Helper function validation
- **Type Safety**: TypeScript compilation testing

### Integration Testing
- **API Contract Testing**: Validate API specifications
- **Multi-User Scenarios**: Test user switching functionality
- **Permission Validation**: Security boundary testing
- **Error Handling**: Failure scenario testing

### End-to-End Testing
- **User Workflows**: Complete user journey testing
- **Multi-User Sessions**: Concurrent user testing
- **Browser Testing**: Cross-browser compatibility
- **Performance Testing**: Load testing and optimization

### Security Testing
- **Permission Escalation**: Test privilege boundaries
- **Input Validation**: Injection attack prevention
- **Authentication Testing**: User verification flows
- **Authorization Testing**: Access control validation

## 📊 **Monitoring & Logging**

### Application Monitoring
- **User Activity**: Track per-user Claude usage
- **Performance Metrics**: Response times and resource usage
- **Error Tracking**: Comprehensive error logging
- **Security Events**: Authentication and authorization logs

### System Health
- **Claude CLI Status**: Monitor Claude availability per user
- **System Resources**: CPU, memory, and disk usage
- **Network Monitoring**: API response times
- **Database Health**: If applicable for user data storage

## 🔐 **Security Considerations**

### User Isolation
- **Process Isolation**: Each Claude execution runs as target user
- **File System Permissions**: Respect system user boundaries
- **Environment Isolation**: Separate environment variables per user
- **Session Management**: Secure session handling per user

### System Security
- **Sudo Configuration**: Proper sudoers configuration
- **Input Validation**: Comprehensive input sanitization
- **Command Construction**: Secure command building
- **Audit Logging**: Complete audit trail for all operations

### Network Security
- **HTTPS Enforcement**: Secure communication protocols
- **CORS Configuration**: Proper cross-origin resource sharing
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Filtering**: Block malicious requests

## 📚 **Documentation Standards**

### Code Documentation
- **API Documentation**: OpenAPI/Swagger specifications
- **Component Documentation**: React component props and usage
- **Function Documentation**: JSDoc comments for all functions
- **Type Documentation**: TypeScript interface documentation

### User Documentation
- **Setup Guides**: Installation and configuration instructions
- **User Manuals**: Feature usage and workflows
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions and answers

## 🚀 **Deployment Strategy**

### Development Deployment
- **Local Development**: Vite dev server with hot reload
- **Staging Environment**: Production-like testing environment
- **Preview Deployments**: Branch-based preview environments
- **CI/CD Integration**: Automated testing and deployment

### Production Deployment
- **Container Deployment**: Docker-based production deployment
- **Reverse Proxy**: Nginx or similar for SSL termination
- **Process Management**: PM2 or similar for process monitoring
- **Backup Strategy**: Regular backups of user data and configurations

### Scaling Considerations
- **Horizontal Scaling**: Multiple backend instances
- **Load Balancing**: Distribute requests across instances
- **Caching Strategy**: Redis or similar for session caching
- **Database Clustering**: If user data persistence is required

## 📈 **Performance Optimization**

### Frontend Performance
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Service worker for offline capabilities
- **Image Optimization**: WebP and responsive images

### Backend Performance
- **Response Caching**: Cache frequently requested data
- **Connection Pooling**: Efficient database connections
- **Stream Processing**: Handle large Claude responses efficiently
- **Memory Management**: Prevent memory leaks in long-running processes

## 🔄 **Development Workflow**

### Feature Development Process
1. **API Design**: Define API endpoints and contracts
2. **Documentation**: Update CLAUDE.md with specifications
3. **Backend Implementation**: Implement API endpoints
4. **Frontend Development**: Create UI components
5. **Testing**: Comprehensive testing suite
6. **Documentation Update**: Update CLAUDE.md with changes
7. **Code Review**: Peer review and quality checks
8. **Deployment**: Staging and production deployment

### Quality Assurance
- **Code Standards**: ESLint and Prettier configuration
- **Type Safety**: TypeScript strict mode enforcement
- **Test Coverage**: Minimum test coverage requirements
- **Performance Budgets**: Performance regression prevention

## 📝 **Change Management**

### Version Control
- **Git Flow**: Feature branch development workflow
- **Conventional Commits**: Standardized commit message format
- **Semantic Versioning**: Clear version numbering strategy
- **Release Notes**: Comprehensive changelog maintenance

### Documentation Versioning
- **API Versioning**: Clear API version management
- **Documentation Updates**: Keep docs synchronized with code
- **Migration Guides**: Guide users through breaking changes
- **Deprecation Policy**: Clear deprecation and removal process

## 🎯 **Future Roadmap**

### Phase 1: Core Multi-User System
- User discovery and validation
- Basic multi-user execution engine
- Simple user selection interface
- Essential security measures

### Phase 2: Advanced Features
- Project management per user
- Conversation history segregation
- Performance monitoring and optimization
- Advanced security features

### Phase 3: Enterprise Features
- Role-based access control
- Audit logging and compliance
- API rate limiting and quotas
- Advanced deployment options

### Phase 4: Innovation & Integration
- AI-powered user recommendations
- Advanced workflow automation
- Third-party service integrations
- Mobile application development

---

**Last Updated**: 2025-08-27  
**Next Review**: After each major feature implementation  
**Document Owner**: Development Team  
**Status**: Living Document - Updated after each task completion