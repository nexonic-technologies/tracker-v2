class ApiConfig {
  static const String baseUrl = 'https://tracker-backend-qben.onrender.com/api';
  static const String socketUrl = 'wss://tracker-backend-qben.onrender.com';

  // Auth endpoints
  static const String login = '/auth/login';
  static const String googleLogin = '/auth/google';
  static const String logout = '/auth/logout';
  static const String storePushToken = '/auth/store-push-token';
  static const String getMe = '/auth/me';
  static const String refreshToken = '/auth/refresh';

  // Populate/CRUD endpoints
  static const String readTickets = '/populate/read/tickets';
  static const String createTicket = '/populate/create/tickets';
  static const String updateTicket = '/populate/update/tickets';

  // Tasks endpoints
  static const String readTasks = '/populate/read/tasks';
  static const String createTask = '/populate/create/tasks';
  static const String updateTask = '/populate/update/tasks';

  // Daily Tracker/Activities endpoints
  static const String readdaily_activities = '/populate/read/daily_activities';
  static const String createDailyActivity = '/populate/create/daily_activities';
  static const String updateDailyActivity = '/populate/update/daily_activities';

  // Client / Project types endpoints
  static const String readClients = '/populate/read/clients';
  static const String readtask_types = '/populate/read/task_types';

  // attendance
  static const String readAttanance = '/populate/read/attendance';
  static const String checkIn = 'populate/create/attendance';
  static const String checkOut = 'populate/update/attendance';

  // Network Timeout Configurations
  static const int connectTimeoutSeconds = 15;
  static const int receiveTimeoutSeconds = 15;
}
