import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFFFDFBF7);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceTint = Color(0xFFF7F2E8);
  static const primary = Color(0xFF4A7882);
  static const primaryBright = Color(0xFF1FA1C3);
  static const accent = Color(0xFF7B9B78);
  static const accentSoft = Color(0xFFEEF3EE);
  static const warning = Color(0xFFD97B66);
  static const text = Color(0xFF2C2925);
  static const muted = Color(0xFF948F87);
  static const border = Color(0xFFEAE6DF);
  static const lightBlue = Color(0xFFDDF0F7);
}

class AppTheme {
  static const double cardRadius = 24;
  static const double inputRadius = 16;
  static const double pillRadius = 999;

  static ThemeData buildTheme() {
    final base = ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.warning,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.text,
        onError: Colors.white,
      ),
    );

    return base.copyWith(
      textTheme: base.textTheme.copyWith(
        displayLarge: _heading(34),
        displayMedium: _heading(30),
        displaySmall: _heading(26),
        headlineLarge: _heading(32),
        headlineMedium: _heading(28),
        headlineSmall: _heading(24),
        titleLarge: _body(20, FontWeight.w700),
        titleMedium: _body(17, FontWeight.w700),
        titleSmall: _body(15, FontWeight.w700),
        bodyLarge: _body(16, FontWeight.w500),
        bodyMedium: _body(14, FontWeight.w500),
        bodySmall: _body(13, FontWeight.w500, color: AppColors.muted),
        labelLarge: _body(16, FontWeight.w700, color: Colors.white),
        labelMedium: _body(13, FontWeight.w700),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: true,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.text,
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        shadowColor: shadowColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
          side: const BorderSide(color: AppColors.border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        hintStyle: _body(14, FontWeight.w500, color: AppColors.muted),
        labelStyle: _body(14, FontWeight.w600, color: AppColors.muted),
        prefixIconColor: AppColors.muted,
        suffixIconColor: AppColors.muted,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 18,
        ),
        border: _inputBorder(AppColors.border),
        enabledBorder: _inputBorder(AppColors.border),
        focusedBorder: _inputBorder(AppColors.primary),
        errorBorder: _inputBorder(AppColors.warning),
        focusedErrorBorder: _inputBorder(AppColors.warning),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryBright,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: shadowColor,
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(pillRadius),
          ),
          textStyle: _body(16, FontWeight.w700, color: Colors.white),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.border),
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(pillRadius),
          ),
          textStyle: _body(16, FontWeight.w700, color: AppColors.primary),
        ),
      ),
      dividerColor: AppColors.border,
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.text,
        contentTextStyle: _body(14, FontWeight.w600, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static TextStyle _heading(double size) {
    return TextStyle(
      fontFamily: 'serif',
      fontSize: size,
      height: 1.08,
      fontWeight: FontWeight.w600,
      color: AppColors.text,
      letterSpacing: -0.8,
    );
  }

  static TextStyle _body(
    double size,
    FontWeight weight, {
    Color color = AppColors.text,
  }) {
    return TextStyle(
      fontFamily: 'sans-serif',
      fontSize: size,
      height: 1.25,
      fontWeight: weight,
      color: color,
      letterSpacing: -0.15,
    );
  }

  static OutlineInputBorder _inputBorder(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(inputRadius),
      borderSide: BorderSide(color: color),
    );
  }

  static const shadowColor = Color.fromRGBO(74, 120, 130, 0.08);

  static List<BoxShadow> softShadow([double opacity = 1]) {
    return [
      BoxShadow(
        color: shadowColor.withValues(alpha: 0.6 * opacity),
        blurRadius: 24,
        offset: const Offset(0, 8),
      ),
    ];
  }
}
