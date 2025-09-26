## Phase 1: Beta Launch
- [x] Sidebar navigation with tables
  - [x] Tables appear under databases
  - [x] Tables are reactive to schema changes
  - [x] Databases open to show tables automatically when selected
- [ ] Table data editing 
  - [x] Figure out the primary key situation -
        There a 'secret primary' key like "_id" that's used, so users can change the primary key without losing rows
  - [ ] Row creation, editing, canceling.
  - [ ] Row creation, editing, saving. 
  - [ ] Existing row editing, canceling.
  - [ ] Existing row editing, saving. 
  - [ ] Row deletion (1 by 1) with confirm / cancel
  - [ ] Row deletion by selection, with confirm / cancel
- [ ] Schema editor
  - [ ] Auto-save ONLY when users edit table position or name, OR create new tables.
  - [ ] When creating/editing/deleting columns, require manual save + confirmation. Describe + perform row alterations.
  - [ ] When deleting tables, require confirmation. Describe # of rows lost.
  - [ ] Allow updating database names, deleting databases.
- [ ] Basic API keys
  - [ ] API key generation and access per database.
  - [ ] API requirement for API calls - ensure all site functions still work. 
- [ ] Schema validation
  - [ ] All tables need a primary key. 
  - [ ] Primary keys must be required.
  - [ ] Primary keys can't be foreign keys. 
  - [ ] Table names & column names can't be blank. 
  - [ ] Table names within a database must be unique. 
  - [ ] Column names within a table must be unique. 

## Phase 2: API Platform  
- [ ] Public API routes
- [ ] Documentation
- [ ] Domain restrictions

## Phase 3: Growth
- [ ] Examples & tutorials
- [ ] Advanced features
- [ ] Full accessibility






# Use cases
- The side bar, which currently lists all the user's databases, should also list all the tables in each each database, in a collapsable list. Each table is a link to that table's page. 
- On a table's page, the user can see and edit rows for that table. This will be implemented in `pages/database/[databaseId]/table/[tableId].vue`
- There will be a user settings page, where users can update their username and password. 
- On each database's page (the schema editor?), the database name needs to be editable. And databases need to be deletable.
- Each user should have an API key generated (or maybe one per database?). The API needs to be updated to require the API key for all transactions.
- API routes should be set up, so users can use their API key to CRUD information from DataPantry on their own websites. These will be documented on a page titled "How to Use" or maybe "Docs"
- Maybe databases should be configurable, so only API calls from certain domains are allowed. 
- There should be an "Examples" page, with at least one basic website that uses most of DataPantry's features (a basic blog, with comment sections, maybe)

# Accessibility
- There should be a solution to responsive design, even if it's just displaying a screen saying "The schema editor currently requires a larger screen"
- Other accessibility concerns, like screen readers, should be addressed

# Data validation
- Data needs validated, especially on the schema editor. No duplicate table names, all tables need a PK, etc. 

# Testing
- Unit and E2E testing for the whole site, I think?


🎯 Priority Analysis for Beta Launch:

## High Priority (Essential for Beta):
 - Sidebar with collapsible tables - Core navigation UX
 - Table data editing page - The other half of the core functionality
 - Database name editing/deletion - Basic CRUD completeness
 - Basic API key system - Makes it actually usable as a service
 - Simple responsive message - "Requires desktop" is totally fine for beta
 - Basic validation - No duplicate names, PK requirements

## Medium Priority (Post-Beta):
 - User settings page - Nice to have but not blocking
 - Domain restrictions - Security enhancement
 - Public API routes - The real value proposition
 - Documentation page - Essential for adoption

## Lower Priority (Future):
 - Examples page - Great for marketing but not essential
 - Full accessibility - Important but can be iterative
 - Comprehensive testing - Build as you go

🆕 Missing Considerations:
 - Authentication persistence - Session expiration handling
 - Error boundaries - Graceful failure handling
 - Data export - Users will want to back up their schemas
 - Billing/usage limits - Even for beta, you'll want some limits
 - Onboarding flow - First-time user experience