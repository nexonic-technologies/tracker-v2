import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../crm/crm_contacts_page.dart';

class CrmTab extends StatefulWidget {
  const CrmTab({super.key});

  @override
  State<CrmTab> createState() => _CrmTabState();
}

class _CrmTabState extends State<CrmTab> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final List<Map<String, dynamic>> crmModules = [
      {
        'category': 'SALES & PIPELINE',
        'title': 'Leads & Deals Pipeline',
        'subtitle': 'Manage customer deals, stages & values',
        'icon': Icons.trending_up_rounded,
        'color': const Color(0xFF2563EB),
        'bgColor': const Color(0xFFEFF6FF),
        'capability': 'CRM:view',
      },
      {
        'category': 'SALES & PIPELINE',
        'title': 'Customer Contacts',
        'subtitle': 'Client directory, phone, email & location pins',
        'icon': Icons.contacts_outlined,
        'color': const Color(0xFF0D9488),
        'bgColor': const Color(0xFFF0FDF4),
        'capability': 'CRM:view',
      },
      {
        'category': 'FIELD & VISITS',
        'title': 'Customer Visits & Check-Ins',
        'subtitle': 'Log client meetings, GPS check-in & notes',
        'icon': Icons.pin_drop_outlined,
        'color': const Color(0xFFE11D48),
        'bgColor': const Color(0xFFFFE4E6),
        'capability': 'CRM:view',
      },
      {
        'category': 'ORDERS & PAYMENTS',
        'title': 'Quotations & Sales Orders',
        'subtitle': 'View pending quotes & customer orders',
        'icon': Icons.description_outlined,
        'color': const Color(0xFF7C3AED),
        'bgColor': const Color(0xFFF5F3FF),
        'capability': 'CRM:view',
      },
      {
        'category': 'ORDERS & PAYMENTS',
        'title': 'Payment Collections',
        'subtitle': 'Track overdue payments & receipts',
        'icon': Icons.payments_outlined,
        'color': const Color(0xFFD97706),
        'bgColor': const Color(0xFFFFFBEB),
        'capability': 'CRM:view',
      },
    ];

    final filteredCrmModules = crmModules.where((item) {
      final cap = item['capability'] as String?;
      if (cap != null && !auth.hasCapability(cap)) return false;

      if (_searchQuery.isNotEmpty) {
        final title = (item['title'] as String).toLowerCase();
        final subtitle = (item['subtitle'] as String).toLowerCase();
        final q = _searchQuery.toLowerCase();
        return title.contains(q) || subtitle.contains(q);
      }
      return true;
    }).toList();

    final Map<String, List<Map<String, dynamic>>> groupedCrm = {};
    for (var mod in filteredCrmModules) {
      final cat = mod['category'] as String;
      groupedCrm.putIfAbsent(cat, () => []).add(mod);
    }

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14.0),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkSurface0 : Colors.white,
              borderRadius: BorderRadius.circular(14.0),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : const Color(0xFFCBD5E1),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Icon(
                  Icons.search_rounded,
                  color: isDark ? AppColors.darkInkSubtle : AppColors.inkSubtle,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => setState(() => _searchQuery = val),
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white : AppColors.inkMuted,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Search leads, contacts, orders...',
                      hintStyle: TextStyle(
                        fontSize: 14,
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkSubtle,
                      ),
                      border: InputBorder.none,
                    ),
                  ),
                ),
                if (_searchQuery.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                    child: Icon(
                      Icons.cancel_rounded,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                      size: 20,
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          if (groupedCrm.isEmpty) ...[
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Column(
                  children: [
                    Icon(
                      Icons.work_off_outlined,
                      size: 48,
                      color: isDark
                          ? AppColors.darkInkSubtle
                          : AppColors.inkSubtle,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No CRM capabilities or records found',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            for (var entry in groupedCrm.entries) ...[
              Text(
                entry.key,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: isDark
                      ? AppColors.darkInkSubtle
                      : AppColors.inkTertiary,
                ),
              ),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: entry.value.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, idx) {
                  final item = entry.value[idx];
                  return InkWell(
                    onTap: () {
                      if (item['title'] == 'Customer Contacts') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const CrmContactsPage(),
                          ),
                        );
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              '${item['title']} feature opening...',
                            ),
                          ),
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(16.0),
                    child: Container(
                      padding: const EdgeInsets.all(14.0),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface0 : Colors.white,
                        borderRadius: BorderRadius.circular(16.0),
                        border: Border.all(
                          color: isDark
                              ? AppColors.darkBorder
                              : const Color(0xFFF1F5F9),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: isDark
                                  ? (item['color'] as Color).withValues(
                                      alpha: 0.18,
                                    )
                                  : (item['bgColor'] as Color),
                              borderRadius: BorderRadius.circular(12.0),
                            ),
                            child: Center(
                              child: Icon(
                                item['icon'] as IconData,
                                color: item['color'] as Color,
                                size: 22,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'] as String,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: isDark
                                        ? Colors.white
                                        : const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  item['subtitle'] as String,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isDark
                                        ? AppColors.darkInkSubtle
                                        : AppColors.inkSubtle,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.chevron_right_rounded,
                            color: isDark
                                ? AppColors.darkInkSubtle
                                : AppColors.inkTertiary,
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),
            ],
          ],
        ],
      ),
    );
  }
}
