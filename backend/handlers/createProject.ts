/**
 * Project creation handler for authenticated users
 * Creates new projects with proper user permissions and CLAUDE.md template
 */

import { Context } from "hono";
import type { ConfigContext, User } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { spawn } from "child_process";
import { writeFile, mkdir, access, readFile } from "fs/promises";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";

interface CreateProjectRequest {
  name: string;
  path: string;
}

interface ValidatePathRequest {
  path: string;
}

/**
 * Default CLAUDE.md template for new projects
 */
const getCLAUDE_MD_TEMPLATE = (projectName: string, projectPath: string, username: string) => `# ${projectName}

> **Project Path**: ${projectPath}  
> **Created**: ${new Date().toISOString().split('T')[0]}  
> **User**: ${username}

## 📋 **CLAUDE.md Maintenance Protocol**

> **CRITICAL REQUIREMENT**: After completing each development task, Claude Code must:
> 1. **READ** this CLAUDE.md file completely
> 2. **UPDATE** relevant sections with new functionality 
> 3. **OPTIMIZE** documentation structure and clarity
> 4. **TEST** that all documented features work as described
> 5. **COMMIT** changes with clear documentation updates
>
> This ensures CLAUDE.md remains the authoritative source of truth for the project.

## 🏗️ **Project Overview**

### Purpose
[Describe the main purpose and goals of this project]

### Key Features
- [List main features and capabilities]
- [Add items as they are implemented]

## 🔧 **Development Guidelines**

### Security First
- Input validation and sanitization
- Proper authentication and authorization
- Secure data handling and storage
- Regular security audits and updates

### Performance & Speed
- Optimize for fast load times
- Efficient algorithms and data structures
- Minimize resource usage
- Profile and monitor performance

### Ultra-Modern UI Design
- Clean, minimalist aesthetics
- Glassmorphism and modern visual effects
- Responsive design for all devices
- Smooth animations and micro-interactions
- Accessibility-first approach

## 📁 **Project Structure**

\`\`\`
project-root/
├── CLAUDE.md           # This documentation file
├── README.md           # User-facing documentation
├── src/               # Source code
├── docs/              # Additional documentation
├── tests/             # Test files
└── config/            # Configuration files
\`\`\`

## 🚀 **Getting Started**

### Prerequisites
- [List required software and versions]
- [Include installation instructions]

### Installation
\`\`\`bash
# Clone the repository
git clone [repository-url]

# Install dependencies
[installation commands]

# Start development server
[start commands]
\`\`\`

## 🔄 **Development Workflow**

1. **Planning**: Review requirements and update this documentation
2. **Implementation**: Write code following security and performance guidelines
3. **Testing**: Ensure all functionality works as documented
4. **Documentation**: Update CLAUDE.md with changes
5. **Review**: Verify documentation accuracy
6. **Commit**: Save changes with descriptive commit messages

## 📚 **API Documentation**

### Endpoints
[Document API endpoints as they are created]

### Authentication
[Document authentication requirements and methods]

### Error Handling
[Document error responses and handling]

## 🧪 **Testing Strategy**

### Test Types
- Unit tests for individual components
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Security testing for vulnerabilities

### Running Tests
\`\`\`bash
# Run all tests
[test command]

# Run specific test suite
[specific test commands]
\`\`\`

## 🔒 **Security Considerations**

### Authentication & Authorization
- [Document security measures]
- [List security requirements]

### Data Protection
- [Document data handling procedures]
- [List privacy considerations]

## 📊 **Performance Monitoring**

### Metrics
- [List key performance indicators]
- [Document monitoring tools]

### Optimization
- [Document optimization strategies]
- [List performance requirements]

## 🎨 **Design System**

### Visual Guidelines
- Color palette and theming
- Typography and spacing
- Component design patterns
- Animation and interaction guidelines

### UI Components
[Document reusable UI components as they are created]

## 📝 **Change Log**

### [Version] - [Date]
- [List changes and improvements]
- [Document new features]
- [Note bug fixes and optimizations]

---

**Last Updated**: ${new Date().toISOString().split('T')[0]}  
**Next Review**: After each major feature implementation  
**Document Owner**: Development Team  
**Status**: Living Document - Updated after each task completion

## 🎯 **Current Task Progress**

### In Progress
- [List current development tasks]

### Completed
- [List completed features and tasks]

### Planned
- [List upcoming features and improvements]

---

*This CLAUDE.md file is automatically maintained by Claude Code and should be updated after each development session.*
`;

/**
 * Validate if a path is accessible by the authenticated user
 */
async function validateUserPath(path: string, user: User): Promise<{ valid: boolean; exists: boolean; message: string }> {
  try {
    // Resolve the path to prevent directory traversal
    const resolvedPath = resolve(path);
    
    // Check if path is within user's home directory or accessible locations
    const userHome = user.homeDirectory;
    if (!resolvedPath.startsWith(userHome)) {
      return {
        valid: false,
        exists: false,
        message: "Path must be within your home directory for security reasons"
      };
    }

    // Check if parent directory is accessible
    const parentDir = dirname(resolvedPath);
    
    try {
      await access(parentDir);
      
      // Check if target path already exists
      const exists = existsSync(resolvedPath);
      
      return {
        valid: true,
        exists,
        message: exists ? "Directory already exists" : "Path is valid and accessible"
      };
    } catch (error) {
      // Parent directory doesn't exist or isn't accessible
      return {
        valid: false,
        exists: false,
        message: "Parent directory is not accessible or doesn't exist"
      };
    }
  } catch (error) {
    logger.project.error("Error validating path: {error}", { error });
    return {
      valid: false,
      exists: false,
      message: "Invalid path format"
    };
  }
}

/**
 * Create directory with proper user permissions
 */
async function createDirectoryAsUser(path: string, user: User): Promise<boolean> {
  try {
    // Create directory recursively
    await mkdir(path, { recursive: true, mode: 0o755 });
    
    // Set ownership to the authenticated user using chown
    return new Promise((resolve, reject) => {
      const child = spawn('chown', [user.username, path], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stderr = '';

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.project.info("Successfully set ownership of {path} to user {username}", { 
            path, 
            username: user.username 
          });
          resolve(true);
        } else {
          logger.project.error("Failed to set ownership: {stderr}", { stderr });
          resolve(false);
        }
      });

      child.on('error', (error) => {
        logger.project.error("Error setting ownership: {error}", { error });
        reject(error);
      });
    });
  } catch (error) {
    logger.project.error("Error creating directory: {error}", { error });
    return false;
  }
}

/**
 * Handle path validation request
 */
export async function handleValidatePathRequest(c: Context<ConfigContext>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const body = await c.req.json() as ValidatePathRequest;
    const { path } = body;

    if (!path || !path.trim()) {
      return c.json({ error: "Path is required" }, 400);
    }

    const validation = await validateUserPath(path.trim(), user);
    
    return c.json({
      valid: validation.valid,
      exists: validation.exists,
      message: validation.message,
    });
  } catch (error) {
    logger.project.error("Path validation error: {error}", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
}

/**
 * Handle project creation request
 */
export async function handleCreateProjectRequest(c: Context<ConfigContext>) {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    const body = await c.req.json() as CreateProjectRequest;
    const { name, path } = body;

    if (!name || !name.trim()) {
      return c.json({ error: "Project name is required" }, 400);
    }

    if (!path || !path.trim()) {
      return c.json({ error: "Project path is required" }, 400);
    }

    const cleanPath = path.trim();
    const cleanName = name.trim();

    logger.project.info("Creating project {name} at {path} for user {username}", {
      name: cleanName,
      path: cleanPath,
      username: user.username,
    });

    // Validate path
    const validation = await validateUserPath(cleanPath, user);
    if (!validation.valid) {
      return c.json({ error: validation.message }, 400);
    }

    // Check if directory already exists and has content
    if (validation.exists) {
      try {
        const claudeMdPath = join(cleanPath, 'CLAUDE.md');
        await access(claudeMdPath);
        return c.json({ error: "Project already exists at this location" }, 409);
      } catch {
        // CLAUDE.md doesn't exist, we can proceed
      }
    }

    // Create directory
    const dirCreated = await createDirectoryAsUser(cleanPath, user);
    if (!dirCreated) {
      return c.json({ error: "Failed to create project directory" }, 500);
    }

    // Create CLAUDE.md file with project-specific template
    const claudeMdContent = getCLAUDE_MD_TEMPLATE(cleanName, cleanPath, user.username);

    const claudeMdPath = join(cleanPath, 'CLAUDE.md');
    
    try {
      await writeFile(claudeMdPath, claudeMdContent, { mode: 0o644 });
      logger.project.info("Created CLAUDE.md file at {path}", { path: claudeMdPath });
    } catch (error) {
      logger.project.error("Failed to create CLAUDE.md: {error}", { error });
      return c.json({ error: "Failed to create CLAUDE.md file" }, 500);
    }

    // Set ownership of CLAUDE.md file
    await new Promise<void>((resolve) => {
      const child = spawn('chown', [user.username, claudeMdPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      child.on('close', () => resolve());
      child.on('error', () => resolve()); // Continue even if chown fails
    });

    logger.project.info("Successfully created project {name} for user {username}", {
      name: cleanName,
      username: user.username,
    });

    return c.json({
      message: "Project created successfully",
      project: {
        name: cleanName,
        path: cleanPath,
        claudeMdCreated: true,
      },
    });

  } catch (error) {
    logger.project.error("Project creation error: {error}", { error });
    return c.json({ error: "Internal server error" }, 500);
  }
}