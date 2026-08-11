export default {
  "Employee": {
    "create": {
      "allowed": true,
      "conditions": {
        "employee": "{{userId}}"
      }
    },
    "read": {
      "allowed": true,
      "conditions": {
        "employee": "{{userId}}"
      }
    },
    "update": {
      "allowed": true,
      "conditions": {
        "employee": "{{userId}}"
      }
    },
    "delete": {
      "allowed": true,
      "conditions": {
        "employee": "{{userId}}"
      }
    }
  },
  "HR": {
    "create": {
      "allowed": true
    },
    "read": {
      "allowed": true
    },
    "update": {
      "allowed": true
    },
    "delete": {
      "allowed": true
    }
  },
  "Manager": {
    "create": {
      "allowed": true
    },
    "read": {
      "allowed": true
    },
    "update": {
      "allowed": true
    },
    "delete": {
      "allowed": true
    }
  }
};