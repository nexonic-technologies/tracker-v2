import 'package:flutter/material.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import 'dart:io';

class FileViewerPage extends StatelessWidget {
  final String fileUrl;
  final String fileName;

  const FileViewerPage({
    super.key,
    required this.fileUrl,
    required this.fileName,
  });

  bool get _isImage =>
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.webp');

  bool get _isPdf => fileName.endsWith('.pdf');

  Future<void> _launchSystemViewer(BuildContext context) async {
    final uri = Uri.parse(fileUrl);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open file in system viewer')),
        );
      }
    } catch (e) {
      debugPrint("System viewer launch error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? Colors.black : Colors.white,
      appBar: AppBar(
        title: Text(fileName, style: const TextStyle(fontSize: 15)),
        backgroundColor: isDark ? Colors.grey[900] : Colors.grey[100],
        foregroundColor: isDark ? Colors.white : Colors.black,
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new_rounded),
            onPressed: () => _launchSystemViewer(context),
          ),
        ],
      ),
      body: SafeArea(child: _buildViewer(context)),
    );
  }

  Widget _buildViewer(BuildContext context) {
    if (_isImage) {
      return Center(
        child: InteractiveViewer(
          maxScale: 4.0,
          child: fileUrl.startsWith('http')
              ? CachedNetworkImage(
                  imageUrl: fileUrl,
                  placeholder: (context, url) => const Center(
                    child: CircularProgressIndicator(
                      color: AppColors.brandSolid,
                    ),
                  ),
                  errorWidget: (context, url, error) => const Center(
                    child: Text(
                      'Failed to load image',
                      style: TextStyle(color: Colors.red),
                    ),
                  ),
                )
              : Image.file(
                  File(fileUrl),
                  errorBuilder: (context, error, stackTrace) =>
                      const Center(child: Text('Failed to load local image')),
                ),
        ),
      );
    }

    if (_isPdf) {
      return fileUrl.startsWith('http')
          ? SfPdfViewer.network(fileUrl)
          : SfPdfViewer.file(File(fileUrl));
    }

    // Default fallback for office documents (xlsx, pptx, csv, docx, videos, audio)
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(_getFileIcon(fileName), size: 72, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              fileName,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'This file format cannot be viewed inside the app directly. Please open it in the system viewer.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6C3DE8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: () => _launchSystemViewer(context),
              icon: const Icon(Icons.open_in_new_rounded, color: Colors.white),
              label: const Text(
                'Open Externally',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getFileIcon(String name) {
    final lowerName = name.toLowerCase();
    if (lowerName.endsWith('.mp4') ||
        lowerName.endsWith('.avi') ||
        lowerName.endsWith('.mkv')) {
      return Icons.video_library_rounded;
    }
    if (lowerName.endsWith('.mp3') ||
        lowerName.endsWith('.wav') ||
        lowerName.endsWith('.aac') ||
        lowerName.endsWith('.m4a')) {
      return Icons.audiotrack_rounded;
    }
    if (lowerName.endsWith('.xlsx') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.csv')) {
      return Icons.table_chart_rounded;
    }
    if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) {
      return Icons.slideshow_rounded;
    }
    if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
      return Icons.description_rounded;
    }
    return Icons.insert_drive_file_rounded;
  }
}
