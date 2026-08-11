# Registry Functions Documentation

This directory contains all registry functions used in the access control policies. Each registry function implements specific business logic for determining access permissions.

## Available Registries

### 1. `isSelf`
**Purpose**: Checks if the current user is accessing their own record
**Use Cases**: 
- Employee updating their own profile
- User viewing their own attendance records
- Employee creating their own daily activities

**Logic**: Matches user ID with record's `_id`, `employeeId`, `userId`, or `createdBy`

### 2. `isRef`
**Purpose**: Allows reference access to basic employee information
**Use Cases**:
- Dropdown lists for employee selection
- Contact information display
- Team member references

**Logic**: Returns true for any authenticated user (basic reference data)

### 3. `isTeamMember`
**Purpose**: Checks if the record belongs to a team member under current user's management
**Use Cases**:
- Manager viewing team member profiles
- Manager approving team member leaves
- Manager accessing team attendance records

**Logic**: Matches user ID with record's `reportingManager` or `teamLead`

### 4. `isAssigned`
**Purpose**: Checks if the current user is assigned to a task
**Use Cases**:
- Employee viewing assigned tasks
- Employee updating task progress
- Task status updates

**Logic**: Matches user ID with record's `assignedTo` (single or array)

### 5. `isRecipient`
**Purpose**: Checks if the current user is the recipient of a notification
**Use Cases**:
- User viewing their notifications
- Marking notifications as read
- Notification access control

**Logic**: Matches user ID with record's `recipient`, `recipients`, or `recipientId`

### 6. `isSender`
**Purpose**: Checks if the current user is the sender of a notification/message
**Use Cases**:
- User viewing sent notifications
- Message thread access
- Communication history

**Logic**: Matches user ID with record's `sender`, `senderId`, or `createdBy`

### 7. `isCreatedBy`
**Purpose**: Checks if the current user created the record
**Use Cases**:
- Task creator permissions
- Document ownership
- Record modification rights

**Logic**: Matches user ID with record's `createdBy`, `assignedBy`, or `author`

### 8. `isHR`
**Purpose**: Checks if the current user has HR role
**Use Cases**:
- HR-specific permissions
- Employee management access
- Administrative functions

**Logic**: Matches user role with HR role ID (`68d8b980f397d1d97620ba96`)

### 9. `isManager`
**Purpose**: Checks if the current user has Manager role
**Use Cases**:
- Manager-specific permissions
- Team management access
- Approval workflows

**Logic**: Matches user role with Manager role ID (`68d8b8caf397d1d97620ba93`)

### 10. `populateRef`
**Purpose**: Existing function for reference population
**Use Cases**: Data population and reference handling

## Usage in Access Policies

Registry functions are referenced in the access policies JSON:

```json
{
  "registry": ["isSelf", "isTeamMember"],
  "conditions": {
    "read": [
      {
        "registry": "isSelf",
        "effect": "allow"
      },
      {
        "registry": "isTeamMember",
        "fields": ["basicInfo", "professionalInfo"],
        "effect": "allow"
      }
    ]
  }
}
```

## Function Signature

All registry functions follow this signature:
```javascript
function registryName(user, record, context = {}) {
  // user: Current authenticated user object
  // record: The data record being accessed
  // context: Additional context data (optional)
  // Returns: boolean (true = allow, false = deny)
}
```

## Role IDs Reference

- **Employee**: `68d8b98af397d1d97620ba97`
- **HR**: `68d8b980f397d1d97620ba96`
- **Manager**: `68d8b8caf397d1d97620ba93`
- **SuperAdmin**: `68d8b94ef397d1d97620ba94`

## Adding New Registries

1. Create a new file in this directory
2. Export a default function with the standard signature
3. Add the import and export to `index.js`
4. Update this documentation
5. Test with appropriate access policies