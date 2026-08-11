---
trigger: always_on
description: Use the Graphify knowledge graph to answer architecture, dependency, debugging, authentication, navigation, and security questions.
---
# Graphify Skill Configuration

## Skill Name

graphify-code-intelligence

## Purpose

Use the Graphify knowledge graph to answer architecture, dependency, debugging, authentication, navigation, and security questions about the Tracker codebase.

## Graph Location

E:\Loigmax\Tracker\graphify-out\graph.json

## Instructions

Before answering codebase-related questions:

1. Read and analyze:
   E:\Loigmax\Tracker\graphify-out\graph.json

2. Use the graph relationships to:

   * trace dependencies
   * understand architecture
   * identify authentication flow
   * inspect API relationships
   * analyze navigation
   * detect security risks
   * identify affected components

3. Prefer graph traversal over scanning the entire repository.

4. Use graph node relationships such as:

   * calls
   * imports_from
   * contains
   * references
   * implements

5. When answering:

   * explain connected modules
   * identify impacted files
   * summarize architectural flow
   * mention related components

6. For debugging:

   * trace upstream dependencies
   * trace downstream effects
   * identify shared hooks/services
   * inspect API usage chains

7. For security analysis:

   * inspect JWT/token storage
   * analyze protected routes
   * inspect AsyncStorage usage
   * inspect axios interceptors
   * inspect logout/session invalidation
   * inspect permission handling

8. If graph data is insufficient:

   * fallback to direct repository analysis.

## Important Paths

Authentication:

* App/app/(authRoute)
* App/app/(protectedRoute)

API Layer:

* App/api/axiosInstance.js

Hooks:

* App/hooks

Components:

* App/components

Task Module:

* App/app/(protectedRoute)/tasks

## Example Queries

* How does authentication work?
* Which APIs affect task assignment?
* Where is AsyncStorage used?
* What breaks if axiosInstance changes?
* Which screens bypass auth protection?
* Trace AddTask flow.
* Find possible security weaknesses.
