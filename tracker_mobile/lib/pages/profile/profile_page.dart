import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../providers/auth_provider.dart';
import '../../providers/navigation_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/cached_avatar.dart';
import '../../services/api.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _taskAlerts = true;
  bool _ticketAlerts = true;
  bool _feedsAlerts = true;
  bool _approvalAlerts = true;
  bool _prefLoading = true;

  @override
  void initState() {
    super.initState();
    _loadnotification_preferences();
  }

  Future<void> _loadnotification_preferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (mounted) {
        setState(() {
          _taskAlerts = prefs.getBool('pref_task_alerts') ?? true;
          _ticketAlerts = prefs.getBool('pref_ticket_alerts') ?? true;
          _feedsAlerts = prefs.getBool('pref_feeds_alerts') ?? true;
          _approvalAlerts = prefs.getBool('pref_approval_alerts') ?? true;
          _prefLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _prefLoading = false);
    }
  }

  Future<void> _togglePref(String key, bool val) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, val);
      setState(() {
        if (key == 'pref_task_alerts') _taskAlerts = val;
        if (key == 'pref_ticket_alerts') _ticketAlerts = val;
        if (key == 'pref_feeds_alerts') _feedsAlerts = val;
        if (key == 'pref_approval_alerts') _approvalAlerts = val;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final nav = context.watch<NavigationProvider>();
    final user = auth.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final name = user?.name ?? 'User';
    final role = user?.role ?? user?.userType ?? 'Employee';
    final email = user?.workEmail ?? 'No email associated';
    final dept = user?.department ?? 'General';
    final desig = user?.designation ?? 'Team Member';

    final isAdminOrManager =
        role == 'superadmin' || user?.userType == 'manager';

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            // Profile Card Header
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  vertical: 24.0,
                  horizontal: 16.0,
                ),
                child: Column(
                  children: [
                    // Avatar
                    CachedAvatar(
                      name: name,
                      imageUrl: user?.profileImage,
                      radius: 46,
                    ),
                    const SizedBox(height: 16),

                    // Name
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkInk : AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),

                    // Designation tag
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brandSolid.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        desig,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.brandSolid,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () =>
                          _showEditProfileModal(context, user, isDark),
                      icon: const Icon(Icons.edit_outlined, size: 16),
                      label: const Text('Edit Profile'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.brandSolid,
                        side: const BorderSide(color: AppColors.brandSolid),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Profile info details list
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildInfoTile(
                      context,
                      Icons.mail_outline_rounded,
                      'Work Email',
                      email,
                      isDark,
                    ),
                    const Divider(height: 24),
                    _buildInfoTile(
                      context,
                      Icons.business_rounded,
                      'Department',
                      dept,
                      isDark,
                    ),
                    const Divider(height: 24),
                    _buildInfoTile(
                      context,
                      Icons.shield_outlined,
                      'System Role',
                      role,
                      isDark,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Notification preferences settings
            if (!_prefLoading) ...[
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: isDark ? AppColors.darkBorder : AppColors.border,
                  ),
                ),
                color: isDark ? AppColors.darkSurface0 : Colors.white,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Notification Alerts',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark
                              ? AppColors.darkInkSubtle
                              : AppColors.inkSubtle,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildSwitchTile(
                        'Task Assignments',
                        _taskAlerts,
                        Icons.task_alt_rounded,
                        (val) {
                          _togglePref('pref_task_alerts', val);
                        },
                        isDark,
                      ),
                      const Divider(height: 16),
                      _buildSwitchTile(
                        'Ticket Updates',
                        _ticketAlerts,
                        Icons.confirmation_number_outlined,
                        (val) {
                          _togglePref('pref_ticket_alerts', val);
                        },
                        isDark,
                      ),
                      const Divider(height: 16),
                      _buildSwitchTile(
                        'Company Feeds',
                        _feedsAlerts,
                        Icons.feed_outlined,
                        (val) {
                          _togglePref('pref_feeds_alerts', val);
                        },
                        isDark,
                      ),
                      if (isAdminOrManager) ...[
                        const Divider(height: 16),
                        _buildSwitchTile(
                          'Leave Requests & Approvals',
                          _approvalAlerts,
                          Icons.assignment_turned_in_outlined,
                          (val) {
                            _togglePref('pref_approval_alerts', val);
                          },
                          isDark,
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // General Settings Card (Theme Toggle)
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(
                  color: isDark ? AppColors.darkBorder : AppColors.border,
                ),
              ),
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    // Theme Toggle
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(
                        isDark
                            ? Icons.dark_mode_rounded
                            : Icons.light_mode_rounded,
                        color: AppColors.brandSolid,
                      ),
                      title: Text(
                        'Dark Theme Mode',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkInk : AppColors.ink,
                        ),
                      ),
                      trailing: Switch(
                        value: isDark,
                        onChanged: (val) {
                          nav.toggleTheme();
                        },
                        activeThumbColor: AppColors.brandSolid,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Logout Button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => auth.logout(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Logout'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchTile(
    String label,
    bool value,
    IconData icon,
    ValueChanged<bool> onChanged,
    bool isDark,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      leading: Icon(icon, size: 20, color: AppColors.brandSolid),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: isDark ? AppColors.darkInk : AppColors.ink,
        ),
      ),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeThumbColor: AppColors.brandSolid,
      ),
    );
  }

  Widget _buildInfoTile(
    BuildContext context,
    IconData icon,
    String label,
    String value,
    bool isDark,
  ) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
        ),
        const SizedBox(width: 14),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkInk : AppColors.ink,
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _showEditProfileModal(BuildContext context, dynamic user, bool isDark) {
    final nameController = TextEditingController(text: user?.name ?? '');
    final emailController = TextEditingController(text: user?.workEmail ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (modalContext) {
        return Padding(
          padding: EdgeInsets.only(
            top: 24,
            left: 24,
            right: 24,
            bottom: MediaQuery.of(modalContext).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Edit Profile',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkInk : AppColors.ink,
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Display Name',
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(
                  labelText: 'Work Email',
                  isDense: true,
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandSolid,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () async {
                    try {
                      final userId = user?.id;
                      if (userId != null && userId.toString().isNotEmpty) {
                        await ApiService()
                            .updateModel('employees', userId.toString(), {
                              'name': nameController.text.trim(),
                              'authInfo.workEmail': emailController.text.trim(),
                            });
                      }
                      if (context.mounted) {
                        context.read<AuthProvider>().checkAuthStatus();
                        Navigator.pop(modalContext);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Profile updated successfully!'),
                          ),
                        );
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Failed to update profile'),
                          ),
                        );
                      }
                    }
                  },
                  child: const Text(
                    'Save Changes',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
