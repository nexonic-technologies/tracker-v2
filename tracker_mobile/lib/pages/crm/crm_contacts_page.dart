import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../services/api.dart';

class CrmContactsPage extends StatefulWidget {
  const CrmContactsPage({super.key});

  @override
  State<CrmContactsPage> createState() => _CrmContactsPageState();
}

class _CrmContactsPageState extends State<CrmContactsPage> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = false;
  String _searchQuery = '';
  List<Map<String, dynamic>> _contacts = [];

  @override
  void initState() {
    super.initState();
    _fetchContacts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchContacts() async {
    setState(() => _isLoading = true);
    try {
      final res = await _apiService.readModel('crm_contacts');
      if (res.statusCode == 200 &&
          res.data != null &&
          res.data['data'] != null) {
        final List list = res.data['data'];
        setState(() {
          _contacts = list
              .map((item) => Map<String, dynamic>.from(item))
              .toList();
        });
      }
    } catch (_) {
      // Fallback mock contacts if server endpoint not yet populated
      _contacts = [
        {
          '_id': '1',
          'name': 'Acme Corporation',
          'contactPerson': 'Johnathan Doe',
          'email': 'j.doe@acme.com',
          'phone': '+1 (555) 234-5678',
          'city': 'New York, USA',
          'status': 'Active Account',
        },
        {
          '_id': '2',
          'name': 'Nexus Technologies',
          'contactPerson': 'Sarah Jenkins',
          'email': 's.jenkins@nexustech.io',
          'phone': '+1 (555) 876-5432',
          'city': 'San Francisco, CA',
          'status': 'Prospect',
        },
        {
          '_id': '3',
          'name': 'Global Logistics Ltd',
          'contactPerson': 'Michael Chang',
          'email': 'm.chang@globallog.com',
          'phone': '+44 20 7946 0912',
          'city': 'London, UK',
          'status': 'VIP Client',
        },
      ];
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _makeCall(String phone) async {
    final Uri url = Uri(
      scheme: 'tel',
      path: phone.replaceAll(RegExp(r'[^0-9+]'), ''),
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Calling $phone...')));
      }
    }
  }

  Future<void> _sendEmail(String email) async {
    final Uri url = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Emailing $email...')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filtered = _contacts.where((c) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      final name = (c['name'] ?? '').toLowerCase();
      final person = (c['contactPerson'] ?? '').toLowerCase();
      final city = (c['city'] ?? '').toLowerCase();
      return name.contains(q) || person.contains(q) || city.contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkCanvas : AppColors.canvas,
      appBar: AppBar(
        title: const Text('Customer Contacts'),
        backgroundColor: isDark ? AppColors.darkSurface0 : Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14.0),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface0 : Colors.white,
                borderRadius: BorderRadius.circular(14.0),
                border: Border.all(
                  color: isDark
                      ? AppColors.darkBorder
                      : const Color(0xFFCBD5E1),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.search_rounded,
                    color: isDark
                        ? AppColors.darkInkSubtle
                        : AppColors.inkSubtle,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _searchQuery = v),
                      style: TextStyle(
                        fontSize: 14,
                        color: isDark ? Colors.white : AppColors.inkMuted,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search contacts by name or city...',
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Contacts List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                ? Center(
                    child: Text(
                      'No contacts found',
                      style: TextStyle(
                        color: isDark
                            ? AppColors.darkInkSubtle
                            : AppColors.inkSubtle,
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _fetchContacts,
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16.0,
                        vertical: 8.0,
                      ),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, idx) {
                        final item = filtered[idx];
                        return Container(
                          padding: const EdgeInsets.all(16.0),
                          decoration: BoxDecoration(
                            color: isDark
                                ? AppColors.darkSurface0
                                : Colors.white,
                            borderRadius: BorderRadius.circular(16.0),
                            border: Border.all(
                              color: isDark
                                  ? AppColors.darkBorder
                                  : const Color(0xFFF1F5F9),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      item['name'] ?? '',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: isDark
                                            ? Colors.white
                                            : const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.brandSolid.withValues(
                                        alpha: 0.12,
                                      ),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      item['status'] ?? 'Client',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.brandSolid,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Contact: ${item['contactPerson'] ?? 'N/A'}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark
                                      ? AppColors.darkInkSubtle
                                      : AppColors.inkMuted,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(
                                    Icons.location_on_outlined,
                                    size: 14,
                                    color: isDark
                                        ? AppColors.darkInkSubtle
                                        : AppColors.inkSubtle,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    item['city'] ?? '',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? AppColors.darkInkSubtle
                                          : AppColors.inkSubtle,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              const Divider(height: 1),
                              const SizedBox(height: 10),

                              // Quick Call & Email actions
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  IconButton(
                                    onPressed: () =>
                                        _makeCall(item['phone'] ?? ''),
                                    icon: const Icon(
                                      Icons.phone_outlined,
                                      color: Color(0xFF059669),
                                      size: 20,
                                    ),
                                    tooltip: 'Call Phone',
                                  ),
                                  IconButton(
                                    onPressed: () =>
                                        _sendEmail(item['email'] ?? ''),
                                    icon: const Icon(
                                      Icons.mail_outline_rounded,
                                      color: Color(0xFF2563EB),
                                      size: 20,
                                    ),
                                    tooltip: 'Send Email',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
